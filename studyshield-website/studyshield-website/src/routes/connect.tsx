import { createFileRoute, Link } from "@tanstack/react-router";
import { ConnectPanel } from "@/components/ConnectPanel";

export const Route = createFileRoute("/connect")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Connect backend — StudyShield" }, { name: "description", content: "Point StudyShield at your Spring Boot server." },
    { property: "og:title", content: "Connect backend — StudyShield" }, { property: "og:description", content: "Point StudyShield at your Spring Boot server." },
  ] }),
  component: () => (
    <div className="mx-auto max-w-lg space-y-4 px-6 py-24">
      <h1 className="text-3xl font-bold">Connect your server</h1>
      <ConnectPanel />
      <Link to="/login" className="text-sm text-primary">← Back to login</Link>
    </div>
  ),
});
