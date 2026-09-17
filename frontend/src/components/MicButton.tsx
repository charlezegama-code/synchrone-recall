import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
import { isSpeechRecognitionSupported, startDictation, type DictationHandle } from "../lib/speech";

export default function MicButton({ onText }: { onText: (text: string) => void }) {
  const [listening, setListening] = useState(false);
  const handleRef = useRef<DictationHandle | null>(null);
  const supported = isSpeechRecognitionSupported();

  useEffect(() => () => handleRef.current?.stop(), []);

  if (!supported) return null; // graceful degradation — no Web Speech API in this browser

  const toggle = () => {
    if (listening) {
      handleRef.current?.stop();
      handleRef.current = null;
      setListening(false);
      return;
    }
    const handle = startDictation(onText, () => {
      setListening(false);
      handleRef.current = null;
    });
    if (handle) {
      handleRef.current = handle;
      setListening(true);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={listening ? "Stop dictation" : "Dictate with your microphone"}
      aria-pressed={listening}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition ${
        listening ? "record-pulse bg-red-500 text-white" : "text-rhino/40 hover:bg-rhino/5 hover:text-rhino/70"
      }`}
    >
      <Mic size={16} />
    </button>
  );
}
