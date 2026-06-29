import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Star, Flag, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSelectedProvider } from "@/lib/provider-store";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/provider/reviews")({
  head: () => buildHead({ title: "Avis — Espace prestataire", description: "Modérez et répondez à vos avis.", path: "/provider/reviews" }),
  component: ProviderReviewsPage,
});

type ReviewRow = {
  id: string; rating: number; comment: string | null; created_at: string;
  provider_response: string | null; provider_response_at: string | null;
  author_id: string;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
};

function ProviderReviewsPage() {
  const { provider } = useSelectedProvider();
  const { user } = useAuth();
  const id = provider?.id;
  const qc = useQueryClient();
  const [replyFor, setReplyFor] = useState<ReviewRow | null>(null);
  const [reply, setReply] = useState("");
  const [reportFor, setReportFor] = useState<ReviewRow | null>(null);
  const [reportReason, setReportReason] = useState("");

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["provider_reviews_dash", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, provider_response, provider_response_at, author_id, profiles:author_id(full_name, avatar_url)")
        .eq("provider_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ReviewRow[];
    },
  });

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const sendReply = useMutation({
    mutationFn: async () => {
      if (!replyFor) return;
      const { error } = await supabase.from("reviews").update({
        provider_response: reply.trim(),
        provider_response_at: new Date().toISOString(),
      }).eq("id", replyFor.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Réponse publiée"); setReplyFor(null); setReply(""); qc.invalidateQueries({ queryKey: ["provider_reviews_dash", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const submitReport = useMutation({
    mutationFn: async () => {
      if (!reportFor || !user) return;
      const { error } = await supabase.from("reports").insert({
        reporter_id: user.id,
        target_type: "review",
        target_id: reportFor.id,
        category: "abusive_review",
        reason: reportReason.trim() || "Avis abusif",
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Signalement envoyé"); setReportFor(null); setReportReason(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!provider) return null;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Avis" title="Avis des patients" description="Répondez et signalez les avis abusifs." icon={<Star className="h-5 w-5" />} />

      <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
        <div className="flex items-center gap-4">
          <div className="text-5xl font-extrabold text-amber-500">{avg.toFixed(1)}</div>
          <div>
            <div className="flex items-center gap-0.5 text-amber-500">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-5 w-5 ${i < Math.round(avg) ? "fill-current" : ""}`} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{reviews.length} avis</p>
          </div>
        </div>
      </section>

      {isLoading ? <Skeleton className="h-60 rounded-3xl" /> : reviews.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">Aucun avis pour le moment.</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{r.profiles?.full_name ?? "Patient"}</p>
                  <div className="mt-0.5 flex items-center gap-1 text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-current" : ""}`} />)}
                  </div>
                  {r.comment ? <p className="mt-2 text-sm">{r.comment}</p> : null}
                  {r.provider_response ? (
                    <div className="mt-3 rounded-xl bg-primary/5 p-3">
                      <p className="text-xs font-semibold text-primary">Votre réponse</p>
                      <p className="text-sm">{r.provider_response}</p>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col gap-1">
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => { setReplyFor(r); setReply(r.provider_response ?? ""); }}>
                    <MessageSquare className="h-3.5 w-3.5" />Répondre
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1" onClick={() => setReportFor(r)}>
                    <Flag className="h-3.5 w-3.5" />Signaler
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!replyFor} onOpenChange={(o) => !o && setReplyFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Répondre à l'avis</DialogTitle></DialogHeader>
          <Textarea rows={4} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Merci pour votre retour…" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReplyFor(null)}>Annuler</Button>
            <Button onClick={() => sendReply.mutate()} disabled={sendReply.isPending || !reply.trim()} className="gap-2"><Send className="h-4 w-4" /> Publier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reportFor} onOpenChange={(o) => !o && setReportFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Signaler un avis abusif</DialogTitle></DialogHeader>
          <Textarea rows={3} value={reportReason} onChange={(e) => setReportReason(e.target.value)} placeholder="Expliquez en quoi cet avis est inapproprié…" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReportFor(null)}>Annuler</Button>
            <Button onClick={() => submitReport.mutate()} disabled={submitReport.isPending}>Envoyer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}