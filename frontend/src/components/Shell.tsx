import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { Library as LibraryIcon, MessageCircle, SearchCheck } from "lucide-react";
import type { ReactNode } from "react";

const navItems = [
  { to: "/", label: "Library", icon: LibraryIcon },
  { to: "/ask", label: "Ask", icon: MessageCircle },
  { to: "/new-project", label: "New project", icon: SearchCheck },
];

export default function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden md:flex-row">
      <aside className="flex shrink-0 flex-col justify-between border-b border-white/10 bg-gradient-to-b from-rhino to-[#1e3044] px-5 py-4 text-white md:h-screen md:w-60 md:border-b-0 md:border-r md:px-5 md:py-7">
        <div className="flex items-center justify-between md:flex-col md:items-stretch md:gap-9">
          {/* Logo ships on a white background, so it sits inside its own white
              plate rather than directly on the dark rail. */}
          <div className="inline-flex w-fit items-center rounded-lg bg-white px-2.5 py-2 shadow-sm">
            <img src="/synchrone-recall-logo.png" alt="Synchrone Recall" height="32" className="h-8 w-auto" />
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
                    `relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors ${
                      isActive ? "text-white" : "text-white/50 hover:text-white/85"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span
                          layoutId="nav-active"
                          className="absolute inset-0 rounded-xl bg-white/10 ring-1 ring-white/10"
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

        <div className="hidden font-mono text-[11px] text-white/25 md:block">Team 29</div>
      </aside>

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-canvas">{children}</main>
    </div>
  );
}
