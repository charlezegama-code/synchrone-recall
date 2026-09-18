import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Library as LibraryIcon, MessageCircle, SearchCheck, Mic, MessageSquareText, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { getRecentConversations, type RecentConversation } from "../lib/conversations";
import SettingsPanel from "./SettingsPanel";

const navItems = [
  { to: "/", label: "Library", icon: LibraryIcon },
  { to: "/ask", label: "Ask", icon: MessageCircle },
  { to: "/new-project", label: "New project", shortLabel: "New", icon: SearchCheck },
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
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col overflow-hidden md:flex-row">
      {/* Desktop rail */}
      <aside className="hidden shrink-0 flex-col bg-rhino text-white md:flex md:h-screen md:w-64 md:border-r md:border-white/10">
        <div className="flex flex-col gap-8 px-5 py-6">
          <div className="inline-flex w-fit items-center rounded-lg bg-white px-2.5 py-2">
            <img src="/synchrone-recall-logo.png" alt="Synchrone Recall" height="28" className="h-[22px] w-auto" />
          </div>

          <nav className="flex flex-col items-stretch gap-1">
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
                          layoutId="nav-active-desktop"
                          className="absolute inset-0 rounded-lg bg-white/10"
                          transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
                        />
                      )}
                      <Icon size={16} className="relative z-10 shrink-0" strokeWidth={2} />
                      <span className="relative z-10">{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-5 pb-5">
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

        <div className="flex items-center justify-between px-5 pb-5">
          <span className="font-mono text-[11px] text-sidebar-muted/50">Team 29</span>
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Appearance settings"
            className="flex h-7 w-7 items-center justify-center rounded-full text-sidebar-muted/60 transition hover:bg-white/10 hover:text-white"
          >
            <Settings size={15} />
          </button>
        </div>
      </aside>

      {/* Mobile top bar — logo only, nav lives in the floating bottom tab bar */}
      <header className="flex shrink-0 items-center justify-between border-b border-hairline bg-canvas px-4 py-3 md:hidden">
        <img src="/synchrone-recall-logo.png" alt="Synchrone Recall" height="22" className="h-[18px] w-auto" />
        <button
          onClick={() => setSettingsOpen(true)}
          aria-label="Appearance settings"
          className="flex h-8 w-8 items-center justify-center rounded-full text-rhino/40 transition hover:bg-black/5 hover:text-rhino"
        >
          <Settings size={17} />
        </button>
      </header>

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-canvas pb-24 md:pb-0">{children}</main>

      {/* Mobile floating bottom tab bar */}
      <nav
        className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-around rounded-2xl bg-white px-1 py-2 shadow-lg ring-1 ring-black/5 md:hidden"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className="relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium"
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-mobile"
                      className="absolute inset-x-1 inset-y-0 rounded-xl bg-indigo-50"
                      transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
                    />
                  )}
                  <Icon
                    size={19}
                    strokeWidth={2}
                    className={`relative z-10 ${isActive ? "text-indigo" : "text-rhino/40"}`}
                  />
                  <span className={`relative z-10 ${isActive ? "text-indigo" : "text-rhino/40"}`}>
                    {item.shortLabel ?? item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
