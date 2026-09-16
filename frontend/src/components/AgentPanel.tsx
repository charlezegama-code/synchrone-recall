import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api, formatTimestamp, type ProjectMatch, type QASource } from "../lib/api";

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
    }, 28);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const isNoAnswer = shown === text && text === NO_ANSWER_TEXT;

  return (
    <p className={`text-[19px] leading-snug ${isNoAnswer ? "text-rhino/45 italic" : "text-rhino"}`}>
      {shown}
      {shown.length < text.length && <span className="animate-pulse text-indigo">▍</span>}
    </p>
  );
}

function SourceChips({ sources }: { sources: QASource[] }) {
  if (sources.length === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {sources.map((s, i) => (
        <Link
          key={i}
          to={`/?highlight=${s.recording_id}`}
          className="rounded-sm border border-hairline px-2 py-1 font-mono text-[12px] text-rhino/60 transition-colors hover:border-indigo hover:text-indigo"
        >
          {s.file_name}{" "}
          <span className="text-indigo/70">
            {formatTimestamp(s.start_timestamp)}–{formatTimestamp(s.end_timestamp)}
          </span>
        </Link>
      ))}
    </div>
  );
}

/** Matches reveal one at a time in a single choreographed sequence, not five independent fades. */
function MatchReveal({
  matches,
  onDone,
  onTick,
}: {
  matches: ProjectMatch[];
  onDone: () => void;
  onTick: () => void;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (count >= matches.length) {
      onDone();
      return;
    }
    const t = setTimeout(() => {
      setCount((c) => c + 1);
      onTick();
    }, 420);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, matches.length]);

  return (
    <div className="mt-1 flex flex-col">
      <AnimatePresence>
        {matches.slice(0, count).map((m, i) => (
          <motion.div
            key={m.recording_id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex items-baseline gap-4 border-t border-hairline py-4 first:border-t-0"
          >
            <span className="font-mono text-2xl text-rhino/25">{String(i + 1).padStart(2, "0")}</span>
            <div className="min-w-0 flex-1">
              <Link
                to={`/?highlight=${m.recording_id}`}
                className="text-[16px] font-semibold text-rhino transition-colors hover:text-indigo"
              >
                {m.file_name}
              </Link>
              <p className="mt-1 text-[15px] leading-snug text-rhino/60">{m.problem_summary}</p>
              <p className="mt-2 font-mono text-[12px] text-rhino/40">
                {Math.round(m.relevance_score * 100)}% relevance · at {formatTimestamp(m.timestamp)}
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function PendingIndicator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="h-px w-5 bg-indigo pulse-rule" />
      <span className="font-mono text-[13px] text-rhino/40">{label}</span>
    </div>
  );
}

export default function AgentPanel({
  mode,
  title,
  subtitle,
  placeholder,
}: {
  mode: "qa" | "match";
  title: string;
  subtitle: string;
  placeholder: string;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  // Follows the reveal as it grows, instead of scrolling once and letting
  // later content build up out of view.
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
    setTurns((t) => [...t, { id, input: q, phase: "pending" }]);

    try {
      if (mode === "qa") {
        const res = await api.ask(q);
        setTurns((t) =>
          t.map((x) => (x.id === id ? { ...x, phase: "revealing", answer: res.answer, sources: res.sources } : x))
        );
      } else {
        const res = await api.matchProject(q);
        setTurns((t) => (t.map((x) => (x.id === id ? { ...x, phase: "revealing", matches: res.matches } : x))));
      }
    } catch {
      setTurns((t) =>
        t.map((x) => (x.id === id ? { ...x, phase: "error", answer: "Couldn't reach the library. Try again." } : x))
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col px-6 md:px-12">
      <div className="pt-12 pb-8 md:pt-16">
        <h1 className="text-4xl font-extrabold tracking-tight text-rhino md:text-5xl">{title}</h1>
        <p className="mt-2 max-w-md text-[15px] text-rhino/55">{subtitle}</p>
      </div>

      <div ref={threadRef} className="scrollbar-thin flex-1 overflow-y-auto">
        {turns.length === 0 && <p className="font-mono text-[13px] text-rhino/35">Nothing asked yet.</p>}

        <div className="flex flex-col gap-10 pb-8">
          {turns.map((t) => (
            <div key={t.id}>
              <p className="text-[13px] font-medium text-rhino/45">{t.input}</p>

              <div className="mt-3">
                {t.phase === "pending" && (
                  <PendingIndicator label={mode === "qa" ? "Thinking" : "Searching the library…"} />
                )}

                {(t.phase === "revealing" || t.phase === "done") && mode === "qa" && t.answer !== undefined && (
                  <>
                    {t.phase === "revealing" ? (
                      <StreamingAnswer
                        text={t.answer}
                        onTick={followReveal}
                        onDone={() => setTurns((ts) => ts.map((x) => (x.id === t.id ? { ...x, phase: "done" } : x)))}
                      />
                    ) : (
                      <p
                        className={`text-[19px] leading-snug ${
                          t.answer === NO_ANSWER_TEXT ? "text-rhino/45 italic" : "text-rhino"
                        }`}
                      >
                        {t.answer}
                      </p>
                    )}
                    {t.phase === "done" && <SourceChips sources={t.sources ?? []} />}
                  </>
                )}

                {(t.phase === "revealing" || t.phase === "done") && mode === "match" && t.matches && (
                  <>
                    {t.matches.length === 0 ? (
                      <p className="text-[15px] text-rhino/45">No comparable past engagements found.</p>
                    ) : (
                      <MatchReveal
                        matches={t.matches}
                        onTick={followReveal}
                        onDone={() => setTurns((ts) => ts.map((x) => (x.id === t.id ? { ...x, phase: "done" } : x)))}
                      />
                    )}
                  </>
                )}

                {t.phase === "error" && <p className="text-[15px] text-red-600">{t.answer}</p>}
              </div>
            </div>
          ))}
        </div>
        <div ref={endRef} />
      </div>

      <div className="border-t border-hairline py-6">
        <div className="flex items-end gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={placeholder}
            aria-label={title}
            className="flex-1 border-b border-hairline bg-transparent py-2 text-[16px] text-rhino outline-none placeholder:text-rhino/35 focus:border-rhino"
          />
          <button
            onClick={submit}
            disabled={busy || !input.trim()}
            className="shrink-0 bg-rhino px-5 py-2.5 text-[14px] font-medium text-white transition-opacity disabled:opacity-30"
          >
            {mode === "qa" ? "Ask" : "Search"}
          </button>
        </div>
      </div>
    </div>
  );
}
