import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Library, MessageCircle, Sparkles, ArrowRight } from "lucide-react";
import { completeOnboarding, type OnboardingUser } from "../lib/onboarding";

const steps = [
  {
    icon: Library,
    title: "Every recording, auto-indexed",
    body: "Upload a recording and Recall transcribes it, timecodes it, and extracts the topics and problem it covers — automatically, before anyone asks a question.",
  },
  {
    icon: MessageCircle,
    title: "Ask it like a colleague",
    body: "Ask a question in plain language. Recall answers strictly from what was actually discussed, and points you to the exact moment it was said.",
  },
  {
    icon: Sparkles,
    title: "The library searches itself",
    body: "Paste a new project brief and Recall surfaces the past engagements that faced the same problem — ranked, before you go looking for them.",
  },
];

function Blobs() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="float-blob absolute -left-24 -top-24 h-96 w-96 rounded-full bg-indigo/25 blur-3xl" />
      <div className="float-blob-slow absolute -right-24 top-1/3 h-[28rem] w-[28rem] rounded-full bg-rhino/15 blur-3xl" />
    </div>
  );
}

function SignupPanel({ onNext }: { onNext: (user: OnboardingUser | null) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  return (
    <motion.div
      key="signup"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16 text-center"
    >
      <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-1.5 text-[13px] font-medium text-rhino/70 shadow-sm ring-1 ring-black/5 backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full bg-indigo" />
        Synchrone internal tool
      </span>

      <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.05] tracking-tight text-rhino md:text-7xl">
        Every past engagement,
        <br />
        <span className="bg-gradient-to-r from-indigo to-rhino bg-clip-text text-transparent">
          one search away.
        </span>
      </h1>

      <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-rhino/60">
        Recall transcribes, analyzes, and matches every recording automatically — so the right
        expertise finds you before you go looking for it.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onNext(name.trim() && email.trim() ? { name: name.trim(), email: email.trim() } : null);
        }}
        className="mt-10 flex w-full max-w-md flex-col gap-3 rounded-2xl bg-white p-5 text-left shadow-xl shadow-rhino/5 ring-1 ring-black/5"
      >
        <label className="text-[13px] font-medium text-rhino/50">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Dupont"
            className="mt-1 w-full rounded-xl border border-hairline bg-canvas px-3.5 py-2.5 text-[15px] text-rhino outline-none transition focus:border-indigo focus:ring-2 focus:ring-indigo/15"
          />
        </label>
        <label className="text-[13px] font-medium text-rhino/50">
          Work email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@synchrone.fr"
            className="mt-1 w-full rounded-xl border border-hairline bg-canvas px-3.5 py-2.5 text-[15px] text-rhino outline-none transition focus:border-indigo focus:ring-2 focus:ring-indigo/15"
          />
        </label>

        <button
          type="submit"
          className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo to-indigo-600 px-5 py-3 text-[15px] font-semibold text-white shadow-lg shadow-indigo/25 transition hover:brightness-110 active:scale-[0.99]"
        >
          Get started
          <ArrowRight size={16} />
        </button>
      </form>

      <button
        onClick={() => onNext(null)}
        className="mt-5 text-[13px] font-medium text-rhino/40 underline-offset-4 transition hover:text-rhino/70 hover:underline"
      >
        Skip intro
      </button>
    </motion.div>
  );
}

function TutorialPanel({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const step = steps[i];
  const Icon = step.icon;
  const isLast = i === steps.length - 1;

  return (
    <motion.div
      key="tutorial"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 py-16 text-center"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35 }}
          className="flex flex-col items-center"
        >
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo to-rhino text-white shadow-lg shadow-indigo/25">
            <Icon size={28} strokeWidth={1.75} />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-rhino">{step.title}</h2>
          <p className="mt-4 max-w-sm text-[16px] leading-relaxed text-rhino/60">{step.body}</p>
        </motion.div>
      </AnimatePresence>

      <div className="mt-10 flex items-center gap-2">
        {steps.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setI(idx)}
            aria-label={`Step ${idx + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              idx === i ? "w-6 bg-indigo" : "w-1.5 bg-rhino/15 hover:bg-rhino/30"
            }`}
          />
        ))}
      </div>

      <button
        onClick={() => (isLast ? onDone() : setI((v) => v + 1))}
        className="mt-8 flex items-center gap-2 rounded-xl bg-rhino px-6 py-3 text-[15px] font-semibold text-white shadow-lg shadow-rhino/20 transition hover:brightness-110 active:scale-[0.99]"
      >
        {isLast ? "Enter Recall" : "Next"}
        <ArrowRight size={16} />
      </button>
    </motion.div>
  );
}

export default function OnboardingFlow({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"signup" | "tutorial">("signup");

  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas bg-grain">
      <Blobs />
      <AnimatePresence mode="wait">
        {phase === "signup" ? (
          <SignupPanel
            key="signup-panel"
            onNext={(user) => {
              completeOnboarding(user);
              setPhase("tutorial");
            }}
          />
        ) : (
          <TutorialPanel key="tutorial-panel" onDone={onComplete} />
        )}
      </AnimatePresence>
    </div>
  );
}
