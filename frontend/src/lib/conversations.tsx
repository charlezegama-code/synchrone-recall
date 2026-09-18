import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

// In-memory "recent conversations" for the sidebar. Kept in React state on
// purpose (no storage): it lives for the session and resets on reload.
// There's no backend chat-session concept, so this is just an index of
// thread starting points, not synced history.
export type RecentConversation = {
  id: string;
  kind: "ask" | "match";
  title: string;
  at: string;
};

type Ctx = {
  recent: RecentConversation[];
  record: (kind: "ask" | "match", title: string) => void;
};

const ConversationsContext = createContext<Ctx>({ recent: [], record: () => {} });

const MAX_ITEMS = 12;

export function ConversationsProvider({ children }: { children: ReactNode }) {
  const [recent, setRecent] = useState<RecentConversation[]>([]);

  const record = useCallback((kind: "ask" | "match", title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setRecent((prev) => {
      const rest = prev.filter((c) => !(c.title === trimmed && c.kind === kind));
      return [{ id: crypto.randomUUID(), kind, title: trimmed.slice(0, 80), at: new Date().toISOString() }, ...rest].slice(
        0,
        MAX_ITEMS
      );
    });
  }, []);

  const value = useMemo(() => ({ recent, record }), [recent, record]);
  return <ConversationsContext.Provider value={value}>{children}</ConversationsContext.Provider>;
}

export function useConversations() {
  return useContext(ConversationsContext);
}
