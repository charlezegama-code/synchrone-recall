import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, RotateCcw } from "lucide-react";
import {
  applyTheme,
  saveTheme,
  loadTheme,
  FONT_OPTIONS,
  COLOR_PRESETS,
  DEFAULT_THEME,
  type ThemeSettings,
} from "../lib/theme";

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [theme, setTheme] = useState<ThemeSettings>(() => loadTheme());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const update = (next: ThemeSettings) => {
    setTheme(next);
    applyTheme(next);
    saveTheme(next);
  };

  const reset = () => update(DEFAULT_THEME);

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-rhino/40 px-4 py-10 backdrop-blur-sm"
      >
        <motion.div
          key="panel"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg rounded-2xl bg-white shadow-xl"
        >
          <div className="flex items-start justify-between gap-4 border-b border-hairline p-6">
            <div>
              <h2 className="text-[22px] font-bold text-rhino">Appearance</h2>
              <p className="mt-1 text-[13px] text-rhino/45">
                Personalize the typeface and accent color — saved on this device.
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-rhino/40 transition hover:bg-canvas hover:text-rhino"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6">
            <p className="mb-3 text-[13px] font-medium text-rhino/50">Accent color</p>
            <div className="flex flex-wrap gap-3">
              {COLOR_PRESETS.map((c) => {
                const selected = theme.accent.toLowerCase() === c.hex;
                return (
                  <button
                    key={c.id}
                    onClick={() => update({ ...theme, accent: c.hex })}
                    aria-label={c.label}
                    title={c.label}
                    className={`flex h-9 w-9 items-center justify-center rounded-full ring-offset-2 transition ${
                      selected ? "ring-2 ring-rhino" : "ring-0"
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {selected && <Check size={15} className="text-white" />}
                  </button>
                );
              })}

              <label
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-dashed border-rhino/25 text-rhino/40 transition hover:border-rhino/40"
                title="Custom color"
              >
                <span className="text-[16px] leading-none">+</span>
                <input
                  type="color"
                  value={theme.accent}
                  onChange={(e) => update({ ...theme, accent: e.target.value })}
                  className="sr-only"
                />
              </label>
            </div>

            <p className="mb-3 mt-6 text-[13px] font-medium text-rhino/50">Typeface</p>
            <div className="grid grid-cols-2 gap-2">
              {FONT_OPTIONS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => update({ ...theme, fontId: f.id })}
                  className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-[15px] transition ${
                    theme.fontId === f.id
                      ? "border-indigo bg-indigo-50 text-indigo-600"
                      : "border-border-card text-rhino/70 hover:border-rhino/25"
                  }`}
                  style={{ fontFamily: f.stack }}
                >
                  {f.label}
                  {theme.fontId === f.id && <Check size={14} />}
                </button>
              ))}
            </div>

            <button
              onClick={reset}
              className="mt-6 flex items-center gap-1.5 text-[13px] font-medium text-rhino/40 transition hover:text-rhino/70"
            >
              <RotateCcw size={13} /> Reset to default
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
