import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { BarChart3, Award, CheckCircle2, Lock } from "lucide-react";
import { api, Stats } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/app/analytics")({ component: AnalyticsPage });

type FullAnalytics = {
  totalFocusMinutes: number; longestSessionMinutes: number; totalSessions: number; avgSessionMinutes: number;
  goalsTotal: number; goalsCompleted: number; aiPlansCount: number;
  byGoal: { name: string; minutes: number }[];
  achievements: { id: string; title: string; description: string; current: number; target: number; unlocked: boolean }[];
};

function AnalyticsPage() {
  const tz = new Date().getTimezoneOffset();
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: () => api<Stats>(`/api/stats/summary?tzOffset=${tz}`) });
  const { data: full } = useQuery({ queryKey: ["analytics-full"], queryFn: () => api<FullAnalytics>(`/api/analytics/full?tzOffset=${tz}`) });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><BarChart3 className="h-6 w-6 text-primary" /> Study Analytics & Achievements</h1>
        <p className="text-sm text-muted-foreground">Live productivity metrics computed from your completed MongoDB focus sessions.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardDescription>Total Focus</CardDescription><CardTitle className="text-2xl">{full?.totalFocusMinutes ?? 0} min</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Completed Sessions</CardDescription><CardTitle className="text-2xl">{full?.totalSessions ?? 0}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Longest Session</CardDescription><CardTitle className="text-2xl">{full?.longestSessionMinutes ?? 0} min</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Current Streak</CardDescription><CardTitle className="text-2xl">{stats?.currentStreak ?? 0} days</CardTitle></CardHeader></Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Last 7 Days Focus (Minutes)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.daily ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Focus Time by Goal</CardTitle></CardHeader>
          <CardContent className="h-64">
            {(full?.byGoal?.length ?? 0) === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">Complete a focus session to see goal breakdown.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={full?.byGoal ?? []} layout="vertical">
                  <XAxis type="number" fontSize={12} />
                  <YAxis type="category" dataKey="name" width={110} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-primary" /> Earned & Locked Achievements</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {(full?.achievements ?? []).map((a) => (
            <div key={a.id} className={`rounded-lg border p-4 space-y-2 ${a.unlocked ? "border-primary/50 bg-primary/5" : "opacity-75"}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{a.title}</span>
                {a.unlocked ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
              </div>
              <p className="text-xs text-muted-foreground">{a.description}</p>
              <Progress value={(a.current / a.target) * 100} className="h-1.5" />
              <p className="text-[11px] text-muted-foreground">{a.current} / {a.target}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}