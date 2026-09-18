import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, type ReactNode } from "react";
import {
  Library as LibraryIcon,
  MessageCircle,
  SearchCheck,
  Mic,
  MessageSquareText,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useConversations } from "../lib/conversations";
import Logo from "./Logo";
import SettingsPanel from "./SettingsPanel";

const navItems = [
  { to: "/", label: "Library", icon: LibraryIcon },
  { to: "/ask", label: "Ask", icon: MessageCircle },
  { to: "/new-project", label: "New project", shortLabel: "New", icon: SearchCheck },
  { to: "/record", label: "Record", icon: Mic },
];

export default function Shell({ children }: { children: ReactNode }) {
  const { recent } = useConversations();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen flex-col overflow-hidden md:flex-row">
      {/* ── Desktop rail ─────────────────────────────────────────── */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 256 }}
        transition={{ type: "spring", duration: 0.45, bounce: 0 }}
        className="relative hidden shrink-0 flex-col overflow-visible border-r border-white/[0.06] bg-rhino-deep text-white md:flex md:h-screen"
      >
        <div className={`flex h-16 items-center ${collapsed ? "justify-center px-0" : "px-5"}`}>
          {collapsed ? <Logo compact className="h-6 w-auto" /> : <Logo className="h-[22px] w-auto" />}
        </div>

        <nav className={`mt-3 flex flex-col gap-0.5 ${collapsed ? "px-3" : "px-3"}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                data-tip={item.label}
                className={({ isActive }) =>
                  `${collapsed ? "tip justify-center" : ""} relative flex h-11 items-center gap-3 rounded-lg px-3 text-[14px] font-medium transition-colors ${
                    isActive ? "text-white" : "text-sidebar-muted hover:bg-white/[0.04] hover:text-white/90"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="nav-active-desktop"
                        className="absolute inset-0 rounded-lg bg-rhino-raised/70"
                        transition={{ type: "spring", duration: 0.5, bounce: 0.15 }}
                      />
                    )}
                    {isActive && (
                      <motion.span
                        layoutId="nav-active-bar"
                        className="absolute -left-3 top-2 bottom-2 w-[3px] rounded-r-full bg-gold"
                        transition={{ type: "spring", duration: 0.5, bounce: 0.15 }}
                      />
                    )}
                    <Icon size={18} strokeWidth={2} className="relative z-10 shrink-0" />
                    {!collapsed && <span className="relative z-10 truncate">{item.label}</span>}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="mt-6 flex min-h-0 flex-1 flex-col px-3">
            {recent.length > 0 && (
              <>
                <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-sidebar-muted/50">
                  Recent
                </div>
                <div className="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto">
                  {recent.map((c) => (
                    <NavLink
                      key={c.id}
                      to={c.kind === "ask" ? "/ask" : "/new-project"}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-sidebar-muted/80 transition-colors hover:bg-white/[0.04] hover:text-white/90"
                    >
                      <MessageSquareText size={13} className="shrink-0 opacity-60" />
                      <span className="truncate">{c.title}</span>
                    </NavLink>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        {collapsed && <div className="flex-1" />}

        <div className={`flex items-center border-t border-white/[0.06] px-3 py-3 ${collapsed ? "flex-col gap-1" : "justify-between"}`}>
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Appearance settings"
            data-tip="Appearance"
            className={`${collapsed ? "tip" : ""} flex h-10 w-10 items-center justify-center rounded-lg text-sidebar-muted/70 transition hover:bg-white/[0.06] hover:text-white`}
          >
            <Settings size={17} />
          </button>
          <button
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            data-tip={collapsed ? "Expand" : "Collapse"}
            className={`${collapsed ? "tip" : ""} flex h-10 w-10 items-center justify-center rounded-lg text-sidebar-muted/70 transition hover:bg-white/[0.06] hover:text-white`}
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>
      </motion.aside>

      {/* ── Mobile top bar (logo + settings only) ────────────────── */}
      <header className="flex h-14 shrink-0 items-center justify-between bg-rhino-deep px-4 text-white md:hidden">
        <Logo className="h-[18px] w-auto" />
        <button
          onClick={() => setSettingsOpen(true)}
          aria-label="Appearance settings"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-sidebar-muted transition hover:text-white"
        >
          <Settings size={18} />
        </button>
      </header>

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-canvas pb-20 md:pb-0">{children}</main>

      {/* ── Mobile bottom tab bar ────────────────────────────────── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-white/[0.06] bg-rhino px-1 md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className="relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium"
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-mobile"
                      className="absolute top-1.5 h-1.5 w-1.5 rounded-full bg-gold"
                      transition={{ type: "spring", duration: 0.45, bounce: 0.2 }}
                    />
                  )}
                  <Icon size={20} strokeWidth={2} className={`mt-1.5 ${isActive ? "text-indigo" : "text-sidebar-muted/70"}`} />
                  <span className={isActive ? "text-white" : "text-sidebar-muted/70"}>{item.shortLabel ?? item.label}</span>
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
