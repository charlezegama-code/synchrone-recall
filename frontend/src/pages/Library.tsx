import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, formatDuration, type RecordingSummary } from "../lib/api";
import StatusBadge from "../components/StatusBadge";

export default function Library() {
  const [recordings, setRecordings] = useState<RecordingSummary[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    api.listRecordings().then((r) => setRecordings(r.recordings)).catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    refresh();
    // Poll while anything is still processing so status flips to
    // processed/failed without a manual refresh.
    const interval = setInterval(() => {
      setRecordings((current) => {
        if (current?.some((r) => r.status === "processing")) refresh();
        return current;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      await api.upload(file);
      refresh();
    } catch (e) {
      setError("Upload failed. " + String(e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-rhino">Library</h1>
          <p className="mt-1 text-sm text-brand-rhino/60">
            Every recording is transcribed, timecoded, and analyzed automatically on upload.
          </p>
        </div>

        <div>
          <input
            ref={fileInput}
            type="file"
            accept="audio/*,video/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <button
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="rounded-lg bg-brand-indigo px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-indigo-dark disabled:opacity-60"
          >
            {uploading ? "Uploading…" : "Upload recording"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}

      {recordings === null && (
        <div className="text-sm text-brand-rhino/50">Loading library…</div>
      )}

      {recordings?.length === 0 && (
        <div className="rounded-xl border border-dashed border-brand-rhino/20 bg-white/50 py-16 text-center text-sm text-brand-rhino/50">
          No recordings yet — upload one to get started.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence>
          {recordings?.map((rec, i) => (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex flex-col justify-between rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5 transition-shadow hover:shadow-md"
            >
              <div>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="truncate text-sm font-semibold text-brand-rhino" title={rec.file_name}>
                    {rec.file_name}
                  </h3>
                  <StatusBadge status={rec.status} />
                </div>

                <p className="mb-3 line-clamp-3 text-xs leading-relaxed text-brand-rhino/60">
                  {rec.problem_summary ?? (rec.status === "processing" ? "Analyzing…" : "—")}
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {rec.topics.slice(0, 4).map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-brand-indigo-light px-2 py-0.5 text-[11px] font-medium text-brand-indigo-dark"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-3 text-xs text-brand-rhino/50">
                <span>{new Date(rec.upload_date).toLocaleDateString()}</span>
                <span>{formatDuration(rec.duration_seconds)}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
