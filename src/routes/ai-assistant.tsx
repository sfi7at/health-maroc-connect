import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, AlertTriangle, Loader2, Stethoscope, HeartPulse, Pill, Activity } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askAssistant } from "@/lib/ai-assistant.functions";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/ai-assistant")({
  head: () =>
    buildHead({
      title: "Assistant IA santé — HealthLink Maroc",
      description:
        "Posez vos questions santé en français. Réponses informatives, jamais un diagnostic. En urgence, composez le 141 (SAMU).",
      path: "/ai-assistant",
    }),
  component: AssistantPage,
});

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  { icon: Stethoscope, text: "Quels symptômes nécessitent une consultation urgente ?" },
  { icon: HeartPulse, text: "Comment réduire ma tension artérielle naturellement ?" },
  { icon: Pill, text: "Différence entre un antibiotique et un antiviral ?" },
  { icon: Activity, text: "Combien d'activité physique par semaine ?" },
];

function AssistantPage() {
  const ask = useServerFn(askAssistant);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const mutation = useMutation({
    mutationFn: async (nextMessages: ChatMessage[]) =>
      ask({ data: { messages: nextMessages } }),
    onSuccess: ({ reply }) => {
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, mutation.isPending]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || mutation.isPending) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    mutation.mutate(next);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Intelligence santé"
        title="Assistant IA HealthLink"
        description="Vos questions santé, des réponses claires en français — jamais un diagnostic."
        icon={<Sparkles className="h-5 w-5" />}
      />

      <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" />
        <p className="text-warning-foreground">
          Information à but éducatif. En cas d'urgence, composez le <strong>141</strong> (SAMU) ou le <strong>15</strong>.
        </p>
      </div>

      <section className="flex h-[60vh] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-elevated">
                <Sparkles className="h-7 w-7" />
              </div>
              <div className="max-w-md">
                <h2 className="text-lg font-semibold">Bonjour 👋</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Je peux répondre à vos questions de santé générale et vous orienter vers le bon professionnel. Choisissez une suggestion ou écrivez votre question.
                </p>
              </div>
              <div className="grid w-full max-w-xl gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.text}
                      onClick={() => send(s.text)}
                      className="group flex items-start gap-3 rounded-2xl border border-border bg-background p-3 text-left text-sm transition hover:border-primary/40 hover:bg-accent/40"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="leading-snug">{s.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.role === "assistant" ? (
                    <div className="flex max-w-[85%] gap-3">
                      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{m.content}</p>
                    </div>
                  ) : (
                    <p className="max-w-[85%] rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-soft">
                      {m.content}
                    </p>
                  )}
                </motion.div>
              ))}
              {mutation.isPending && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="flex max-w-[85%] gap-3">
                    <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Sparkles className="h-4 w-4 animate-pulse" />
                    </div>
                    <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Réflexion…
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="border-t border-border bg-background/60 p-3 backdrop-blur"
        >
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Posez votre question santé…"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              className="min-h-12 resize-none rounded-2xl"
              aria-label="Message"
            />
            <Button type="submit" size="icon" disabled={!input.trim() || mutation.isPending} className="h-12 w-12 rounded-2xl" aria-label="Envoyer">
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
