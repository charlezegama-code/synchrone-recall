import AgentPanel from "../components/AgentPanel";

// Suggestions are phrased against what's actually in the seeded library so
// the first click returns a real answer, not "insufficient evidence".
const SUGGESTIONS = [
  "How did we fix the checkout latency issue?",
  "What was decided about the monolith migration?",
  "How was the data migration escalation handled?",
];

export default function QA() {
  return (
    <AgentPanel
      mode="qa"
      emptyHeadline="What do you want to find?"
      emptySubtitle="Ask in plain language — Recall answers strictly from what was actually discussed."
      placeholder="Ask the library anything…"
      inputVariant="input"
      suggestions={SUGGESTIONS}
    />
  );
}
