import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function AppointmentChat({ appointmentId }: { appointmentId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const queryKey = ["appointment-messages", appointmentId];
  const messages = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase.from("appointment_messages").select("*").eq("appointment_id", appointmentId).order("created_at").limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    const channel = supabase.channel(`appointment-chat-${appointmentId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "appointment_messages", filter: `appointment_id=eq.${appointmentId}` }, () => qc.invalidateQueries({ queryKey })).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [appointmentId, qc]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const clean = body.trim();
    if (!user || !clean || clean.length > 2000) return;
    setSending(true);
    const { error } = await supabase.from("appointment_messages").insert({ appointment_id: appointmentId, sender_id: user.id, body: clean });
    setSending(false);
    if (error) return toast.error(error.message);
    setBody("");
    qc.invalidateQueries({ queryKey });
  }

  return (
    <div className="space-y-3">
      <div className="max-h-72 space-y-2 overflow-y-auto rounded-2xl bg-muted/30 p-3" aria-live="polite">
        {messages.isLoading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : messages.data?.length ? messages.data.map((message) => {
          const mine = message.sender_id === user?.id;
          return <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}><div className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm", mine ? "bg-primary text-primary-foreground" : "border border-border bg-card")}><p className="whitespace-pre-wrap break-words">{message.body}</p><p className={cn("mt-1 text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>{new Date(message.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p></div></div>;
        }) : <p className="py-6 text-center text-xs text-muted-foreground">Aucun message. Utilisez cet espace pour les informations liées au rendez-vous.</p>}
      </div>
      <form onSubmit={send} className="flex gap-2"><Input value={body} onChange={(event) => setBody(event.target.value)} maxLength={2000} placeholder="Écrire un message…" aria-label="Message" /><Button type="submit" size="icon" disabled={!body.trim() || sending} aria-label="Envoyer">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button></form>
      <p className="text-[11px] text-muted-foreground">N'utilisez pas la messagerie en cas d'urgence médicale.</p>
    </div>
  );
}
