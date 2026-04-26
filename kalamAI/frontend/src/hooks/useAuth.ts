import { useCallback } from "react";

interface JwtPayload {
  sub: string;   // email (used as user id)
  name: string;
  exp: number;
}

function parseJwt(token: string): JwtPayload | null {
  try {
    const raw = token.split(".")[1];
    return JSON.parse(atob(raw));
  } catch {
    return null;
  }
}

export function useAuth() {
  const token = localStorage.getItem("kalamai_token");
  const parsed = token ? parseJwt(token) : null;
  const isLoggedIn = !!parsed && parsed.exp * 1000 > Date.now();

  const logout = useCallback(() => {
    localStorage.removeItem("kalamai_token");
    localStorage.removeItem("kalamai_name");
  }, []);

  return {
    token: isLoggedIn ? token : null,
    name: isLoggedIn ? (parsed!.name || localStorage.getItem("kalamai_name") || "") : null,
    email: isLoggedIn ? parsed!.sub : null,
    isLoggedIn,
    logout,
  };
}

export const API_BASE = import.meta.env.VITE_BACKEND_URL ?? "";

export async function authFetch(path: string, opts?: RequestInit): Promise<Response> {
  const token = localStorage.getItem("kalamai_token");
  return fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers ?? {}),
    },
  });
}
