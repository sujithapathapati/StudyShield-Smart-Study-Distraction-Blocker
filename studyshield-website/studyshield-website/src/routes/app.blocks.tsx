import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ban, Plus, Trash2, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/blocks")({ component: BlocksPage });

type BlockedSite = { id: string; name: string; domain: string; enabled: boolean };

function BlocksPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [err, setErr] = useState("");

  const { data: sites = [] } = useQuery({ queryKey: ["blocks"], queryFn: () => api<BlockedSite[]>("/api/blocks") });

  const add = useMutation({
    mutationFn: () => api("/api/blocks", { method: "POST", body: { name, domain } }),
    onSuccess: () => { setName(""); setDomain(""); setErr(""); qc.invalidateQueries({ queryKey: ["blocks"] }); },
    onError: (e: Error) => setErr(e.message),
  });

  const toggle = useMutation({
    mutationFn: (id: string) => api(`/api/blocks/${id}/toggle`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blocks"] }),
  });

  const del = useMutation({
    mutationFn: (id: string) => api(`/api/blocks/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blocks"] }),
  });

  const activeCount = sites.filter((s) => s.enabled).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Ban className="h-6 w-6 text-primary" /> Distraction Blocker</h1>
          <p className="text-sm text-muted-foreground">Websites enabled below are automatically blocked by the StudyShield Chrome Extension during active focus sessions.</p>
        </div>
        <Badge className="gap-1"><ShieldCheck className="h-3.5 w-3.5" /> {activeCount} Active Rules</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle>Add Distracting Website</CardTitle><CardDescription>Enter a domain such as instagram.com or netflix.com</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input placeholder="Site Name (e.g., Instagram)" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Domain (e.g., instagram.com)" value={domain} onChange={(e) => setDomain(e.target.value)} />
            <Button disabled={!domain.trim() || add.isPending} onClick={() => add.mutate()}><Plus className="mr-1 h-4 w-4" /> Add</Button>
          </div>
          {err && <p className="text-xs text-destructive">{err}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Your Block List</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {sites.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.domain}</p>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={s.enabled} onCheckedChange={() => toggle.mutate(s.id)} />
                <Button variant="ghost" size="icon" onClick={() => del.mutate(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}