// Seeds the SAMPLE_TRANSCRIPTS through the real analyze/embed/store pipeline
// via the /api/dev/seed endpoint (bypasses Workers AI STT since we're
// starting from text, not audio — see that route's comment in src/index.ts).
import { SAMPLE_TRANSCRIPTS } from "./transcripts.mjs";

const isLocal = process.argv.includes("--local");
const BASE_URL = isLocal
  ? "http://127.0.0.1:8787"
  : process.env.SEED_BASE_URL ?? "https://synchrone-recall.synagogue.workers.dev";

const WORDS_PER_SECOND = 150 / 60; // ~150 wpm speaking rate assumption
const WORDS_PER_SEGMENT = 12;

function toSegments(fullText) {
  const words = fullText.split(/\s+/).filter(Boolean);
  const segments = [];
  for (let i = 0; i < words.length; i += WORDS_PER_SEGMENT) {
    const group = words.slice(i, i + WORDS_PER_SEGMENT);
    segments.push({
      start: i / WORDS_PER_SECOND,
      end: (i + group.length) / WORDS_PER_SECOND,
      text: group.join(" "),
    });
  }
  return { segments, duration_seconds: words.length / WORDS_PER_SECOND };
}

async function seedOne(sample) {
  const { segments, duration_seconds } = toSegments(sample.full_text);
  const res = await fetch(`${BASE_URL}/api/dev/seed?secret=recall-dev`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      file_name: sample.file_name,
      full_text: sample.full_text,
      segments,
      duration_seconds,
    }),
  });
  if (!res.ok) {
    throw new Error(`Seed failed for ${sample.file_name}: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function main() {
  console.log(`Seeding ${SAMPLE_TRANSCRIPTS.length} sample recordings against ${BASE_URL} ...`);
  for (const sample of SAMPLE_TRANSCRIPTS) {
    const result = await seedOne(sample);
    console.log(`  ✓ ${sample.file_name} -> recording_id=${result.id}`);
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
