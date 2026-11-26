import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";

export const Route = createFileRoute("/signup")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Sign up — StudyShield" }, { name: "description", content: "Create your free StudyShield account." },
    { property: "og:title", content: "Sign up — StudyShield" }, { property: "og:description", content: "Create your free StudyShield account." },
  ] }),
  component: () => <AuthForm mode="signup" />,
});
