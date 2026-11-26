import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, PlusCircle, CheckCircle2, Trash2, Loader2 } from "lucide-react";
import { api, Priority } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/ai-planner")({ component: AiPlannerPage });

type PlanItem = { id: string; dayLabel: string; title: string; description: string; durationMinutes: number; priority: Priority; completed: boolean; convertedToGoal: boolean };
type AiPlan = { id: string; title: string; subject: string; targetDate: string; summary: string; items: PlanItem[]; createdAt: string };

function AiPlannerPage() {
  const qc = useQueryClient();
  const [subject, setSubject] = useState("");
  const [targetDate, setTargetDate] = useState(() => new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [minutesPerDay, setMinutesPerDay] = useState(60);
  const [level, setLevel] = useState("Intermediate");
  const [weakAreas, setWeakAreas] = useState("");
  const [err, setErr] = useState("");

  const { data: plans = [], isLoading } = useQuery({ queryKey: ["ai-plans"], queryFn: () => api<AiPlan[]>("/api/ai/plans") });

  const gen = useMutation({
    mutationFn: () => api<AiPlan>("/api/ai/plans/generate", { method: "POST", body: { subject, targetDate, minutesPerDay, level, weakAreas } }),
    onSuccess: () => { setErr(""); setSubject(""); setWeakAreas(""); qc.invalidateQueries({ queryKey: ["ai-plans"] }); },
    onError: (e: Error) => setErr(e.message),
  });

  const convert = useMutation({
    mutationFn: ({ planId, itemId }: { planId: string; itemId: string }) => api(`/api/ai/plans/${planId}/items/${itemId}/convert`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ai-plans"] }); qc.invalidateQueries({ queryKey: ["goals"] }); },
  });

  const toggleItem = useMutation({
    mutationFn: ({ planId, itemId }: { planId: string; itemId: string }) => api(`/api/ai/plans/${planId}/items/${itemId}/toggle`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-plans"] }),
  });

  const delPlan = useMutation({
    mutationFn: (id: string) => api(`/api/ai/plans/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-plans"] }),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Sparkles className="h-6 w-6 text-primary" /> AI Study Planner</h1>
        <p className="text-sm text-muted-foreground">Generate a structured, day-by-day study roadmap powered by Gemini AI and convert tasks directly into focus goals.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Create New AI Plan</CardTitle><CardDescription>Enter your subject, deadline, and weak areas.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="text-xs font-medium">Subject / Topic *</label><Input placeholder="e.g., Data Structures & Algorithms" value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
            <div><label className="text-xs font-medium">Target / Exam Date</label><Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} /></div>
            <div><label className="text-xs font-medium">Daily Study Minutes</label><Input type="number" min={15} max={480} value={minutesPerDay} onChange={(e) => setMinutesPerDay(Number(e.target.value))} /></div>
            <div><label className="text-xs font-medium">Current Level</label><Input placeholder="Beginner / Intermediate / Advanced" value={level} onChange={(e) => setLevel(e.target.value)} /></div>
          </div>
          <div><label className="text-xs font-medium">Weak Topics or Syllabus Notes (Optional)</label><Input placeholder="e.g., Dynamic Programming, Trees, Time Complexity" value={weakAreas} onChange={(e) => setWeakAreas(e.target.value)} /></div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <Button disabled={!subject.trim() || gen.isPending} onClick={() => gen.mutate()}>
            {gen.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating AI Plan…</> : <><Sparkles className="mr-2 h-4 w-4" /> Generate Personalized Plan</>}
          </Button>
        </CardContent>
      </Card>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading saved plans…</p> : plans.map((plan) => (
        <Card key={plan.id}>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2"><CardTitle>{plan.title}</CardTitle><Badge variant="secondary">AI Generated</Badge></div>
              <CardDescription className="mt-1">{plan.summary} · Target: {plan.targetDate}</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => delPlan.mutate(plan.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {plan.items.map((item) => (
              <div key={item.id} className="flex flex-col justify-between gap-3 rounded-lg border p-3 sm:flex-row sm:items-center">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{item.dayLabel}</Badge>
                    <span className={`font-medium ${item.completed ? "line-through text-muted-foreground" : ""}`}>{item.title}</span>
                    <Badge>{item.durationMinutes} min</Badge>
                    <Badge variant="secondary">{item.priority}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => toggleItem.mutate({ planId: plan.id, itemId: item.id })}>
                    <CheckCircle2 className="mr-1 h-4 w-4" /> {item.completed ? "Done" : "Mark Done"}
                  </Button>
                  <Button size="sm" disabled={item.convertedToGoal || convert.isPending} onClick={() => convert.mutate({ planId: plan.id, itemId: item.id })}>
                    <PlusCircle className="mr-1 h-4 w-4" /> {item.convertedToGoal ? "In Planner" : "Add to Goals"}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}