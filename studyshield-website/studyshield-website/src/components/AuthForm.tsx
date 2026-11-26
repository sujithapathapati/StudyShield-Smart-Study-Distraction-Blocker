import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Shield, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const { login, signup } = useAuth();
  const nav = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(() => (typeof window !== "undefined" && localStorage.getItem("ss_email")) || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError(null);
    if (mode === "signup") {
      if (fullName.trim().length < 2) return setError("Please enter your full name.");
      if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) return setError("Password needs 8+ characters with letters and numbers.");
      if (password !== confirm) return setError("Passwords don't match.");
    }
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email.trim(), password);
        if (remember) localStorage.setItem("ss_email", email.trim()); else localStorage.removeItem("ss_email");
      } else await signup(fullName.trim(), email.trim(), password);
      nav({ to: "/app" });
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border bg-card p-8">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold"><Shield className="h-5 w-5 text-primary" /> StudyShield</Link>
        <h1 className="text-2xl font-bold">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        {mode === "signup" && (
          <div className="space-y-1.5"><Label htmlFor="n">Full name</Label><Input id="n" value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
        )}
        <div className="space-y-1.5"><Label htmlFor="e">Email</Label><Input id="e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div className="space-y-1.5">
          <Label htmlFor="p">Password</Label>
          <div className="relative">
            <Input id="p" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" aria-label="Toggle password" onClick={() => setShow(!show)} className="absolute right-3 top-2.5 text-muted-foreground">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
          </div>
        </div>
        {mode === "signup" && (
          <div className="space-y-1.5"><Label htmlFor="c">Confirm password</Label><Input id="c" type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></div>
        )}
        {mode === "login" && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground"><Checkbox checked={remember} onCheckedChange={(v) => setRemember(!!v)} /> Remember my email</label>
        )}
        {error && <p className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>{loading ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}</Button>
        <p className="text-center text-sm text-muted-foreground">
          {mode === "login" ? <>No account? <Link to="/signup" className="text-primary">Sign up</Link></> : <>Have an account? <Link to="/login" className="text-primary">Log in</Link></>}
        </p>
        <p className="text-center text-xs text-muted-foreground">Server not set up? <Link to="/connect" className="underline">Connect backend</Link></p>
      </form>
    </div>
  );
}
