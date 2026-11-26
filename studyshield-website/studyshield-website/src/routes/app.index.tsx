import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FocusCard } from "@/components/FocusCard";
import { useAuth } from "@/lib/auth";
import { useStats } from "@/lib/queries";

export const Route = createFileRoute("/app/")({ component: Home });

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function Home() {
  const { user } = useAuth();
  const stats = useStats();
  const s = stats.data;
  const tiles = s ? [
    ["Today", `${s.todayMinutes} min`], ["This week", `${s.weekMinutes} min`],
    ["Sessions done", s.completedSessions], ["Focus score", `${s.focusScore}%`],
    ["Goals done", `${s.goalsCompleted}/${s.goalsTotal}`],
  ] : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground">{greeting()},</p>
          <h1 className="text-3xl font-bold">{user?.fullName.split(" ")[0]}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 rounded-full bg-accent/15 px-3 py-1 text-sm text-accent"><Flame className="h-4 w-4" /> {s?.currentStreak ?? 0}-day streak</span>
          <Button variant="secondary" asChild><Link to="/app/planner">Manage goals</Link></Button>
        </div>
      </div>
      <FocusCard />
      {stats.error && <p className="text-sm text-destructive">{(stats.error as Error).message}</p>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {tiles.map(([k, v]) => (
          <div key={k} className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">{k}</p><p className="mt-1 font-display text-2xl font-bold">{v}</p></div>
        ))}
      </div>
      {s && (
        <div className="rounded-2xl border bg-card p-6">
          <h3 className="mb-4 font-semibold">Last 7 days (minutes)</h3>
          {s.daily.every((d) => d.minutes === 0) && <p className="mb-2 text-sm text-muted-foreground">No study time yet — complete a session to fill this chart.</p>}
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={s.daily}>
                <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} />
                <Bar dataKey="minutes" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
