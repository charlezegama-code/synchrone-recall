import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ThinkingOrb } from "thinking-orbs";
import { Mic, Square, ArrowRight, AlertCircle, Check } from "lucide-react";
import { api, type PipelineStage } from "../lib/api";
import { useConversations } from "../lib/conversations";
import { isSpeechRecognitionSupported, startDictation, type DictationHandle } from "../lib/speech";
import { useIsMobile } from "../lib/useIsMobile";
import AudioVisualizerOrb from "../components/AudioVisualizerOrb";

type Phase = "idle" | "recording" | "processing" | "result" | "error";

const STEPS: { stage: PipelineStage; orb: "working" | "composing" | "connecting" | "solving"; label: string }[] = [
  { stage: "cleaning", orb: "working", label: "Cleaning transcript…" },
  { stage: "analyzing", orb: "composing", label: "Extracting topics & summary…" },
  { stage: "chunking", orb: "connecting", label: "Chunking & indexing…" },
  { stage: "embedding", orb: "solving", label: "Embedding into knowledge base…" },
];

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function Record() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [result, setResult] = useState<{ title: string; topics: string[]; problem_summary: string } | null>(null);
  const isMobile = useIsMobile();
  const { record } = useConversations();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const dictationRef = useRef<DictationHandle | null>(null);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      dictationRef.current?.stop();
      if (timerRef.current) window.clearInterval(timerRef.current);
    },
    []
  );

  const start = async () => {
    setErrorMsg(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setErrorMsg("This browser doesn't support in-browser recording (needs getUserMedia + MediaRecorder).");
      setPhase("error");
      return;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = s;
      setStream(s);

      chunksRef.current = [];
      const recorder = new MediaRecorder(s);
      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      recorder.onstop = () => handleStopped(recorder.mimeType || "audio/webm");
      mediaRecorderRef.current = recorder;
      recorder.start();

      setLiveTranscript("");
      // On-device live captions for in-the-room feedback only. The transcript
      // that gets stored/indexed is the server-side Whisper pass after Stop.
      if (isSpeechRecognitionSupported()) {
        dictationRef.current = startDictation(setLiveTranscript, () => {});
      }

      setElapsed(0);
      timerRef.current = window.setInterval(() => setElapsed((v) => v + 1), 1000);
      setPhase("recording");
    } catch {
      setErrorMsg("Microphone access was denied or unavailable. Check your browser's permission settings.");
      setPhase("error");
    }
  };

  const stop = () => {
    dictationRef.current?.stop();
    if (timerRef.current) window.clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setStream(null);
  };

  const handleStopped = async (mimeType: string) => {
    setPhase("processing");
    setCurrentStepIndex(0);
    const blob = new Blob(chunksRef.current, { type: mimeType });
    const ext = mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : "webm";
    const file = new File([blob], `recording-${Date.now()}.${ext}`, { type: mimeType });
    try {
      const res = await api.upload(file);
      setRecordingId(res.id);
      poll(res.id);
    } catch {
      setErrorMsg("Upload failed. The recording wasn't saved.");
      setPhase("error");
    }
  };

  const poll = (id: string) => {
    const interval = window.setInterval(async () => {
      try {
        const detail = await api.getRecording(id);
        const status = detail.recording?.status;
        const stage: PipelineStage = detail.recording?.stage ?? null;
        if (status === "failed") {
          window.clearInterval(interval);
          setErrorMsg("Processing failed on the server. Check the recording in the Library.");
          setPhase("error");
          return;
        }
        if (status === "processed") {
          window.clearInterval(interval);
          setCurrentStepIndex(STEPS.length);
          setResult({
            title: detail.analysis?.title ?? "Untitled recording",
            topics: detail.analysis?.topics ?? [],
            problem_summary: detail.analysis?.problem_summary ?? "",
          });
          record("ask", detail.analysis?.title ?? "Recorded meeting");
          setPhase("result");
          return;
        }
        const idx = STEPS.findIndex((s) => s.stage === stage);
        setCurrentStepIndex(idx >= 0 ? idx : 0);
      } catch {
        /* transient — keep polling */
      }
    }, 1000);
  };

  const orbSize = isMobile ? 140 : 200;

  if (phase === "idle") {
    return (
      <div className="page-enter mx-auto flex h-full max-w-lg flex-col items-center justify-center px-6 text-center">
        <AudioVisualizerOrb
          size={orbSize}
          mode="dormant"
          fallback={
            <div className="flex items-center justify-center rounded-full bg-indigo-50 text-indigo" style={{ width: orbSize, height: orbSize }}>
              <Mic size={orbSize / 4} />
            </div>
          }
        />
        <h1 className="mt-6 text-[36px] font-bold leading-[1.1] tracking-tight text-rhino md:text-[44px]">Record a meeting</h1>
        <p className="mt-3 max-w-sm text-[15px] leading-[1.6] text-rhino/55">
          Start recording — Synchrone Recall will transcribe, analyse and index it automatically.
        </p>
        <button
          onClick={start}
          className="mt-8 flex min-h-[48px] items-center gap-2 rounded-full bg-rhino px-6 text-[15px] font-semibold text-white transition hover:brightness-110"
        >
          <Mic size={16} /> Start recording
        </button>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="page-enter mx-auto flex h-full max-w-lg flex-col items-center justify-center px-6 text-center">
        <AlertCircle size={32} className="text-red-500" />
        <p className="mt-4 text-[15px] leading-[1.6] text-rhino/70">{errorMsg}</p>
        <button
          onClick={() => {
            setPhase("idle");
            setErrorMsg(null);
          }}
          className="mt-6 min-h-[44px] rounded-full bg-rhino px-5 text-[14px] font-semibold text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  if (phase === "recording") {
    return (
      <div className="page-enter mx-auto flex h-full max-w-2xl flex-col px-5 py-6 md:px-6 md:py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-red-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> Recording
          </div>
          <div className="rounded-full bg-surface px-3 py-1 text-[15px] font-semibold tabular-nums text-rhino elev-1">{formatElapsed(elapsed)}</div>
        </div>

        <div className="mt-2 flex justify-center">
          <AudioVisualizerOrb
            size={orbSize}
            mode="active"
            stream={stream}
            fallback={<div className="flex items-center justify-center rounded-full bg-indigo/10 text-indigo" style={{ width: orbSize, height: orbSize }}><Mic size={40} /></div>}
          />
        </div>

        <div className="scrollbar-thin elev-1 mt-4 min-h-[120px] flex-1 overflow-y-auto rounded-2xl border border-border-card bg-surface p-5">
          <p className="text-[12px] font-medium text-rhino/40">Live transcript · on-device, for reference only</p>
          <p className="mt-2 text-[15px] leading-[1.6] text-rhino [overflow-wrap:anywhere]">
            {liveTranscript || <span className="text-rhino/35">Listening…</span>}
          </p>
          {!isSpeechRecognitionSupported() && (
            <p className="mt-2 text-[13px] text-rhino/35">
              Live captions aren't available in this browser — the real transcript is still generated server-side after you stop.
            </p>
          )}
        </div>

        <button
          onClick={stop}
          aria-label="Stop recording"
          className="mx-auto mt-6 flex min-h-[48px] items-center gap-2 rounded-full bg-rhino px-6 text-[15px] font-semibold text-white transition hover:brightness-110"
        >
          <Square size={15} /> Stop
        </button>
      </div>
    );
  }

  if (phase === "processing") {
    return (
      <div className="page-enter mx-auto flex h-full max-w-md flex-col items-center justify-center px-6">
        <h2 className="text-[26px] font-bold leading-[1.15] tracking-tight text-rhino">Processing your recording</h2>
        <div className="elev-1 mt-8 w-full space-y-1 rounded-2xl border border-border-card bg-surface p-3">
          {STEPS.map((step, i) => {
            const done = i < currentStepIndex;
            const active = i === currentStepIndex;
            return (
              <div key={step.stage} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${active ? "bg-surface-2" : ""}`}>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                  {done ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold text-white">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  ) : (
                    <ThinkingOrb state={step.orb} size={20} theme="light" paused={!active} />
                  )}
                </span>
                <span className={`text-[14px] ${done ? "text-rhino/70" : active ? "font-medium text-rhino" : "text-rhino/35"}`}>{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter mx-auto flex h-full max-w-lg flex-col items-center justify-center px-6 text-center">
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-gold">Recording indexed</p>
      <h2 className="mt-3 text-[32px] font-bold leading-[1.1] tracking-tight text-rhino md:text-[40px]">{result?.title}</h2>
      {result && result.topics.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {result.topics.map((t) => (
            <span key={t} className="rounded-full bg-indigo-50 px-2.5 py-1 text-[12px] font-medium text-indigo-600">
              {t}
            </span>
          ))}
        </div>
      )}
      <p className="mt-4 text-[15px] leading-[1.6] text-rhino/60">{result?.problem_summary}</p>
      <Link
        to={`/?highlight=${recordingId}`}
        className="mt-8 flex min-h-[48px] items-center gap-2 rounded-full bg-gold px-6 text-[15px] font-semibold text-white transition hover:brightness-110"
      >
        View in Library <ArrowRight size={15} />
      </Link>
    </div>
  );
}
