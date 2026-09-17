import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ThinkingOrb } from "thinking-orbs";
import { Send, Clock } from "lucide-react";
import { api, formatTimestamp, type ProjectMatch, type QASource } from "../lib/api";
import { recordConversation } from "../lib/conversations";
import MicButton from "./MicButton";

const NO_ANSWER_TEXT = "Insufficient evidence was found in the available recordings.";

type Turn = {
  id: string;
  input: string;
  phase: "pending" | "revealing" | "done" | "error";
  answer?: string;
  sources?: QASource[];
  matches?: ProjectMatch[];
};

/** Reveals real, already-fetched text progressively — no fabricated tokens. */
function StreamingAnswer({ text, onDone, onTick }: { text: string; onDone: () => void; onTick: () => void }) {
  const [shown, setShown] = useState("");

  useEffect(() => {
    const words = text.split(" ");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(words.slice(0, i).join(" "));
      onTick();
      if (i >= words.length) {
        clearInterval(id);
        onDone();
      }
    }, 26);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const isNoAnswer = shown === text && text === NO_ANSWER_TEXT;

  return (
    <p className={`text-[16px] leading-[1.6] ${isNoAnswer ? "italic text-rhino/45" : "text-rhino"}`}>
      {shown}
      {shown.length < text.length && <span className="animate-pulse text-indigo">▍</span>}
    </p>
  );
}

function SourceChips({ sources }: { sources: QASource[] }) {
  if (sources.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {sources.map((s, i) => (
        <Link
          key={i}
          to={`/?highlight=${s.recording_id}`}
          className="group flex items-center gap-1.5 rounded-full bg-indigo-50 py-1 pl-2 pr-3 text-[12px] text-indigo-600 transition-colors hover:bg-indigo hover:text-white"
        >
          <Clock size={11} className="opacity-70 group-hover:opacity-100" />
          <span className="max-w-[13rem] truncate">{s.file_name}</span>
          <span className="opacity-70">
            {formatTimestamp(s.start_timestamp)}–{formatTimestamp(s.end_timestamp)}
          </span>
        </Link>
      ))}
    </div>
  );
}

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.3, ease: "easeOut" as const },
  }),
};

/** Matches are already fetched — this is a quick 100ms-staggered entrance, not a fabricated wait. */
function MatchResults({ matches }: { matches: ProjectMatch[] }) {
  if (matches.length === 0) {
    return <p className="text-[15px] text-rhino/45">No comparable past engagements found.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {matches.map((m, i) => (
        <motion.div
          key={m.recording_id}
          custom={i}
          initial="hidden"
          animate="show"
          variants={cardVariants}
          className="card-hover rounded-xl border border-border-card bg-white p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <Link
              to={`/?highlight=${m.recording_id}`}
              className="text-[16px] font-semibold text-rhino transition-colors hover:text-indigo"
            >
              {m.title}
            </Link>
            <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[12px] font-medium text-indigo-600">
              {Math.round(m.relevance_score * 100)}%
            </span>
          </div>
          <p className="mt-1.5 text-[14px] leading-[1.6] text-rhino/60">{m.problem_summary}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {m.topics.slice(0, 3).map((t) => (
              <span key={t} className="rounded-full bg-canvas px-2 py-0.5 text-[12px] text-rhino/50">
                {t}
              </span>
            ))}
            <span className="flex items-center gap-1 text-[12px] text-rhino/40">
              <Clock size={10} /> {formatTimestamp(m.timestamp)}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function PendingOrb({ mode, phase }: { mode: "qa" | "match"; phase: "searching" | "solving" }) {
  const label =
    mode === "match" ? "Searching the library…" : phase === "searching" ? "Searching the library…" : "Composing an answer…";
  return (
    <div className="flex items-center gap-3">
      <ThinkingOrb state={mode === "match" ? "searching" : phase} size={64} theme="light" aria-label={label} />
      <span className="text-[14px] text-rhino/45">{label}</span>
    </div>
  );
}

export default function AgentPanel({
  mode,
  emptyHeadline,
  emptySubtitle,
  placeholder,
  inputVariant = "input",
}: {
  mode: "qa" | "match";
  emptyHeadline: string;
  emptySubtitle: string;
  placeholder: string;
  inputVariant?: "input" | "textarea";
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingPhase, setPendingPhase] = useState<"searching" | "solving">("searching");
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [turns.length]);

  const followReveal = () => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  const submit = async () => {
    const q = input.trim();
    if (!q || busy) return;
    const id = crypto.randomUUID();
    setInput("");
    setBusy(true);
    setPendingPhase("searching");
    const isFirst = turns.length === 0;
    setTurns((t) => [...t, { id, input: q, phase: "pending" }]);
    if (isFirst) recordConversation(mode === "qa" ? "ask" : "match", q);

    // The backend does search -> generate as one call; this timer is a
    // best-effort approximation of that real transition (embedding+vector
    // search is consistently the faster half), not a claim of exact timing.
    const solvingTimer = mode === "qa" ? setTimeout(() => setPendingPhase("solving"), 900) : null;

    try {
      if (mode === "qa") {
        const res = await api.ask(q);
        setTurns((t) =>
          t.map((x) => (x.id === id ? { ...x, phase: "revealing", answer: res.answer, sources: res.sources } : x))
        );
      } else {
        const res = await api.matchProject(q);
        setTurns((t) => t.map((x) => (x.id === id ? { ...x, phase: "done", matches: res.matches } : x)));
      }
    } catch {
      setTurns((t) =>
        t.map((x) => (x.id === id ? { ...x, phase: "error", answer: "Couldn't reach the library. Try again." } : x))
      );
    } finally {
      if (solvingTimer) clearTimeout(solvingTimer);
      setBusy(false);
    }
  };

  const InputBar = (
    <div className={`flex items-end gap-2 rounded-2xl border border-border-card bg-white p-2 shadow-sm ${inputVariant === "textarea" ? "flex-col items-stretch" : ""}`}>
      {inputVariant === "textarea" ? (
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          rows={4}
          className="w-full resize-none bg-transparent px-3 py-2 text-[15px] leading-[1.6] text-rhino outline-none placeholder:text-rhino/35"
        />
      ) : (
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={placeholder}
          aria-label={emptyHeadline}
          className="flex-1 bg-transparent px-3 py-2.5 text-[15px] text-rhino outline-none placeholder:text-rhino/35"
        />
      )}
      <div className={`flex items-center gap-1 ${inputVariant === "textarea" ? "justify-end px-1 pb-1" : ""}`}>
        <MicButton onText={setInput} />
        <button
          onClick={submit}
          disabled={busy || !input.trim()}
          aria-label={mode === "qa" ? "Ask" : "Search"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo text-white transition hover:brightness-110 disabled:bg-rhino/15 disabled:text-rhino/30"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );

  if (turns.length === 0) {
    return (
      <div className="page-enter mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-6">
        <ThinkingOrb state="breathing" size={64} theme="light" paused={false} aria-label="Recall, idle" />
        <h1 className="mt-4 text-center text-[34px] font-bold leading-tight tracking-tight text-rhino md:text-[40px]">
          {emptyHeadline}
        </h1>
        <p className="mt-2 max-w-md text-center text-[15px] leading-[1.6] text-rhino/50">{emptySubtitle}</p>
        <div className="mt-8 w-full">{InputBar}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col px-4 md:px-8">
      <div ref={threadRef} className="scrollbar-thin flex-1 overflow-y-auto py-6">
        <div className="flex flex-col gap-8">
          {turns.map((t) => (
            <div key={t.id} className="flex flex-col gap-3">
              <p className="text-[15px] font-medium text-rhino/70">{t.input}</p>

              {t.phase === "pending" && <PendingOrb mode={mode} phase={pendingPhase} />}

              {(t.phase === "revealing" || t.phase === "done") && mode === "qa" && t.answer !== undefined && (
                <>
                  {t.phase === "revealing" ? (
                    <StreamingAnswer
                      text={t.answer}
                      onTick={followReveal}
                      onDone={() => setTurns((ts) => ts.map((x) => (x.id === t.id ? { ...x, phase: "done" } : x)))}
                    />
                  ) : (
                    <p className={`text-[16px] leading-[1.6] ${t.answer === NO_ANSWER_TEXT ? "italic text-rhino/45" : "text-rhino"}`}>
                      {t.answer}
                    </p>
                  )}
                  {t.phase === "done" && <SourceChips sources={t.sources ?? []} />}
                </>
              )}

              {t.phase === "done" && mode === "match" && t.matches && <MatchResults matches={t.matches} />}

              {t.phase === "error" && <p className="text-[15px] text-red-600">{t.answer}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="pb-6 pt-2">{InputBar}</div>
    </div>
  );
}
