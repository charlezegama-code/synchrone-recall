import AgentPanel from "../components/AgentPanel";

export default function NewProject() {
  return (
    <AgentPanel
      mode="match"
      title="New project"
      subtitle="Describe a new brief. We search past engagements for the closest match, ranked by relevance."
      placeholder="Client wants to migrate a legacy monolith ahead of a traffic spike…"
    />
  );
}
