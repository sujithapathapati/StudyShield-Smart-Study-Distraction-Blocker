import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Timer, Target, Ban, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StudyShield — Focus, plan and block distractions" },
      { name: "description", content: "Set study goals, run focus sessions that survive refreshes, take smart breaks and track your progress." },
      { property: "og:title", content: "StudyShield — Focus, plan and block distractions" },
      { property: "og:description", content: "Set study goals, run focus sessions, take smart breaks and track your progress." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Target, title: "Goal planner", text: "Pick exactly which goal you study. Only that goal gets completed." },
  { icon: Timer, title: "Unbreakable timer", text: "Timestamps on the server — refresh, switch tabs, sleep your laptop." },
  { icon: Ban, title: "Distraction blocking", text: "Chrome extension blocks your distracting sites during sessions." },
  { icon: BarChart3, title: "Real analytics", text: "Streaks, focus score and daily progress from your own records." },
];

function Landing() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <header className="flex items-center justify-between py-6">
        <div className="flex items-center gap-2 font-display text-xl font-bold"><Shield className="h-6 w-6 text-primary" /> StudyShield</div>
        <div className="flex gap-2">
          <Button variant="ghost" asChild><Link to="/login">Log in</Link></Button>
          <Button asChild><Link to="/signup">Get started</Link></Button>
        </div>
      </header>
      <section className="py-24 text-center">
        <p className="mb-4 text-sm uppercase tracking-[0.3em] text-primary">Study. Shielded.</p>
        <h1 className="mx-auto max-w-3xl text-5xl font-bold md:text-7xl">Deep focus, <span className="text-primary">without the scroll.</span></h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">Plan your goals, start a focus session and let StudyShield guard your attention until you're done.</p>
        <Button size="lg" className="mt-10 glow" asChild><Link to="/signup">Start your first session</Link></Button>
      </section>
      <section className="grid gap-4 pb-24 md:grid-cols-4">
        {features.map((f) => (
          <div key={f.title} className="rounded-2xl border bg-card p-6">
            <f.icon className="mb-4 h-6 w-6 text-primary" />
            <h3 className="font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
