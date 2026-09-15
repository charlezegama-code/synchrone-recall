import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, formatTimestamp, type QAResult } from "../lib/api";

const NO_ANSWER_TEXT = "Insufficient evidence was found in the available recordings.";

export default function QA() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QAResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.ask(question.trim());
      setResult(res);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold text-brand-rhino">Ask the library</h1>
      <p className="mt-1 text-sm text-brand-rhino/60">
        Retrieves the 5 most relevant transcript chunks and answers strictly from that context.
      </p>

      <div className="mt-6 flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="e.g. How did we resolve the checkout latency issue?"
          className="flex-1 rounded-lg border border-black/10 bg-white px-4 py-3 text-sm text-brand-rhino shadow-sm outline-none focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/20"
        />
        <button
          onClick={ask}
          disabled={loading}
          className="rounded-lg bg-brand-indigo px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-indigo-dark disabled:opacity-60"
        >
          {loading ? "Thinking…" : "Ask"}
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={result.answer}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5"
          >
            <p
              className={`text-[15px] leading-relaxed ${
                result.answer === NO_ANSWER_TEXT ? "italic text-brand-rhino/50" : "text-brand-rhino"
              }`}
            >
              {result.answer}
            </p>

            {result.sources.length > 0 && (
              <div className="mt-5 border-t border-black/5 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-rhino/40">
                  Sources
                </p>
                <div className="flex flex-col gap-2">
                  {result.sources.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-brand-alabaster px-3 py-2 text-sm"
                    >
                      <span className="truncate text-brand-rhino/80">{s.file_name}</span>
                      <span className="ml-3 shrink-0 rounded-full bg-brand-indigo-light px-2 py-0.5 text-xs font-mono text-brand-indigo-dark">
                        {formatTimestamp(s.start_timestamp)} – {formatTimestamp(s.end_timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
