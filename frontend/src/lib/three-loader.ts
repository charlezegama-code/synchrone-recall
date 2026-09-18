// Three.js is loaded from the CDN at runtime and used through `window.THREE`,
// deliberately NOT bundled via npm — bundling it into the Worker's asset
// build bloated/broke the deploy. r128 is pinned because that's the CDN
// build we validated the Points/BufferGeometry API against.
const THREE_CDN = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";

let pending: Promise<any> | null = null;

export function loadThree(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if ((window as any).THREE) return Promise.resolve((window as any).THREE);
  if (pending) return pending;

  pending = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${THREE_CDN}"]`);
    const script = existing ?? document.createElement("script");
    const done = () => ((window as any).THREE ? resolve((window as any).THREE) : reject(new Error("THREE missing")));
    script.addEventListener("load", done, { once: true });
    script.addEventListener("error", () => reject(new Error("Three.js CDN failed to load")), { once: true });
    if (!existing) {
      script.src = THREE_CDN;
      script.async = true;
      document.head.appendChild(script);
    }
  });
  pending.catch(() => {
    pending = null; // allow a retry on the next mount
  });
  return pending;
}
