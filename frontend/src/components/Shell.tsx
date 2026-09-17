import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Library as LibraryIcon, MessageCircle, SearchCheck, Mic, MessageSquareText } from "lucide-react";
import type { ReactNode } from "react";
import { getRecentConversations, type RecentConversation } from "../lib/conversations";

const navItems = [
  { to: "/", label: "Library", icon: LibraryIcon },
  { to: "/ask", label: "Ask", icon: MessageCircle },
  { to: "/new-project", label: "New project", icon: SearchCheck },
  { to: "/record", label: "Record", icon: Mic },
];

function useRecentConversations(): RecentConversation[] {
  const [items, setItems] = useState<RecentConversation[]>(() => getRecentConversations());
  useEffect(() => {
    const refresh = () => setItems(getRecentConversations());
    window.addEventListener("recall:conversations-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("recall:conversations-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return items;
}

export default function Shell({ children }: { children: ReactNode }) {
  const recent = useRecentConversations();

  return (
    <div className="flex h-screen flex-col overflow-hidden md:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-white/10 bg-rhino text-white md:h-screen md:w-64 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-5 py-4 md:flex-col md:items-stretch md:gap-8 md:px-5 md:py-6">
          {/* PNG logo is transparent, but its navy tone matches the sidebar
              bg 1:1 — a white plate keeps "Synchrone" legible, the standard
              lockup pattern for a colored logo on a dark rail. */}
          <div className="inline-flex w-fit items-center rounded-lg bg-white px-2.5 py-2">
            <img src="/synchrone-recall-logo.png" alt="Synchrone Recall" height="28" className="h-[22px] w-auto" />
          </div>

          <nav className="flex items-center gap-1 md:flex-col md:items-stretch md:gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    `relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors ${
                      isActive ? "text-white" : "text-sidebar-muted hover:text-white/85"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span
                          layoutId="nav-active"
                          className="absolute inset-0 rounded-lg bg-white/10"
                          transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
                        />
                      )}
                      <Icon size={16} className="relative z-10 shrink-0" strokeWidth={2} />
                      <span className="relative z-10 hidden sm:inline">{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="hidden min-h-0 flex-1 flex-col px-5 pb-5 md:flex">
          {recent.length > 0 && (
            <>
              <div className="mb-2 mt-2 text-[12px] font-medium text-sidebar-muted/70">Recent</div>
              <div className="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto">
                {recent.map((c) => (
                  <NavLink
                    key={c.id}
                    to={c.kind === "ask" ? "/ask" : "/new-project"}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-sidebar-muted transition-colors hover:bg-white/5 hover:text-white/85"
                  >
                    <MessageSquareText size={13} className="shrink-0 opacity-60" />
                    <span className="truncate">{c.title}</span>
                  </NavLink>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="hidden font-mono text-[11px] text-sidebar-muted/50 md:block md:px-5 md:pb-5">Team 29</div>
      </aside>

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-canvas">{children}</main>
    </div>
  );
}
