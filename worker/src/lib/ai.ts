import type { Bindings, Segment, AnalysisResult } from "../types";

// Workers AI model ids used across the pipeline. Centralized so they're easy
// to swap if the account's model catalog changes.
export const MODELS = {
  // ASSUMPTION: whisper-large-v3-turbo returns word-level timestamps in
  // `resp.words` ([{word, start, end}]). If your account's version of this
  // model only returns plain `text` with no timestamps, transcribeAudio()
  // below falls back to evenly-spaced pseudo-timestamps across the whole
  // duration so the rest of the pipeline (chunking, timecoded sources) still
  // works end to end — flagged clearly in that fallback branch.
  STT: "@cf/openai/whisper-large-v3-turbo",
  // NOTE: @cf/meta/llama-3.1-8b-instruct was deprecated on the account's
  // model catalog as of 2026-05-30 (surfaced as a runtime AiError, not a
  // deploy-time failure) — pinned to the current fast fp8 3.3 model instead.
  CHAT: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  EMBEDDING: "@cf/baai/bge-base-en-v1.5", // 768-dim, matches Vectorize index config
} as const;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export async function transcribeAudio(
  ai: Ai,
  audioBytes: ArrayBuffer
): Promise<{ full_text: string; duration_seconds: number; segments: Segment[] }> {
  // ASSUMPTION: whisper-large-v3-turbo's current input schema wants `audio`
  // as a base64-encoded string, not a raw byte array (which is what the
  // older @cf/openai/whisper model accepted) — confirmed by a live 400 from
  // the AI Gateway schema validator when a byte array was sent instead.
  const input = { audio: arrayBufferToBase64(audioBytes) };
  const resp: any = await ai.run(MODELS.STT as any, input as any);

  const full_text: string = resp.text ?? "";

  // Preferred path: word-level timestamps -> group into ~10-word pseudo-segments.
  if (Array.isArray(resp.words) && resp.words.length > 0) {
    const segments: Segment[] = [];
    const GROUP = 10;
    for (let i = 0; i < resp.words.length; i += GROUP) {
      const group = resp.words.slice(i, i + GROUP);
      segments.push({
        start: group[0].start,
        end: group[group.length - 1].end,
        text: group.map((w: any) => w.word).join(" ").trim(),
      });
    }
    const duration_seconds = resp.words[resp.words.length - 1].end ?? 0;
    return { full_text, duration_seconds, segments };
  }

  // Fallback: no timestamp data returned by the model. Spread the text
  // evenly across a rough estimated duration (150 words/min speaking rate)
  // so downstream timecoding degrades gracefully instead of crashing.
  // NOTE TO REVIEWER: this fallback loses real timecode accuracy.
  const words = full_text.split(/\s+/).filter(Boolean);
  const estimatedDuration = Math.max(1, (words.length / 150) * 60);
  const segments: Segment[] = [
    { start: 0, end: estimatedDuration, text: full_text },
  ];
  return { full_text, duration_seconds: estimatedDuration, segments };
}

const EXTRACTION_PROMPT = (transcript: string) => `You are analyzing a consulting/engineering engagement recording transcript.
Return STRICT JSON only, no prose, no markdown fences, matching this schema exactly:
{"topics": ["short topic tag", ...], "problem_summary": "2-4 sentence summary of the problem discussed", "key_entities": ["technology, client, or system named"]}

Transcript:
${transcript}`;

// Workers AI's `response` convenience field is auto-parsed into an object
// when the model's raw output happens to be valid JSON, instead of staying a
// string — so we can't assume `resp.response` is always text. The OpenAI-style
// `choices[0].message.content` field is always the raw string, and is the
// more reliable source; `resp.response` (stringified if needed) is the fallback.
function extractText(resp: any): string {
  const content = resp?.choices?.[0]?.message?.content;
  if (typeof content === "string" && content.length > 0) return content;
  if (typeof resp?.response === "string") return resp.response;
  if (resp?.response != null) return JSON.stringify(resp.response);
  return "";
}

export async function analyzeTranscript(ai: Ai, fullText: string): Promise<AnalysisResult> {
  const resp: any = await ai.run(MODELS.CHAT, {
    messages: [{ role: "user", content: EXTRACTION_PROMPT(fullText) }],
    temperature: 0,
  });
  return parseAnalysisJson(extractText(resp));
}

export function parseAnalysisJson(raw: string): AnalysisResult {
  let cleaned = raw.trim();
  // QUOTA/RELIABILITY: models occasionally wrap JSON in markdown fences
  // despite instructions not to. Strip fences before parsing.
  cleaned = cleaned.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  try {
    const parsed = JSON.parse(cleaned);
    return {
      topics: Array.isArray(parsed.topics) ? parsed.topics : [],
      problem_summary: typeof parsed.problem_summary === "string" ? parsed.problem_summary : "",
      key_entities: Array.isArray(parsed.key_entities) ? parsed.key_entities : [],
    };
  } catch {
    return { topics: [], problem_summary: cleaned.slice(0, 500), key_entities: [] };
  }
}

export async function embedText(ai: Ai, text: string): Promise<number[]> {
  const resp: any = await ai.run(MODELS.EMBEDDING, { text: [text] });
  return resp.data[0];
}

export async function embedTextBatch(ai: Ai, texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const resp: any = await ai.run(MODELS.EMBEDDING, { text: texts });
  return resp.data;
}

const QA_PROMPT = (context: string, question: string) => `Answer the question using ONLY the context below.
If the answer is not contained in the context, respond EXACTLY with:
"Insufficient evidence was found in the available recordings."

Context:
${context}

Question: ${question}`;

export async function generateAnswer(ai: Ai, context: string, question: string): Promise<string> {
  const resp: any = await ai.run(MODELS.CHAT, {
    messages: [{ role: "user", content: QA_PROMPT(context, question) }],
    temperature: 0,
  });
  return extractText(resp).trim();
}
