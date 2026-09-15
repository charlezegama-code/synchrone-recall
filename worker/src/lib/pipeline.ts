import type { Bindings } from "../types";
import { transcribeAudio, analyzeTranscript, embedText, embedTextBatch } from "./ai";
import { buildChunks } from "./chunking";

/**
 * Full auto-pipeline run right after upload: transcribe -> chunk -> analyze
 * -> embed -> persist to D1 + Vectorize. Runs inline within the request
 * (via ctx.waitUntil from the caller) rather than through a queue — fine for
 * demo-scale files, but a production version should move this to a Cloudflare
 * Queue consumer so large files don't risk hitting the Worker's CPU/wall-time
 * limits, and so failures can be retried without re-uploading.
 */
export async function runPipeline(env: Bindings, recordingId: string, audioBytes: ArrayBuffer) {
  try {
    const { full_text, duration_seconds, segments } = await transcribeAudio(env.AI, audioBytes);
    await runAnalysisAndEmbedding(env, recordingId, full_text, segments, duration_seconds);
  } catch (err) {
    console.error("Pipeline (transcription) failed for recording", recordingId, err);
    await env.DB.prepare("UPDATE recordings SET status = 'failed' WHERE id = ?")
      .bind(recordingId)
      .run();
  }
}

/**
 * Everything after transcription: persist transcript, analyze, chunk, embed,
 * store in D1 + Vectorize. Factored out so the seed script can drive
 * synthetic sample transcripts through the exact same analysis/embedding
 * path without needing a real audio file or Workers AI STT call.
 */
export async function runAnalysisAndEmbedding(
  env: Bindings,
  recordingId: string,
  full_text: string,
  segments: import("../types").Segment[],
  duration_seconds: number
) {
  try {
    await env.DB.prepare(
      "INSERT INTO transcripts (recording_id, full_text, segments_json) VALUES (?, ?, ?)"
    ).bind(recordingId, full_text, JSON.stringify(segments)).run();

    await env.DB.prepare("UPDATE recordings SET duration_seconds = ? WHERE id = ?")
      .bind(duration_seconds, recordingId)
      .run();

    const analysis = await analyzeTranscript(env.AI, full_text);
    const summaryEmbedding = await embedText(env.AI, analysis.problem_summary);

    await env.DB.prepare(
      `INSERT INTO analysis (recording_id, topics_json, problem_summary, key_entities_json, summary_embedding_json)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(
      recordingId,
      JSON.stringify(analysis.topics),
      analysis.problem_summary,
      JSON.stringify(analysis.key_entities),
      JSON.stringify(summaryEmbedding)
    ).run();

    await env.VECTORIZE_SUMMARIES.upsert([
      {
        id: recordingId,
        values: summaryEmbedding,
        metadata: { recording_id: recordingId, problem_summary: analysis.problem_summary },
      },
    ]).catch((err) => console.error("Vectorize summary upsert failed (D1 fallback still holds data):", err));

    const chunks = buildChunks(segments);
    const chunkEmbeddings = await embedTextBatch(env.AI, chunks.map((c) => c.chunk_text));

    const insertChunk = env.DB.prepare(
      `INSERT INTO chunks (id, recording_id, chunk_id, chunk_text, start_timestamp, end_timestamp, embedding_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    const batch = chunks.map((c, i) =>
      insertChunk.bind(
        `${recordingId}_${c.chunk_id}`,
        recordingId,
        c.chunk_id,
        c.chunk_text,
        c.start_timestamp,
        c.end_timestamp,
        JSON.stringify(chunkEmbeddings[i])
      )
    );
    await env.DB.batch(batch);

    await env.VECTORIZE_CHUNKS.upsert(
      chunks.map((c, i) => ({
        id: `${recordingId}_${c.chunk_id}`,
        values: chunkEmbeddings[i],
        metadata: {
          recording_id: recordingId,
          chunk_text: c.chunk_text,
          start_timestamp: c.start_timestamp,
          end_timestamp: c.end_timestamp,
          topics: JSON.stringify(analysis.topics),
        },
      }))
    ).catch((err) => console.error("Vectorize chunk upsert failed (D1 fallback still holds data):", err));

    await env.DB.prepare("UPDATE recordings SET status = 'processed' WHERE id = ?")
      .bind(recordingId)
      .run();
  } catch (err) {
    console.error("Pipeline failed for recording", recordingId, err);
    await env.DB.prepare("UPDATE recordings SET status = 'failed' WHERE id = ?")
      .bind(recordingId)
      .run();
    throw err; // surface to direct callers (e.g. the seed route); runPipeline's own catch swallows it for the fire-and-forget upload path
  }
}
