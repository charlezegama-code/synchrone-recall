import type { Segment, Chunk } from "../types";

const CHUNK_WORDS = 400;
const OVERLAP_WORDS = 50;

/**
 * Flattens timestamped segments into a word stream tagged with the segment's
 * timestamp, then slides a 400-word/50-word-overlap window over it. Chunk
 * boundaries are only as precise as segment-level timecoding upstream, not
 * per-word.
 */
export function buildChunks(segments: Segment[]): Chunk[] {
  const wordsWithTs: { word: string; start: number; end: number }[] = [];
  for (const seg of segments) {
    for (const w of seg.text.split(/\s+/).filter(Boolean)) {
      wordsWithTs.push({ word: w, start: seg.start, end: seg.end });
    }
  }

  const chunks: Chunk[] = [];
  let chunkId = 0;
  const step = CHUNK_WORDS - OVERLAP_WORDS;

  for (let i = 0; i < wordsWithTs.length; i += step) {
    const window = wordsWithTs.slice(i, i + CHUNK_WORDS);
    if (window.length === 0) break;
    chunks.push({
      chunk_id: chunkId++,
      chunk_text: window.map((w) => w.word).join(" "),
      start_timestamp: window[0].start,
      end_timestamp: window[window.length - 1].end,
    });
    if (i + CHUNK_WORDS >= wordsWithTs.length) break;
  }

  return chunks.length > 0
    ? chunks
    : [{ chunk_id: 0, chunk_text: "", start_timestamp: 0, end_timestamp: 0 }];
}
