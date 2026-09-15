import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Bindings } from "./types";
import { runPipeline, runAnalysisAndEmbedding } from "./lib/pipeline";
import { embedText, generateAnswer } from "./lib/ai";
import { searchChunks, searchSummaries } from "./lib/vectorSearch";

const app = new Hono<{ Bindings: Bindings }>();

app.use("/api/*", cors());

const NO_ANSWER_TEXT = "Insufficient evidence was found in the available recordings.";

app.get("/api/recordings", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT r.id, r.file_name, r.upload_date, r.duration_seconds, r.status,
            a.topics_json, a.problem_summary
     FROM recordings r
     LEFT JOIN analysis a ON a.recording_id = r.id
     ORDER BY r.upload_date DESC`
  ).all();

  const recordings = results.map((r: any) => ({
    id: r.id,
    file_name: r.file_name,
    upload_date: r.upload_date,
    duration_seconds: r.duration_seconds,
    status: r.status,
    topics: r.topics_json ? JSON.parse(r.topics_json) : [],
    problem_summary: r.problem_summary ?? null,
  }));

  return c.json({ recordings });
});

app.get("/api/recordings/:id", async (c) => {
  const id = c.req.param("id");
  const recording = await c.env.DB.prepare("SELECT * FROM recordings WHERE id = ?").bind(id).first();
  if (!recording) return c.json({ error: "not found" }, 404);

  const transcript = await c.env.DB.prepare("SELECT * FROM transcripts WHERE recording_id = ?").bind(id).first();
  const analysis = await c.env.DB.prepare("SELECT * FROM analysis WHERE recording_id = ?").bind(id).first();

  return c.json({
    recording,
    transcript: transcript
      ? { full_text: transcript.full_text, segments: JSON.parse(String(transcript.segments_json)) }
      : null,
    analysis: analysis
      ? {
          topics: JSON.parse(String(analysis.topics_json)),
          problem_summary: analysis.problem_summary,
          key_entities: JSON.parse(String(analysis.key_entities_json)),
        }
      : null,
  });
});

app.post("/api/recordings/upload", async (c) => {
  const form = await c.req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return c.json({ error: "missing 'file' field" }, 400);
  }

  const id = crypto.randomUUID();
  const uploadDate = new Date().toISOString();
  const bytes = await file.arrayBuffer();

  await c.env.MEDIA.put(`recordings/${id}/${file.name}`, bytes);

  await c.env.DB.prepare(
    "INSERT INTO recordings (id, file_name, upload_date, duration_seconds, status) VALUES (?, ?, ?, ?, 'processing')"
  ).bind(id, file.name, uploadDate, null).run();

  // Kick off the auto-pipeline without blocking the upload response; the
  // client polls GET /api/recordings for status transitions.
  c.executionCtx.waitUntil(runPipeline(c.env, id, bytes));

  return c.json({ id, file_name: file.name, status: "processing" }, 202);
});

// Seeds a synthetic sample recording (text + segments already "transcribed")
// through the real analysis/embedding pipeline, bypassing Workers AI STT.
// INTERNAL/DEMO ONLY — unauthenticated by design since this is a private
// consulting-firm tool seeded once at setup; do not expose in a public
// deployment without an auth check.
app.post("/api/dev/seed", async (c) => {
  const body = await c.req.json<{
    file_name: string;
    upload_date?: string;
    full_text: string;
    segments: { start: number; end: number; text: string }[];
    duration_seconds: number;
  }>();

  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    "INSERT INTO recordings (id, file_name, upload_date, duration_seconds, status) VALUES (?, ?, ?, ?, 'processing')"
  ).bind(id, body.file_name, body.upload_date ?? new Date().toISOString(), body.duration_seconds).run();

  try {
    await runAnalysisAndEmbedding(c.env, id, body.full_text, body.segments, body.duration_seconds);
  } catch (err) {
    return c.json({ id, file_name: body.file_name, error: String(err) }, 500);
  }

  return c.json({ id, file_name: body.file_name });
});

app.post("/api/qa", async (c) => {
  const { question } = await c.req.json<{ question: string }>();
  if (!question || !question.trim()) return c.json({ error: "missing 'question'" }, 400);

  const queryVector = await embedText(c.env.AI, question);
  const matches = await searchChunks(c.env, queryVector, 5);

  if (matches.length === 0) {
    return c.json({ answer: NO_ANSWER_TEXT, sources: [] });
  }

  const context = matches
    .map((m) => `[recording:${m.recording_id} ${m.start_timestamp}-${m.end_timestamp}] ${m.chunk_text}`)
    .join("\n---\n");

  const answer = await generateAnswer(c.env.AI, context, question);

  let sources: any[] = [];
  if (answer.trim() !== NO_ANSWER_TEXT) {
    const fileNames = await resolveFileNames(c.env, matches.map((m) => m.recording_id));
    sources = matches.map((m) => ({
      file_name: fileNames[m.recording_id] ?? m.recording_id,
      recording_id: m.recording_id,
      start_timestamp: m.start_timestamp,
      end_timestamp: m.end_timestamp,
    }));
  }

  return c.json({ answer, sources });
});

app.post("/api/match", async (c) => {
  const { description } = await c.req.json<{ description: string }>();
  if (!description || !description.trim()) return c.json({ error: "missing 'description'" }, 400);

  const queryVector = await embedText(c.env.AI, description);
  const matches = await searchSummaries(c.env, queryVector, 5);

  if (matches.length === 0) return c.json({ matches: [] });

  const recordingIds = matches.map((m) => m.recording_id);
  const details = await c.env.DB.prepare(
    `SELECT r.id, r.file_name, a.problem_summary, a.topics_json,
            (SELECT MIN(start_timestamp) FROM chunks WHERE recording_id = r.id) AS entry_timestamp
     FROM recordings r
     JOIN analysis a ON a.recording_id = r.id
     WHERE r.id IN (${recordingIds.map(() => "?").join(",")})`
  ).bind(...recordingIds).all<any>();

  const byId = new Map(details.results.map((d: any) => [d.id, d]));

  const output = matches
    .map((m) => {
      const d = byId.get(m.recording_id);
      if (!d) return null;
      return {
        file_name: d.file_name,
        recording_id: m.recording_id,
        problem_summary: d.problem_summary,
        topics: JSON.parse(d.topics_json),
        relevance_score: m.score,
        // TIMECODE ASSUMPTION: matching happens against a file-level problem
        // summary, not a specific chunk, so there is no single natural
        // timecode. We point to the recording's earliest chunk as an entry
        // point into where the discussion starts.
        timestamp: d.entry_timestamp ?? 0,
      };
    })
    .filter(Boolean);

  return c.json({ matches: output });
});

async function resolveFileNames(env: Bindings, recordingIds: string[]): Promise<Record<string, string>> {
  if (recordingIds.length === 0) return {};
  const unique = [...new Set(recordingIds)];
  const { results } = await env.DB.prepare(
    `SELECT id, file_name FROM recordings WHERE id IN (${unique.map(() => "?").join(",")})`
  ).bind(...unique).all<{ id: string; file_name: string }>();
  const map: Record<string, string> = {};
  for (const r of results) map[r.id] = r.file_name;
  return map;
}

export default app;
