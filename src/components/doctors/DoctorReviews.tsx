import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, Flag, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatRelativeFr } from "@/lib/format";

interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  photos: string[];
  provider_response: string | null;
  provider_response_at: string | null;
  created_at: string;
  author_id: string;
  status?: string | null;
  appointment_id?: string | null;
  profiles?: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

interface Props {
  providerId: string;
  reviews: ReviewRow[];
}

export function DoctorReviews({ providerId, reviews }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reportOpen, setReportOpen] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("inappropriate");
  const [reportDetails, setReportDetails] = useState("");

  // Fetch completed appointments with this provider to check eligibility
  const eligibility = useQuery({
    queryKey: ["review_eligibility", providerId, user?.id ?? "anon"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, scheduled_for")
        .eq("provider_id", providerId)
        .eq("patient_id", user!.id)
        .eq("status", "completed")
        .order("scheduled_for", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });
  const myExistingReview = useMemo(
    () => (user ? reviews.find((r) => r.author_id === user.id) : null),
    [reviews, user],
  );
  const eligibleAppts = eligibility.data ?? [];
  const canReview = !!user && eligibleAppts.length > 0 && !myExistingReview;

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("auth");
      if (rating < 1) throw new Error("Sélectionnez une note");
      const appointment_id = eligibleAppts[0]?.id ?? null;
      const { error } = await supabase.from("reviews").insert({
        provider_id: providerId,
        author_id: user.id,
        rating,
        comment: comment.trim() || null,
        appointment_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Avis publié");
      setComment(""); setRating(0);
      qc.invalidateQueries({ queryKey: ["doctor_reviews", providerId] });
      qc.invalidateQueries({ queryKey: ["doctor", providerId] });
      qc.invalidateQueries({ queryKey: ["review_eligibility", providerId] });
    },
    onError: (e: Error) => {
      if (e.message === "auth") toast.error("Connectez-vous pour laisser un avis");
      else if (/completing an appointment/i.test(e.message)) toast.error("Vous devez avoir un rendez-vous terminé avec ce médecin.");
      else if (/duplicate|unique/i.test(e.message)) toast.error("Vous avez déjà laissé un avis pour cette visite.");
      else toast.error(e.message);
    },
  });

  const report = useMutation({
    mutationFn: async () => {
      if (!user || !reportOpen) throw new Error("auth");
      const { error } = await supabase.from("review_reports").insert({
        review_id: reportOpen, reporter_id: user.id,
        reason: reportReason, details: reportDetails.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Signalement envoyé. Merci !");
      setReportOpen(null); setReportDetails(""); setReportReason("inappropriate");
    },
    onError: (e: Error) => {
      if (/duplicate|unique/i.test(e.message)) toast.error("Vous avez déjà signalé cet avis.");
      else toast.error(e.message);
    },
  });

  const dist = [5, 4, 3, 2, 1].map((n) => ({
    n, count: reviews.filter((r) => r.rating === n).length,
  }));
  const total = reviews.length;
  const avg = total ? reviews.reduce((a, r) => a + r.rating, 0) / total : 0;

  return (
    <div className="space-y-6">
      <section className="grid gap-6 rounded-3xl border border-border bg-card p-6 shadow-soft sm:grid-cols-[180px_1fr]">
        <div className="text-center">
          <p className="text-5xl font-bold">{avg.toFixed(1)}</p>
          <div className="mt-1 flex justify-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`h-4 w-4 ${i < Math.round(avg) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{total} avis</p>
        </div>
        <ul className="space-y-1.5">
          {dist.map((d) => (
            <li key={d.n} className="flex items-center gap-3 text-xs">
              <span className="w-3 font-medium">{d.n}</span>
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-amber-400" style={{ width: total ? `${(d.count / total) * 100}%` : "0%" }} />
              </div>
              <span className="w-6 text-right text-muted-foreground">{d.count}</span>
            </li>
          ))}
        </ul>
      </section>

      {!user ? (
        <section className="rounded-3xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Connectez-vous après avoir consulté ce médecin pour laisser un avis.
        </section>
      ) : myExistingReview ? (
        <section className="rounded-3xl border border-border bg-card p-5 text-sm text-muted-foreground shadow-soft">
          Merci — votre avis est publié. Vous pouvez le modifier ou le supprimer pendant 30 jours.
        </section>
      ) : canReview ? (
        <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <h3 className="mb-3 text-sm font-semibold">Laisser un avis</h3>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" aria-label={`${n} étoiles`} onClick={() => setRating(n)} className="p-1">
                <Star className={`h-8 w-8 sm:h-7 sm:w-7 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
              </button>
            ))}
          </div>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Partagez votre expérience (facultatif, 1000 caractères max)…"
            rows={4}
            maxLength={1000}
            className="mt-3 rounded-2xl"
          />
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{comment.length}/1000</p>
            <Button onClick={() => submit.mutate()} disabled={submit.isPending || rating < 1}>
              Publier
            </Button>
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Seuls les patients ayant consulté ce médecin peuvent laisser un avis.
        </section>
      )}

      <section className="space-y-4">
        {!reviews.length ? (
          <p className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Aucun avis pour le moment. Soyez le premier !
          </p>
        ) : (
          reviews.map((r) => (
            <article key={r.id} className="rounded-3xl border border-border bg-card p-5 shadow-soft">
              <header className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-muted text-xs font-semibold">
                    {r.profiles?.avatar_url ? (
                      <img src={r.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (r.profiles?.full_name ?? "?").slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{r.profiles?.full_name ?? "Patient"}</p>
                    <p className="text-xs text-muted-foreground">{formatRelativeFr(r.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
                  ))}
                </div>
              </header>
              {r.comment ? <p className="mt-3 text-sm leading-relaxed">{r.comment}</p> : null}
              {r.provider_response ? (
                <div className="mt-4 rounded-2xl bg-primary/5 p-4">
                  <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-primary">
                    <MessageSquare className="h-3.5 w-3.5" /> Réponse du médecin
                  </div>
                  <p className="text-sm">{r.provider_response}</p>
                </div>
              ) : null}
              <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 hover:text-foreground disabled:opacity-40"
                  disabled={!user || r.author_id === user?.id}
                  onClick={() => setReportOpen(r.id)}
                >
                  <Flag className="h-3.5 w-3.5" /> Signaler
                </button>
              </div>
            </article>
          ))
        )}
      </section>

      <Dialog open={!!reportOpen} onOpenChange={(o) => !o && setReportOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Signaler cet avis</DialogTitle>
            <DialogDescription>Aidez-nous à garder les avis honnêtes. Un modérateur vérifiera ce signalement.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={reportReason} onValueChange={setReportReason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="inappropriate">Contenu inapproprié</SelectItem>
                <SelectItem value="spam">Spam ou publicité</SelectItem>
                <SelectItem value="fake">Avis manifestement faux</SelectItem>
                <SelectItem value="hate">Propos haineux</SelectItem>
                <SelectItem value="personal">Données personnelles</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Précisions (facultatif)"
              maxLength={500}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReportOpen(null)}>Annuler</Button>
            <Button onClick={() => report.mutate()} disabled={report.isPending}>Envoyer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}