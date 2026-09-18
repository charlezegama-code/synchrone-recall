import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThinkingOrb } from "thinking-orbs";
import { X, Clock, Calendar, Quote } from "lucide-react";
import { api, formatDuration, formatTimestamp, type RecordingDetail } from "../lib/api";

type Props = {
  id: string;
  onClose: () => void;
  /** When set (from a source chip), the matching transcript excerpt is pulled to the top and highlighted. */
  focusRange?: { start: number; end: number } | null;
};

export default function RecordingDetailModal({ id, onClose, focusRange }: Props) {
  const [detail, setDetail] = useState<RecordingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDetail(null);
    setError(null);
    api.getRecording(id).then(setDetail).catch((e) => setError(String(e)));
  }, [id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const title = detail?.analysis?.title ?? detail?.recording.file_name;
  const segments = detail?.transcript?.segments ?? [];
  const inRange = (s: { start: number; end: number }) =>
    !!focusRange && s.end >= focusRange.start && s.start <= focusRange.end;
  const excerpt = focusRange ? segments.filter(inRange) : [];

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-rhino-deep/50 px-4 py-6 backdrop-blur-sm md:py-10"
      >
        <motion.div
          key="panel"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          className="elev-2 w-full max-w-2xl overflow-hidden rounded-2xl bg-surface"
        >
          {!detail && !error && (
            <div className="flex items-center gap-3 p-10">
              <ThinkingOrb state="working" size={20} theme="light" />
              <span className="text-[14px] text-rhino/50">Loading recording…</span>
            </div>
          )}

          {error && (
            <div className="p-10">
              <p className="text-[14px] text-red-600">Couldn't load this recording. {error}</p>
              <button onClick={onClose} className="mt-4 text-[13px] font-medium text-indigo">
                Close
              </button>
            </div>
          )}

          {detail && (
            <>
              <div className="flex items-start justify-between gap-4 border-b border-hairline p-6">
                <div className="min-w-0">
                  <h2 className="text-[24px] font-bold leading-[1.15] tracking-tight text-rhino">{title}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-rhino/45">
                    <span className="flex items-center gap-1.5">
                      <Clock size={12} /> {formatDuration(detail.recording.duration_seconds)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar size={12} /> {new Date(detail.recording.upload_date).toLocaleDateString()}
                    </span>
                    <span className="max-w-full truncate text-rhino/30">{detail.recording.file_name}</span>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-rhino/40 transition hover:bg-canvas hover:text-rhino"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="scrollbar-thin max-h-[65vh] overflow-y-auto p-6">
                {excerpt.length > 0 && (
                  <div className="mb-6 rounded-xl border-l-[3px] border-gold bg-gold-soft/60 p-4">
                    <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-gold">
                      <Quote size={12} /> Cited excerpt · {formatTimestamp(focusRange!.start)}–{formatTimestamp(focusRange!.end)}
                    </p>
                    <p className="text-[15px] leading-[1.6] text-rhino">{excerpt.map((s) => s.text).join(" ")}</p>
                  </div>
                )}

                {detail.analysis && (
                  <>
                    {detail.analysis.topics.length > 0 && (
                      <div className="mb-5 flex flex-wrap gap-1.5">
                        {detail.analysis.topics.map((t) => (
                          <span key={t} className="rounded-full bg-indigo-50 px-2.5 py-1 text-[12px] font-medium text-indigo-600">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-[15px] leading-[1.6] text-rhino/75">{detail.analysis.problem_summary}</p>

                    {detail.analysis.key_entities.length > 0 && (
                      <div className="mt-4">
                        <p className="text-[13px] font-medium text-rhino/40">Key entities</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {detail.analysis.key_entities.map((e) => (
                            <span key={e} className="rounded-full bg-canvas px-2.5 py-1 text-[12px] text-rhino/55">
                              {e}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {segments.length > 0 && (
                  <div className="mt-6 border-t border-hairline pt-5">
                    <p className="mb-3 text-[13px] font-medium text-rhino/40">Transcript</p>
                    <div className="flex flex-col gap-3">
                      {segments.map((s, i) => (
                        <div key={i} className={`flex gap-3 rounded-lg ${inRange(s) ? "-mx-2 bg-gold-soft/70 px-2 py-1.5" : ""}`}>
                          <span className="mt-0.5 shrink-0 rounded-full bg-canvas px-2 py-0.5 text-[11px] text-rhino/40">
                            {formatTimestamp(s.start)}
                          </span>
                          <p className="min-w-0 text-[14px] leading-[1.6] text-rhino/65">{s.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!detail.analysis && !detail.transcript && (
                  <p className="text-[14px] text-rhino/45">Still processing — details will appear once ready.</p>
                )}
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
