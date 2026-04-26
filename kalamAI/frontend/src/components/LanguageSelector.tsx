import { useState, useRef, useEffect } from "react";
import { LANGUAGES, type LanguageCode } from "../types";
import { useRoomStore } from "../store/roomStore";
import clsx from "clsx";

interface Props {
  compact?: boolean;
}

export default function LanguageSelector({ compact = false }: Props) {
  const { listeningLanguage, setListeningLanguage } = useRoomStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find((l) => l.code === listeningLanguage)!;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "flex items-center gap-2 rounded-xl border border-white/10 bg-surface",
          "hover:bg-white/10 transition-all duration-150 font-medium",
          compact ? "px-3 py-2 text-sm" : "px-4 py-2.5"
        )}
      >
        <span className="text-lg">{current.flag}</span>
        <span className={clsx(compact && "hidden sm:inline")}>{current.nativeLabel}</span>
        <svg
          className={clsx("w-4 h-4 text-muted transition-transform", open && "rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 w-56 bg-surface border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
          <div className="p-2 text-xs text-muted px-3 pt-2 pb-1 font-medium uppercase tracking-wide">
            Langue d'écoute
          </div>
          <div className="max-h-72 overflow-y-auto">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setListeningLanguage(lang.code as LanguageCode);
                  setOpen(false);
                }}
                className={clsx(
                  "w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left",
                  lang.code === listeningLanguage && "bg-accent/20 text-accent"
                )}
              >
                <span className="text-xl">{lang.flag}</span>
                <div>
                  <div className="font-medium text-sm">{lang.nativeLabel}</div>
                  <div className="text-xs text-muted">{lang.label}</div>
                </div>
                {lang.code === listeningLanguage && (
                  <svg
                    className="ml-auto w-4 h-4 text-accent"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
          <div className="px-3 py-2 border-t border-white/5">
            <p className="text-xs text-muted">+ Langues africaines à venir</p>
          </div>
        </div>
      )}
    </div>
  );
}
