import { useEffect, useRef, useState, type ReactNode } from "react";
import { loadThree } from "../lib/three-loader";

export type OrbMode = "dormant" | "active" | "collapsing";

type Props = {
  size: number;
  mode: OrbMode;
  /** Use this mic stream instead of acquiring one (Record page already owns it). */
  stream?: MediaStream | null;
  /** Fired once the particles have collapsed back to a perfect sphere in "collapsing" mode. */
  onSettled?: () => void;
  /** Rendered if Three.js fails to load or WebGL is unavailable. */
  fallback?: ReactNode;
  className?: string;
};

const PARTICLES = 500;
const BLUE = { r: 0x3f / 255, g: 0x78 / 255, b: 0xc5 / 255 };
const GOLD = { r: 0xc8 / 255, g: 0x93 / 255, b: 0x3a / 255 };
const DORMANT = { r: 0x2b / 255, g: 0x48 / 255, b: 0x7a / 255 };

function makeDotTexture(THREE: any) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  // Mostly-solid disc with a short anti-aliased edge: small points otherwise
  // end up being all falloff, which washes the vertex color out to grey on a
  // light background.
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.72, "rgba(255,255,255,1)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/**
 * ~500 particles on a Fibonacci sphere, driven by a real AnalyserNode on the
 * microphone. Amplitude pushes particles outward and shifts their color from
 * indigo toward gold; the sphere always rotates slowly on Y. Three.js comes
 * from the CDN as window.THREE (see three-loader.ts) — never bundled.
 */
export default function AudioVisualizerOrb({ size, mode, stream, onSettled, fallback, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");

  // Runtime knobs read by the render loop without re-creating the scene.
  const modeRef = useRef<OrbMode>(mode);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const settledFiredRef = useRef(false);
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  useEffect(() => {
    modeRef.current = mode;
    settledFiredRef.current = false;
  }, [mode]);

  useEffect(() => {
    let cancelled = false;
    loadThree()
      .then(() => !cancelled && setStatus("ready"))
      .catch(() => !cancelled && setStatus("failed"));
    return () => {
      cancelled = true;
    };
  }, []);

  // Microphone → AnalyserNode. Own stream only when none is provided.
  useEffect(() => {
    if (mode !== "active") return;
    let audioCtx: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let ownStream: MediaStream | null = null;
    let cancelled = false;

    const attach = (s: MediaStream) => {
      if (cancelled) return;
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtx.resume().catch(() => {});
      source = audioCtx.createMediaStreamSource(s);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      analyserRef.current = analyser;
    };

    if (stream) {
      attach(stream);
    } else if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((s) => {
          if (cancelled) {
            s.getTracks().forEach((t) => t.stop());
            return;
          }
          ownStream = s;
          attach(s);
        })
        .catch(() => {
          /* no mic — orb keeps breathing at resting amplitude */
        });
    }

    return () => {
      cancelled = true;
      analyserRef.current = null;
      source?.disconnect();
      audioCtx?.close().catch(() => {});
      ownStream?.getTracks().forEach((t) => t.stop());
    };
  }, [mode, stream]);

  // Scene lifecycle.
  useEffect(() => {
    if (status !== "ready" || !hostRef.current) return;
    const THREE = (window as any).THREE;
    const host = hostRef.current;

    let renderer: any;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      setStatus("failed");
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(size, size);
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 3.2;

    // Fibonacci sphere → evenly spread particles.
    const base = new Float32Array(PARTICLES * 3);
    const phase = new Float32Array(PARTICLES);
    const bias = new Float32Array(PARTICLES);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < PARTICLES; i++) {
      const y = 1 - (i / (PARTICLES - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = golden * i;
      base[i * 3] = Math.cos(theta) * r;
      base[i * 3 + 1] = y;
      base[i * 3 + 2] = Math.sin(theta) * r;
      phase[i] = Math.random() * Math.PI * 2;
      bias[i] = Math.random();
    }

    const positions = new Float32Array(base);
    const colors = new Float32Array(PARTICLES * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const pxPerUnit = size / 2.65; // visible height at z=0 for fov 45 @ z=3.2
    const pointPx = size <= 100 ? 3.2 : size <= 160 ? 4.4 : 5.6;
    const texture = makeDotTexture(THREE);
    const material = new THREE.PointsMaterial({
      size: pointPx / pxPerUnit,
      vertexColors: true,
      map: texture,
      transparent: true,
      alphaTest: 0.3,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    points.rotation.x = 0.35;
    scene.add(points);

    const timeData = new Uint8Array(256);
    let smoothed = 0;
    let raf = 0;
    const start = performance.now();

    const readAmplitude = (): number => {
      const analyser = analyserRef.current;
      if (!analyser) return 0;
      analyser.getByteTimeDomainData(timeData);
      let sum = 0;
      for (let i = 0; i < timeData.length; i++) {
        const v = (timeData[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / timeData.length);
      return Math.min(1, Math.max(0, (rms - 0.015) * 5.5));
    };

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const t = (performance.now() - start) / 1000;
      const m = modeRef.current;

      let target: number;
      if (m === "active") {
        const live = readAmplitude();
        // Live input rides on top of a faint resting breath so silence never looks dead.
        target = Math.max(live, 0.05 + 0.03 * Math.sin(t * 1.4));
      } else if (m === "dormant") {
        target = 0.09 + 0.05 * Math.sin(t * 1.1);
      } else {
        target = 0;
      }
      const rate = target > smoothed ? 0.32 : 0.07; // fast attack, slow release
      smoothed += (target - smoothed) * rate;

      const posAttr = geometry.getAttribute("position");
      const colAttr = geometry.getAttribute("color");
      const spread = m === "active" ? 0.95 : 0.35;

      for (let i = 0; i < PARTICLES; i++) {
        const wobble = 0.65 + 0.35 * Math.sin(t * 2.6 + phase[i]);
        const ripple = m === "active" ? smoothed * 0.22 * Math.sin(t * 6 + phase[i] * 2.3) : 0;
        const r = 1 + smoothed * spread * wobble + ripple;
        positions[i * 3] = base[i * 3] * r;
        positions[i * 3 + 1] = base[i * 3 + 1] * r;
        positions[i * 3 + 2] = base[i * 3 + 2] * r;

        let cr: number, cg: number, cb: number;
        if (m === "dormant") {
          const k = 0.15 + smoothed * 0.6 + bias[i] * 0.15;
          cr = DORMANT.r + (BLUE.r - DORMANT.r) * k;
          cg = DORMANT.g + (BLUE.g - DORMANT.g) * k;
          cb = DORMANT.b + (BLUE.b - DORMANT.b) * k;
        } else {
          const k = Math.min(1, Math.max(0, smoothed * 1.35 - 0.12 + bias[i] * 0.25));
          cr = BLUE.r + (GOLD.r - BLUE.r) * k;
          cg = BLUE.g + (GOLD.g - BLUE.g) * k;
          cb = BLUE.b + (GOLD.b - BLUE.b) * k;
        }
        colors[i * 3] = cr;
        colors[i * 3 + 1] = cg;
        colors[i * 3 + 2] = cb;
      }
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;

      points.rotation.y += m === "active" ? 0.006 : 0.0035;
      renderer.render(scene, camera);

      if (m === "collapsing" && smoothed < 0.012 && !settledFiredRef.current) {
        settledFiredRef.current = true;
        onSettledRef.current?.();
      }
    };
    frame();

    return () => {
      cancelAnimationFrame(raf);
      geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, [status, size]);

  if (status === "failed") return <>{fallback ?? null}</>;

  return (
    <div
      ref={hostRef}
      aria-hidden
      className={className}
      style={{ width: size, height: size, lineHeight: 0 }}
    />
  );
}
