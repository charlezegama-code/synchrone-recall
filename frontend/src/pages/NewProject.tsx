import AgentPanel from "../components/AgentPanel";

export default function NewProject() {
  return (
    <AgentPanel
      mode="match"
      emptyHeadline="Describe your new project"
      emptySubtitle="Recall searches past engagements for the closest match, ranked by relevance."
      placeholder="Client wants to migrate a legacy monolith ahead of a traffic spike…"
      inputVariant="textarea"
    />
  );
}
