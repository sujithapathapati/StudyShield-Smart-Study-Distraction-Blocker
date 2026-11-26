import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiUrl, setApiUrl } from "@/lib/api";

export function ConnectPanel() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "fail" | "checking">("idle");
  useEffect(() => setUrl(getApiUrl()), []);

  const test = async () => {
    setApiUrl(url); setStatus("checking");
    try {
      const r = await fetch(`${getApiUrl()}/api/health`);
      if (!r.ok) throw new Error();
      setStatus("ok"); toast.success("Connected to StudyShield server");
    } catch { setStatus("fail"); }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Address of your running Spring Boot backend (e.g. <code>http://localhost:8081</code> or your Render/Railway URL).</p>
      <div className="flex gap-2">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} />
        <Button onClick={test} disabled={status === "checking"}>Save & test</Button>
      </div>
      {status === "ok" && <p className="text-sm text-success">Server reachable ✓</p>}
      {status === "fail" && <p className="text-sm text-destructive">Couldn't reach the server. Check it's running and CORS allows this site.</p>}
    </div>
  );
}
