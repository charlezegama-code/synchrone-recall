import AgentPanel from "../components/AgentPanel";

export default function QA() {
  return (
    <AgentPanel
      mode="qa"
      emptyHeadline="What do you want to find?"
      emptySubtitle="Ask in plain language — Recall answers strictly from what was actually discussed."
      placeholder="How did we resolve the checkout latency issue?"
      inputVariant="input"
    />
  );
}
