import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Clock, SearchCheck } from "lucide-react";
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

function AgentAvatar() {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo to-rhino text-white shadow-sm">
      <Sparkles size={15} strokeWidth={2} />
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      <span className="typing-dot h-2 w-2 rounded-full bg-indigo/70" style={{ animationDelay: "0ms" }} />
      <span className="typing-dot h-2 w-2 rounded-full bg-indigo/70" style={{ animationDelay: "150ms" }} />
      <span className="typing-dot h-2 w-2 rounded-full bg-indigo/70" style={{ animationDelay: "300ms" }} />
    </div>
  );
}

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
    <p className={`text-[15.5px] leading-relaxed ${isNoAnswer ? "italic text-rhino/45" : "text-rhino"}`}>
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
          className="group flex items-center gap-1.5 rounded-full bg-indigo-50 py-1 pl-2 pr-3 font-mono text-[11.5px] text-indigo-600 transition-colors hover:bg-indigo hover:text-white"
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

const rankAccent = ["border-indigo", "border-indigo/70", "border-indigo/50", "border-rhino/30", "border-rhino/20"];

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
    }, 380);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, matches.length]);

  return (
    <div className="mt-1 flex flex-col gap-3">
      <AnimatePresence>
        {matches.slice(0, count).map((m, i) => (
          <motion.div
            key={m.recording_id}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className={`rounded-2xl border-l-4 bg-white p-4 shadow-sm ring-1 ring-black/5 ${
              rankAccent[i] ?? "border-rhino/20"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <Link
                to={`/?highlight=${m.recording_id}`}
                className="text-[15px] font-semibold text-rhino transition-colors hover:text-indigo"
              >
                {m.file_name}
              </Link>
              <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 font-mono text-[11px] font-medium text-indigo-600">
                {Math.round(m.relevance_score * 100)}%
              </span>
            </div>
            <p className="mt-1.5 text-[14px] leading-relaxed text-rhino/60">{m.problem_summary}</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {m.topics.slice(0, 3).map((t) => (
                <span key={t} className="rounded-full bg-canvas px-2 py-0.5 font-mono text-[11px] text-rhino/45">
                  {t}
                </span>
              ))}
              <span className="flex items-center gap-1 rounded-full bg-canvas px-2 py-0.5 font-mono text-[11px] text-rhino/45">
                <Clock size={10} /> {formatTimestamp(m.timestamp)}
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
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
    setTurns((t) => [...t, { id, input: q, phase: "pending" }]);

    try {
      if (mode === "qa") {
        const res = await api.ask(q);
        setTurns((t) =>
          t.map((x) => (x.id === id ? { ...x, phase: "revealing", answer: res.answer, sources: res.sources } : x))
        );
      } else {
        const res = await api.matchProject(q);
        setTurns((t) => t.map((x) => (x.id === id ? { ...x, phase: "revealing", matches: res.matches } : x)));
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
    <div className="mx-auto flex h-full max-w-2xl flex-col px-4 md:px-8">
      <div className="flex items-center gap-3 pb-5 pt-8 md:pt-10">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo to-rhino text-white shadow-md shadow-indigo/20">
          {mode === "qa" ? <Sparkles size={20} /> : <SearchCheck size={20} />}
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-rhino">{title}</h1>
          <p className="text-[13.5px] text-rhino/50">{subtitle}</p>
        </div>
      </div>

      <div ref={threadRef} className="scrollbar-thin flex-1 overflow-y-auto pb-4">
        {turns.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo">
              {mode === "qa" ? <Sparkles size={20} /> : <SearchCheck size={20} />}
            </div>
            <p className="max-w-[15rem] text-[14px] text-rhino/40">
              {mode === "qa" ? "Ask anything about a past recording." : "Describe a new brief to get started."}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-5">
          {turns.map((t) => (
            <div key={t.id} className="flex flex-col gap-3">
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-md bg-indigo px-4 py-2.5 text-[15px] text-white shadow-sm">
                  {t.input}
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <AgentAvatar />
                <div className="min-w-0 flex-1 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm ring-1 ring-black/5">
                  {t.phase === "pending" && <TypingDots />}

                  {(t.phase === "revealing" || t.phase === "done") && mode === "qa" && t.answer !== undefined && (
                    <>
                      {t.phase === "revealing" ? (
                        <StreamingAnswer
                          text={t.answer}
                          onTick={followReveal}
                          onDone={() =>
                            setTurns((ts) => ts.map((x) => (x.id === t.id ? { ...x, phase: "done" } : x)))
                          }
                        />
                      ) : (
                        <p
                          className={`text-[15.5px] leading-relaxed ${
                            t.answer === NO_ANSWER_TEXT ? "italic text-rhino/45" : "text-rhino"
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
                        <p className="text-[14.5px] text-rhino/45">No comparable past engagements found.</p>
                      ) : (
                        <MatchReveal
                          matches={t.matches}
                          onTick={followReveal}
                          onDone={() =>
                            setTurns((ts) => ts.map((x) => (x.id === t.id ? { ...x, phase: "done" } : x)))
                          }
                        />
                      )}
                    </>
                  )}

                  {t.phase === "error" && <p className="text-[14.5px] text-red-600">{t.answer}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pb-6 pt-3">
        <div className="flex items-center gap-2 rounded-full bg-white py-1.5 pl-5 pr-1.5 shadow-md shadow-rhino/5 ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-indigo/25">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={placeholder}
            aria-label={title}
            className="flex-1 bg-transparent py-2 text-[15px] text-rhino outline-none placeholder:text-rhino/35"
          />
          <button
            onClick={submit}
            disabled={busy || !input.trim()}
            aria-label={mode === "qa" ? "Ask" : "Search"}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo text-white transition hover:brightness-110 disabled:bg-rhino/15 disabled:text-rhino/30"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
