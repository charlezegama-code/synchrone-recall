import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, formatTimestamp, type ProjectMatch } from "../lib/api";

export default function NewProject() {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<ProjectMatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!description.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.matchProject(description.trim());
      setMatches(res.matches);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold text-brand-rhino">New project</h1>
      <p className="mt-1 text-sm text-brand-rhino/60">
        Paste a project brief. We surface past engagements that faced a similar problem — before anyone
        has to search for them.
      </p>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={5}
        placeholder="e.g. Client wants to migrate their legacy monolith to microservices ahead of a Black Friday traffic spike, and their team keeps escalating around deployment rollbacks…"
        className="mt-6 w-full resize-none rounded-lg border border-black/10 bg-white px-4 py-3 text-sm text-brand-rhino shadow-sm outline-none focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/20"
      />

      <button
        onClick={run}
        disabled={loading}
        className="mt-3 rounded-lg bg-brand-indigo px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-indigo-dark disabled:opacity-60"
      >
        {loading ? "Searching past engagements…" : "Find similar engagements"}
      </button>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-8 flex flex-col gap-3">
        <AnimatePresence>
          {matches?.map((m, i) => (
            <motion.div
              key={m.recording_id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-rhino text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <h3 className="text-sm font-semibold text-brand-rhino">{m.file_name}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-brand-rhino/70">{m.problem_summary}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {m.topics.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-brand-indigo-light px-2 py-0.5 text-[11px] font-medium text-brand-indigo-dark"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="rounded-full bg-brand-alabaster px-2.5 py-1 text-xs font-mono font-semibold text-brand-rhino/70 ring-1 ring-black/5">
                    {Math.round(m.relevance_score * 100)}% match
                  </span>
                  <span className="rounded-full bg-brand-indigo-light px-2.5 py-1 text-xs font-mono text-brand-indigo-dark">
                    at {formatTimestamp(m.timestamp)}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {matches?.length === 0 && (
          <div className="rounded-xl border border-dashed border-brand-rhino/20 bg-white/50 py-12 text-center text-sm text-brand-rhino/50">
            No comparable past engagements found in the library.
          </div>
        )}
      </div>
    </div>
  );
}
