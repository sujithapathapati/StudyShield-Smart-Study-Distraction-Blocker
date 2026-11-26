import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Log in — StudyShield" }, { name: "description", content: "Log in to your StudyShield account." },
    { property: "og:title", content: "Log in — StudyShield" }, { property: "og:description", content: "Log in to your StudyShield account." },
  ] }),
  component: () => <AuthForm mode="login" />,
});
