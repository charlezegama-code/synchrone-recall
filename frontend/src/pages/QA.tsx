import AgentPanel from "../components/AgentPanel";

export default function QA() {
  return (
    <AgentPanel
      mode="qa"
      title="Ask"
      subtitle="Retrieves the 5 most relevant transcript chunks and answers strictly from that context."
      placeholder="How did we resolve the checkout latency issue?"
    />
  );
}
