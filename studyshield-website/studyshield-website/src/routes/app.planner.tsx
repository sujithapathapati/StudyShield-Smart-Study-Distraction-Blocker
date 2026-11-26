import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Play, Trash2, Undo2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { api, breaksAllowedFor, type Goal, type Priority } from "@/lib/api";
import { useGoals } from "@/lib/queries";
import { useStudySession } from "@/lib/session";

export const Route = createFileRoute("/app/planner")({ component: Planner });

const PR: Record<Priority, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
const empty = { title: "", description: "", durationMinutes: 30, priority: "MEDIUM" as Priority, scheduledDate: "" };

function Planner() {
  const { data: goals = [], isLoading, error } = useGoals();
  const qc = useQueryClient();
  const { session, start } = useStudySession();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [sort, setSort] = useState<"priority" | "date" | "duration">("priority");
  const [q, setQ] = useState("");
  const [toDelete, setToDelete] = useState<Goal | null>(null);

  const refresh = () => qc.invalidateQueries();
  const run = (p: Promise<unknown>, ok: string) => p.then(() => { toast.success(ok); refresh(); }).catch((e) => toast.error(e.message));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body = { ...form, title: form.title.trim(), scheduledDate: form.scheduledDate || null };
    if (!body.title) { toast.error("Give the goal a title"); return; }
    if (body.durationMinutes < 5 || body.durationMinutes > 480) { toast.error("Duration must be 5–480 minutes"); return; }
    run(editing ? api(`/api/goals/${editing}`, { method: "PUT", body }) : api("/api/goals", { method: "POST", body }), editing ? "Goal updated" : "Goal added")
      .then(() => { setForm(empty); setEditing(null); });
  };

  const list = useMemo(() => goals
    .filter((g) => filter === "all" || (filter === "completed" ? g.completed : !g.completed))
    .filter((g) => g.title.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => sort === "priority" ? PR[b.priority] - PR[a.priority] : sort === "duration" ? b.durationMinutes - a.durationMinutes : (a.scheduledDate ?? "9").localeCompare(b.scheduledDate ?? "9")),
  [goals, filter, q, sort]);

  const total = goals.reduce((s, g) => s + g.durationMinutes, 0);
  const sel = goals.find((g) => g.id === selected && !g.completed);

  const startSelected = async () => {
    if (!sel) { toast.error("Select a pending goal first"); return; }
    try { await start(sel.id); toast.success(`Session started: ${sel.title}`); navigate({ to: "/app" }); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-3xl font-bold">Planner</h1><p className="text-sm text-muted-foreground">{goals.length} goals · {goals.filter((g) => g.completed).length} completed · {total} min planned</p></div>
        <Button onClick={startSelected} disabled={!sel || !!session} className="glow"><Play className="h-4 w-4" /> {session ? "Session already running" : sel ? `Start “${sel.title}”` : "Select a goal to start"}</Button>
      </div>

      <form onSubmit={submit} className="grid gap-3 rounded-2xl border bg-card p-5 md:grid-cols-6">
        <Input className="md:col-span-2" placeholder="Goal, e.g. DSA" value={form.title} maxLength={100} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Input type="number" min={5} max={480} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} aria-label="Minutes" />
        <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Priority })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{(["HIGH", "MEDIUM", "LOW"] as const).map((p) => <SelectItem key={p} value={p}>{p.toLowerCase()}</SelectItem>)}</SelectContent>
        </Select>
        <Input type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} />
        <div className="flex gap-2">
          <Button type="submit" className="flex-1">{editing ? "Save" : "Add"}</Button>
          {editing && <Button type="button" variant="ghost" onClick={() => { setEditing(null); setForm(empty); }}>Cancel</Button>}
        </div>
        <Input className="md:col-span-6" placeholder="Description (optional)" value={form.description} maxLength={500} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <p className="text-xs text-muted-foreground md:col-span-6">This length allows {breaksAllowedFor(form.durationMinutes)} break(s).</p>
      </form>

      <div className="flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Search goals" value={q} onChange={(e) => setQ(e.target.value)} />
        {(["all", "pending", "completed"] as const).map((f) => <Button key={f} size="sm" variant={filter === f ? "default" : "secondary"} onClick={() => setFilter(f)}>{f}</Button>)}
        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="priority">Sort: priority</SelectItem><SelectItem value="date">Sort: date</SelectItem><SelectItem value="duration">Sort: duration</SelectItem></SelectContent>
        </Select>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading goals…</p>}
      {error && <p className="text-destructive">{(error as Error).message}</p>}
      {!isLoading && !error && list.length === 0 && <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">No goals here yet. Add one above.</p>}

      <ul className="space-y-2" role="radiogroup" aria-label="Select goal to study">
        {list.map((g) => {
          const isSel = selected === g.id;
          return (
            <li key={g.id} className={`flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors ${isSel ? "border-primary" : ""} ${g.completed ? "opacity-60" : ""}`}>
              <button role="radio" aria-checked={isSel} disabled={g.completed} onClick={() => setSelected(g.id)}
                className={`h-5 w-5 shrink-0 rounded-full border-2 ${isSel ? "border-primary bg-primary" : "border-muted-foreground"} disabled:opacity-30`} aria-label={`Select ${g.title}`} />
              <div className="min-w-0 flex-1">
                <p className={`font-medium ${g.completed ? "line-through" : ""}`}>{g.title}</p>
                <p className="truncate text-xs text-muted-foreground">{g.durationMinutes} min{g.scheduledDate ? ` · ${g.scheduledDate}` : ""}{g.description ? ` · ${g.description}` : ""}</p>
              </div>
              <Badge variant={g.priority === "HIGH" ? "destructive" : "secondary"}>{g.priority.toLowerCase()}</Badge>
              <Button size="icon" variant="ghost" aria-label={g.completed ? "Undo completion" : "Mark complete"} onClick={() => run(api(`/api/goals/${g.id}/complete`, { method: "PATCH", body: { completed: !g.completed } }), g.completed ? "Marked pending" : "Goal completed")}>
                {g.completed ? <Undo2 className="h-4 w-4" /> : <Check className="h-4 w-4" />}
              </Button>
              <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => { setEditing(g.id); setForm({ title: g.title, description: g.description ?? "", durationMinutes: g.durationMinutes, priority: g.priority, scheduledDate: g.scheduledDate ?? "" }); }}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => setToDelete(g)}><Trash2 className="h-4 w-4" /></Button>
            </li>
          );
        })}
      </ul>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete “{toDelete?.title}”?</AlertDialogTitle><AlertDialogDescription>This can't be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (toDelete) { if (selected === toDelete.id) setSelected(null); run(api(`/api/goals/${toDelete.id}`, { method: "DELETE" }), "Goal deleted"); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
