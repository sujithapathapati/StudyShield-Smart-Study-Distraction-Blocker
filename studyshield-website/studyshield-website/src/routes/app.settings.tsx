import { createFileRoute } from "@tanstack/react-router";
import { ConnectPanel } from "@/components/ConnectPanel";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/settings")({ component: Settings });

function Settings() {
  const { user } = useAuth();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>
      <section className="rounded-2xl border bg-card p-6">
        <h2 className="mb-2 font-semibold">Account</h2>
        <p className="text-sm">{user?.fullName}</p><p className="text-sm text-muted-foreground">{user?.email}</p>
      </section>
      <section className="rounded-2xl border bg-card p-6"><h2 className="mb-2 font-semibold">Backend server</h2><ConnectPanel /></section>
    </div>
  );
}
