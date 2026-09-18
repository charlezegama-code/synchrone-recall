const STORAGE_KEY = "synchrone_recall_theme";

export type FontOption = {
  id: string;
  label: string;
  stack: string;
};

export const FONT_OPTIONS: FontOption[] = [
  { id: "inter", label: "Inter", stack: '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif' },
  { id: "sora", label: "Sora", stack: '"Sora", ui-sans-serif, system-ui, -apple-system, sans-serif' },
  { id: "poppins", label: "Poppins", stack: '"Poppins", ui-sans-serif, system-ui, -apple-system, sans-serif' },
  { id: "plex", label: "IBM Plex Sans", stack: '"IBM Plex Sans", ui-sans-serif, system-ui, -apple-system, sans-serif' },
  { id: "georgia", label: "Georgia", stack: 'Georgia, "Times New Roman", serif' },
  { id: "system", label: "System UI", stack: "ui-sans-serif, system-ui, -apple-system, sans-serif" },
];

export const COLOR_PRESETS = [
  { id: "indigo", label: "Synchrone", hex: "#3f78c5" },
  { id: "violet", label: "Violet", hex: "#7c3aed" },
  { id: "emerald", label: "Emerald", hex: "#059669" },
  { id: "rose", label: "Rose", hex: "#e11d48" },
  { id: "amber", label: "Amber", hex: "#d97706" },
  { id: "teal", label: "Teal", hex: "#0d9488" },
  { id: "slate", label: "Graphite", hex: "#475569" },
];

export type ThemeSettings = { fontId: string; accent: string };

export const DEFAULT_THEME: ThemeSettings = { fontId: "inter", accent: COLOR_PRESETS[0].hex };

function hexToHsl(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/** Derives the tint/shade scale the app expects (50/100/dim/600) from one accent color. */
function deriveShades(hex: string) {
  const [h, s, l] = hexToHsl(hex);
  return {
    accent: hex,
    accent50: hslToHex(h, clamp(s, 20, 60), 96),
    accent100: hslToHex(h, clamp(s, 20, 60), 90),
    accentDim: hslToHex(h, clamp(s - 10, 0, 100), clamp(l + 12, 0, 85)),
    accent600: hslToHex(h, s, clamp(l - 9, 12, 90)),
  };
}

export function applyTheme(theme: ThemeSettings) {
  const root = document.documentElement;
  const font = FONT_OPTIONS.find((f) => f.id === theme.fontId) ?? FONT_OPTIONS[0];
  const shades = deriveShades(theme.accent);

  root.style.setProperty("--font-sans", font.stack);
  root.style.setProperty("--color-indigo", shades.accent);
  root.style.setProperty("--color-indigo-dim", shades.accentDim);
  root.style.setProperty("--color-indigo-50", shades.accent50);
  root.style.setProperty("--color-indigo-100", shades.accent100);
  root.style.setProperty("--color-indigo-600", shades.accent600);
}

export function loadTheme(): ThemeSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_THEME;
    const parsed = JSON.parse(raw);
    return { fontId: parsed.fontId ?? DEFAULT_THEME.fontId, accent: parsed.accent ?? DEFAULT_THEME.accent };
  } catch {
    return DEFAULT_THEME;
  }
}

export function saveTheme(theme: ThemeSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  } catch {
    /* private browsing / storage disabled — theme just won't persist across reloads */
  }
}
