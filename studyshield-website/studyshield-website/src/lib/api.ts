// Thin client for the StudyShield Spring Boot backend.
const TOKEN_KEY = "ss_token";
const URL_KEY = "ss_api_url";
export const DEFAULT_API = (import.meta.env["VITE_API_URL"] as string | undefined) ?? "http://localhost:8081";

export function getApiUrl() {
  if (typeof window === "undefined") return DEFAULT_API;
  return localStorage.getItem(URL_KEY) || DEFAULT_API;
}
export function setApiUrl(url: string) {
  localStorage.setItem(URL_KEY, url.replace(/\/+$/, ""));
}
export function getToken() {
  return typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string | null) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function api<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${getApiUrl()}${path}`, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : null,
    });
  } catch {
    throw new ApiError(0, `Can't reach the StudyShield server at ${getApiUrl()}. Is the backend running?`);
  }
  // keep token
  if (!res.ok) {
    let msg = res.statusText;
    try { const j = await res.json(); msg = j.message || j.error || msg; } catch { /* ignore */ }
    throw new ApiError(res.status, msg);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export type User = { id: string; fullName: string; email: string };
export type Priority = "LOW" | "MEDIUM" | "HIGH";
export type Goal = {
  id: string; title: string; description?: string; durationMinutes: number;
  priority: Priority; scheduledDate?: string | null; completed: boolean;
  completedAt?: string | null; createdAt: string; source: string;
};
export type SessionStatus = "ACTIVE" | "PAUSED" | "BREAK" | "COMPLETED" | "CANCELLED";
export type StudySession = {
  id: string; goalId: string; goalTitle: string; plannedMinutes: number;
  status: SessionStatus; startedAt: string; endedAt?: string | null;
  accumulatedFocusMs: number; lastResumedAt?: string | null;
  breakEndsAt?: string | null; breaksTaken: number; breaksAllowed: number;
  breakMinutes: number; serverNow: string;
};
export type Stats = {
  todayMinutes: number; weekMinutes: number; completedSessions: number;
  currentStreak: number; goalsTotal: number; goalsCompleted: number; focusScore: number;
  daily: { date: string; minutes: number }[];
};

/** Mirrors backend BreakPolicy: <30 → 0, 30–59 → 1, 60–119 → 2, ≥120 → 3. */
export function breaksAllowedFor(minutes: number) {
  if (minutes < 30) return 0;
  if (minutes < 60) return 1;
  if (minutes < 120) return 2;
  return 3;
}
