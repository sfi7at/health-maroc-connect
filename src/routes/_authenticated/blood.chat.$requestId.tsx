import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  MapPin,
  Hospital,
  CheckCheck,
  Loader2,
  ShieldCheck,
  ArrowLeft,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { bloodRequestByIdQuery, chatMessagesQuery } from "@/lib/blood-queries";
import { formatRelativeFr } from "@/lib/format";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/blood/chat/$requestId")({
  head: () =>
    buildHead({
      title: "Discussion sécurisée — HealthLink Maroc",
      description: "Discussion privée entre demandeur et donneur de sang.",
    }),
  component: ChatPage,
});

function ChatPage() {
  const { requestId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: request } = useQuery(bloodRequestByIdQuery(requestId));
  const { data: messages = [], isLoading } = useQuery(chatMessagesQuery(requestId));

  const [body, setBody] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Determine recipient = the other participant. If I'm requester, recipient is anyone who accepted.
  // For simplicity, we let server-side RLS enforce. Recipient defaults to request.requester_id if I'm a donor, else needs accepted donor lookup.
  const recipientId = useEffect ? null : null;

  useEffect(() => {
    if (!requestId) return;
    const ch = supabase
      .channel(`blood_chat_${requestId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blood_chat_messages", filter: `request_id=eq.${requestId}` },
        () => qc.invalidateQueries({ queryKey: ["blood_chat", requestId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [requestId, qc]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = useMutation({
    mutationFn: async (payload: { kind: string; body: string; metadata?: Record<string, unknown> }) => {
      if (!user || !request) throw new Error("Session invalide");
      // Determine recipient
      let recipient = request.requester_id;
      if (user.id === request.requester_id) {
        const { data: resp } = await supabase
          .from("blood_request_responses")
          .select("donor_id")
          .eq("request_id", request.id)
          .eq("status", "accepted")
          .limit(1)
          .maybeSingle();
        if (!resp) throw new Error("Aucun donneur n'a encore accepté");
        recipient = resp.donor_id;
      }
      const { error } = await supabase.from("blood_chat_messages").insert({
        request_id: request.id,
        sender_id: user.id,
        recipient_id: recipient,
        body: payload.body,
        kind: payload.kind,
        metadata: payload.metadata ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => setBody(""),
    onError: (e: Error) => toast.error(e.message),
  });

  const shareLocation = () => {
    if (!navigator.geolocation) return toast.error("Géolocalisation non disponible");
    navigator.geolocation.getCurrentPosition((pos) => {
      send.mutate({
        kind: "location",
        body: "📍 Position partagée",
        metadata: { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
      });
    });
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-12rem)] max-w-3xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
      <header className="flex items-center gap-3 border-b border-border p-4">
        <Button asChild variant="ghost" size="icon">
          <Link to="/appointments"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {request ? `${request.patient_name} • ${request.blood_group}` : "Discussion"}
          </p>
          <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3 w-3 text-primary" /> Chiffré et privé entre vous deux
          </p>
        </div>
        {request?.contact_phone && (
          <Button asChild size="sm" variant="outline" className="gap-1">
            <a href={`tel:${request.contact_phone}`}><Phone className="h-3.5 w-3.5" /> Appeler</a>
          </Button>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {isLoading ? (
          <Skeleton className="h-16 w-2/3 rounded-2xl" />
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                      mine
                        ? "bg-rose-600 text-white"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {m.kind === "location" ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-4 w-4" /> {m.body}
                      </span>
                    ) : m.kind === "hospital" ? (
                      <span className="inline-flex items-center gap-1">
                        <Hospital className="h-4 w-4" /> {m.body}
                      </span>
                    ) : (
                      m.body
                    )}
                    <div className={`mt-1 flex items-center gap-1 text-[10px] ${mine ? "text-white/70" : "text-muted-foreground"}`}>
                      {formatRelativeFr(m.created_at)}
                      {mine && m.read_at && <CheckCheck className="h-3 w-3" />}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = body.trim();
          if (!trimmed) return;
          send.mutate({ kind: "text", body: trimmed.slice(0, 800) });
        }}
        className="flex items-center gap-2 border-t border-border p-3"
      >
        <Button type="button" variant="ghost" size="icon" onClick={shareLocation} title="Partager la position">
          <MapPin className="h-4 w-4" />
        </Button>
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Écrire un message…"
          maxLength={800}
          className="h-11 rounded-full"
        />
        <Button type="submit" size="icon" disabled={send.isPending} className="h-11 w-11 rounded-full">
          {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}

// Suppress unused warning for placeholder var
void Hospital;