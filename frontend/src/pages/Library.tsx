import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ThinkingOrb } from "thinking-orbs";
import { Upload, Clock, Calendar, Search, XCircle, Trash2 } from "lucide-react";
import { api, formatDuration, type RecordingSummary } from "../lib/api";
import RecordingDetailModal from "../components/RecordingDetailModal";

export default function Library() {
  const [recordings, setRecordings] = useState<RecordingSummary[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
    rowRefs.current[target]?.scrollIntoView({ behavior: "smooth", block: "center" });
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

  const handleDelete = async (rec: RecordingSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    const label = rec.title ?? rec.file_name;
    if (!window.confirm(`Delete "${label}"? This removes the recording, its transcript, and its analysis permanently.`)) return;
    setDeletingId(rec.id);
    try {
      await api.deleteRecording(rec.id);
      setRecordings((cur) => cur?.filter((r) => r.id !== rec.id) ?? cur);
      if (selectedId === rec.id) setSelectedId(null);
    } catch (err) {
      setError("Delete failed. " + String(err));
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = useMemo(() => {
    if (!recordings) return recordings;
    const q = query.trim().toLowerCase();
    if (!q) return recordings;
    return recordings.filter((r) =>
      [r.title ?? r.file_name, r.problem_summary ?? "", ...r.topics].join(" ").toLowerCase().includes(q)
    );
  }, [recordings, query]);

  return (
    <div className="page-enter mx-auto max-w-5xl px-5 py-8 md:px-10 md:py-14">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[36px] font-bold leading-[1.1] tracking-tight text-rhino md:text-[44px]">Library</h1>
          <p className="mt-2 text-[15px] leading-[1.6] text-rhino/50">Every recording, auto-indexed on upload.</p>
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
            className="flex min-h-[44px] items-center gap-2 rounded-full bg-indigo px-5 text-[14px] font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            <Upload size={15} />
            {uploading ? "Uploading…" : "Upload recording"}
          </button>
        </div>
      </div>

      <div className="focus-glow elev-1 mb-8 flex min-h-[48px] items-center gap-2.5 rounded-full border border-border-card bg-surface px-4">
        <Search size={16} className="shrink-0 text-rhino/35" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, topic, or summary…"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-rhino outline-none placeholder:text-rhino/35"
        />
        {query && (
          <button onClick={() => setQuery("")} aria-label="Clear search" className="flex h-8 w-8 items-center justify-center">
            <XCircle size={16} className="text-rhino/30 hover:text-rhino/60" />
          </button>
        )}
      </div>

      {error && <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-600">{error}</div>}

      {recordings === null && (
        <div className="flex items-center gap-3 text-[14px] text-rhino/40">
          <ThinkingOrb state="working" size={20} theme="light" /> Loading library…
        </div>
      )}

      {recordings?.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border-card bg-surface/60 py-16 text-center text-[14px] text-rhino/40">
          No recordings yet — upload one to get started.
        </div>
      )}

      {recordings && recordings.length > 0 && filtered?.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border-card bg-surface/60 py-16 text-center text-[14px] text-rhino/40">
          No recordings match “{query}”.
        </div>
      )}

      {/* Masonry: CSS columns so each card's height follows its content. */}
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [column-fill:_balance]">
        {filtered?.map((rec) => {
          const processing = rec.status === "processing";
          return (
            <div
              key={rec.id}
              ref={(el: HTMLDivElement | null) => {
                rowRefs.current[rec.id] = el;
              }}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedId(rec.id)}
              onKeyDown={(e) => e.key === "Enter" && setSelectedId(rec.id)}
              className={`card-hover elev-1 group mb-4 flex cursor-pointer break-inside-avoid flex-col rounded-2xl border border-border-card bg-surface p-5 text-left ${
                processing ? "shimmer" : ""
              } ${flashId === rec.id ? "highlight-sweep" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="min-w-0 text-[18px] font-bold leading-[1.2] tracking-tight text-rhino [overflow-wrap:anywhere]">
                  {rec.title ?? rec.file_name}
                </h3>
                <button
                  onClick={(e) => handleDelete(rec, e)}
                  disabled={deletingId === rec.id}
                  aria-label={`Delete ${rec.title ?? rec.file_name}`}
                  className="-mr-2 -mt-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-rhino/25 opacity-0 transition hover:bg-red-50 hover:text-red-500 focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-50 md:opacity-0 max-md:opacity-100"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {rec.topics.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {rec.topics.slice(0, 4).map((t) => (
                    <span key={t} className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[12px] font-medium text-indigo-600">
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <p className="mt-3 line-clamp-2 text-[14px] leading-[1.6] text-rhino/60">
                {rec.problem_summary ?? (processing ? "Transcribing and analysing…" : "—")}
              </p>

              <div className="mt-4 flex items-center justify-between border-t border-hairline pt-3 text-[12px] text-rhino/40">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Clock size={11} /> {formatDuration(rec.duration_seconds)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={11} /> {new Date(rec.upload_date).toLocaleDateString()}
                  </span>
                </div>
                {processing && (
                  <span className="flex items-center gap-1.5 font-medium text-indigo">
                    <ThinkingOrb state="working" size={20} theme="light" /> Processing
                  </span>
                )}
                {rec.status === "failed" && (
                  <span className="flex items-center gap-1.5 font-medium text-red-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Failed
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedId && <RecordingDetailModal id={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
