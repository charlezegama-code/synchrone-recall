import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ThinkingOrb } from "thinking-orbs";
import { Send, Clock, FolderOpen } from "lucide-react";
import { api, formatTimestamp, type ProjectMatch, type QASource } from "../lib/api";
import { useConversations } from "../lib/conversations";
import MicButton from "./MicButton";
import RecordingDetailModal from "./RecordingDetailModal";

const NO_ANSWER_TEXT = "Insufficient evidence was found in the available recordings.";

type Turn = {
  id: string;
  input: string;
  phase: "pending" | "revealing" | "done" | "error";
  answer?: string;
  sources?: QASource[];
  matches?: ProjectMatch[];
};

type Focus = { id: string; range: { start: number; end: number } | null };

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

function SourceChips({ sources, onOpen }: { sources: QASource[]; onOpen: (f: Focus) => void }) {
  if (sources.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {sources.map((s, i) => (
        <button
          key={i}
          onClick={() => onOpen({ id: s.recording_id, range: { start: s.start_timestamp, end: s.end_timestamp } })}
          className="group flex min-h-[44px] max-w-full items-center gap-1.5 rounded-full border border-border-card bg-surface-2 py-1 pl-2.5 pr-3 text-[12px] text-rhino/70 transition-colors hover:border-indigo hover:text-indigo md:min-h-[32px]"
        >
          <FolderOpen size={12} className="shrink-0 text-indigo" />
          <span className="truncate">{s.file_name}</span>
          <span className="shrink-0 text-rhino/40 group-hover:text-indigo/70">· {formatTimestamp(s.start_timestamp)}</span>
        </button>
      ))}
    </div>
  );
}

function RelevanceRing({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-12 w-12 shrink-0" aria-label={`${pct}% relevance`}>
      <svg viewBox="0 0 44 44" className="h-12 w-12 -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="var(--color-border-card)" strokeWidth="3.5" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="var(--color-indigo)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-rhino">{pct}%</span>
    </div>
  );
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.15, duration: 0.3, ease: "easeOut" as const } }),
};

/** Matches are already fetched — a 150ms-staggered entrance of real results, not a fabricated wait. */
function MatchResults({ matches, onOpen }: { matches: ProjectMatch[]; onOpen: (f: Focus) => void }) {
  if (matches.length === 0) return <p className="text-[15px] text-rhino/45">No comparable past engagements found.</p>;
  return (
    <div className="flex flex-col gap-3">
      {matches.map((m, i) => (
        <motion.div
          key={m.recording_id}
          custom={i}
          initial="hidden"
          animate="show"
          variants={cardVariants}
          className="card-hover elev-1 flex gap-4 rounded-xl border border-border-card bg-surface p-4"
        >
          <RelevanceRing value={m.relevance_score} />
          <div className="min-w-0 flex-1">
            <button
              onClick={() => onOpen({ id: m.recording_id, range: null })}
              className="text-left text-[16px] font-semibold leading-[1.2] text-rhino transition-colors hover:text-indigo"
            >
              {m.title}
            </button>
            <p className="mt-1.5 text-[14px] leading-[1.6] text-rhino/60">{m.problem_summary}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {m.topics.slice(0, 3).map((t) => (
                <span key={t} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[12px] font-medium text-indigo-600">
                  {t}
                </span>
              ))}
              <span className="flex items-center gap-1 rounded-full bg-canvas px-2 py-0.5 text-[12px] text-rhino/50">
                <Clock size={10} /> {formatTimestamp(m.timestamp)}
              </span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default function AgentPanel({
  mode,
  emptyHeadline,
  emptySubtitle,
  placeholder,
  inputVariant = "input",
  suggestions = [],
}: {
  mode: "qa" | "match";
  emptyHeadline: string;
  emptySubtitle: string;
  placeholder: string;
  inputVariant?: "input" | "textarea";
  suggestions?: string[];
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [focus, setFocus] = useState<Focus | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const { record } = useConversations();

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [turns.length]);

  const followReveal = () => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  const submit = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    const id = crypto.randomUUID();
    setInput("");
    setBusy(true);
    if (turns.length === 0) record(mode === "qa" ? "ask" : "match", q);
    setTurns((t) => [...t, { id, input: q, phase: "pending" }]);

    try {
      if (mode === "qa") {
        const res = await api.ask(q);
        setTurns((t) => t.map((x) => (x.id === id ? { ...x, phase: "revealing", answer: res.answer, sources: res.sources } : x)));
      } else {
        const res = await api.matchProject(q);
        setTurns((t) => t.map((x) => (x.id === id ? { ...x, phase: "done", matches: res.matches } : x)));
      }
    } catch {
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, phase: "error", answer: "Couldn't reach the library. Try again." } : x)));
    } finally {
      setBusy(false);
    }
  };

  const InputBar = (
    <div
      className={`focus-glow elev-1 flex gap-1 border border-border-card bg-surface transition ${
        inputVariant === "textarea" ? "flex-col rounded-2xl p-2" : "items-center rounded-full py-1 pl-4 pr-1"
      }`}
    >
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
          rows={turns.length === 0 ? 4 : 2}
          className="w-full resize-none bg-transparent px-3 py-2 text-[15px] leading-[1.6] text-rhino outline-none placeholder:text-rhino/35"
        />
      ) : (
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={placeholder}
          aria-label={emptyHeadline}
          className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] text-rhino outline-none placeholder:text-rhino/35"
        />
      )}
      <div className={`flex items-center gap-1 ${inputVariant === "textarea" ? "justify-end px-1 pb-1" : ""}`}>
        <MicButton onText={setInput} />
        <button
          onClick={() => submit()}
          disabled={busy || !input.trim()}
          aria-label={mode === "qa" ? "Ask" : "Search"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo text-white transition hover:brightness-110 disabled:bg-rhino/10 disabled:text-rhino/30"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );

  const modal = focus && <RecordingDetailModal id={focus.id} focusRange={focus.range} onClose={() => setFocus(null)} />;

  if (turns.length === 0) {
    return (
      <div className="page-enter mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-5 md:px-6">
        <h1 className="text-center text-[36px] font-bold leading-[1.1] tracking-tight text-rhino md:text-[52px]">{emptyHeadline}</h1>
        <p className="mt-3 max-w-md text-center text-[15px] leading-[1.6] text-rhino/50">{emptySubtitle}</p>
        <div className="mt-8 w-full">{InputBar}</div>
        {suggestions.length > 0 && (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => setInput(s)}
                className="min-h-[44px] rounded-full border border-border-card bg-surface px-3.5 py-1.5 text-[13px] text-rhino/70 transition hover:border-indigo hover:text-indigo md:min-h-[36px]"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {modal}
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col px-4 md:px-8">
      <div ref={threadRef} className="scrollbar-thin flex-1 overflow-y-auto py-6">
        <div className="flex flex-col gap-7">
          {turns.map((t) => (
            <div key={t.id} className="flex flex-col gap-3">
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-rhino px-4 py-2.5 text-[15px] leading-[1.5] text-white">{t.input}</div>
              </div>

              {t.phase === "pending" ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <ThinkingOrb state="searching" size={64} theme="light" aria-label="Searching the library" />
                  <span className="text-[13px] text-rhino/45">Searching the library…</span>
                </div>
              ) : (
                <div className="elev-1 rounded-2xl border border-border-card border-l-[3px] border-l-indigo bg-surface p-4 md:p-5">
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
                      {t.phase === "done" && <SourceChips sources={t.sources ?? []} onOpen={setFocus} />}
                    </>
                  )}
                  {t.phase === "done" && mode === "match" && t.matches && <MatchResults matches={t.matches} onOpen={setFocus} />}
                  {t.phase === "error" && <p className="text-[15px] text-red-600">{t.answer}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="pb-4 pt-2 md:pb-6">{InputBar}</div>
      {modal}
    </div>
  );
}
