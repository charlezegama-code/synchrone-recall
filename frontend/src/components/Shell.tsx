import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

const navItems = [
  { to: "/", label: "Library" },
  { to: "/ask", label: "Ask" },
  { to: "/new-project", label: "New project" },
];

export default function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden md:flex-row">
      <aside className="flex shrink-0 flex-col justify-between border-b border-white/10 bg-rhino px-6 py-5 text-white md:h-screen md:w-56 md:border-b-0 md:border-r md:py-8">
        <div className="flex items-center justify-between md:flex-col md:items-start md:gap-10">
          <div className="leading-none">
            <div className="text-lg font-extrabold tracking-tight">Synchrone</div>
            <div className="font-mono text-[13px] text-white/50">Recall</div>
          </div>

          <nav className="flex items-center gap-5 md:flex-col md:items-stretch md:gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `border-l-2 py-1 text-[15px] transition-colors md:pl-3 ${
                    isActive
                      ? "border-indigo font-medium text-white"
                      : "border-transparent text-white/55 hover:text-white/85"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="hidden font-mono text-[11px] text-white/30 md:block">Team 29</div>
      </aside>

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-canvas">{children}</main>
    </div>
  );
}
