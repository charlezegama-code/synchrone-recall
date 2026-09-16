import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Clock, Calendar, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { api, formatDuration, type RecordingSummary } from "../lib/api";

const statusMeta: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  processed: { label: "Processed", className: "bg-emerald-50 text-emerald-600", icon: CheckCircle2 },
  processing: { label: "Processing", className: "bg-indigo-50 text-indigo-600", icon: Loader2 },
  failed: { label: "Failed", className: "bg-red-50 text-red-600", icon: XCircle },
};

export default function Library() {
  const [recordings, setRecordings] = useState<RecordingSummary[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [params] = useSearchParams();
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const refresh = useCallback(() => {
    api.listRecordings().then((r) => setRecordings(r.recordings)).catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(() => {
      setRecordings((current) => {
        if (current?.some((r) => r.status === "processing")) refresh();
        return current;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    const target = params.get("highlight");
    if (!target || !recordings) return;
    const el = rowRefs.current[target];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashId(target);
    const t = setTimeout(() => setFlashId(null), 1800);
    return () => clearTimeout(t);
  }, [params, recordings]);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const res = await api.upload(file);
      refresh();
      setFlashId(res.id);
      setTimeout(() => setFlashId(null), 1800);
    } catch (e) {
      setError("Upload failed. " + String(e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 md:px-10 md:py-14">
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-rhino md:text-4xl">Library</h1>
          <p className="mt-1 text-[14.5px] text-rhino/50">Every recording, auto-indexed on upload.</p>
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
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo to-indigo-600 px-4 py-2.5 text-[14px] font-semibold text-white shadow-md shadow-indigo/20 transition hover:brightness-110 disabled:opacity-60"
          >
            <Upload size={15} />
            {uploading ? "Uploading…" : "Upload recording"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-600 ring-1 ring-red-100">
          {error}
        </div>
      )}

      {recordings === null && <div className="text-[14px] text-rhino/40">Loading…</div>}

      {recordings?.length === 0 && (
        <div className="rounded-2xl border border-dashed border-rhino/15 bg-white/50 py-16 text-center text-[14px] text-rhino/40">
          No recordings yet — upload one to get started.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AnimatePresence>
          {recordings?.map((rec, i) => {
            const meta = statusMeta[rec.status] ?? statusMeta.processing;
            const StatusIcon = meta.icon;
            return (
              <motion.div
                key={rec.id}
                ref={(el: HTMLDivElement | null) => {
                  rowRefs.current[rec.id] = el;
                }}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.4), ease: "easeOut" }}
                whileHover={{ y: -2 }}
                className={`flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 transition-shadow hover:shadow-md ${
                  flashId === rec.id ? "highlight-sweep" : ""
                }`}
              >
                <div className="mb-2.5 flex items-start justify-between gap-3">
                  <h3 className="min-w-0 truncate text-[15.5px] font-semibold text-rhino">{rec.file_name}</h3>
                  <span
                    className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${meta.className}`}
                  >
                    <StatusIcon size={11} className={rec.status === "processing" ? "animate-spin" : ""} />
                    {meta.label}
                  </span>
                </div>

                <p className="line-clamp-2 text-[13.5px] leading-relaxed text-rhino/55">
                  {rec.problem_summary ?? (rec.status === "processing" ? "Analyzing…" : "—")}
                </p>

                {rec.topics.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {rec.topics.slice(0, 3).map((t) => (
                      <span key={t} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-600">
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex items-center gap-4 border-t border-hairline pt-3 font-mono text-[11.5px] text-rhino/40">
                  <span className="flex items-center gap-1">
                    <Clock size={11} /> {formatDuration(rec.duration_seconds)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={11} /> {new Date(rec.upload_date).toLocaleDateString()}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
