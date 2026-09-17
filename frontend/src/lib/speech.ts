// Thin wrapper around the Web Speech API's SpeechRecognition. Chromium-only
// (Chrome/Edge) as of this writing — Safari and Firefox don't implement it,
// so every consumer must feature-detect via `isSpeechRecognitionSupported()`
// and degrade gracefully (hide/disable the mic control) rather than assume
// it's always available.
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

function getRecognitionCtor(): any {
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
}

export type DictationHandle = { stop: () => void };

/**
 * Starts continuous dictation. `onUpdate` fires on every interim and final
 * result with the full transcript accumulated so far in this session, so the
 * caller can just set it directly into a controlled input/textarea.
 */
export function startDictation(onUpdate: (text: string) => void, onEnd: () => void): DictationHandle | null {
  const Ctor = getRecognitionCtor();
  if (!Ctor) return null;

  const recognition = new Ctor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  let finalText = "";

  recognition.onresult = (event: any) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        finalText += result[0].transcript + " ";
      } else {
        interim += result[0].transcript;
      }
    }
    onUpdate((finalText + interim).trim());
  };

  recognition.onerror = () => onEnd();
  recognition.onend = () => onEnd();

  recognition.start();

  return { stop: () => recognition.stop() };
}
