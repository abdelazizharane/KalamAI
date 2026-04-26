import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth, authFetch } from "../hooks/useAuth";
import clsx from "clsx";

/** KalamAI brand logo — equalizer bars in gradient rounded square. */
function KalamLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-label="KalamAI">
      <defs>
        <linearGradient id="kl-db-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3C6E71" />
          <stop offset="100%" stopColor="#284B63" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="8" fill="url(#kl-db-grad)" />
      <rect x="6.5"  y="16" width="3.5" height="10" rx="1.75" fill="white" opacity="0.95" />
      <rect x="11.5" y="11" width="3.5" height="15" rx="1.75" fill="white" opacity="0.95" />
      <rect x="16.5" y="14" width="3.5" height="12" rx="1.75" fill="white" opacity="0.95" />
      <rect x="21.5" y="8"  width="3.5" height="18" rx="1.75" fill="white" opacity="0.95" />
    </svg>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Meeting {
  id: string;
  title: string;
  description: string;
  scheduled_at: string;
  host_id: string;
  host_name: string;
  room_code: string;
  participants: string[];
  created_at: string;
  status: "scheduled" | "cancelled";
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  } catch { return iso; }
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

function isPast(iso: string): boolean {
  return new Date(iso) < new Date();
}

function inviteUrl(code: string): string {
  return `${window.location.origin}/room/${code}`;
}

// ── Email chip input ──────────────────────────────────────────────────────────
function EmailChips({ emails, onChange }: { emails: string[]; onChange: (e: string[]) => void }) {
  const [input, setInput] = useState("");

  const add = () => {
    const val = input.trim().toLowerCase();
    if (!val || emails.includes(val)) { setInput(""); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return;
    onChange([...emails, val]);
    setInput("");
  };

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input
          type="email"
          placeholder="email@example.com"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          className="flex-1 px-3 py-2.5 rounded-xl text-sm text-gray-100 focus:outline-none transition-all"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
          onFocus={(e) => (e.target.style.borderColor = "#3C6E71")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
          style={{ background: "rgba(60,110,113,0.4)" }}
        >
          + Add
        </button>
      </div>
      {emails.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {emails.map((em) => (
            <span key={em}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border"
              style={{ background: "rgba(60,110,113,0.15)", borderColor: "rgba(60,110,113,0.3)", color: "#67b2b5" }}>
              {em}
              <button
                type="button"
                onClick={() => onChange(emails.filter((e) => e !== em))}
                className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
              >×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Success state after scheduling ───────────────────────────────────────────
function ScheduleSuccess({ meeting, onClose }: { meeting: Meeting; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = inviteUrl(meeting.room_code);

  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">
      {/* Animated checkmark */}
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 relative"
        style={{ background: "linear-gradient(135deg,rgba(16,185,129,0.2),rgba(5,150,105,0.1))", border: "1px solid rgba(16,185,129,0.3)" }}>
        <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        <span className="absolute inset-0 rounded-full animate-ping opacity-20"
          style={{ background: "rgba(16,185,129,0.4)" }} />
      </div>

      <h2 className="text-xl font-bold text-white mb-1">Meeting scheduled!</h2>
      <p className="text-gray-400 text-sm mb-6">
        {meeting.participants.length > 0
          ? `${meeting.participants.length} invitation${meeting.participants.length > 1 ? "s" : ""} sent by email`
          : "Your meeting is ready"}
      </p>

      {/* Meeting summary */}
      <div className="w-full rounded-2xl border p-4 mb-6 text-left"
        style={{ background: "rgba(60,110,113,0.07)", borderColor: "rgba(60,110,113,0.2)" }}>
        <p className="font-semibold text-gray-100 mb-2">{meeting.title}</p>
        <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-3">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="capitalize">{fmtDate(meeting.scheduled_at)} · {fmtTime(meeting.scheduled_at)}</span>
        </div>

        {/* Invite link */}
        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1.5">
          Invite link
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2 rounded-xl text-xs font-mono text-teal-300 truncate"
            style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(60,110,113,0.2)" }}>
            {url}
          </div>
          <button
            onClick={copy}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
            style={copied
              ? { background: "rgba(16,185,129,0.2)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)" }
              : { background: "rgba(60,110,113,0.25)", color: "#67b2b5", border: "1px solid rgba(60,110,113,0.3)" }
            }
          >
            {copied ? (
              <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg> Copied!</>
            ) : (
              <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg> Copy</>
            )}
          </button>
        </div>
      </div>

      <button
        onClick={onClose}
        className="w-full py-3.5 rounded-xl font-bold text-white transition-all active:scale-95"
        style={{ background: "linear-gradient(135deg, #3C6E71, #284B63)", boxShadow: "0 4px 20px rgba(60,110,113,0.35)" }}
      >
        Close
      </button>
    </div>
  );
}

// ── Schedule Meeting Drawer ────────────────────────────────────────────────────
function ScheduleDrawer({ onClose, onCreated }: { onClose: () => void; onCreated: (m: Meeting) => void }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [description, setDescription] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<Meeting | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required."); return; }
    if (!date) { setError("Date is required."); return; }
    setError("");
    setLoading(true);
    try {
      const scheduled_at = new Date(`${date}T${time}:00`).toISOString();
      const res = await authFetch("/api/meetings/schedule", {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), scheduled_at, participants: emails, description }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail ?? "Scheduling failed."); return; }
      onCreated(data.meeting);
      setSuccess(data.meeting);
    } catch {
      setError("Could not reach server.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#f1f5f9",
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}>
      <div ref={ref}
        className="w-full max-w-md h-full overflow-y-auto flex flex-col"
        style={{
          background: "linear-gradient(180deg, #0d1220 0%, #080c17 100%)",
          borderLeft: "1px solid rgba(60,110,113,0.15)",
          boxShadow: "-8px 0 40px rgba(0,0,0,0.5)",
        }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div>
            <h2 className="text-lg font-bold text-white">Schedule a meeting</h2>
            <p className="text-xs text-gray-500 mt-0.5">An invite link will be generated</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <ScheduleSuccess meeting={success} onClose={onClose} />
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 px-6 py-6 space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Meeting title *
              </label>
              <input
                className="w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none transition-all"
                style={inputStyle}
                placeholder="e.g. Weekly team meeting"
                value={title}
                required
                onChange={(e) => setTitle(e.target.value)}
                onFocus={(e) => (e.target.style.borderColor = "#3C6E71")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-3 rounded-xl text-sm focus:outline-none transition-all"
                  style={{ ...inputStyle, colorScheme: "dark" }}
                  value={date}
                  min={new Date().toISOString().split("T")[0]}
                  required
                  onChange={(e) => setDate(e.target.value)}
                  onFocus={(e) => (e.target.style.borderColor = "#3C6E71")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  Time *
                </label>
                <input
                  type="time"
                  className="w-full px-3 py-3 rounded-xl text-sm focus:outline-none transition-all"
                  style={{ ...inputStyle, colorScheme: "dark" }}
                  value={time}
                  required
                  onChange={(e) => setTime(e.target.value)}
                  onFocus={(e) => (e.target.style.borderColor = "#3C6E71")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Description (optional)
              </label>
              <textarea
                rows={2}
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all resize-none"
                style={inputStyle}
                placeholder="Agenda, notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onFocus={(e) => (e.target.style.borderColor = "#3C6E71")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Invite participants
              </label>
              <EmailChips emails={emails} onChange={setEmails} />
              <p className="text-xs text-gray-600 mt-2">
                Enter an email and press Enter. An invite link will be sent.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-xl">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white transition-all active:scale-95 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #3C6E71, #284B63)", boxShadow: "0 4px 20px rgba(60,110,113,0.4)" }}
            >
              {loading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
              {loading ? "Scheduling…" : "Schedule meeting"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Meeting card ──────────────────────────────────────────────────────────────
function MeetingCard({ meeting, onCancel, onJoin }: {
  meeting: Meeting;
  onCancel: (id: string) => void;
  onJoin: (code: string) => void;
}) {
  const past = isPast(meeting.scheduled_at);
  const cancelled = meeting.status === "cancelled";
  const upcoming = !cancelled && !past;
  const [copiedLink, setCopiedLink] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(inviteUrl(meeting.room_code));
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div
      className="rounded-2xl border transition-all"
      style={{
        background: cancelled
          ? "rgba(255,255,255,0.02)"
          : past
          ? "rgba(255,255,255,0.03)"
          : "rgba(60,110,113,0.05)",
        borderColor: upcoming ? "rgba(60,110,113,0.25)" : "rgba(255,255,255,0.07)",
        opacity: cancelled ? 0.55 : 1,
        boxShadow: upcoming ? "0 0 0 1px rgba(60,110,113,0.08) inset, 0 4px 20px rgba(60,110,113,0.08)" : "none",
      }}
    >
      {/* Gradient top border for upcoming meetings */}
      {upcoming && (
        <div className="h-px w-full rounded-t-2xl"
          style={{ background: "linear-gradient(90deg, #3C6E71, #284B63, transparent)" }} />
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Title + status badge */}
            <div className="flex items-center gap-2 mb-1.5">
              {upcoming && (
                <span className="shrink-0 w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              )}
              <h3 className="font-semibold text-gray-100 truncate">{meeting.title}</h3>
              {cancelled && (
                <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
                  Cancelled
                </span>
              )}
              {!cancelled && past && (
                <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/5 text-gray-500 border border-white/10">
                  Past
                </span>
              )}
              {upcoming && (
                <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-700/20 text-teal-300 border border-teal-600/30">
                  Upcoming
                </span>
              )}
            </div>

            {/* Date/time */}
            <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-1">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="capitalize">{fmtDate(meeting.scheduled_at)}</span>
              <span className="text-gray-600">·</span>
              <span>{fmtTime(meeting.scheduled_at)}</span>
            </div>

            {meeting.description && (
              <p className="text-xs text-gray-500 mb-2 line-clamp-1">{meeting.description}</p>
            )}

            {/* Participants + room code */}
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{meeting.participants.length} invited</span>
              <span className="text-gray-700">·</span>
              <span className="font-mono text-gray-600">{meeting.room_code}</span>
            </div>
          </div>

          {/* Actions */}
          {!cancelled && (
            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                onClick={() => onJoin(meeting.room_code)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #3C6E71, #284B63)" }}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Join
              </button>
              {!past && (
                <button
                  onClick={() => onCancel(meeting.id)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors border border-red-500/20"
                >
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>

        {/* Invite link row — always visible for non-cancelled meetings */}
        {!cancelled && (
          <div className="mt-3 pt-3 border-t flex items-center gap-2"
            style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            <div className="flex-1 text-xs font-mono text-gray-600 truncate">
              {inviteUrl(meeting.room_code)}
            </div>
            <button
              onClick={copyLink}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all active:scale-95"
              style={copiedLink
                ? { background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.25)" }
                : { background: "rgba(60,110,113,0.12)", color: "#67b2b5", border: "1px solid rgba(60,110,113,0.2)" }
              }
            >
              {copiedLink ? (
                <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg> Copied</>
              ) : (
                <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg> Copy link</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Quick join widget ─────────────────────────────────────────────────────────
function QuickJoin() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  return (
    <div className="rounded-2xl border p-4 mb-6"
      style={{
        background: "rgba(255,255,255,0.025)",
        borderColor: "rgba(255,255,255,0.07)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
      }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(60,110,113,0.2)" }}>
          <svg className="w-3.5 h-3.5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Join with a code
        </p>
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 px-4 py-2.5 rounded-xl font-mono font-bold tracking-[0.2em] text-center uppercase text-gray-100 focus:outline-none transition-all text-sm"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
          placeholder="ABC123"
          value={code}
          maxLength={6}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          onKeyDown={(e) => { if (e.key === "Enter" && code.length >= 4) navigate(`/room/${code}`); }}
          onFocus={(e) => (e.target.style.borderColor = "#3C6E71")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
        />
        <button
          onClick={() => code.length >= 4 && navigate(`/room/${code}`)}
          disabled={code.length < 4}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #3C6E71, #284B63)" }}
        >
          Join
        </button>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const { name, email, isLoggedIn, logout } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [showSchedule, setShowSchedule] = useState(false);
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");

  useEffect(() => {
    if (!isLoggedIn) { navigate("/auth"); return; }
    loadMeetings();
  }, [isLoggedIn]);

  const loadMeetings = async () => {
    setLoadingMeetings(true);
    try {
      const res = await authFetch("/api/meetings/my");
      if (res.ok) {
        const data = await res.json();
        setMeetings(data.meetings ?? []);
      }
    } catch { /* ignore */ } finally {
      setLoadingMeetings(false);
    }
  };

  const handleCancel = useCallback(async (id: string) => {
    if (!confirm("Cancel this meeting?")) return;
    const res = await authFetch(`/api/meetings/${id}/cancel`, { method: "PATCH" });
    if (res.ok) {
      setMeetings((prev) => prev.map((m) => m.id === id ? { ...m, status: "cancelled" } : m));
    }
  }, []);

  const handleJoin = useCallback((code: string) => {
    navigate(`/room/${code}`);
  }, [navigate]);

  const filtered = meetings.filter((m) => {
    if (filter === "upcoming") return !isPast(m.scheduled_at) && m.status !== "cancelled";
    if (filter === "past") return isPast(m.scheduled_at) || m.status === "cancelled";
    return true;
  });

  const upcomingCount = meetings.filter((m) => !isPast(m.scheduled_at) && m.status !== "cancelled").length;
  const totalInvited = meetings.reduce((s, m) => s + m.participants.length, 0);

  return (
    <>
      <style>{`
        @keyframes blob-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(24px, -28px) scale(1.06); }
          66% { transform: translate(-18px, 18px) scale(0.96); }
        }
        .blob-a { animation: blob-drift 14s ease-in-out infinite; }
        .blob-b { animation: blob-drift 18s ease-in-out infinite reverse 2s; }
        .blob-c { animation: blob-drift 11s ease-in-out infinite 5s; }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.4s ease-out forwards; }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
      `}</style>

      <div className="min-h-screen flex flex-col" style={{ background: "#070b14" }}>

        {/* Animated background blobs */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="blob-a absolute top-[-15%] right-[-8%] w-[520px] h-[520px] rounded-full opacity-[0.055]"
            style={{ background: "radial-gradient(circle, #284B63, transparent 70%)" }} />
          <div className="blob-b absolute bottom-[-12%] left-[-6%] w-[440px] h-[440px] rounded-full opacity-[0.04]"
            style={{ background: "radial-gradient(circle, #3C6E71, transparent 70%)" }} />
          <div className="blob-c absolute top-[40%] left-[30%] w-[300px] h-[300px] rounded-full opacity-[0.025]"
            style={{ background: "radial-gradient(circle, #3C6E71, transparent 70%)" }} />
        </div>

        {/* Header */}
        <header className="relative z-10 flex items-center justify-between px-5 sm:px-8 py-4 border-b"
          style={{
            borderColor: "rgba(255,255,255,0.06)",
            background: "rgba(7,11,20,0.88)",
            backdropFilter: "blur(20px)",
          }}>
          <Link to="/" className="flex items-center gap-2.5">
            <KalamLogo size={32} />
            <span className="font-bold text-white tracking-wide">KalamAI</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-gray-400 hover:text-gray-200 transition-colors hidden sm:block">
              ← Home
            </Link>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border"
              style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,rgba(60,110,113,0.5),rgba(40,75,99,0.5))" }}>
                <span className="text-xs font-bold text-teal-200">
                  {name?.charAt(0).toUpperCase() ?? "?"}
                </span>
              </div>
              <span className="text-sm text-gray-300 hidden sm:block">{name}</span>
            </div>
            <button
              onClick={() => { logout(); navigate("/"); }}
              className="text-sm text-gray-500 hover:text-red-400 transition-colors px-2 py-1"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="relative z-10 flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8">

          {/* Welcome + schedule button */}
          <div className="flex items-start justify-between mb-8 gap-4 animate-slide-up">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
                Hello,{" "}
                <span style={{
                  background: "linear-gradient(135deg,#3C6E71,#284B63)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}>
                  {name?.split(" ")[0]}
                </span>{" "}
                👋
              </h1>
              <p className="text-gray-500 text-sm">{email}</p>
            </div>
            <button
              onClick={() => setShowSchedule(true)}
              className="shrink-0 relative flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white text-sm transition-all active:scale-95"
              style={{
                background: "linear-gradient(135deg, #3C6E71, #284B63)",
                boxShadow: "0 4px 20px rgba(60,110,113,0.45), 0 0 0 1px rgba(60,110,113,0.2)",
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Schedule</span>
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { label: "Total", value: meetings.length, icon: "📋", color: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.07)" },
              { label: "Upcoming", value: upcomingCount, icon: "📅", color: "rgba(60,110,113,0.06)", border: "rgba(60,110,113,0.2)" },
              { label: "Invited", value: totalInvited, icon: "👥", color: "rgba(40,75,99,0.06)", border: "rgba(40,75,99,0.15)" },
            ].map(({ label, value, icon, color, border }) => (
              <div key={label}
                className="rounded-2xl border p-4 text-center transition-all hover:scale-[1.02]"
                style={{ background: color, borderColor: border }}>
                <div className="text-2xl mb-1">{icon}</div>
                <div className="text-2xl font-bold text-white">{value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Quick join */}
          <QuickJoin />

          {/* Filter tabs */}
          <div className="flex gap-1 p-1 rounded-xl mb-5 w-fit"
            style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.05)" }}>
            {(["upcoming", "past", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={
                  filter === f
                    ? { background: "linear-gradient(135deg, #3C6E71, #284B63)", color: "white", boxShadow: "0 2px 8px rgba(60,110,113,0.4)" }
                    : { color: "#6b7280" }
                }
              >
                {f === "upcoming" ? "Upcoming" : f === "past" ? "Past" : "All"}
                {f === "upcoming" && upcomingCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                    style={filter === f
                      ? { background: "rgba(255,255,255,0.2)", color: "white" }
                      : { background: "rgba(60,110,113,0.2)", color: "#67b2b5" }
                    }>
                    {upcomingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Meetings list */}
          {loadingMeetings ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <svg className="w-8 h-8 animate-spin text-teal-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <p className="text-gray-600 text-sm">Loading…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border animate-fade-in"
              style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
              <div className="text-5xl mb-4">
                {filter === "upcoming" ? "📅" : filter === "past" ? "📂" : "🗒️"}
              </div>
              <p className="text-gray-300 font-semibold mb-1.5">
                {filter === "upcoming" ? "No upcoming meetings" : filter === "past" ? "No past meetings" : "No meetings yet"}
              </p>
              <p className="text-gray-600 text-sm mb-5">
                {filter === "upcoming" ? "Schedule your first meeting above." : "Your meetings will appear here."}
              </p>
              {filter === "upcoming" && (
                <button
                  onClick={() => setShowSchedule(true)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
                  style={{ background: "linear-gradient(135deg, #3C6E71, #284B63)" }}
                >
                  Schedule a meeting
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3 animate-fade-in">
              {filtered.map((m) => (
                <MeetingCard key={m.id} meeting={m} onCancel={handleCancel} onJoin={handleJoin} />
              ))}
            </div>
          )}
        </main>

        {/* Schedule drawer */}
        {showSchedule && (
          <ScheduleDrawer
            onClose={() => setShowSchedule(false)}
            onCreated={(m) => {
              setMeetings((prev) => [m, ...prev]);
              setFilter("upcoming");
              // Drawer stays open on success state (shows invite link)
            }}
          />
        )}
      </div>
    </>
  );
}
