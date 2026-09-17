// Lightweight client-side "recent conversations" list for the sidebar.
// There is no backend chat-session concept — each Ask/New Project thread
// lives only in that page's React state — so this is a local index of
// thread starting points a user can jump back to, not a real synced history.
const KEY = "synchrone_recall_recent_conversations";
const MAX_ITEMS = 12;

export type RecentConversation = {
  id: string;
  kind: "ask" | "match";
  title: string; // the first question/brief, trimmed
  at: string; // ISO timestamp
};

export function getRecentConversations(): RecentConversation[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordConversation(kind: "ask" | "match", title: string) {
  try {
    const trimmed = title.trim();
    if (!trimmed) return;
    const existing = getRecentConversations().filter((c) => c.title !== trimmed || c.kind !== kind);
    const next: RecentConversation[] = [
      { id: crypto.randomUUID(), kind, title: trimmed.slice(0, 80), at: new Date().toISOString() },
      ...existing,
    ].slice(0, MAX_ITEMS);
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("recall:conversations-changed"));
  } catch {
    /* storage unavailable — recent list just stays empty */
  }
}
