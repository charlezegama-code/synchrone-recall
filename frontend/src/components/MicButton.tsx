import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic } from "lucide-react";
import { isSpeechRecognitionSupported, startDictation, type DictationHandle } from "../lib/speech";
import { useIsMobile } from "../lib/useIsMobile";
import AudioVisualizerOrb from "./AudioVisualizerOrb";

type Phase = "idle" | "listening" | "collapsing";

/**
 * Mic button that becomes the 3D audio orb while dictating. The click target
 * stays a fixed 44px circle; the orb (80px desktop / 60px mobile) is layered
 * over it and allowed to overflow the input bar rather than reflow it.
 */
export default function MicButton({ onText }: { onText: (text: string) => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const handleRef = useRef<DictationHandle | null>(null);
  const supported = isSpeechRecognitionSupported();
  const isMobile = useIsMobile();
  const orbSize = isMobile ? 60 : 80;

  useEffect(() => () => handleRef.current?.stop(), []);

  if (!supported) return null;

  const stopListening = () => {
    handleRef.current?.stop();
    handleRef.current = null;
    setPhase("collapsing");
  };

  const toggle = () => {
    if (phase === "listening") {
      stopListening();
      return;
    }
    if (phase === "collapsing") return;
    const handle = startDictation(onText, () => {
      // Recognition ended on its own (silence / browser timeout).
      handleRef.current = null;
      setPhase((p) => (p === "listening" ? "collapsing" : p));
    });
    if (handle) {
      handleRef.current = handle;
      setPhase("listening");
    }
  };

  const showOrb = phase !== "idle";

  return (
    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
      <button
        type="button"
        onClick={toggle}
        aria-label={phase === "listening" ? "Stop dictation" : "Dictate with your microphone"}
        aria-pressed={phase === "listening"}
        className={`relative z-10 flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
          showOrb ? "text-transparent" : "text-rhino/45 hover:bg-rhino/5 hover:text-rhino/80"
        }`}
      >
        <Mic size={17} className={showOrb ? "opacity-0" : "opacity-100"} />
      </button>

      <AnimatePresence>
        {showOrb && (
          <motion.div
            key="orb"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
            style={{ width: orbSize, height: orbSize }}
          >
            <AudioVisualizerOrb
              size={orbSize}
              mode={phase === "listening" ? "active" : "collapsing"}
              onSettled={() => setPhase("idle")}
              fallback={<span className="flex h-full w-full items-center justify-center rounded-full bg-indigo text-white"><Mic size={16} /></span>}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
