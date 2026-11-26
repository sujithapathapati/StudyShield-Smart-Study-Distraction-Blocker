import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send, Plus, Trash2, Sparkles, PlusCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/ai-chat")({ component: AiChatPage });

type ChatMsg = { role: "user" | "assistant"; content: string; timestamp: string };
type Convo = { id: string; title: string; messages: ChatMsg[]; updatedAt: string };

function AiChatPage() {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");

  const { data: convos = [] } = useQuery({ queryKey: ["ai-convos"], queryFn: () => api<Convo[]>("/api/ai/conversations") });
  const active = convos.find((c) => c.id === activeId) ?? convos[0] ?? null;

  const send = useMutation({
    mutationFn: (message: string) => api<Convo>("/api/ai/chat", { method: "POST", body: { conversationId: active?.id ?? "", message } }),
    onSuccess: (updated) => { setErr(""); setText(""); setActiveId(updated.id); qc.invalidateQueries({ queryKey: ["ai-convos"] }); },
    onError: (e: Error) => setErr(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => api(`/api/ai/conversations/${id}`, { method: "DELETE" }),
    onSuccess: () => { setActiveId(null); qc.invalidateQueries({ queryKey: ["ai-convos"] }); },
  });

  const saveAsGoal = useMutation({
    mutationFn: (title: string) => api("/api/goals", { method: "POST", body: { title: title.slice(0, 60), durationMinutes: 30, priority: "MEDIUM", source: "AI_CHAT" } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });

  const prompts = [
    "Break down Java OOPs into 30-minute study sessions",
    "Quiz me with 3 DSA interview questions",
    "How should I revise before tomorrow's project review?",
  ];

  return (
    <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-[240px_1fr]">
      <Card className="h-fit">
        <CardHeader className="pb-3">
          <Button size="sm" className="w-full" onClick={() => setActiveId("__new__")}><Plus className="mr-1 h-4 w-4" /> New Chat</Button>
        </CardHeader>
        <CardContent className="space-y-1">
          {convos.map((c) => (
            <div key={c.id} className={`flex items-center justify-between rounded-md px-2 py-1.5 text-xs cursor-pointer ${active?.id === c.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
              onClick={() => setActiveId(c.id)}>
              <span className="truncate">{c.title}</span>
              <button onClick={(e) => { e.stopPropagation(); del.mutate(c.id); }}><Trash2 className="h-3.5 w-3.5 opacity-70 hover:opacity-100" /></button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="flex min-h-[520px] flex-col">
        <CardHeader className="border-b pb-3">
          <CardTitle className="flex items-center gap-2 text-lg"><MessageSquare className="h-5 w-5 text-primary" /> StudyShield AI Assistant</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col justify-between gap-4 pt-4">
          <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1">
            {(!active || activeId === "__new__" || active.messages.length === 0) ? (
              <div className="space-y-3 py-6 text-center">
                <Sparkles className="mx-auto h-8 w-8 text-primary" />
                <p className="text-sm text-muted-foreground">Ask for study schedules, topic explanations, practice questions, or motivation.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {prompts.map((p) => (
                    <Button key={p} variant="outline" size="sm" onClick={() => send.mutate(p)}>{p}</Button>
                  ))}
                </div>
              </div>
            ) : active.messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                  {m.role === "assistant" && <Badge variant="outline" className="mb-1 text-[10px]">AI Assistant</Badge>}
                  <div>{m.content}</div>
                  {m.role === "assistant" && (
                    <Button variant="ghost" size="sm" className="mt-2 h-7 px-2 text-xs" onClick={() => saveAsGoal.mutate(m.content)}>
                      <PlusCircle className="mr-1 h-3.5 w-3.5" /> Save as 30m Goal
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t pt-3">
            {err && <p className="text-xs text-destructive">{err}</p>}
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) send.mutate(text); }}>
              <Input placeholder="Ask StudyShield AI anything..." value={text} onChange={(e) => setText(e.target.value)} />
              <Button type="submit" disabled={!text.trim() || send.isPending}>
                {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}