import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ThinkingOrb } from "thinking-orbs";
import { Upload, Clock, Calendar, Search, XCircle } from "lucide-react";
import { api, formatDuration, type RecordingSummary } from "../lib/api";
import RecordingDetailModal from "../components/RecordingDetailModal";

export default function Library() {
  const [recordings, setRecordings] = useState<RecordingSummary[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
    }, 3000);
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

  const filtered = useMemo(() => {
    if (!recordings) return recordings;
    const q = query.trim().toLowerCase();
    if (!q) return recordings;
    return recordings.filter((r) => {
      const haystack = [r.title ?? r.file_name, r.problem_summary ?? "", ...r.topics].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [recordings, query]);

  return (
    <div className="page-enter mx-auto max-w-5xl px-6 py-10 md:px-10 md:py-14">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-bold tracking-tight text-rhino md:text-[38px]">Library</h1>
          <p className="mt-1 text-[15px] text-rhino/50">Every recording, auto-indexed on upload.</p>
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
            className="flex items-center gap-2 rounded-xl bg-indigo px-4 py-2.5 text-[14px] font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            <Upload size={15} />
            {uploading ? "Uploading…" : "Upload recording"}
          </button>
        </div>
      </div>

      <div className="mb-8 flex items-center gap-2 rounded-xl border border-border-card bg-white px-3.5 py-2.5">
        <Search size={15} className="text-rhino/35" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, topic, or summary…"
          className="flex-1 bg-transparent text-[14px] text-rhino outline-none placeholder:text-rhino/35"
        />
        {query && (
          <button onClick={() => setQuery("")} aria-label="Clear search">
            <XCircle size={15} className="text-rhino/30 hover:text-rhino/60" />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-600">{error}</div>
      )}

      {recordings === null && (
        <div className="flex items-center gap-3 text-[14px] text-rhino/40">
          <ThinkingOrb state="working" size={20} theme="light" /> Loading library…
        </div>
      )}

      {recordings?.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border-card bg-white/50 py-16 text-center text-[14px] text-rhino/40">
          No recordings yet — upload one to get started.
        </div>
      )}

      {recordings && recordings.length > 0 && filtered?.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border-card bg-white/50 py-16 text-center text-[14px] text-rhino/40">
          No recordings match “{query}”.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {filtered?.map((rec) => (
          <div
            key={rec.id}
            ref={(el: HTMLDivElement | null) => {
              rowRefs.current[rec.id] = el;
            }}
            role="button"
            tabIndex={0}
            onClick={() => setSelectedId(rec.id)}
            onKeyDown={(e) => e.key === "Enter" && setSelectedId(rec.id)}
            className={`card-hover flex cursor-pointer flex-col rounded-xl border border-border-card bg-white p-5 text-left ${
              flashId === rec.id ? "highlight-sweep" : ""
            }`}
          >
            <div className="mb-2.5 flex items-start justify-between gap-3">
              <h3 className="min-w-0 truncate text-[16px] font-semibold text-rhino">
                {rec.title ?? rec.file_name}
              </h3>
              {rec.status === "processed" && (
                <span className="flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Ready
                </span>
              )}
              {rec.status === "processing" && (
                <span className="flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-indigo">
                  <ThinkingOrb state="working" size={20} theme="light" /> Processing
                </span>
              )}
              {rec.status === "failed" && (
                <span className="flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-red-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Failed
                </span>
              )}
            </div>

            <p className="line-clamp-2 text-[14px] leading-[1.6] text-rhino/55">
              {rec.problem_summary ?? (rec.status === "processing" ? "Analyzing…" : "—")}
            </p>

            {rec.topics.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {rec.topics.slice(0, 3).map((t) => (
                  <span key={t} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[12px] text-indigo-600">
                    {t}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 flex items-center gap-4 border-t border-hairline pt-3 text-[12px] text-rhino/40">
              <span className="flex items-center gap-1">
                <Clock size={11} /> {formatDuration(rec.duration_seconds)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={11} /> {new Date(rec.upload_date).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {selectedId && <RecordingDetailModal id={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
