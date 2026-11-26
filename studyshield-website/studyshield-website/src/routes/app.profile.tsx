import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { User as UserIcon, Check } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const Route = createFileRoute("/app/profile")({ component: ProfilePage });

function ProfilePage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [saved, setSaved] = useState(false);

  const update = useMutation({
    mutationFn: () => api("/api/profile", { method: "PATCH", body: { fullName } }),
    onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2500); },
  });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold"><UserIcon className="h-6 w-6 text-primary" /> Student Profile</h1>
      <Card>
        <CardHeader><CardTitle>Account Details</CardTitle><CardDescription>Manage your StudyShield profile stored in MongoDB.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div><label className="text-xs font-medium">Email</label><Input value={user?.email ?? ""} disabled /></div>
          <div><label className="text-xs font-medium">Full Name</label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
          <Button disabled={!fullName.trim() || update.isPending} onClick={() => update.mutate()}>
            {saved ? <><Check className="mr-1 h-4 w-4" /> Saved</> : "Save Profile"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}