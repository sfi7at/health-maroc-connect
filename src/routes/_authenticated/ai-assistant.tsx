import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Send, AlertTriangle, Loader2, Stethoscope, HeartPulse, Pill, Activity,
  Phone, MapPin, ArrowRight, Siren,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askAssistant } from "@/lib/ai-assistant.functions";
import { buildHead } from "@/lib/seo";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useSearchHistory } from "@/hooks/use-search-history";

export const Route = createFileRoute("/_authenticated/ai-assistant")({
  head: () =>
    buildHead({
      title: "Assistant IA santé — HealthLink Maroc",
      description:
        "Assistant santé contextuel : symptômes, urgences, pharmacies, médecins, dons de sang. Réponses informatives, jamais un diagnostic.",
      path: "/ai-assistant",
    }),
  component: AssistantPage,
});

interface AssistantReply {
  reply: string;
  emergency: boolean;
  suggestions: { label: string; to: string }[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  reply?: AssistantReply;
}

const SUGGESTIONS = [
  { icon: Stethoscope, text: "Je cherche un dermatologue à Rabat ouvert maintenant" },
  { icon: Pill, text: "Pharmacie de garde proche" },
  { icon: HeartPulse, text: "J'ai mal à la poitrine, que faire ?" },
  { icon: Activity, text: "Où donner mon sang O- à Casablanca ?" },
];

const EMERGENCY_NUMBERS = [
  { label: "SAMU", number: "141" },
  { label: "Urgences", number: "15" },
  { label: "Protection civile", number: "150" },
];

function AssistantPage() {
  const ask = useServerFn(askAssistant);
  const { user } = useAuth();
  const { history } = useSearchHistory();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [city, setCity] = useState<string | undefined>();
  const [bloodGroup, setBloodGroup] = useState<string | undefined>();
  const [coords, setCoords] = useState<{ lat: number; lon: number } | undefined>();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load user context once
  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("city_id, cities ( name_fr )")
        .eq("id", user.id)
        .maybeSingle();
      const cityName = (profile as { cities?: { name_fr?: string } } | null)?.cities?.name_fr;
      if (cityName) setCity(cityName);
      const { data: donor } = await supabase
        .from("blood_donors")
        .select("blood_group")
        .eq("id", user.id)
        .maybeSingle();
      if (donor?.blood_group) setBloodGroup(String(donor.blood_group));
    })();
  }, [user]);

  // Best-effort geolocation
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => undefined,
      { timeout: 4000, maximumAge: 5 * 60_000 },
    );
  }, []);

  const detectedLang = useMemo<"fr" | "ar" | "en">(() => {
    const last = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    if (/[\u0600-\u06FF]/.test(last)) return "ar";
    if (/\b(the|what|how|where|hospital|doctor|pharmacy)\b/i.test(last)) return "en";
    return "fr";
  }, [messages]);

  const mutation = useMutation({
    mutationFn: async (next: ChatMessage[]) =>
      ask({
        data: {
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          context: {
            language: detectedLang,
            city,
            blood_group: bloodGroup,
            latitude: coords?.lat,
            longitude: coords?.lon,
            recent_searches: history.slice(0, 6),
          },
        },
      }) as Promise<AssistantReply>,
    onSuccess: (reply) => {
      setMessages((m) => [...m, { role: "assistant", content: reply.reply, reply }]);
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
        description="Contextuel, multilingue (FR/AR/EN), urgence-aware. Réponses informatives uniquement."
        icon={<Sparkles className="h-5 w-5" />}
      />

      <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" />
        <p className="text-warning-foreground">
          Information à but éducatif. En cas d'urgence, composez le <strong>141</strong> (SAMU) ou le <strong>15</strong>.
        </p>
      </div>

      {(city || bloodGroup || coords) && (
        <div className="flex flex-wrap gap-2 text-xs">
          {city && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-primary">
              <MapPin className="h-3 w-3" /> {city}
            </span>
          )}
          {coords && (
            <span className="inline-flex items-center gap-1 rounded-full bg-info/10 px-3 py-1 text-info">
              <MapPin className="h-3 w-3" /> GPS détectée
            </span>
          )}
          {bloodGroup && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blood/10 px-3 py-1 text-blood">
              <HeartPulse className="h-3 w-3" /> {bloodGroup}
            </span>
          )}
        </div>
      )}

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
                  Posez votre question — symptôme, pharmacie de garde, médecin, don de sang… Je vous oriente vers la bonne ressource HealthLink.
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
                    <div className="flex w-full max-w-[92%] gap-3">
                      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-3">
                        {m.reply?.emergency && (
                          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
                            <div className="flex items-center gap-2 text-destructive">
                              <Siren className="h-5 w-5 animate-pulse" />
                              <p className="text-sm font-bold uppercase tracking-wide">Mode urgence détecté</p>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {EMERGENCY_NUMBERS.map((n) => (
                                <a
                                  key={n.number}
                                  href={`tel:${n.number}`}
                                  className="inline-flex items-center gap-2 rounded-xl bg-destructive px-3 py-2 text-xs font-semibold text-destructive-foreground shadow-soft hover:opacity-90"
                                >
                                  <Phone className="h-3.5 w-3.5" /> {n.label} · {n.number}
                                </a>
                              ))}
                              <Link
                                to="/hospitals/emergency"
                                className="inline-flex items-center gap-2 rounded-xl border border-destructive/40 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10"
                              >
                                <MapPin className="h-3.5 w-3.5" /> Hôpitaux d'urgence
                              </Link>
                            </div>
                          </div>
                        )}
                        <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{m.content}</p>
                        {m.reply?.suggestions && m.reply.suggestions.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {m.reply.suggestions.map((s) => (
                              <Link
                                key={s.to + s.label}
                                to={s.to}
                                className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
                              >
                                {s.label} <ArrowRight className="h-3 w-3" />
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
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
              placeholder="Posez votre question santé (FR / العربية / EN)…"
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
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || mutation.isPending}
              className="h-12 w-12 rounded-2xl"
              aria-label="Envoyer"
            >
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
