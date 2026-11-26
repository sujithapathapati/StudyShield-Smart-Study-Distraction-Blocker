import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, type StudySession } from "./api";
import { useAuth } from "./auth";

type SessionCtx = {
  session: StudySession | null;
  focusMs: number;          // derived from server timestamps, never from a counter
  breakRemainingMs: number;
  busy: boolean;
  error: string | null;
  start: (goalId: string) => Promise<void>;
  action: (a: "pause" | "resume" | "break/start" | "break/end") => Promise<void>;
  complete: (markGoalComplete: boolean) => Promise<void>;
  cancel: () => Promise<void>;
};
const Ctx = createContext<SessionCtx | null>(null);
const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("ss_session") : null;

export function SessionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [session, setSession] = useState<StudySession | null>(null);
  const [skew, setSkew] = useState(0); // serverNow - clientNow
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoEnding = useRef(false);

  const apply = useCallback((s: StudySession | null, broadcast = true) => {
    if (s) setSkew(new Date(s.serverNow).getTime() - Date.now());
    setSession(s && (s.status === "COMPLETED" || s.status === "CANCELLED") ? null : s);
    if (broadcast) channel?.postMessage("refresh");
  }, []);

  const refresh = useCallback(async () => {
    try { apply(await api<StudySession | null>("/api/sessions/active").then((r) => r ?? null), false); setError(null); }
    catch (e) { setError((e as Error).message); }
  }, [apply]);

  useEffect(() => { if (user) refresh(); else setSession(null); }, [user, refresh]);
  useEffect(() => {
    const onMsg = () => refresh();
    channel?.addEventListener("message", onMsg);
    const onVis = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVis);
    return () => { channel?.removeEventListener("message", onMsg); document.removeEventListener("visibilitychange", onVis); };
  }, [refresh]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(t); }, []);

  const serverNow = now + skew;
  const focusMs = session
    ? session.accumulatedFocusMs + (session.status === "ACTIVE" && session.lastResumedAt ? Math.max(0, serverNow - new Date(session.lastResumedAt).getTime()) : 0)
    : 0;
  const breakRemainingMs = session?.status === "BREAK" && session.breakEndsAt ? Math.max(0, new Date(session.breakEndsAt).getTime() - serverNow) : 0;

  const run = async (fn: () => Promise<StudySession | null>) => {
    setBusy(true); setError(null);
    try { apply(await fn()); qc.invalidateQueries(); }
    catch (e) { setError((e as Error).message); throw e; }
    finally { setBusy(false); }
  };

  const value: SessionCtx = {
    session, focusMs, breakRemainingMs, busy, error,
    start: (goalId) => run(() => api("/api/sessions/start", { method: "POST", body: { goalId } })),
    action: (a) => run(() => api(`/api/sessions/${session!.id}/${a}`, { method: "POST" })),
    complete: (markGoalComplete) => run(() => api(`/api/sessions/${session!.id}/complete`, { method: "POST", body: { markGoalComplete } })),
    cancel: () => run(() => api(`/api/sessions/${session!.id}/cancel`, { method: "POST" })),
  };

  // Automatically resume when the break countdown reaches zero.
  useEffect(() => {
    if (session?.status === "BREAK" && breakRemainingMs === 0 && !autoEnding.current && !busy) {
      autoEnding.current = true;
      value.action("break/end").catch(() => {}).finally(() => { autoEnding.current = false; });
    }
  });

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStudySession() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStudySession outside SessionProvider");
  return c;
}

export function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
}
