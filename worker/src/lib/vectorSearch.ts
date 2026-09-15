import type { Bindings } from "../types";

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

export type ChunkMatch = {
  id: string;
  score: number;
  recording_id: string;
  chunk_text: string;
  start_timestamp: number;
  end_timestamp: number;
};

export type SummaryMatch = {
  id: string;
  score: number;
  recording_id: string;
};

/** Vectorize primary path, D1-JSON cosine-similarity fallback. */
export async function searchChunks(
  env: Bindings,
  queryVector: number[],
  topK: number
): Promise<ChunkMatch[]> {
  if (env.USE_D1_FALLBACK_SEARCH !== "true") {
    try {
      const result = await env.VECTORIZE_CHUNKS.query(queryVector, {
        topK,
        returnMetadata: "all",
      });
      return result.matches.map((m) => ({
        id: m.id,
        score: m.score,
        recording_id: String(m.metadata?.recording_id ?? ""),
        chunk_text: String(m.metadata?.chunk_text ?? ""),
        start_timestamp: Number(m.metadata?.start_timestamp ?? 0),
        end_timestamp: Number(m.metadata?.end_timestamp ?? 0),
      }));
    } catch (err) {
      console.error("Vectorize query failed, falling back to D1 cosine search:", err);
    }
  }

  const rows = await env.DB.prepare(
    "SELECT id, recording_id, chunk_text, start_timestamp, end_timestamp, embedding_json FROM chunks"
  ).all<{
    id: string;
    recording_id: string;
    chunk_text: string;
    start_timestamp: number;
    end_timestamp: number;
    embedding_json: string;
  }>();

  const scored = (rows.results ?? []).map((r) => ({
    id: r.id,
    score: cosineSimilarity(queryVector, JSON.parse(r.embedding_json)),
    recording_id: r.recording_id,
    chunk_text: r.chunk_text,
    start_timestamp: r.start_timestamp,
    end_timestamp: r.end_timestamp,
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

export async function searchSummaries(
  env: Bindings,
  queryVector: number[],
  topK: number
): Promise<SummaryMatch[]> {
  if (env.USE_D1_FALLBACK_SEARCH !== "true") {
    try {
      const result = await env.VECTORIZE_SUMMARIES.query(queryVector, {
        topK,
        returnMetadata: "all",
      });
      return result.matches.map((m) => ({
        id: m.id,
        score: m.score,
        recording_id: String(m.metadata?.recording_id ?? m.id),
      }));
    } catch (err) {
      console.error("Vectorize query failed, falling back to D1 cosine search:", err);
    }
  }

  const rows = await env.DB.prepare(
    "SELECT recording_id, summary_embedding_json FROM analysis WHERE summary_embedding_json IS NOT NULL"
  ).all<{ recording_id: string; summary_embedding_json: string }>();

  const scored = (rows.results ?? []).map((r) => ({
    id: r.recording_id,
    score: cosineSimilarity(queryVector, JSON.parse(r.summary_embedding_json)),
    recording_id: r.recording_id,
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}
