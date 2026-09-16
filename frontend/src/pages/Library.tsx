import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, formatDuration, type RecordingSummary } from "../lib/api";

const statusDot: Record<string, string> = {
  processed: "bg-emerald-600",
  processing: "bg-indigo animate-pulse",
  failed: "bg-red-500",
};

const statusLabel: Record<string, string> = {
  processed: "Processed",
  processing: "Processing",
  failed: "Failed",
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

  // Arriving from a source/match chip elsewhere: jump to that recording and
  // reuse the same highlight-sweep motion as a fresh upload — the app's one
  // reusable "something just happened here" cue.
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
    <div className="mx-auto max-w-4xl px-6 py-12 md:px-12 md:py-16">
      <div className="mb-12 flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-rhino md:text-5xl">Library</h1>

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
            className="font-mono text-[13px] text-indigo underline-offset-4 transition hover:underline disabled:opacity-50"
          >
            {uploading ? "uploading…" : "+ upload recording"}
          </button>
        </div>
      </div>

      {error && <div className="mb-8 text-sm text-red-600">{error}</div>}

      {recordings === null && <div className="font-mono text-sm text-rhino/40">Loading…</div>}

      {recordings?.length === 0 && (
        <div className="border-t border-hairline py-16 text-sm text-rhino/40">
          No recordings yet — upload one to get started.
        </div>
      )}

      <div className="border-t border-hairline">
        {recordings?.map((rec, i) => (
          <div
            key={rec.id}
            ref={(el) => {
              rowRefs.current[rec.id] = el;
            }}
            className={`grid grid-cols-[2.5rem_1fr] gap-x-4 gap-y-2 border-b border-hairline py-5 transition-colors hover:bg-black/[0.02] md:grid-cols-[3rem_1fr_11rem] ${
              flashId === rec.id ? "highlight-sweep" : ""
            }`}
          >
            <div className="font-mono text-sm text-rhino/30">{String(i + 1).padStart(2, "0")}</div>

            <div className="min-w-0">
              <h3 className="truncate text-[17px] font-semibold text-rhino">{rec.file_name}</h3>
              <p className="mt-1 line-clamp-2 max-w-xl text-[15px] leading-snug text-rhino/60">
                {rec.problem_summary ?? (rec.status === "processing" ? "Analyzing…" : "—")}
              </p>
              {rec.topics.length > 0 && (
                <p className="mt-2 font-mono text-[12px] text-rhino/40">{rec.topics.slice(0, 4).join("  ·  ")}</p>
              )}
            </div>

            <div className="col-span-2 flex items-center gap-4 font-mono text-[12px] text-rhino/45 md:col-span-1 md:flex-col md:items-end md:gap-1.5 md:text-right">
              <span className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${statusDot[rec.status] ?? statusDot.processing}`} />
                {statusLabel[rec.status] ?? rec.status}
              </span>
              <span>{formatDuration(rec.duration_seconds)}</span>
              <span>{new Date(rec.upload_date).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
