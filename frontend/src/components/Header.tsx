import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";

const navItems = [
  { to: "/", label: "Library" },
  { to: "/qa", label: "Ask" },
  { to: "/new-project", label: "New Project" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-black/5 bg-brand-alabaster/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-baseline gap-2">
          {/* Text wordmark placeholder — no logo asset available. */}
          <span className="text-xl font-extrabold tracking-tight text-brand-rhino">
            Synchrone
          </span>
          <span className="text-xl font-light text-brand-indigo">Recall</span>
        </div>

        <nav className="flex items-center gap-1 rounded-full bg-white p-1 shadow-sm ring-1 ring-black/5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `relative rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  isActive ? "text-white" : "text-brand-rhino/70 hover:text-brand-rhino"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-brand-indigo"
                      transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
                    />
                  )}
                  <span className="relative z-10">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
