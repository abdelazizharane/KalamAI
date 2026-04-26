/**
 * Landing.tsx — KalamAI public homepage.
 *
 * Monochrome Beach palette · Futuristic Orbitron/Space Grotesk design
 * Sections: Nav → Hero + Meeting card → Stats → Features → How it works →
 *           Languages → Final CTA → Footer.
 */

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRoom } from "../hooks/useRoom";
import { useRoomStore } from "../store/roomStore";
import { useAuth } from "../hooks/useAuth";
import { LANGUAGES, type LanguageCode } from "../types";
import clsx from "clsx";

type Tab = "join" | "create";
type Theme = "dark" | "light";

// ─── Palette ───────────────────────────────────────────────────────────────────
const TEAL   = "#3C6E71";
const NAVY   = "#284B63";
const WHITE  = "#FFFFFF";
const LGRAY  = "#D9D9D9";

// ─── CursorGlow ───────────────────────────────────────────────────────────────
function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!ref.current) return;
      ref.current.style.left = `${e.clientX - 200}px`;
      ref.current.style.top  = `${e.clientY - 200}px`;
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        pointerEvents: "none",
        width: 400,
        height: 400,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(60,110,113,0.14) 0%, transparent 70%)",
        transition: "left 0.08s, top 0.08s",
        zIndex: 1,
        top: -200,
        left: -200,
      }}
    />
  );
}

// ─── KalamAI logo — futuristic sound-wave globe ───────────────────────────────
function KalamLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-label="KalamAI">
      <defs>
        <linearGradient id="kl-logo-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={TEAL} />
          <stop offset="100%" stopColor={NAVY} />
        </linearGradient>
      </defs>
      {/* Background rounded rect */}
      <rect x="0" y="0" width="40" height="40" rx="10" fill="url(#kl-logo-grad)" />
      {/* Globe circle */}
      <circle cx="17" cy="20" r="9" stroke="white" strokeOpacity="0.9" strokeWidth="1.5" fill="none" />
      {/* Globe meridian arc */}
      <path d="M17 11 Q21 16 21 20 Q21 24 17 29" stroke="white" strokeOpacity="0.55" strokeWidth="1" fill="none" />
      {/* Globe horizontal lines */}
      <line x1="8" y1="20" x2="26" y2="20" stroke="white" strokeOpacity="0.35" strokeWidth="1" />
      <line x1="9.5" y1="15.5" x2="24.5" y2="15.5" stroke="white" strokeOpacity="0.25" strokeWidth="1" />
      <line x1="9.5" y1="24.5" x2="24.5" y2="24.5" stroke="white" strokeOpacity="0.25" strokeWidth="1" />
      {/* Sound-wave arcs emanating right */}
      <path d="M28 17 Q31 20 28 23" stroke="white" strokeOpacity="0.9" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M31 15 Q35.5 20 31 25" stroke="white" strokeOpacity="0.65" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M34 13 Q40 20 34 27" stroke="white" strokeOpacity="0.35" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ─── Theme toggle ──────────────────────────────────────────────────────────────
function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const dark = theme === "dark";
  return (
    <button
      onClick={onToggle}
      title={dark ? "Light mode" : "Dark mode"}
      style={{
        width: 38,
        height: 38,
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: `1px solid ${dark ? "rgba(60,110,113,0.35)" : "rgba(0,0,0,0.12)"}`,
        background: dark ? "rgba(60,110,113,0.12)" : "rgba(0,0,0,0.05)",
        color: dark ? LGRAY : "#6b7280",
        cursor: "pointer",
        transition: "all 0.2s",
      }}
    >
      {dark ? (
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}

// ─── African Meeting Grid illustration ────────────────────────────────────────
function AfricanMeetingGrid({ dark }: { dark: boolean }) {
  const [dots, setDots] = useState(1);
  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d % 3) + 1), 600);
    return () => clearInterval(t);
  }, []);

  const participants = [
    { init: "A", name: "Ahmed",   city: "N'Djamena", flag: "🇹🇩", lang: "Arabic",  color: TEAL },
    { init: "A", name: "Amara",   city: "Dakar",      flag: "🇸🇳", lang: "Wolof",   color: NAVY },
    { init: "K", name: "Kofi",    city: "Accra",      flag: "🇬🇭", lang: "English", color: "#2D5F62" },
    { init: "F", name: "Fatima",  city: "Lagos",      flag: "🇳🇬", lang: "Hausa",  color: "#1E3A50" },
  ];

  const cardBg    = dark ? "#1a1a1a" : "#f8f9fa";
  const tileBg    = dark ? "#1e2a2b" : "#e8f2f3";
  const tileBord  = dark ? `rgba(60,110,113,0.25)` : `rgba(60,110,113,0.18)`;
  const nameColor = dark ? LGRAY : "#374151";
  const cityColor = dark ? "rgba(217,217,217,0.55)" : "#64748b";

  return (
    <div
      style={{
        background: cardBg,
        border: `1.5px solid ${dark ? "rgba(60,110,113,0.4)" : "rgba(60,110,113,0.25)"}`,
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: dark
          ? `0 0 0 1px rgba(60,110,113,0.15), 0 24px 48px rgba(0,0,0,0.55), 0 0 40px rgba(60,110,113,0.08)`
          : `0 24px 48px rgba(0,0,0,0.12), 0 0 0 1px rgba(60,110,113,0.1)`,
        transform: "perspective(800px) rotateY(-8deg)",
        transformOrigin: "right center",
        width: "100%",
        maxWidth: 400,
      }}
    >
      {/* Header bar */}
      <div style={{
        padding: "10px 14px",
        borderBottom: `1px solid ${dark ? "rgba(60,110,113,0.2)" : "rgba(60,110,113,0.12)"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: dark ? "rgba(60,110,113,0.08)" : "rgba(60,110,113,0.05)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <KalamLogo size={22} />
          <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700, color: dark ? WHITE : "#1a1a1a", letterSpacing: "0.08em" }}>
            KalamAI
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", animation: "kl-pulse 2s infinite" }} />
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#4ade80", fontWeight: 600 }}>LIVE</span>
        </div>
      </div>

      {/* 2×2 participant grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: 10 }}>
        {participants.map((p) => (
          <div
            key={p.init + p.city}
            style={{
              background: tileBg,
              border: `1.5px solid ${tileBord}`,
              borderRadius: 12,
              padding: "14px 10px 10px",
              position: "relative",
              aspectRatio: "4/3",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              /* Kente-inspired subtle geometric border using outline box */
              outline: `2px dashed ${p.color}18`,
              outlineOffset: -5,
            }}
          >
            {/* Avatar */}
            <div style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${p.color}cc, ${p.color}55)`,
              border: `2px solid ${p.color}80`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'Orbitron', sans-serif",
              fontWeight: 700,
              fontSize: 14,
              color: WHITE,
              boxShadow: `0 0 12px ${p.color}40`,
            }}>
              {p.init}
            </div>
            {/* Name */}
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, fontWeight: 600, color: nameColor }}>
              {p.name}
            </div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 9, color: cityColor }}>
              {p.city}
            </div>
            {/* Language badge */}
            <div style={{
              position: "absolute",
              bottom: 7,
              left: 7,
              background: `${p.color}28`,
              border: `1px solid ${p.color}50`,
              borderRadius: 6,
              padding: "2px 5px",
              fontSize: 9,
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
              color: p.color,
              display: "flex",
              alignItems: "center",
              gap: 3,
            }}>
              <span>{p.flag}</span>
              <span>{p.lang}</span>
            </div>
          </div>
        ))}
      </div>

      {/* AI translating strip */}
      <div style={{
        margin: "0 10px 10px",
        padding: "8px 12px",
        background: `linear-gradient(90deg, ${TEAL}18, ${NAVY}18)`,
        border: `1px solid ${TEAL}40`,
        borderRadius: 10,
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 11,
        color: dark ? `${TEAL}` : NAVY,
        fontWeight: 600,
      }}>
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ flexShrink: 0, color: TEAL }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10" />
        </svg>
        <span style={{ color: TEAL }}>AI translating →</span>
        <span style={{ letterSpacing: "0.3em", color: dark ? LGRAY : "#64748b" }}>
          {".".repeat(dots)}{"  ".repeat(3 - dots)}
        </span>
        <span style={{ marginLeft: "auto", color: dark ? "rgba(217,217,217,0.5)" : "#9ca3af", fontSize: 9 }}>
          4 languages
        </span>
      </div>
    </div>
  );
}

// ─── Language dropdown (theme-aware) ──────────────────────────────────────────
function LangDropdown({ value, onChange, dark, textPrimary, inputBg, inputBorder }: {
  value: LanguageCode; onChange: (v: LanguageCode) => void;
  dark: boolean; textPrimary: string; inputBg: string; inputBorder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGUAGES.find((l) => l.code === value)!;

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left focus:outline-none"
        style={{
          background: inputBg,
          borderColor: open ? TEAL : inputBorder,
          color: textPrimary,
          boxShadow: open ? `0 0 0 2px ${TEAL}30` : "none",
        }}
      >
        <span className="text-2xl">{current.flag}</span>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{current.nativeLabel}</span>
          <span className="text-xs ml-2" style={{ color: dark ? "#6b7280" : "#94a3b8", fontFamily: "'Space Grotesk', sans-serif" }}>({current.label})</span>
        </div>
        <svg className={clsx("w-4 h-4 shrink-0 transition-transform", open && "rotate-180")}
          style={{ color: dark ? "#6b7280" : "#94a3b8" }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute z-50 left-0 right-0 mt-1.5 rounded-xl border overflow-hidden shadow-2xl"
          style={{
            background: dark ? "rgba(24,24,24,0.98)" : "rgba(255,255,255,0.98)",
            borderColor: dark ? `rgba(60,110,113,0.35)` : "rgba(0,0,0,0.1)",
            backdropFilter: "blur(24px)",
            boxShadow: dark ? `0 20px 40px rgba(0,0,0,0.6), 0 0 0 1px ${TEAL}25` : "0 20px 40px rgba(0,0,0,0.15)",
          }}
        >
          <div className="max-h-52 overflow-y-auto py-1.5">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => { onChange(lang.code as LanguageCode); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                style={{
                  background: lang.code === value ? `${TEAL}20` : "transparent",
                  color: lang.code === value ? TEAL : (dark ? "#d1d5db" : "#374151"),
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
                onMouseEnter={(e) => { if (lang.code !== value) e.currentTarget.style.background = dark ? "rgba(60,110,113,0.1)" : "rgba(60,110,113,0.06)"; }}
                onMouseLeave={(e) => { if (lang.code !== value) e.currentTarget.style.background = "transparent"; }}
              >
                <span className="text-xl">{lang.flag}</span>
                <span className="text-sm font-medium">{lang.nativeLabel}</span>
                <span className="text-xs ml-1" style={{ color: dark ? "#6b7280" : "#94a3b8" }}>({lang.label})</span>
                {lang.code === value && (
                  <svg className="w-3.5 h-3.5 ml-auto shrink-0" style={{ color: TEAL }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Join / Create card ────────────────────────────────────────────────────────
function MeetingCard({ dark }: { dark: boolean }) {
  const navigate = useNavigate();
  const { createRoom, joinRoom } = useRoom();
  const { listeningLanguage, setListeningLanguage } = useRoomStore();
  const [tab, setTab] = useState<Tab>("join");
  const [name, setName] = useState(localStorage.getItem("kalamai_name") ?? "");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const codeRef = useRef<HTMLInputElement>(null);

  const saveName = (v: string) => { setName(v); localStorage.setItem("kalamai_name", v); };

  const handleCreate = async () => {
    if (!name.trim()) { setError("Enter your name"); return; }
    setError(""); setLoading(true);
    try {
      const data = await createRoom(name.trim());
      navigate(`/room/${data.code}`);
    } catch {
      setError("Could not create meeting. Check your connection.");
    } finally { setLoading(false); }
  };

  const handleJoin = async () => {
    if (!name.trim()) { setError("Enter your name"); return; }
    if (!code.trim()) { setError("Enter a meeting code"); codeRef.current?.focus(); return; }
    setError(""); setLoading(true);
    try {
      await joinRoom(code.trim(), name.trim(), listeningLanguage);
      navigate(`/room/${code.trim().toUpperCase()}`);
    } catch {
      setError("Meeting not found. Check the code.");
    } finally { setLoading(false); }
  };

  const inputBg     = dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
  const inputBorder = dark ? "rgba(60,110,113,0.25)"  : "rgba(0,0,0,0.12)";
  const textPrimary = dark ? "#f1f5f9" : "#0f172a";
  const textMuted   = dark ? "#6b7280" : "#64748b";
  const tabBg       = dark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.06)";

  return (
    <div
      className="w-full max-w-md rounded-3xl border p-6 shadow-2xl"
      style={{
        background: dark ? "#242424" : "rgba(255,255,255,0.96)",
        borderColor: dark ? `rgba(60,110,113,0.3)` : "rgba(0,0,0,0.08)",
        backdropFilter: "blur(32px)",
        boxShadow: dark
          ? `0 32px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(60,110,113,0.12), 0 0 60px ${TEAL}12`
          : "0 32px 64px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)",
      }}
    >
      {/* Tabs */}
      <div className="flex p-1 rounded-xl mb-5" style={{ background: tabBg }}>
        {(["join", "create"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(""); }}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              ...(tab === t
                ? {
                    background: `linear-gradient(135deg, ${TEAL}, ${NAVY})`,
                    color: WHITE,
                    boxShadow: `0 2px 10px ${TEAL}50`,
                  }
                : { color: textMuted }),
            }}
          >
            {t === "join" ? "Join a meeting" : "New meeting"}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {/* Name input */}
        <div>
          <label
            className="block text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: textMuted, fontFamily: "'Orbitron', sans-serif", fontSize: 9, letterSpacing: "0.15em" }}
          >
            Your name
          </label>
          <input
            className="w-full px-4 py-3 rounded-xl border text-sm font-medium transition-all focus:outline-none"
            style={{
              background: inputBg,
              borderColor: inputBorder,
              color: textPrimary,
              fontFamily: "'Space Grotesk', sans-serif",
            }}
            placeholder="Ahmed Moussa"
            value={name}
            onChange={(e) => saveName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (tab === "join" ? handleJoin() : handleCreate())}
            onFocus={(e) => { e.target.style.borderColor = TEAL; e.target.style.boxShadow = `0 0 0 2px ${TEAL}30`; }}
            onBlur={(e) => { e.target.style.borderColor = inputBorder; e.target.style.boxShadow = "none"; }}
          />
        </div>

        {/* Meeting code (join only) */}
        {tab === "join" && (
          <div>
            <label
              className="block text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: textMuted, fontFamily: "'Orbitron', sans-serif", fontSize: 9, letterSpacing: "0.15em" }}
            >
              Meeting code
            </label>
            <input
              ref={codeRef}
              className="w-full px-4 py-3 rounded-xl border text-lg font-mono tracking-[0.25em] uppercase text-center font-bold transition-all focus:outline-none"
              style={{
                background: inputBg,
                borderColor: inputBorder,
                color: textPrimary,
                fontFamily: "'Orbitron', monospace",
              }}
              placeholder="ABC-123"
              value={code}
              maxLength={10}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              onFocus={(e) => { e.target.style.borderColor = TEAL; e.target.style.boxShadow = `0 0 0 2px ${TEAL}30`; }}
              onBlur={(e) => { e.target.style.borderColor = inputBorder; e.target.style.boxShadow = "none"; }}
            />
          </div>
        )}

        {/* Listening language */}
        <div>
          <label
            className="block text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: textMuted, fontFamily: "'Orbitron', sans-serif", fontSize: 9, letterSpacing: "0.15em" }}
          >
            Listening language
          </label>
          <LangDropdown
            value={listeningLanguage}
            onChange={setListeningLanguage}
            dark={dark}
            textPrimary={textPrimary}
            inputBg={inputBg}
            inputBorder={inputBorder}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-xl"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* CTA button */}
        <button
          onClick={tab === "join" ? handleJoin : handleCreate}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white transition-all active:scale-95 disabled:opacity-60"
          style={{
            background: `linear-gradient(135deg, ${TEAL}, ${NAVY})`,
            boxShadow: `0 4px 24px ${TEAL}50`,
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 15,
            letterSpacing: "0.02em",
          }}
        >
          {loading ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          ) : tab === "join" ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          )}
          {loading ? "Connecting…" : tab === "join" ? "Join meeting" : "Start meeting"}
        </button>

        <p className="text-center text-xs" style={{ color: textMuted, fontFamily: "'Space Grotesk', sans-serif" }}>
          No account required · End-to-end encrypted · Sovereign
        </p>
      </div>
    </div>
  );
}

// ─── Feature card ──────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc, accent, dark }: {
  icon: React.ReactNode; title: string; desc: string; accent: string; dark: boolean;
}) {
  return (
    <div
      className="rounded-2xl border p-6 transition-all hover:-translate-y-1 duration-200"
      style={{
        background: dark ? "#242424" : "rgba(255,255,255,0.85)",
        borderColor: dark ? `${accent}28` : "rgba(0,0,0,0.07)",
        backdropFilter: "blur(12px)",
        boxShadow: dark
          ? `0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 ${accent}15`
          : "0 4px 24px rgba(0,0,0,0.06)",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = `${accent}55`; (e.currentTarget as HTMLDivElement).style.boxShadow = dark ? `0 8px 32px rgba(0,0,0,0.4), 0 0 20px ${accent}18` : `0 8px 32px rgba(0,0,0,0.1)`; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = dark ? `${accent}28` : "rgba(0,0,0,0.07)"; (e.currentTarget as HTMLDivElement).style.boxShadow = dark ? `0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 ${accent}15` : "0 4px 24px rgba(0,0,0,0.06)"; }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-2xl"
        style={{ background: `${accent}1a`, border: `1px solid ${accent}40` }}
      >
        {icon}
      </div>
      <h3
        className="font-bold text-lg mb-2"
        style={{ color: dark ? WHITE : "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {title}
      </h3>
      <p
        className="text-sm leading-relaxed"
        style={{ color: dark ? "#9ca3af" : "#64748b", fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {desc}
      </p>
    </div>
  );
}

// ─── Step card ─────────────────────────────────────────────────────────────────
function StepCard({ n, title, desc, dark }: {
  n: number; title: string; desc: string; dark: boolean;
}) {
  return (
    <div className="flex gap-4 items-start">
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0"
        style={{
          background: `linear-gradient(135deg, ${TEAL}, ${NAVY})`,
          color: WHITE,
          boxShadow: `0 4px 12px ${TEAL}50`,
          fontFamily: "'Orbitron', sans-serif",
          fontSize: 12,
        }}
      >
        {n}
      </div>
      <div>
        <h4
          className="font-bold mb-1"
          style={{ color: dark ? WHITE : "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {title}
        </h4>
        <p
          className="text-sm leading-relaxed"
          style={{ color: dark ? "#9ca3af" : "#64748b", fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {desc}
        </p>
      </div>
    </div>
  );
}

// ─── Main Landing page ─────────────────────────────────────────────────────────
export default function Landing() {
  const { isLoggedIn, name: authName } = useAuth();
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("kalamai_theme") as Theme) ?? "dark",
  );
  const dark = theme === "dark";

  const toggleTheme = () => {
    const next: Theme = dark ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("kalamai_theme", next);
  };

  const bg        = dark ? "#181818" : "#f0f4f6";
  const textPri   = dark ? WHITE : "#0f172a";
  const textMuted = dark ? "#8a9bb0" : "#64748b";
  const borderSub = dark ? "rgba(60,110,113,0.2)" : "rgba(0,0,0,0.07)";

  return (
    <div
      className="min-h-screen flex flex-col transition-colors duration-300 overflow-x-hidden"
      style={{ background: bg, color: textPri, fontFamily: "'Space Grotesk', sans-serif" }}
    >
      {/* ── Font imports + keyframes ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');

        @keyframes kl-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes kl-fade-up {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .kl-fade-up   { animation: kl-fade-up 0.65s ease-out both; }
        .kl-fade-up-2 { animation: kl-fade-up 0.65s ease-out 0.18s both; }
        .kl-fade-up-3 { animation: kl-fade-up 0.65s ease-out 0.34s both; }
        @keyframes kl-scan {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(400px); }
        }
        .kl-scan-line {
          animation: kl-scan 4s linear infinite;
        }
      `}</style>

      {/* ── Dot grid background ── */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          backgroundImage: "radial-gradient(rgba(60,110,113,0.15) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          opacity: dark ? 1 : 0.5,
        }}
      />

      {/* ── Cursor glow ── */}
      <CursorGlow />

      {/* ══════════════════════ HEADER ════════════════════════════════════════ */}
      {/* Floating pill nav — fixed at top with glass effect */}
      <div
        style={{
          position: "fixed",
          top: 12,
          left: 0,
          right: 0,
          zIndex: 50,
          padding: "0 24px",
          pointerEvents: "none",
        }}
      >
      <header
        className="flex items-center justify-between"
        style={{
          pointerEvents: "auto",
          maxWidth: 1200,
          margin: "0 auto",
          height: 64,
          paddingLeft: 20,
          paddingRight: 20,
          borderRadius: 16,
          border: `1px solid rgba(60,110,113,0.2)`,
          background: dark ? "rgba(15,22,23,0.85)" : "rgba(240,244,246,0.88)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: dark
            ? "0 4px 24px rgba(0,0,0,0.45), 0 1px 0 rgba(60,110,113,0.15)"
            : "0 4px 24px rgba(0,0,0,0.10), 0 1px 0 rgba(60,110,113,0.10)",
        }}
      >
        {/* Left: logo + wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <KalamLogo size={44} />
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <span
              style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 20,
                fontWeight: 700,
                color: dark ? WHITE : "#181818",
                letterSpacing: "0.04em",
              }}
            >
              KalamAI
            </span>
            <span
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 10,
                fontWeight: 500,
                color: TEAL,
                letterSpacing: "0.08em",
              }}
            >
              by Abdel-aziz Harane
            </span>
          </div>
        </div>

        {/* Center: nav links (desktop) */}
        <nav
          className="hidden md:flex items-center gap-8"
          style={{ position: "absolute", left: "50%", transform: "translateX(-50%)" }}
        >
          {["Features", "Languages", "About"].map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase()}`}
              style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: textMuted,
                textDecoration: "none",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = TEAL)}
              onMouseLeave={(e) => (e.currentTarget.style.color = textMuted)}
            >
              {link}
            </a>
          ))}
        </nav>

        {/* Right: theme toggle + auth */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          {isLoggedIn ? (
            <a
              href="/dashboard"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                padding: "8px 18px",
                borderRadius: 12,
                border: `1px solid ${TEAL}60`,
                background: `${TEAL}18`,
                color: TEAL,
                textDecoration: "none",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = `${TEAL}30`; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = `${TEAL}18`; }}
            >
              {authName ? `${authName.split(" ")[0]} · Dashboard →` : "Dashboard →"}
            </a>
          ) : (
            <a
              href="/auth"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 13,
                fontWeight: 500,
                padding: "8px 18px",
                borderRadius: 12,
                border: `1px solid ${borderSub}`,
                background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                color: textMuted,
                textDecoration: "none",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = `${TEAL}50`; (e.currentTarget as HTMLAnchorElement).style.color = dark ? LGRAY : "#374151"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = borderSub; (e.currentTarget as HTMLAnchorElement).style.color = textMuted; }}
            >
              Sign in
            </a>
          )}
        </div>
      </header>
      </div>{/* /floating nav wrapper */}

      <main style={{ position: "relative", zIndex: 2, flex: 1, paddingTop: 88 }}>

        {/* ══════════════════════ HERO ═══════════════════════════════════════ */}
        <section className="max-w-7xl mx-auto px-5 sm:px-10 pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center">

          {/* Left: copy */}
          <div className="kl-fade-up">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-7 border"
              style={{
                background: `${TEAL}15`,
                borderColor: `${TEAL}40`,
                color: TEAL,
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 12,
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: TEAL, display: "inline-block", animation: "kl-pulse 2s infinite" }} />
              Real-time AI simultaneous translation
            </div>

            {/* 3D Orbitron hero title */}
            <h1
              style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "clamp(2rem, 5vw, 3.4rem)",
                fontWeight: 900,
                lineHeight: 1.08,
                marginBottom: "1.5rem",
                letterSpacing: "0.02em",
                color: dark ? WHITE : "#0f172a",
                textShadow: dark
                  ? `0 1px 0 ${TEAL}cc, 0 2px 0 ${TEAL}99, 0 4px 0 ${TEAL}66, 0 8px 20px rgba(0,0,0,0.5), 0 0 40px ${TEAL}30`
                  : `0 1px 0 rgba(60,110,113,0.4), 0 2px 0 rgba(60,110,113,0.25), 0 4px 12px rgba(0,0,0,0.12)`,
              }}
            >
              MEET IN ANY
              <br />
              <span
                style={{
                  background: `linear-gradient(135deg, ${TEAL}, ${NAVY})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  display: "inline-block",
                  filter: dark ? `drop-shadow(0 0 12px ${TEAL}60)` : "none",
                }}
              >
                LANGUAGE
              </span>
            </h1>

            <p
              className="text-lg mb-8 leading-relaxed max-w-lg"
              style={{ color: textMuted, fontFamily: "'Space Grotesk', sans-serif" }}
            >
              KalamAI translates every speaker in real time — so each participant
              hears the meeting in their own language. Built for Africa,
              designed for the world.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2 mb-8">
              {[
                { icon: "🔒", text: "End-to-end encrypted" },
                { icon: "🌍", text: "10+ African languages" },
                { icon: "⚡", text: "Real-time translation" },
                { icon: "📱", text: "No install needed" },
              ].map(({ icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border"
                  style={{
                    background: dark ? "rgba(60,110,113,0.08)" : "rgba(60,110,113,0.05)",
                    borderColor: dark ? "rgba(60,110,113,0.25)" : "rgba(60,110,113,0.15)",
                    color: dark ? LGRAY : "#374151",
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  <span>{icon}</span><span>{text}</span>
                </div>
              ))}
            </div>

            {/* Inline CTAs (desktop) */}
            <div className="hidden lg:flex gap-3">
              <button
                onClick={() => { const el = document.getElementById("join-card"); el?.scrollIntoView({ behavior: "smooth" }); }}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white text-sm"
                style={{
                  background: `linear-gradient(135deg, ${TEAL}, ${NAVY})`,
                  boxShadow: `0 4px 20px ${TEAL}55`,
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 14,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 6px 28px ${TEAL}70`; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 4px 20px ${TEAL}55`; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}
              >
                Start a free meeting
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
              <a
                href="#how-it-works"
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm border transition-all"
                style={{
                  borderColor: dark ? "rgba(60,110,113,0.3)" : "rgba(0,0,0,0.12)",
                  color: textMuted,
                  fontFamily: "'Space Grotesk', sans-serif",
                  textDecoration: "none",
                }}
              >
                How it works
              </a>
            </div>
          </div>

          {/* Right: illustration + meeting card */}
          <div className="kl-fade-up-2 flex flex-col gap-6 items-center lg:items-start">
            {/* African meeting grid (desktop only) */}
            <div className="hidden lg:block w-full">
              <AfricanMeetingGrid dark={dark} />
            </div>
            {/* Join card */}
            <div id="join-card" className="w-full flex justify-center lg:justify-start">
              <MeetingCard dark={dark} />
            </div>
          </div>
        </section>

        {/* ══════════════════════ STATS BAR ════════════════════════════════════ */}
        <section
          className="border-y py-8"
          style={{
            borderColor: borderSub,
            background: dark ? "rgba(60,110,113,0.04)" : "rgba(60,110,113,0.03)",
          }}
        >
          <div className="max-w-4xl mx-auto px-5 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { value: "10+",    label: "African languages" },
              { value: "< 1s",   label: "Translation latency" },
              { value: "100%",   label: "Sovereign & open" },
              { value: "E2E",    label: "Encrypted" },
            ].map(({ value, label }) => (
              <div key={label}>
                <div
                  className="text-3xl font-extrabold mb-1"
                  style={{
                    fontFamily: "'Orbitron', sans-serif",
                    background: `linear-gradient(135deg, ${TEAL}, ${NAVY})`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    filter: dark ? `drop-shadow(0 0 8px ${TEAL}50)` : "none",
                  }}
                >
                  {value}
                </div>
                <div
                  className="text-sm font-medium"
                  style={{ color: textMuted, fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════ FEATURES ══════════════════════════════════════ */}
        <section id="features" className="max-w-6xl mx-auto px-5 sm:px-10 py-20">
          <div className="text-center mb-12 kl-fade-up">
            <h2
              className="text-3xl sm:text-4xl font-extrabold mb-3"
              style={{ fontFamily: "'Orbitron', sans-serif", color: dark ? WHITE : "#0f172a", letterSpacing: "0.03em" }}
            >
              Built for multilingual teams
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: textMuted, fontFamily: "'Space Grotesk', sans-serif" }}>
              Everything you need for inclusive, productive meetings — without language as a barrier.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard dark={dark} accent={TEAL} icon="🌐"
              title="Simultaneous AI Translation"
              desc="Every speaker is translated in real time using Meta's SeamlessM4T model — the world's most advanced multilingual AI. Each participant hears in their own language." />
            <FeatureCard dark={dark} accent={NAVY} icon="🔒"
              title="Privacy-first & Sovereign"
              desc="Self-hosted, end-to-end encrypted. Your data never leaves your infrastructure. Designed for African data sovereignty and compliance." />
            <FeatureCard dark={dark} accent="#2D7A7E" icon="📱"
              title="Works Everywhere"
              desc="Pure browser-based. No app to install. Works on any device — smartphone, tablet, laptop — with a modern browser." />
            <FeatureCard dark={dark} accent="#1A5276" icon="✋"
              title="Rich Meeting Controls"
              desc="Raise hand, send reactions, screen share, record (host), background blur, chat, and participants panel — all in a draggable floating toolbar." />
            <FeatureCard dark={dark} accent={TEAL} icon="🎙️"
              title="Independent Volume Control"
              desc="Adjust original voice and AI translation volumes independently. Never miss a word in your language while everyone speaks theirs." />
            <FeatureCard dark={dark} accent={NAVY} icon="📅"
              title="Schedule & Invite"
              desc="Schedule meetings in advance, send email invitations with one click, and share instant join links — all from your personal dashboard." />
          </div>
        </section>

        {/* ══════════════════════ HOW IT WORKS ══════════════════════════════════ */}
        <section
          id="how-it-works"
          className="py-20 border-y"
          style={{ borderColor: borderSub, background: dark ? "rgba(36,36,36,0.6)" : "rgba(60,110,113,0.03)" }}
        >
          <div className="max-w-5xl mx-auto px-5 sm:px-10">
            <div className="text-center mb-12">
              <h2
                className="text-3xl sm:text-4xl font-extrabold mb-3"
                style={{ fontFamily: "'Orbitron', sans-serif", color: dark ? WHITE : "#0f172a", letterSpacing: "0.03em" }}
              >
                How it works
              </h2>
              <p className="text-lg" style={{ color: textMuted, fontFamily: "'Space Grotesk', sans-serif" }}>
                From zero to translated meeting in under 30 seconds.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-8">
              <StepCard dark={dark} n={1}
                title="Create or join"
                desc="Click 'New meeting' or paste a 6-character room code shared by the host. No account required." />
              <StepCard dark={dark} n={2}
                title="Pick your language"
                desc="Select the language you want to hear the meeting in — Arabic, French, Wolof, Hausa, English, and more." />
              <StepCard dark={dark} n={3}
                title="Speak — AI does the rest"
                desc="Talk naturally. KalamAI transcribes, translates, and delivers audio in every participant's chosen language in near real time." />
            </div>
          </div>
        </section>

        {/* ══════════════════════ WHY KALAMAI — Feature Grid ═══════════════════ */}
        <section className="max-w-6xl mx-auto px-5 sm:px-10 py-20">
          <div className="text-center mb-12">
            <h2
              className="text-3xl sm:text-4xl font-extrabold mb-3"
              style={{ fontFamily: "'Orbitron', sans-serif", color: dark ? WHITE : "#0f172a", letterSpacing: "0.03em" }}
            >
              Why KalamAI?
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: textMuted, fontFamily: "'Space Grotesk', sans-serif" }}>
              Every feature you need to run inclusive, real-time multilingual meetings.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Card 1 — Real-time AI Translation */}
            {[
              {
                title: "Real-time AI Translation",
                desc: "Speak any language, understood by all in real time",
                accent: TEAL,
                icon: (
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.5 18h5" />
                  </svg>
                ),
              },
              {
                title: "HD Video & Audio",
                desc: "Crystal-clear conferencing with adaptive quality",
                accent: NAVY,
                icon: (
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                ),
              },
              {
                title: "End-to-End Encryption",
                desc: "Military-grade security for every session",
                accent: "#2D7A7E",
                icon: (
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 12l2 2 4-4M10.5 3.5L5 6v6c0 3.87 2.333 7.14 5.5 8.5C13.667 19.14 16 15.87 16 12V6l-5.5-2.5z" />
                  </svg>
                ),
              },
              {
                title: "Meeting Recording",
                desc: "Capture every detail as a local video file",
                accent: TEAL,
                icon: (
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <circle cx="12" cy="12" r="3.5" fill="white" fillOpacity="0.85" stroke="none" />
                  </svg>
                ),
              },
              {
                title: "Raise Hand",
                desc: "Structured discussions with hand-raise queue",
                accent: NAVY,
                icon: (
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 11V6a2 2 0 00-4 0v5M14 10V4a2 2 0 00-4 0v6M10 9.5V4a2 2 0 00-4 0v8l-1.5-1.5a1.5 1.5 0 00-2.121 2.121L6 16.5V18a4 4 0 004 4h4a4 4 0 004-4v-7a2 2 0 00-4 0" />
                  </svg>
                ),
              },
              {
                title: "Multi-device",
                desc: "Works on any browser, desktop or mobile",
                accent: "#2D7A7E",
                icon: (
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="14" height="10" rx="2" />
                    <path d="M16 8h4a1 1 0 011 1v7a1 1 0 01-1 1h-4" />
                    <path d="M8 18v2M5 20h6M18 14v4" />
                    <circle cx="18" cy="19" r="1" fill="white" stroke="none" />
                  </svg>
                ),
              },
            ].map(({ title, desc, accent, icon }) => (
              <div
                key={title}
                className="rounded-2xl border p-6 transition-all hover:-translate-y-1 duration-200"
                style={{
                  background: dark ? "#1e2a2b" : "rgba(255,255,255,0.9)",
                  borderColor: dark ? `${accent}30` : "rgba(60,110,113,0.12)",
                  backdropFilter: "blur(12px)",
                  boxShadow: dark
                    ? `0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 ${accent}15`
                    : "0 4px 24px rgba(0,0,0,0.06)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = `${accent}55`;
                  (e.currentTarget as HTMLDivElement).style.boxShadow = dark
                    ? `0 8px 32px rgba(0,0,0,0.4), 0 0 20px ${accent}20`
                    : `0 8px 32px rgba(0,0,0,0.1)`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = dark ? `${accent}30` : "rgba(60,110,113,0.12)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = dark
                    ? `0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 ${accent}15`
                    : "0 4px 24px rgba(0,0,0,0.06)";
                }}
              >
                {/* Icon box */}
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: `linear-gradient(135deg, ${accent}, ${accent === TEAL ? NAVY : TEAL})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                    boxShadow: `0 4px 14px ${accent}40`,
                  }}
                >
                  {icon}
                </div>
                <h3
                  className="font-bold text-base mb-1.5"
                  style={{ color: dark ? WHITE : "#0f172a", fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: dark ? "#9ca3af" : "#64748b", fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════ BUILT FOR AFRICA — Stats Banner ═══════════════ */}
        <section
          style={{
            background: "#1a3a3c",
            borderTop: "1px solid rgba(60,110,113,0.35)",
            borderBottom: "1px solid rgba(60,110,113,0.35)",
          }}
        >
          <div
            className="max-w-5xl mx-auto px-5 sm:px-10 py-14"
            style={{ textAlign: "center" }}
          >
            {/* Section heading */}
            <p
              style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: TEAL,
                marginBottom: 10,
              }}
            >
              Built for Africa
            </p>
            <h2
              style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
                fontWeight: 900,
                color: WHITE,
                letterSpacing: "0.02em",
                marginBottom: 40,
                lineHeight: 1.2,
              }}
            >
              By the numbers
            </h2>

            {/* Stats row */}
            <div
              className="grid grid-cols-2 sm:grid-cols-4 gap-8"
            >
              {[
                { value: "50+",    label: "languages supported",   sub: "African & global" },
                { value: "<200ms", label: "translation latency",   sub: "Near real-time" },
                { value: "100%",   label: "browser-native",        sub: "No install needed" },
                { value: "Free",   label: "to use",                sub: "No account required" },
              ].map(({ value, label, sub }) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    padding: "20px 12px",
                    borderRadius: 16,
                    background: "rgba(60,110,113,0.12)",
                    border: "1px solid rgba(60,110,113,0.22)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Orbitron', sans-serif",
                      fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
                      fontWeight: 900,
                      color: WHITE,
                      lineHeight: 1,
                      filter: `drop-shadow(0 0 10px ${TEAL}80)`,
                    }}
                  >
                    {value}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: 13,
                      fontWeight: 600,
                      color: LGRAY,
                      textAlign: "center",
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: 11,
                      color: "rgba(217,217,217,0.45)",
                      textAlign: "center",
                    }}
                  >
                    {sub}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════ LANGUAGES ═════════════════════════════════════ */}
        <section id="languages" className="max-w-4xl mx-auto px-5 sm:px-10 py-20">
          <div className="text-center mb-10">
            <h2
              className="text-3xl sm:text-4xl font-extrabold mb-3"
              style={{ fontFamily: "'Orbitron', sans-serif", color: dark ? WHITE : "#0f172a", letterSpacing: "0.03em" }}
            >
              Languages we support
            </h2>
            <p className="text-lg" style={{ color: textMuted, fontFamily: "'Space Grotesk', sans-serif" }}>
              African languages first — with more added continuously.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {LANGUAGES.map((l) => (
              <div
                key={l.code}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all hover:-translate-y-0.5 duration-150"
                style={{
                  background: dark ? "#242424" : "rgba(255,255,255,0.9)",
                  borderColor: dark ? "rgba(60,110,113,0.2)" : "rgba(60,110,113,0.15)",
                  color: dark ? LGRAY : "#374151",
                  boxShadow: dark ? "none" : "0 2px 8px rgba(0,0,0,0.05)",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = `${TEAL}60`; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 10px ${TEAL}20`; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = dark ? "rgba(60,110,113,0.2)" : "rgba(60,110,113,0.15)"; (e.currentTarget as HTMLDivElement).style.boxShadow = dark ? "none" : "0 2px 8px rgba(0,0,0,0.05)"; }}
              >
                <span className="text-xl">{l.flag}</span>
                <span>{l.nativeLabel}</span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold ml-1"
                  style={{ background: `${TEAL}22`, color: TEAL, fontFamily: "'Orbitron', sans-serif" }}
                >
                  {l.code.toUpperCase()}
                </span>
              </div>
            ))}
            <div
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border"
              style={{
                borderColor: dark ? "rgba(60,110,113,0.15)" : "rgba(0,0,0,0.06)",
                color: textMuted,
                background: "transparent",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              + more coming soon
            </div>
          </div>
        </section>

        {/* ══════════════════════ FINAL CTA ═════════════════════════════════════ */}
        <section
          id="about"
          className="py-20 border-t"
          style={{
            borderColor: borderSub,
            background: dark ? `linear-gradient(135deg, rgba(60,110,113,0.07), rgba(40,75,99,0.07))` : `linear-gradient(135deg, rgba(60,110,113,0.05), rgba(40,75,99,0.04))`,
          }}
        >
          <div className="max-w-xl mx-auto px-5 text-center">
            <h2
              className="text-3xl sm:text-4xl font-extrabold mb-4"
              style={{ fontFamily: "'Orbitron', sans-serif", color: dark ? WHITE : "#0f172a", letterSpacing: "0.03em" }}
            >
              Ready to meet without limits?
            </h2>
            <p
              className="text-lg mb-8"
              style={{ color: textMuted, fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Free, instant, no account required. Just click and start.
            </p>
            <button
              onClick={() => { const el = document.getElementById("join-card"); el?.scrollIntoView({ behavior: "smooth" }); }}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-white text-lg transition-all active:scale-95"
              style={{
                background: `linear-gradient(135deg, ${TEAL}, ${NAVY})`,
                boxShadow: `0 6px 32px ${TEAL}55`,
                fontFamily: "'Space Grotesk', sans-serif",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 8px 40px ${TEAL}70`; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 6px 32px ${TEAL}55`; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}
            >
              Start a free meeting
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
            {!isLoggedIn && (
              <p className="mt-4 text-sm" style={{ color: textMuted, fontFamily: "'Space Grotesk', sans-serif" }}>
                Want to schedule meetings?{" "}
                <a href="/auth" style={{ color: TEAL, fontWeight: 600, textDecoration: "none" }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                >
                  Create a free account →
                </a>
              </p>
            )}
          </div>
        </section>

      </main>

      {/* ══════════════════════ FOOTER ════════════════════════════════════════ */}
      <footer
        className="relative border-t py-8"
        style={{ zIndex: 2, borderColor: borderSub }}
      >
        <div className="max-w-6xl mx-auto px-5 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left: logo + tagline */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <KalamLogo size={28} />
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
              <span
                style={{
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: 13,
                  fontWeight: 700,
                  color: dark ? WHITE : "#181818",
                }}
              >
                KalamAI
              </span>
              <span
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 9,
                  fontWeight: 500,
                  color: TEAL,
                  letterSpacing: "0.06em",
                }}
              >
                by Abdel-aziz Harane
              </span>
            </div>
            <span
              style={{
                fontSize: 11,
                color: textMuted,
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              · Sovereign multilingual video conferencing for Africa
            </span>
          </div>

          {/* Right: badges + creator credit */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontSize: 11,
              color: textMuted,
              fontFamily: "'Space Grotesk', sans-serif",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <span>🔒 E2E Encrypted</span>
            <span>🌍 Africa-first</span>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                paddingLeft: 14,
                borderLeft: `1px solid ${borderSub}`,
              }}
            >
              {/* Creator avatar */}
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${TEAL}, ${NAVY})`,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: 9,
                  fontWeight: 700,
                  color: WHITE,
                  flexShrink: 0,
                  boxShadow: `0 0 8px ${TEAL}50`,
                }}
              >
                A
              </span>
              Created by{" "}
              <span style={{ color: dark ? LGRAY : "#374151", fontWeight: 600 }}>
                Abdel-aziz Harane
              </span>
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
