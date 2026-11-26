import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, getToken, setToken, type User } from "./api";

type AuthCtx = {
  user: User | null; ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (u: User) => void;
};
const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) { setReady(true); return; }
    api<User>("/api/auth/me").then(setUser).catch(() => setToken(null)).finally(() => setReady(true));
  }, []);

  const handle = (r: { token: string; user: User }) => { setToken(r.token); setUser(r.user); };
  const value: AuthCtx = {
    user, ready, setUser,
    login: async (email, password) => handle(await api("/api/auth/login", { method: "POST", body: { email, password } })),
    signup: async (fullName, email, password) => handle(await api("/api/auth/signup", { method: "POST", body: { fullName, email, password } })),
    logout: () => { setToken(null); setUser(null); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}
