import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Shield, Home, ListChecks, Settings, LogOut, Sparkles, MessageSquare, Ban, BarChart3, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useStudySession, fmt } from "@/lib/session";

export const Route = createFileRoute("/app")({
  ssr: false,
  head: () => ({ meta: [{ title: "Dashboard — StudyShield" }] }),
  component: AppLayout,
});

const nav = [
  { to: "/app", label: "Home", icon: Home, exact: true },
  { to: "/app/ai-planner", label: "AI Planner", icon: Sparkles },
  { to: "/app/ai-chat", label: "AI Study Chat", icon: MessageSquare },
  { to: "/app/planner", label: "Planner", icon: ListChecks },
  { to: "/app/blocks", label: "Blocks", icon: Ban },
  { to: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/app/profile", label: "Profile", icon: UserIcon },
  { to: "/app/settings", label: "Settings", icon: Settings },
] as const;

function AppLayout() {
  const { user, ready, logout } = useAuth();
  const { session, focusMs } = useStudySession();
  const navigate = useNavigate();
  useEffect(() => { if (ready && !user) navigate({ to: "/login", replace: true }); }, [ready, user, navigate]);
  if (!ready || !user) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-wrap gap-1 border-b bg-card/60 p-3 md:w-60 md:flex-col md:border-b-0 md:border-r md:p-4">
        <div className="mb-6 hidden items-center gap-2 px-2 font-display text-lg font-bold md:flex">
          <Shield className="h-5 w-5 text-primary" /> StudyShield
        </div>
        {nav.map((n) => (
          <Link key={n.to} to={n.to} activeOptions={{ exact: "exact" in n }}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[status=active]:bg-primary data-[status=active]:text-primary-foreground">
            <n.icon className="h-4 w-4" /><span className="hidden sm:inline">{n.label}</span>
          </Link>
        ))}
        <div className="ml-auto md:ml-0 md:mt-auto">
          {session && (
            <Link to="/app" className="mb-3 hidden rounded-lg bg-primary/15 px-3 py-2 text-sm text-primary md:block">
              ● {session.goalTitle} · <span className="tabular">{fmt(focusMs)}</span>
            </Link>
          )}
          <button onClick={() => { logout(); navigate({ to: "/login", replace: true }); }}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4" /><span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8"><Outlet /></main>
    </div>
  );
}