// Minimal evaluation harness against the deployed API. Run with:
//   node seed/eval.mjs
// Assumes the 5 sample transcripts have already been seeded (seed/seed.mjs).
const BASE_URL = process.env.SEED_BASE_URL ?? "https://synchrone-recall.vaultx.workers.dev";
const NO_ANSWER_TEXT = "Insufficient evidence was found in the available recordings.";

const cases = [
  {
    id: "1_exact_terminology",
    type: "qa",
    input: "Why was the checkout endpoint slow and how was it fixed?",
    expectFile: "2026-03-04_checkout-latency-bugfix.mp3",
    expectAnswer: true,
  },
  {
    id: "2_semantic_paraphrase",
    type: "qa",
    input: "What made payments take so long under heavy load, and what changed to speed it up?",
    expectFile: "2026-03-04_checkout-latency-bugfix.mp3",
    expectAnswer: true,
  },
  {
    id: "3_no_answer_in_corpus",
    type: "qa",
    input: "What is the company's policy on parental leave?",
    expectFile: null,
    expectAnswer: false,
  },
  {
    id: "4_multi_source_capable",
    type: "qa",
    input: "Describe a time a client escalated a project and how the team responded.",
    expectFile: "2026-04-11_client-escalation-data-migration.mp3",
    expectAnswer: true,
  },
  {
    id: "5_proactive_match",
    type: "match",
    input:
      "Our client runs an e-commerce platform on a single old Rails app. Last Black Friday a memory leak in one module crashed everything including checkout, and now leadership wants us to make the system more resilient before the next big sale without a full rewrite.",
    expectFile: "2026-05-19_architecture-monolith-to-microservices.mp3",
  },
];

async function runQa(input) {
  const res = await fetch(`${BASE_URL}/api/qa`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: input }),
  });
  return res.json();
}

async function runMatch(input) {
  const res = await fetch(`${BASE_URL}/api/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description: input }),
  });
  return res.json();
}

async function main() {
  console.log(`Running eval harness against ${BASE_URL}\n`);
  const rows = [];

  for (const tc of cases) {
    if (tc.type === "qa") {
      const { answer, sources } = await runQa(tc.input);
      const retrievedFiles = sources.map((s) => s.file_name);
      const correct_file_retrieved = tc.expectFile ? retrievedFiles.includes(tc.expectFile) : null;
      const correct_timestamp = tc.expectFile
        ? sources.some((s) => s.file_name === tc.expectFile && s.end_timestamp > s.start_timestamp)
        : null;
      const gaveAnAnswer = answer.trim() !== NO_ANSWER_TEXT;
      const answer_correct = tc.expectAnswer ? gaveAnAnswer : !gaveAnAnswer;
      // Hallucination heuristic: confidently answered but expected source
      // wasn't actually retrieved. Not a substitute for human review.
      const hallucination_detected = gaveAnAnswer && tc.expectFile && !correct_file_retrieved;

      rows.push({
        test_case: tc.id,
        correct_file_retrieved,
        correct_timestamp,
        answer_correct,
        hallucination_detected,
        match_relevance_correct: null,
      });
    } else {
      const { matches } = await runMatch(tc.input);
      const top = matches[0];
      const match_relevance_correct = top?.file_name === tc.expectFile;
      rows.push({
        test_case: tc.id,
        correct_file_retrieved: match_relevance_correct,
        correct_timestamp: match_relevance_correct ? top.timestamp >= 0 : null,
        answer_correct: null,
        hallucination_detected: null,
        match_relevance_correct,
      });
    }
  }

  const header = Object.keys(rows[0]);
  console.log(header.join(" | "));
  for (const row of rows) {
    console.log(header.map((h) => String(row[h])).join(" | "));
  }

  const passed = rows.filter(
    (r) => r.correct_file_retrieved !== false && r.answer_correct !== false && !r.hallucination_detected && r.match_relevance_correct !== false
  ).length;
  console.log(`\n${passed}/${rows.length} test cases passed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
