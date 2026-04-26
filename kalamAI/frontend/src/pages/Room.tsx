/**
 * Room.tsx — Live meeting room page.
 *
 * Renders the WebRTC video grid, a draggable floating control toolbar,
 * floating emoji reactions, and optional side panels (chat / participants).
 *
 * Toolbar behaviour:
 *   • Free-float: drag anywhere on screen.
 *   • Edge-snap: releasing within EDGE_THRESHOLD px of the left or right
 *     viewport edge collapses the toolbar into a small bubble docked to that
 *     edge.  Clicking the bubble expands a vertical control panel.
 */

import React, {
  useEffect, useRef, useState, useCallback,
  useContext, createContext,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRoomStore } from "../store/roomStore";
import { useTranslation } from "../hooks/useTranslation";
import { useWebRTC } from "../hooks/useWebRTC";
import { useSounds } from "../hooks/useSounds";
import { useRecording } from "../hooks/useRecording";
import { useBackgroundBlur } from "../hooks/useBackgroundBlur";
import { useTheme } from "../hooks/useTheme";
import { LANGUAGES, type LanguageCode } from "../types";
import VideoLayout from "../components/VideoLayout";
import ChatPanel from "../components/ChatPanel";
import ParticipantsPanel from "../components/ParticipantsPanel";
import clsx from "clsx";
import type { Reaction } from "../hooks/useWebRTC";

// ─── Constants ────────────────────────────────────────────────────────────────

const EMOJIS = ["👍", "❤️", "😂", "😮", "👏", "🎉", "🙏", "🔥"];

/** Pixels from left/right viewport edge that triggers edge-snap on release. */
const EDGE_THRESHOLD = 70;

// ─── Pill orientation context ─────────────────────────────────────────────────

/**
 * Consumed by PillDivider to flip between a vertical separator (horizontal
 * pill layout) and a horizontal separator (vertical/edge panel layout).
 */
const PillCtx = createContext<{ vertical: boolean }>({ vertical: false });

// ─── Toolbar position state ───────────────────────────────────────────────────

type PillMode =
  | { kind: "default" }
  | { kind: "float"; x: number; y: number }
  | { kind: "edge";   side: "left" | "right"; y: number; open: boolean }  // vertical bubble
  | { kind: "edge-h"; side: "top"  | "bottom"; x: number; open: boolean }; // horizontal bubble

// ─── KalamAI Logo ─────────────────────────────────────────────────────────────

/**
 * Brand logo: four audio-equalizer bars inside a gradient rounded-square.
 * Represents global multilingual voice communication.
 */
function KalamLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-label="KalamAI">
      <defs>
        <linearGradient id="kl-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3C6E71" />
          <stop offset="100%" stopColor="#284B63" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="8" fill="url(#kl-grad)" />
      {/* Equalizer bars — bottom-aligned, heights 10 / 15 / 12 / 18 */}
      <rect x="6.5"  y="16" width="3.5" height="10" rx="1.75" fill="white" opacity="0.95" />
      <rect x="11.5" y="11" width="3.5" height="15" rx="1.75" fill="white" opacity="0.95" />
      <rect x="16.5" y="14" width="3.5" height="12" rx="1.75" fill="white" opacity="0.95" />
      <rect x="21.5" y="8"  width="3.5" height="18" rx="1.75" fill="white" opacity="0.95" />
    </svg>
  );
}

// ─── DraggablePill ────────────────────────────────────────────────────────────

/**
 * Wraps the control toolbar with drag-and-drop positioning.
 *
 * Three render states:
 *   1. Default   – fixed bottom-centre (no drag yet).
 *   2. Float     – follows drag; stays within viewport.
 *   3. Edge snap – released near left/right edge → collapses to a small
 *                  docked bubble; clicking expands a vertical panel.
 */
function DraggablePill({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<PillMode>({ kind: "default" });
  const [isDragging, setIsDragging] = useState(false);
  const drag = useRef<{
    startX: number; startY: number; origX: number; origY: number;
    w: number; h: number;
  } | null>(null);
  // Tracks whether pointer moved enough to count as a drag (vs. a click)
  const didDrag = useRef(false);

  const getRect = useCallback(
    () => ref.current?.getBoundingClientRect() ?? new DOMRect(),
    [],
  );

  const clampY = useCallback(
    (y: number, h: number) => Math.max(8, Math.min(window.innerHeight - h - 8, y)),
    [],
  );

  /**
   * Begins a drag gesture; skips interactive children.
   * `override` provides explicit position/size when ref is not attached (edge bubbles).
   */
  const beginDrag = useCallback((
    clientX: number, clientY: number, target: EventTarget | null,
    override?: { x: number; y: number; w: number; h: number },
  ) => {
    if ((target as HTMLElement)?.closest("button, input, select")) return;
    let origX: number, origY: number, w: number, h: number;
    if (override) {
      ({ x: origX, y: origY, w, h } = override);
    } else {
      const r = getRect();
      origX = r.left; origY = r.top; w = r.width; h = r.height;
    }
    drag.current = { startX: clientX, startY: clientY, origX, origY, w, h };
    didDrag.current = false;
    setIsDragging(true);
  }, [getRect]);

  useEffect(() => {
    const DRAG_THRESHOLD = 5;

    const onMove = (e: MouseEvent) => {
      if (!drag.current) return;
      const dx = e.clientX - drag.current.startX;
      const dy = e.clientY - drag.current.startY;
      if (!didDrag.current && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
      didDrag.current = true;
      const { w, h } = drag.current;
      const nx = Math.max(0, Math.min(window.innerWidth - w, drag.current.origX + dx));
      const ny = clampY(drag.current.origY + dy, h);
      setMode({ kind: "float", x: nx, y: ny });
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!drag.current) return;
      const t = e.touches[0];
      const dx = t.clientX - drag.current.startX;
      const dy = t.clientY - drag.current.startY;
      if (!didDrag.current && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
      didDrag.current = true;
      const { w, h } = drag.current;
      const nx = Math.max(0, Math.min(window.innerWidth - w, drag.current.origX + dx));
      const ny = clampY(drag.current.origY + dy, h);
      setMode({ kind: "float", x: nx, y: ny });
      e.preventDefault();
    };

    /** On release: snap to nearest edge or stay floating. */
    const settle = (clientX: number, clientY: number) => {
      if (!drag.current) return;
      if (!didDrag.current) {
        // Tap without movement — reset drag state, let click fire naturally
        drag.current = null;
        setIsDragging(false);
        return;
      }
      const { w, h } = drag.current;
      const nx = drag.current.origX + (clientX - drag.current.startX);
      const ny = clampY(drag.current.origY + (clientY - drag.current.startY), h);

      if (nx <= EDGE_THRESHOLD) {
        setMode({ kind: "edge", side: "left", y: ny, open: false });
      } else if (nx + w >= window.innerWidth - EDGE_THRESHOLD) {
        setMode({ kind: "edge", side: "right", y: ny, open: false });
      } else if (ny <= EDGE_THRESHOLD) {
        setMode({ kind: "edge-h", side: "top", x: nx, open: false });
      } else if (ny + h >= window.innerHeight - EDGE_THRESHOLD) {
        setMode({ kind: "edge-h", side: "bottom", x: nx, open: false });
      } else {
        setMode({ kind: "float", x: Math.max(8, Math.min(window.innerWidth - w - 8, nx)), y: ny });
      }
      drag.current = null;
      setIsDragging(false);
    };

    const onUp = (e: MouseEvent) => settle(e.clientX, e.clientY);
    const onTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length > 0) settle(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      else { drag.current = null; setIsDragging(false); }
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [getRect, clampY]);

  // ── Collapsed edge bubble — vertical (left / right) ───────────────────────
  if (mode.kind === "edge" && !mode.open) {
    const { side, y } = mode;
    return (
      <div
        ref={ref}
        style={{ position: "fixed", [side]: 0, top: y, zIndex: 50, userSelect: "none" }}
        onMouseDown={(e) => beginDrag(e.clientX, e.clientY, e.target, {
          x: side === "left" ? 0 : window.innerWidth - 36,
          y, w: 36, h: 56,
        })}
        onTouchStart={(e) => {
          const t = e.touches[0];
          beginDrag(t.clientX, t.clientY, e.target, {
            x: side === "left" ? 0 : window.innerWidth - 36,
            y, w: 36, h: 56,
          });
        }}
      >
        <div
          className={clsx(
            "w-9 h-14 flex flex-col items-center justify-center gap-1.5",
            "transition-all duration-150 hover:opacity-90",
            side === "left" ? "rounded-r-2xl" : "rounded-l-2xl",
          )}
          style={{
            background: "rgba(15,22,23,0.97)",
            backdropFilter: "blur(32px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderLeft: side === "left" ? "none" : undefined,
            borderRight: side === "right" ? "none" : undefined,
            boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
          }}
        >
          {/* Expand button — chevron arrow */}
          <button
            onClick={() => setMode({ ...mode, open: true })}
            title="Expand controls"
            className="flex items-center justify-center w-full pt-1.5"
          >
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d={side === "left" ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
            </svg>
          </button>
          {/* Drag dots — mousedown starts drag */}
          <div className="flex flex-col gap-0.5 pb-1.5 cursor-grab" title="Drag to move">
            {[0, 1, 2].map((i) => (
              <span key={i} className="w-1 h-1 bg-gray-500 rounded-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Expanded edge panel — vertical (left / right) ─────────────────────────
  if (mode.kind === "edge" && mode.open) {
    const { side, y } = mode;
    const MIN_H = 440;
    const panelTop = Math.max(8, Math.min(y, window.innerHeight - MIN_H - 8));
    const maxH    = window.innerHeight - panelTop - 8;
    return (
      <PillCtx.Provider value={{ vertical: true }}>
        <div
          style={{ position: "fixed", [side]: 0, top: panelTop, zIndex: 50, userSelect: "none" }}
          onMouseDown={(e) => beginDrag(e.clientX, e.clientY, e.target, {
            x: side === "left" ? 0 : window.innerWidth - (ref.current?.offsetWidth ?? 72),
            y: panelTop,
            w: ref.current?.offsetWidth ?? 72,
            h: ref.current?.offsetHeight ?? MIN_H,
          })}
          onTouchStart={(e) => {
            const t = e.touches[0];
            beginDrag(t.clientX, t.clientY, e.target, {
              x: side === "left" ? 0 : window.innerWidth - (ref.current?.offsetWidth ?? 72),
              y: panelTop,
              w: ref.current?.offsetWidth ?? 72,
              h: ref.current?.offsetHeight ?? MIN_H,
            });
          }}
        >
          <div
            ref={ref}
            className={clsx(
              "flex flex-col items-center gap-0.5 px-2.5 py-2.5 overflow-y-auto",
              side === "left" ? "rounded-r-3xl" : "rounded-l-3xl",
            )}
            style={{
              maxHeight: maxH,
              background: "rgba(15,22,23,0.97)",
              backdropFilter: "blur(32px)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderLeft: side === "left" ? "none" : undefined,
              borderRight: side === "right" ? "none" : undefined,
              boxShadow: "0 8px 40px rgba(0,0,0,0.7)",
              scrollbarWidth: "none",
            }}
          >
            {/* Drag handle — 3 horizontal lines */}
            <div className="flex flex-col gap-[3px] items-center justify-center w-6 h-5 mb-0.5 opacity-30 hover:opacity-60 cursor-grab shrink-0" title="Drag to move">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-5 h-0.5 bg-gray-400 rounded-full" />
              ))}
            </div>
            {/* Collapse button */}
            <button
              onClick={() => setMode({ ...mode, open: false })}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 flex items-center justify-center mb-1 shrink-0"
              title="Collapse"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d={side === "left" ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
              </svg>
            </button>
            {children}
          </div>
        </div>
      </PillCtx.Provider>
    );
  }

  // ── Collapsed edge bubble — horizontal (top / bottom) ─────────────────────
  if (mode.kind === "edge-h" && !mode.open) {
    const { side, x } = mode;
    const bubbleLeft = Math.max(8, Math.min(x, window.innerWidth - 64));
    return (
      <div
        ref={ref}
        style={{ position: "fixed", [side]: 0, left: bubbleLeft, zIndex: 50, userSelect: "none" }}
        onMouseDown={(e) => beginDrag(e.clientX, e.clientY, e.target, {
          x: bubbleLeft,
          y: side === "top" ? 0 : window.innerHeight - 36,
          w: 56, h: 36,
        })}
        onTouchStart={(e) => {
          const t = e.touches[0];
          beginDrag(t.clientX, t.clientY, e.target, {
            x: bubbleLeft,
            y: side === "top" ? 0 : window.innerHeight - 36,
            w: 56, h: 36,
          });
        }}
      >
        <div
          className={clsx(
            "h-9 w-14 flex items-center justify-center gap-1 transition-all duration-150 hover:opacity-90",
            side === "top" ? "rounded-b-2xl" : "rounded-t-2xl",
          )}
          style={{
            background: "rgba(15,22,23,0.97)",
            backdropFilter: "blur(32px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderTop: side === "top" ? "none" : undefined,
            borderBottom: side === "bottom" ? "none" : undefined,
            boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
          }}
        >
          {/* Expand button — chevron arrow */}
          <button
            onClick={() => setMode({ ...mode, open: true })}
            title="Expand controls"
            className="flex items-center justify-center flex-1 h-full pl-1.5"
          >
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d={side === "top" ? "M19 9l-7 7-7-7" : "M5 15l7-7 7 7"} />
            </svg>
          </button>
          {/* Drag dots */}
          <div className="flex flex-col gap-0.5 pr-1.5 cursor-grab" title="Drag to move">
            {[0, 1, 2].map((i) => (
              <span key={i} className="w-1 h-1 bg-gray-500 rounded-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Expanded edge panel — horizontal (top / bottom) ───────────────────────
  if (mode.kind === "edge-h" && mode.open) {
    const { side, x } = mode;
    const panelLeft = Math.max(8, Math.min(x, window.innerWidth - 600));
    return (
      <PillCtx.Provider value={{ vertical: false }}>
        <div
          style={{ position: "fixed", [side]: 0, left: panelLeft, zIndex: 50, userSelect: "none" }}
          onMouseDown={(e) => beginDrag(e.clientX, e.clientY, e.target, {
            x: panelLeft,
            y: side === "top" ? 0 : window.innerHeight - (ref.current?.offsetHeight ?? 72),
            w: ref.current?.offsetWidth ?? 600,
            h: ref.current?.offsetHeight ?? 72,
          })}
          onTouchStart={(e) => {
            const t = e.touches[0];
            beginDrag(t.clientX, t.clientY, e.target, {
              x: panelLeft,
              y: side === "top" ? 0 : window.innerHeight - (ref.current?.offsetHeight ?? 72),
              w: ref.current?.offsetWidth ?? 600,
              h: ref.current?.offsetHeight ?? 72,
            });
          }}
        >
          <div
            ref={ref}
            className={clsx(
              "flex items-center gap-0.5 px-2 py-2.5 overflow-x-auto",
              "max-w-[calc(100vw-24px)]",
              side === "top" ? "rounded-b-3xl" : "rounded-t-3xl",
            )}
            style={{
              background: "rgba(15,22,23,0.97)",
              backdropFilter: "blur(32px)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderTop: side === "top" ? "none" : undefined,
              borderBottom: side === "bottom" ? "none" : undefined,
              boxShadow: "0 8px 40px rgba(0,0,0,0.7)",
              scrollbarWidth: "none",
            }}
          >
            {/* Drag handle */}
            <div className="flex flex-col gap-[3px] items-center justify-center w-5 h-6 mr-0.5 opacity-30 hover:opacity-60 cursor-grab shrink-0" title="Drag to move">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-4 h-0.5 bg-gray-400 rounded-full" />
              ))}
            </div>
            {/* Collapse button */}
            <button
              onClick={() => setMode({ ...mode, open: false })}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 flex items-center justify-center mr-1 shrink-0"
              title="Collapse"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d={side === "top" ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
              </svg>
            </button>
            {children}
          </div>
        </div>
      </PillCtx.Provider>
    );
  }

  // ── Default / free-floating horizontal pill ────────────────────────────────
  const floatStyle: React.CSSProperties = mode.kind === "float"
    ? { position: "fixed", left: mode.x, top: mode.y, zIndex: 50, cursor: isDragging ? "grabbing" : "grab" }
    : { position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 50, cursor: "grab" };

  return (
    <PillCtx.Provider value={{ vertical: false }}>
      <div
        ref={ref}
        style={floatStyle}
        onMouseDown={(e) => beginDrag(e.clientX, e.clientY, e.target)}
        onTouchStart={(e) => { const t = e.touches[0]; beginDrag(t.clientX, t.clientY, e.target); }}
      >
        <div
          className="flex items-center gap-0.5 px-2 py-2.5 rounded-full border border-white/[0.07] max-w-[calc(100vw-24px)] overflow-x-auto"
          style={{
            background: "rgba(15,22,23,0.97)",
            backdropFilter: "blur(32px)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          <GrabHandle />
          {children}
        </div>
      </div>
    </PillCtx.Provider>
  );
}

// ─── Pill sub-components ──────────────────────────────────────────────────────

/**
 * Separator between control groups.
 * Renders vertically in horizontal pill mode, horizontally in edge-panel mode.
 */
function PillDivider() {
  const { vertical } = useContext(PillCtx);
  return vertical
    ? <div className="h-px w-7 bg-white/[0.08] shrink-0 my-0.5" />
    : <div className="w-px h-7 bg-white/[0.08] shrink-0 mx-0.5" />;
}

/** Grip dots rendered at the start of the horizontal pill to invite dragging. */
function GrabHandle() {
  const { vertical } = useContext(PillCtx);
  if (vertical) return null;
  return (
    <div className="flex flex-col gap-[3px] items-center justify-center w-5 px-0.5 opacity-30 hover:opacity-60 transition-opacity shrink-0 select-none cursor-grab">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-[3px]">
          <span className="w-1 h-1 rounded-full bg-gray-400" />
          <span className="w-1 h-1 rounded-full bg-gray-400" />
        </div>
      ))}
    </div>
  );
}

/** Round icon button with optional label and notification badge. */
function CtrlBtn({
  onClick, active = true, danger = false, highlight = false,
  label, children, badge, title,
}: {
  onClick?: () => void;
  active?: boolean;
  danger?: boolean;
  highlight?: boolean;
  label?: string;
  children: React.ReactNode;
  badge?: number;
  title?: string;
}) {
  return (
    <div className="relative flex flex-col items-center gap-0.5 shrink-0">
      <button
        onClick={onClick}
        title={title}
        className={clsx(
          "w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center",
          "transition-all duration-150 active:scale-90 focus:outline-none relative",
          danger
            ? "bg-red-500 hover:bg-red-600 text-white"
            : highlight
            ? "bg-teal-700/25 hover:bg-teal-700/35 text-teal-300 ring-1 ring-teal-600/40"
            : active
            ? "bg-white/10 hover:bg-white/15 text-white"
            : "bg-red-500/20 hover:bg-red-500/30 text-red-400 ring-1 ring-red-500/20",
        )}
      >
        {children}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-teal-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 border-2 border-[#0d1a1b]">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </button>
      {label && (
        <span className={clsx(
          "text-[9px] font-medium leading-none hidden sm:block",
          danger ? "text-red-400" : highlight ? "text-teal-400" : active ? "text-gray-400" : "text-red-400",
        )}>
          {label}
        </span>
      )}
    </div>
  );
}

// ─── Popovers ─────────────────────────────────────────────────────────────────

/**
 * Generic floating popover anchored ~90px above the viewport bottom-centre.
 * Closes when clicking outside.
 */
function FixedPopover({ children, onClose, className = "", style }: {
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={clsx(
        "fixed left-1/2 -translate-x-1/2 bottom-[90px]",
        "border border-white/10 rounded-2xl shadow-2xl z-[60]",
        className,
      )}
      style={{ background: "rgba(10,22,23,0.97)", backdropFilter: "blur(24px)", ...style }}
    >
      {children}
    </div>
  );
}

/** Dual-slider panel to independently adjust original voice and AI translation volumes. */
function VolumePanel({ originalVolume, translationVolume, setOriginalVolume, setTranslationVolume, onClose }: {
  originalVolume: number;
  translationVolume: number;
  setOriginalVolume: (v: number) => void;
  setTranslationVolume: (v: number) => void;
  onClose: () => void;
}) {
  return (
    <FixedPopover onClose={onClose} className="w-64 p-4">
      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-3">Volumes</p>
      <div className="space-y-4">
        {[
          { label: "Original voice", value: originalVolume, set: setOriginalVolume },
          { label: "AI translation", value: translationVolume, set: setTranslationVolume },
        ].map(({ label, value, set }) => (
          <div key={label}>
            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
              <span>{label}</span>
              <span className="font-mono text-teal-400">{value}%</span>
            </div>
            <input
              type="range" min={0} max={100} value={value}
              onChange={(e) => set(Number(e.target.value))}
              className="w-full h-1.5 accent-teal-600 cursor-pointer"
            />
          </div>
        ))}
      </div>
    </FixedPopover>
  );
}

/** Scrollable list of supported listening languages with a checkmark on the active one. */
function LangPanel({ current, onChange, onClose }: {
  current: LanguageCode;
  onChange: (l: LanguageCode) => void;
  onClose: () => void;
}) {
  return (
    <FixedPopover onClose={onClose} className="w-56 overflow-hidden">
      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider px-3 pt-3 pb-1">
        Listening language
      </p>
      <div className="max-h-64 overflow-y-auto pb-2">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => { onChange(lang.code as LanguageCode); onClose(); }}
            className={clsx(
              "w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 text-left transition-colors",
              lang.code === current && "bg-teal-700/20",
            )}
          >
            <img
              src={`https://flagcdn.com/20x15/${lang.countryCode}.png`}
              alt={lang.nativeLabel}
              width={20} height={15}
              className="rounded-sm object-cover shrink-0"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
            />
            <div className="flex-1 min-w-0">
              <div className={clsx(
                "text-sm font-medium truncate",
                lang.code === current ? "text-teal-400" : "text-gray-200",
              )}>
                {lang.nativeLabel}
              </div>
            </div>
            {lang.code === current && (
              <svg className="w-3.5 h-3.5 text-teal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </FixedPopover>
  );
}

/** 4×2 emoji grid for quick reactions. */
function EmojiPanel({ onPick, onClose }: { onPick: (e: string) => void; onClose: () => void }) {
  return (
    <FixedPopover onClose={onClose} className="p-2">
      <div className="grid grid-cols-4 gap-1">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => { onPick(emoji); onClose(); }}
            className="w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center text-2xl transition-all active:scale-90"
          >
            {emoji}
          </button>
        ))}
      </div>
    </FixedPopover>
  );
}

type BgLevel = 0 | 1 | 2;

/** Background blur panel — uses AI portrait segmentation via useBackgroundBlur. */
function BackgroundPanel({ level, onChange, onClose }: {
  level: BgLevel;
  onChange: (l: BgLevel) => void;
  onClose: () => void;
}) {
  return (
    <FixedPopover onClose={onClose} className="w-56 p-3">
      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-3">Background blur</p>
      <div className="grid grid-cols-3 gap-2">
        {([
          { label: "None",  value: 0 as BgLevel },
          { label: "Blur",  value: 1 as BgLevel },
          { label: "Blur+", value: 2 as BgLevel },
        ] as const).map(({ label, value }) => (
          <button
            key={value}
            onClick={() => onChange(value)}
            className={clsx(
              "flex flex-col items-center gap-2 py-3 px-1 rounded-xl border text-xs font-medium transition-all active:scale-95",
              level === value
                ? "bg-teal-700/25 border-teal-600/40 text-teal-300"
                : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10",
            )}
          >
            {/* Portrait-mode preview: blurred background + sharp person silhouette */}
            <div className="w-10 h-7 rounded-lg overflow-hidden relative shrink-0">
              <div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(135deg, #3C6E71aa, #284B63aa)",
                  filter: value > 0 ? `blur(${value === 1 ? 2 : 4}px)` : "none",
                  transform: value > 0 ? "scale(1.15)" : "none",
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-0.5 gap-0">
                <div className="w-3 h-3 rounded-full bg-white/85 shrink-0" />
                <div className="w-4 h-2.5 rounded-t-full bg-white/85 shrink-0" />
              </div>
            </div>
            <span>{label}</span>
          </button>
        ))}
      </div>
      {level > 0 && (
        <p className="text-[10px] text-teal-500/70 mt-2 text-center leading-tight">
          AI segments background only — portrait mode
        </p>
      )}
    </FixedPopover>
  );
}

// ─── Floating reactions ────────────────────────────────────────────────────────

/** Displays the latest reactions from all participants, fading in from below-left. */
function ReactionsOverlay({ reactions }: { reactions: Reaction[] }) {
  return (
    <div className="fixed bottom-28 left-4 pointer-events-none z-20 flex flex-col-reverse gap-2">
      {reactions.slice(-6).map((r) => (
        <div
          key={r.id}
          className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10"
          style={{ animation: "fadeInUp 0.2s ease-out" }}
        >
          <span className="text-xl">{r.emoji}</span>
          <span className="text-xs text-white font-medium">{r.name}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Room page ────────────────────────────────────────────────────────────

type Panel = "participants" | "chat" | null;

/** Top-level meeting room view. Composes WebRTC, video layout, controls, and panels. */
export default function Room() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const {
    participant, isHost, listeningLanguage, isTranslating,
    isMicOn, isCamOn, originalVolume, translationVolume,
    toggleMic, toggleCam, setListeningLanguage,
    setOriginalVolume, setTranslationVolume, reset,
  } = useRoomStore();

  const { isDark, toggle: toggleTheme } = useTheme();

  const [copied, setCopied] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showBg, setShowBg] = useState(false);
  const [blurLevel, setBlurLevel] = useState<BgLevel>(0);
  const [activePanel, setActivePanel] = useState<Panel>(null);
  const [lastSeenChatCount, setLastSeenChatCount] = useState(0);
  const [showRecordHint, setShowRecordHint] = useState(false);

  const { playTamTam, playChime, playJoin, playLeave, playMessage, playSuccess, playRecordStart } = useSounds();
  const { isRecording, toggleRecording, recordingTime, recordingError } = useRecording();

  // Redirect to home if participant state is missing (e.g. page refresh)
  useEffect(() => { if (!participant) navigate("/"); }, [participant, navigate]);

  const roomCode = code?.toUpperCase() ?? "";

  const handleKick = useCallback(() => {
    reset();
    navigate("/");
  }, [reset, navigate]);

  const {
    localStream, peers, chatMessages, reactions,
    sendChat, sendReaction,
    isScreenSharing, toggleScreenShare,
    isHandRaised, raisedHands, toggleHand,
    mutePeer, camOffPeer, kickPeer,
    error: rtcError,
  } = useWebRTC(roomCode, participant?.id ?? "", participant?.name ?? "", handleKick);

  const blurredStream = useBackgroundBlur(localStream, blurLevel);

  useTranslation(roomCode, participant?.id ?? "");

  // ── Success sound on room entry ───────────────────────────────────────────
  useEffect(() => { playSuccess(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sound effects for join / leave ────────────────────────────────────────
  const prevPeerCount = useRef(0);
  useEffect(() => {
    if (peers.length > prevPeerCount.current) playJoin();
    else if (peers.length < prevPeerCount.current) playLeave();
    prevPeerCount.current = peers.length;
  }, [peers.length, playJoin, playLeave]);

  // ── Unread chat badge — derived, not state ────────────────────────────────
  // Update the "last seen" watermark only while chat is open
  useEffect(() => {
    if (activePanel === "chat") setLastSeenChatCount(chatMessages.length);
  }, [chatMessages.length, activePanel]);

  // Unread = messages that arrived after the user last had chat open
  const unreadChat = activePanel !== "chat"
    ? Math.max(0, chatMessages.length - lastSeenChatCount)
    : 0;

  // Notification ping whenever unread count rises
  const prevUnreadRef = useRef(0);
  useEffect(() => {
    if (unreadChat > prevUnreadRef.current) playMessage();
    prevUnreadRef.current = unreadChat;
  }, [unreadChat, playMessage]);

  if (!participant || !code) return null;

  const currentLang = LANGUAGES.find((l) => l.code === listeningLanguage)!;
  const leave = () => { reset(); navigate("/"); };

  const copyInvite = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${roomCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const togglePanel = (panel: Panel) => setActivePanel((p) => (p === panel ? null : panel));

  const closePopovers = () => {
    setShowVolume(false);
    setShowLang(false);
    setShowEmoji(false);
    setShowBg(false);
  };

  /** Raises hand and plays tam-tam percussion sound. */
  const handleToggleHand = () => {
    if (!isHandRaised) playTamTam();
    toggleHand();
  };

  /** Broadcasts emoji reaction and plays chime sound. */
  const handleSendReaction = (emoji: string) => {
    sendReaction(emoji);
    playChime();
  };

  // ── Theme-driven styles ───────────────────────────────────────────────────
  const rootBg   = isDark ? "#0d1a1b" : "#f0f4f4";
  const topBarBg = isDark
    ? "linear-gradient(to bottom, rgba(13,26,27,0.97) 0%, rgba(13,26,27,0) 100%)"
    : "linear-gradient(to bottom, rgba(240,244,244,0.97) 0%, rgba(240,244,244,0) 100%)";
  const topTextPrimary   = isDark ? "text-white"      : "text-slate-800";
  const topTextSecondary = isDark ? "text-gray-300"   : "text-slate-600";
  const roomCodeBg       = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
  const roomCodeBorder   = isDark ? "rgba(255,255,255,0.1)"  : "rgba(0,0,0,0.1)";

  // Shared control content — rendered inside both horizontal pill and vertical edge panel
  const controls = (
    <>
      {/* Microphone */}
      <CtrlBtn
        onClick={toggleMic}
        active={isMicOn}
        label={isMicOn ? "Mic" : "Muted"}
        title={isMicOn ? "Mute microphone" : "Unmute microphone"}
      >
        {isMicOn ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 10V5a3 3 0 00-3-3m0 0a3 3 0 00-3 3v6M3 3l18 18" />
          </svg>
        )}
      </CtrlBtn>

      {/* Camera */}
      <CtrlBtn
        onClick={toggleCam}
        active={isCamOn}
        label={isCamOn ? "Camera" : "Off"}
        title={isCamOn ? "Turn off camera" : "Turn on camera"}
      >
        {isCamOn ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2zM3 3l18 18" />
          </svg>
        )}
      </CtrlBtn>

      {/* Background blur */}
      <CtrlBtn
        onClick={() => { setShowBg((v) => !v); setShowLang(false); setShowVolume(false); setShowEmoji(false); }}
        highlight={showBg}
        label="Background"
        title="Background effects"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </CtrlBtn>

      {/* Screen share */}
      <CtrlBtn
        onClick={() => { closePopovers(); toggleScreenShare(); }}
        highlight={isScreenSharing}
        active={!isScreenSharing}
        label={isScreenSharing ? "Stop" : "Share"}
        title={isScreenSharing ? "Stop sharing" : "Share screen"}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </CtrlBtn>

      {/* Raise hand */}
      <CtrlBtn
        onClick={() => { closePopovers(); handleToggleHand(); }}
        highlight={isHandRaised}
        active={!isHandRaised}
        label={isHandRaised ? "Lower" : "Hand"}
        title={isHandRaised ? "Lower hand" : "Raise hand"}
      >
        <span className="text-lg leading-none">✋</span>
      </CtrlBtn>

      <PillDivider />

      {/* Emoji reactions */}
      <CtrlBtn
        onClick={() => { setShowEmoji((v) => !v); setShowLang(false); setShowVolume(false); setShowBg(false); }}
        highlight={showEmoji}
        label="Reactions"
        title="Send a reaction"
      >
        <span className="text-lg leading-none">😊</span>
      </CtrlBtn>

      {/* Listening language selector */}
      <div className="relative flex flex-col items-center gap-0.5 shrink-0">
        <button
          onClick={() => { setShowLang((v) => !v); setShowVolume(false); setShowEmoji(false); setShowBg(false); }}
          title="Listening language"
          className={clsx(
            "w-10 h-10 sm:w-11 sm:h-11 rounded-full transition-all flex items-center justify-center active:scale-90",
            showLang ? "bg-teal-700/25 ring-1 ring-teal-600/40" : "bg-white/10 hover:bg-white/15",
          )}
        >
          <img
              src={`https://flagcdn.com/20x15/${currentLang.countryCode}.png`}
              alt={currentLang.nativeLabel}
              width={20} height={15}
              className="rounded-sm object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
            />
        </button>
        <span className="text-[9px] font-medium text-gray-400 leading-none hidden sm:block">
          {currentLang.code.toUpperCase()}
        </span>
      </div>

      {/* Volume */}
      <div className="relative flex flex-col items-center gap-0.5 shrink-0">
        <button
          onClick={() => { setShowVolume((v) => !v); setShowLang(false); setShowEmoji(false); setShowBg(false); }}
          title="Adjust volumes"
          className={clsx(
            "w-10 h-10 sm:w-11 sm:h-11 rounded-full transition-all flex items-center justify-center active:scale-90",
            showVolume
              ? "bg-cyan-500/20 ring-1 ring-cyan-500/40 text-teal-300"
              : "bg-white/10 hover:bg-white/15 text-gray-300",
          )}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536a5 5 0 000 7.072" />
          </svg>
        </button>
        <span className="text-[9px] font-medium text-gray-400 leading-none hidden sm:block">Volume</span>
      </div>

      {/* AI translation status indicator */}
      <div className="flex flex-col items-center gap-0.5 shrink-0">
        <div className={clsx(
          "w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center relative",
          isTranslating ? "bg-emerald-500/15 text-emerald-400" : "bg-white/10 text-gray-600",
        )}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
          </svg>
          {isTranslating && (
            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-pulse border-2 border-[#0d1a1b]" />
          )}
        </div>
        <span className={clsx("text-[9px] font-medium leading-none hidden sm:block",
          isTranslating ? "text-emerald-400" : "text-gray-600")}>AI</span>
      </div>

      <PillDivider />

      {/* Participants panel */}
      <CtrlBtn
        onClick={() => { closePopovers(); togglePanel("participants"); }}
        highlight={activePanel === "participants"}
        label="Members"
        badge={peers.length + 1}
        title="Participants"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </CtrlBtn>

      {/* Chat panel */}
      <CtrlBtn
        onClick={() => { closePopovers(); togglePanel("chat"); }}
        highlight={activePanel === "chat"}
        label="Chat"
        badge={unreadChat}
        title="Chat"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </CtrlBtn>

      {/* Recording — host only */}
      {isHost && (
        <>
          <PillDivider />
          <CtrlBtn
            onClick={() => {
              closePopovers();
              if (!isRecording && !localStorage.getItem("kalamai_rec_hint_seen")) {
                setShowRecordHint(true);
              } else {
                if (!isRecording) playRecordStart();
                toggleRecording();
              }
            }}
            highlight={isRecording}
            label={isRecording ? recordingTime : "REC"}
            title={isRecording ? `Stop recording (${recordingTime})` : "Record meeting (host only)"}
          >
          {isRecording ? (
            <span className="relative flex items-center justify-center">
              <span className="w-3.5 h-3.5 rounded-sm bg-red-400" />
              <span className="absolute inset-0 rounded-full animate-ping bg-red-400/20" />
            </span>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="12" r="4" strokeWidth={2} />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          )}
          </CtrlBtn>
        </>
      )}

      <PillDivider />

      {/* Leave */}
      <div className="flex flex-col items-center gap-0.5 shrink-0">
        <button
          onClick={leave}
          title="Leave meeting"
          className="h-10 sm:h-11 px-4 sm:px-5 rounded-full flex items-center gap-1.5 font-semibold text-white text-sm transition-all active:scale-90"
          style={{
            background: "linear-gradient(135deg, #ef4444, #dc2626)",
            boxShadow: "0 4px 16px rgba(239,68,68,0.35)",
          }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="hidden sm:inline">Leave</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>

      <div className="h-screen flex flex-col overflow-hidden" style={{ background: rootBg }}>

        {/* ── Top navigation bar ──────────────────────────────────────────── */}
        <div
          className="fixed top-0 left-0 right-0 flex items-center justify-between px-3 sm:px-5 py-2.5 z-40"
          style={{ background: topBarBg }}
        >
          {/* Left: logo + room code */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2">
              <KalamLogo size={32} />
              <div className="hidden sm:flex flex-col leading-none">
                <span className={clsx("font-bold text-sm tracking-wide", topTextPrimary)}>
                  KalamAI
                </span>
                <span className={clsx("text-[9px] tracking-wider", topTextSecondary)}>
                  by Abdel-aziz Harane
                </span>
              </div>
            </div>
            {/* Room code chip with copy button */}
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl backdrop-blur-sm"
              style={{ background: roomCodeBg, border: `1px solid ${roomCodeBorder}` }}
            >
              <span className={clsx("font-mono font-bold tracking-[0.2em] text-sm", topTextPrimary)}>
                {roomCode}
              </span>
              <button
                onClick={copyInvite}
                title="Copy invite link"
                className={clsx(
                  "flex items-center px-1 py-0.5 rounded text-[10px] font-medium transition-all",
                  copied ? "text-emerald-400" : `${topTextSecondary} hover:text-teal-400`,
                )}
              >
                {copied
                  ? <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                }
              </button>
            </div>
          </div>

          {/* Right: status badges + theme toggle + avatar */}
          <div className="flex items-center gap-2">

            {/* Recording live badge */}
            {isRecording && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-red-500/30 bg-red-500/10 animate-pulse">
                <span className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-xs text-red-400 font-mono font-bold">{recordingTime}</span>
              </div>
            )}

            {/* AI active badge + dark/light toggle */}
            <div className="hidden sm:flex items-center gap-1.5">
              {isTranslating && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-xs text-emerald-400 font-medium">AI active</span>
                </div>
              )}
              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                className={clsx(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                  isDark
                    ? "bg-white/10 hover:bg-white/15 text-yellow-300"
                    : "bg-black/5 hover:bg-black/10 text-slate-600",
                )}
              >
                {isDark ? (
                  /* Sun icon */
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                  </svg>
                ) : (
                  /* Moon icon */
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Hand-raised indicator */}
            {isHandRaised && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 animate-pulse">
                <span className="text-sm">✋</span>
                <span className="text-xs text-amber-400 font-medium hidden sm:inline">Hand raised</span>
              </div>
            )}

            {/* Participant avatar */}
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-teal-600/30"
                style={{ background: "linear-gradient(135deg, rgba(60,110,113,0.35), rgba(40,75,99,0.35))" }}
              >
                <span className="text-xs font-bold text-teal-300">
                  {participant.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className={clsx("text-sm truncate max-w-[80px] hidden sm:inline", topTextSecondary)}>
                {participant.name}
              </span>
            </div>

          </div>
        </div>

        {/* ── Main area: video grid + optional side panel ──────────────────── */}
        <div className="flex flex-1 overflow-hidden pt-12">
          <div className="flex-1 overflow-hidden">
            <VideoLayout
              local={{
                id: participant.id,
                name: participant.name,
                stream: blurredStream ?? localStream,
                isMicOn,
                isCamOn,
                isScreenSharing,
                isHandRaised,
              }}
              peers={peers}
              raisedHands={raisedHands}
              error={rtcError}
            />
          </div>

          {activePanel && (
            <div className={clsx(
              "flex flex-col overflow-hidden z-40",
              "fixed inset-x-0 top-12 bottom-0",
              "sm:relative sm:inset-auto sm:top-auto sm:bottom-auto sm:w-72 sm:shrink-0 sm:z-auto",
            )}>
              {activePanel === "participants" ? (
                <ParticipantsPanel
                  localName={participant.name}
                  isMicOn={isMicOn}
                  isCamOn={isCamOn}
                  isHandRaised={isHandRaised}
                  peers={peers}
                  raisedHands={raisedHands}
                  isHost={isHost}
                  onMutePeer={mutePeer}
                  onCamOffPeer={camOffPeer}
                  onKickPeer={kickPeer}
                  onClose={() => setActivePanel(null)}
                />
              ) : (
                <ChatPanel
                  messages={chatMessages}
                  onSend={sendChat}
                  onClose={() => setActivePanel(null)}
                />
              )}
            </div>
          )}
        </div>

        {/* ── Floating emoji reactions ──────────────────────────────────────── */}
        <ReactionsOverlay reactions={reactions} />

        {/* ── Recording error toast ─────────────────────────────────────────── */}
        {recordingError && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border border-red-500/30 bg-red-500/10 backdrop-blur-sm shadow-xl">
            <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <span className="text-sm text-red-300">{recordingError}</span>
          </div>
        )}

        {/* ── Recording hint modal (shown once before first recording) ──────── */}
        {showRecordHint && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div
              className="w-[340px] rounded-3xl border border-white/10 p-6 flex flex-col gap-4"
              style={{ background: "rgba(15,22,23,0.98)", backdropFilter: "blur(32px)", boxShadow: "0 24px 64px rgba(0,0,0,0.8)" }}
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 self-start"
                style={{ background: "linear-gradient(135deg, #3C6E71, #284B63)" }}>
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <circle cx="12" cy="12" r="4" strokeWidth={2} />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
              </div>

              <div>
                <h3 className="text-white font-bold text-lg mb-1">Record your meeting</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  A screen picker will appear — just like Teams, Zoom or Meet.
                  Select <span className="text-teal-300 font-semibold">"Entire Screen"</span> to record
                  everything including the meeting interface, or <span className="text-teal-300 font-semibold">"This Tab"</span> for the meeting only.
                </p>
              </div>

              {/* Visual hint */}
              <div className="flex items-center gap-3 rounded-2xl border border-teal-600/20 bg-teal-700/10 px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-teal-600/20 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <rect x="2" y="3" width="20" height="14" rx="2" strokeWidth={2} />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 21h8M12 17v4" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-teal-300">Select "Entire Screen" for full capture</p>
                  <p className="text-xs text-gray-500 mt-0.5">Records everything visible — just like Teams or Zoom</p>
                </div>
              </div>

              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setShowRecordHint(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-400 bg-white/5 hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem("kalamai_rec_hint_seen", "1");
                    setShowRecordHint(false);
                    playRecordStart();
                    toggleRecording();
                  }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
                  style={{ background: "linear-gradient(135deg, #3C6E71, #284B63)", boxShadow: "0 4px 16px rgba(60,110,113,0.4)" }}
                >
                  Start Recording
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Popovers ─────────────────────────────────────────────────────── */}
        {showVolume && (
          <VolumePanel
            originalVolume={originalVolume}
            translationVolume={translationVolume}
            setOriginalVolume={setOriginalVolume}
            setTranslationVolume={setTranslationVolume}
            onClose={() => setShowVolume(false)}
          />
        )}
        {showLang && (
          <LangPanel
            current={listeningLanguage}
            onChange={setListeningLanguage}
            onClose={() => setShowLang(false)}
          />
        )}
        {showEmoji && <EmojiPanel onPick={handleSendReaction} onClose={() => setShowEmoji(false)} />}
        {showBg && <BackgroundPanel level={blurLevel} onChange={setBlurLevel} onClose={() => setShowBg(false)} />}

        {/* ── Draggable floating toolbar ────────────────────────────────────── */}
        <DraggablePill>
          {controls}
        </DraggablePill>

      </div>
    </>
  );
}
