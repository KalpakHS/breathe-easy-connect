import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Bot, Send, User } from "lucide-react";
import { toast } from "sonner";
import { askAssistant } from "@/lib/smartneb.functions";
import { PatientPage } from "@/components/smartneb/patient-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/patient/assistant")({
  head: () => ({
    meta: [
      { title: "AI Assistant — SmartNeb" },
      {
        name: "description",
        content: "Ask questions about your therapy, adherence and vitals with an AI assistant scoped to your data.",
      },
      { property: "og:title", content: "AI Assistant — SmartNeb" },
      { property: "og:description", content: "Understand your therapy data in plain language." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <PatientPage title="AI assistant" subtitle="Answers grounded in your own therapy data">
      {({ patientId }) => <AssistantBody patientId={patientId} />}
    </PatientPage>
  ),
});

const SUGGESTIONS = [
  "How has my SpO₂ trended this week?",
  "Did I miss any doses recently?",
  "Explain my current care plan simply.",
  "What should I do if my oxygen drops?",
];

type Msg = { role: "user" | "assistant"; content: string };

function AssistantBody({ patientId }: { patientId: string }) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi — I can explain your vitals, adherence and care plan. I can't diagnose or change your prescription; contact your clinician for medical decisions.",
    },
  ]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const ask = useMutation({
    mutationFn: (question: string) => askAssistant({ data: { question, patientId } }),
    onSuccess: (res) => {
      setMessages((m) => [...m, { role: "assistant", content: res.answer }]);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "I couldn't answer that right now. Please try again." },
      ]);
    },
  });

  const send = (text: string) => {
    const q = text.trim();
    if (!q || ask.isPending) return;
    setMessages((m) => [...m, { role: "user", content: q }]);
    setInput("");
    ask.mutate(q);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  return (
    <div className="panel flex h-[70vh] flex-col p-5">
      <div className="flex-1 space-y-4 overflow-y-auto pr-2">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex gap-3"}>
            {m.role === "assistant" ? (
              <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Bot className="size-4" />
              </span>
            ) : null}
            <div
              className={
                m.role === "user"
                  ? "max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground"
                  : "max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-bl-sm border bg-surface-2 px-4 py-2.5 text-sm"
              }
            >
              {m.content}
            </div>
            {m.role === "user" ? (
              <span className="ml-3 mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <User className="size-4" />
              </span>
            ) : null}
          </div>
        ))}
        {ask.isPending ? (
          <p className="text-sm text-muted-foreground">Assistant is thinking…</p>
        ) : null}
        <div ref={endRef} />
      </div>

      <div className="mt-4 space-y-3 border-t pt-4">
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <Button key={s} size="sm" variant="outline" onClick={() => send(s)} disabled={ask.isPending}>
              {s}
            </Button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your therapy…"
            aria-label="Ask the assistant"
          />
          <Button type="submit" disabled={ask.isPending}>
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
