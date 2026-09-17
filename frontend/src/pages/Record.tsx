import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ThinkingOrb } from "thinking-orbs";
import { Mic, Square, ArrowRight, AlertCircle } from "lucide-react";
import { api, type PipelineStage } from "../lib/api";
import { recordConversation } from "../lib/conversations";
import { isSpeechRecognitionSupported, startDictation, type DictationHandle } from "../lib/speech";

type Phase = "idle" | "recording" | "processing" | "result" | "error";

const STEPS: { stage: PipelineStage; orb: any; label: string }[] = [
  { stage: "cleaning", orb: "working", label: "Cleaning transcript…" },
  { stage: "analyzing", orb: "composing", label: "Extracting topics and summary…" },
  { stage: "chunking", orb: "connecting", label: "Chunking and indexing…" },
  { stage: "embedding", orb: "solving", label: "Embedding into knowledge base…" },
];

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Live canvas waveform driven by a Web Audio AnalyserNode on the mic stream. */
function Waveform({ stream }: { stream: MediaStream }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser); // not connected to destination — no playback/feedback

    const data = new Uint8Array(analyser.frequencyBinCount);
    let raf = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(data);
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      ctx.beginPath();
      ctx.strokeStyle = "#3F78C5";
      ctx.lineWidth = 2;
      const step = width / data.length;
      for (let i = 0; i < data.length; i++) {
        const y = (data[i] / 255) * height;
        const x = i * step;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      source.disconnect();
      audioCtx.close();
    };
  }, [stream]);

  return <canvas ref={canvasRef} width={640} height={96} className="w-full rounded-xl bg-white" />;
}

export default function Record() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [result, setResult] = useState<{ title: string; topics: string[]; problem_summary: string } | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const dictationRef = useRef<DictationHandle | null>(null);
  const timerRef = useRef<number | null>(null);

  const cleanupMedia = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    dictationRef.current?.stop();
    dictationRef.current = null;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };

  useEffect(() => () => cleanupMedia(), []);

  const start = async () => {
    setErrorMsg(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setErrorMsg("This browser doesn't support in-browser recording (needs getUserMedia + MediaRecorder).");
      setPhase("error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => handleStopped(recorder.mimeType || "audio/webm");
      mediaRecorderRef.current = recorder;
      recorder.start();

      setFinalTranscript("");
      setInterimTranscript("");
      // Live, on-device transcript — purely for feedback while recording.
      // The transcript that actually gets stored/indexed comes from the
      // server-side Whisper pass on the uploaded audio after Stop, which is
      // more accurate and works regardless of browser support.
      if (isSpeechRecognitionSupported()) {
        dictationRef.current = startDictation(
          (text) => setInterimTranscript(text),
          () => {}
        );
      }

      setElapsed(0);
      timerRef.current = window.setInterval(() => setElapsed((s) => s + 1), 1000);

      setPhase("recording");
    } catch {
      setErrorMsg("Microphone access was denied or unavailable. Check your browser's permission settings.");
      setPhase("error");
    }
  };

  const stop = () => {
    if (finalTranscript === "" && interimTranscript) setFinalTranscript(interimTranscript);
    dictationRef.current?.stop();
    if (timerRef.current) window.clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
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
          recordConversation("ask", detail.analysis?.title ?? "Recorded meeting");
          setPhase("result");
          return;
        }

        const idx = STEPS.findIndex((s) => s.stage === stage);
        setCurrentStepIndex(idx >= 0 ? idx : 0);
      } catch {
        // transient — keep polling, the interval will eventually succeed or the user can navigate away
      }
    }, 1000);
  };

  if (phase === "idle") {
    return (
      <div className="page-enter mx-auto flex h-full max-w-lg flex-col items-center justify-center px-6 text-center">
        <h1 className="text-[34px] font-bold tracking-tight text-rhino md:text-[40px]">Record a meeting</h1>
        <p className="mt-3 max-w-sm text-[15px] leading-[1.6] text-rhino/55">
          Start recording — Synchrone Recall will transcribe, analyse and index it automatically.
        </p>
        <button
          onClick={start}
          aria-label="Start recording"
          className="record-pulse mt-10 flex h-20 w-20 items-center justify-center rounded-full bg-red-500 text-white transition hover:brightness-110"
        >
          <Mic size={28} />
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
          className="mt-6 rounded-xl bg-rhino px-5 py-2.5 text-[14px] font-semibold text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  if (phase === "recording") {
    return (
      <div className="page-enter mx-auto flex h-full max-w-2xl flex-col px-6 py-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[15px] font-medium text-red-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> Recording
          </div>
          <div className="text-[15px] font-mono text-rhino/60">{formatElapsed(elapsed)}</div>
        </div>

        <div className="mt-6">{streamRef.current && <Waveform stream={streamRef.current} />}</div>

        <div className="scrollbar-thin mt-6 flex-1 overflow-y-auto rounded-xl border border-border-card bg-white p-5">
          <p className="text-[13px] font-medium text-rhino/40">Live transcript (on-device, for reference only)</p>
          <p className="mt-2 text-[15px] leading-[1.6]">
            <span className="text-rhino">{finalTranscript}</span>{" "}
            <span className="text-rhino/40">{interimTranscript}</span>
          </p>
          {!isSpeechRecognitionSupported() && (
            <p className="mt-2 text-[13px] text-rhino/35">
              Live captions aren't available in this browser — the real transcript is still generated
              server-side after you stop.
            </p>
          )}
        </div>

        <button
          onClick={stop}
          aria-label="Stop recording"
          className="mx-auto mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-rhino text-white transition hover:brightness-110"
        >
          <Square size={20} />
        </button>
      </div>
    );
  }

  if (phase === "processing") {
    return (
      <div className="page-enter mx-auto flex h-full max-w-lg flex-col items-center justify-center px-6">
        <h2 className="text-[22px] font-bold text-rhino">Processing your recording</h2>
        <div className="mt-8 w-full space-y-4">
          {STEPS.map((step, i) => {
            const done = i < currentStepIndex;
            const active = i === currentStepIndex;
            return (
              <div key={step.stage} className="flex items-center gap-3">
                <ThinkingOrb state={step.orb} size={20} theme="light" paused={!active} />
                <span className={`text-[14px] ${done ? "text-indigo" : active ? "text-rhino" : "text-rhino/35"}`}>
                  {step.label} {done && <span className="font-semibold">Done ✓</span>}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // result
  return (
    <div className="page-enter mx-auto flex h-full max-w-lg flex-col items-center justify-center px-6 text-center">
      <p className="text-[13px] font-medium text-indigo">Recording indexed</p>
      <h2 className="mt-2 text-[28px] font-bold leading-tight text-rhino">{result?.title}</h2>

      {result && result.topics.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {result.topics.map((t) => (
            <span key={t} className="rounded-full bg-indigo-50 px-2.5 py-1 text-[12px] text-indigo-600">
              {t}
            </span>
          ))}
        </div>
      )}

      <p className="mt-4 text-[15px] leading-[1.6] text-rhino/60">{result?.problem_summary}</p>

      <Link
        to={`/?highlight=${recordingId}`}
        className="mt-8 flex items-center gap-2 rounded-xl bg-indigo px-5 py-2.5 text-[14px] font-semibold text-white transition hover:brightness-110"
      >
        View in Library <ArrowRight size={15} />
      </Link>
    </div>
  );
}
