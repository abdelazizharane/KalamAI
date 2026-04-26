import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";

type Mode = "login" | "register";

const API = import.meta.env.VITE_BACKEND_URL ?? "";

function KalamLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-label="KalamAI">
      <defs>
        <linearGradient id="kl-auth-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3C6E71" />
          <stop offset="100%" stopColor="#284B63" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="40" height="40" rx="10" fill="url(#kl-auth-grad)" />
      <rect x="6.5"  y="20" width="4.5" height="13" rx="2.25" fill="white" opacity="0.95" />
      <rect x="14"   y="14" width="4.5" height="19" rx="2.25" fill="white" opacity="0.95" />
      <rect x="21.5" y="17" width="4.5" height="16" rx="2.25" fill="white" opacity="0.95" />
      <rect x="29"   y="10" width="4.5" height="23" rx="2.25" fill="white" opacity="0.95" />
    </svg>
  );
}

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const body = mode === "register"
        ? { name: name.trim(), email: email.trim(), password }
        : { email: email.trim(), password };

      const res = await fetch(`${API}/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      let data: Record<string, unknown>;
      try {
        data = await res.json();
      } catch {
        setError("Invalid server response.");
        return;
      }

      if (!res.ok) {
        const detail = data.detail as string | undefined;
        if (detail === "Email already registered") {
          setError("This email is already registered. Try signing in.");
        } else if (res.status === 401) {
          setError("Incorrect email or password.");
        } else {
          setError(detail ?? "Authentication error.");
        }
        return;
      }

      localStorage.setItem("kalamai_token", data.access_token as string);
      localStorage.setItem("kalamai_name", data.name as string);

      setSuccess(
        mode === "register"
          ? `Account created for ${data.name as string}! Redirecting...`
          : `Welcome back, ${data.name as string}! Redirecting...`
      );
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch {
      setError("Cannot reach the server. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "#0d1a1b" }}
    >
      {/* Dot grid */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: "radial-gradient(rgba(60,110,113,0.12) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
        zIndex: 0,
      }} />

      {/* Teal glow blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-15%] left-[-10%] w-[450px] h-[450px] rounded-full opacity-[0.07]"
          style={{ background: "radial-gradient(circle, #3C6E71, transparent 70%)" }} />
        <div className="absolute bottom-[-10%] right-[-5%] w-[380px] h-[380px] rounded-full opacity-[0.05]"
          style={{ background: "radial-gradient(circle, #284B63, transparent 70%)" }} />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2.5 mb-8">
          <KalamLogo size={40} />
          <span
            className="text-xl font-bold text-white"
            style={{ fontFamily: "'Orbitron', sans-serif" }}
          >
            KalamAI
          </span>
        </Link>

        {/* Card */}
        <div
          className="rounded-2xl border p-6"
          style={{
            background: "rgba(15,22,23,0.97)",
            borderColor: "rgba(60,110,113,0.2)",
            backdropFilter: "blur(24px)",
            boxShadow: "0 25px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(60,110,113,0.1)",
          }}
        >
          <h2 className="text-lg font-bold text-white mb-1 text-center">
            {mode === "login" ? "Welcome back" : "Create account"}
          </h2>
          <p className="text-sm text-gray-500 text-center mb-6">
            {mode === "login"
              ? "Sign in to access your meetings"
              : "Join KalamAI — it's free"}
          </p>

          {/* Mode tabs */}
          <div className="flex p-1 rounded-xl mb-5" style={{ background: "rgba(0,0,0,0.3)" }}>
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(""); setSuccess(""); setShowPassword(false); }}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                style={
                  mode === m
                    ? { background: "linear-gradient(135deg, #3C6E71, #284B63)", color: "white", boxShadow: "0 2px 8px rgba(60,110,113,0.4)" }
                    : { color: "#6b7280" }
                }
              >
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  Full name
                </label>
                <input
                  className="w-full px-4 py-3 rounded-xl text-sm font-medium text-gray-100 transition-all focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(60,110,113,0.25)" }}
                  placeholder="Ahmed Moussa"
                  value={name}
                  required
                  minLength={1}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={(e) => e.target.style.borderColor = "#3C6E71"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(60,110,113,0.25)"}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Email
              </label>
              <input
                ref={emailRef}
                className="w-full px-4 py-3 rounded-xl text-sm font-medium text-gray-100 transition-all focus:outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(60,110,113,0.25)" }}
                type="email"
                placeholder="ahmed@institution.td"
                value={email}
                required
                onChange={(e) => setEmail(e.target.value)}
                onFocus={(e) => e.target.style.borderColor = "#3C6E71"}
                onBlur={(e) => e.target.style.borderColor = "rgba(60,110,113,0.25)"}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  className="w-full px-4 py-3 pr-12 rounded-xl text-sm font-medium text-gray-100 transition-all focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(60,110,113,0.25)" }}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  required
                  minLength={6}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={(e) => e.target.style.borderColor = "#3C6E71"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(60,110,113,0.25)"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {mode === "register" && (
                <p className="text-xs text-gray-600 mt-1">Minimum 6 characters</p>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-xl">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 text-green-400 text-sm bg-green-500/10 border border-green-500/20 px-3 py-2.5 rounded-xl">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-all active:scale-95 disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #3C6E71, #284B63)",
                boxShadow: "0 4px 20px rgba(60,110,113,0.35)",
              }}
            >
              {loading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : null}
              {loading ? "..." : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-white/5 text-center">
            <Link to="/" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
              Continue without account →
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Your data is stored securely and encrypted.
        </p>
      </div>
    </div>
  );
}
