import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Pause, Play, Coffee, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useStudySession, fmt } from "@/lib/session";

export function FocusCard() {
  const { session, focusMs, breakRemainingMs, busy, error, action, complete, cancel } = useStudySession();
  const [confirm, setConfirm] = useState(false);

  if (!session) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <p className="text-muted-foreground">No active session.</p>
        <Button className="mt-4" asChild><Link to="/app/planner">Choose a goal to study</Link></Button>
      </div>
    );
  }
  const planned = session.plannedMinutes * 60000;
  const pct = Math.min(100, (focusMs / planned) * 100);
  const wrap = (p: Promise<void>, ok?: string) => p.then(() => ok && toast.success(ok)).catch((e) => toast.error(e.message));
  const breaksLeft = session.breaksAllowed - session.breaksTaken;

  return (
    <div className="rounded-2xl border bg-card p-8 glow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary">{session.status === "BREAK" ? "On a break" : session.status === "PAUSED" ? "Paused" : "Focusing"}</p>
          <h2 className="mt-1 text-2xl font-bold">{session.goalTitle}</h2>
          <p className="text-sm text-muted-foreground">Planned {session.plannedMinutes} min · breaks {session.breaksTaken}/{session.breaksAllowed}</p>
        </div>
        <Button size="icon" variant="ghost" aria-label="Cancel session" disabled={busy} onClick={() => wrap(cancel(), "Session cancelled")}><X className="h-4 w-4" /></Button>
      </div>
      <div className="my-8 text-center">
        <div className="font-display text-7xl font-bold tabular">{fmt(focusMs)}</div>
        {session.status === "BREAK" && <p className="mt-2 text-accent">Break ends in <span className="tabular">{fmt(breakRemainingMs)}</span></p>}
      </div>
      <Progress value={pct} />
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {session.status === "ACTIVE" && <Button variant="secondary" disabled={busy} onClick={() => wrap(action("pause"))}><Pause className="h-4 w-4" /> Pause</Button>}
        {session.status === "PAUSED" && <Button variant="secondary" disabled={busy} onClick={() => wrap(action("resume"))}><Play className="h-4 w-4" /> Resume</Button>}
        {session.status === "BREAK"
          ? <Button variant="secondary" disabled={busy} onClick={() => wrap(action("break/end"))}><Play className="h-4 w-4" /> End break</Button>
          : <Button variant="secondary" disabled={busy || breaksLeft <= 0 || session.status !== "ACTIVE"} onClick={() => wrap(action("break/start"), `${session.breakMinutes}-minute break started`)} title={breaksLeft <= 0 ? "No breaks left for this session length" : ""}><Coffee className="h-4 w-4" /> Take break ({breaksLeft})</Button>}
        <Button disabled={busy} onClick={() => setConfirm(true)}><CheckCircle2 className="h-4 w-4" /> Complete</Button>
      </div>
      {error && <p className="mt-4 text-center text-sm text-destructive">{error}</p>}
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete this session?</AlertDialogTitle>
            <AlertDialogDescription>You focused for {fmt(focusMs)}. Mark “{session.goalTitle}” as completed too?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => wrap(complete(false), "Session saved")}>Save, keep goal open</AlertDialogCancel>
            <AlertDialogAction onClick={() => wrap(complete(true), "Session saved and goal completed 🎉")}>Save & complete goal</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
