import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, ThumbsUp, Flag, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("auth");
      if (rating < 1) throw new Error("Sélectionnez une note");
      const { error } = await supabase.from("reviews").upsert({
        provider_id: providerId, author_id: user.id, rating, comment: comment.trim() || null,
      }, { onConflict: "provider_id,author_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Avis publié");
      setComment(""); setRating(0);
      qc.invalidateQueries({ queryKey: ["doctor_reviews", providerId] });
      qc.invalidateQueries({ queryKey: ["doctor", providerId] });
    },
    onError: (e: Error) => toast.error(e.message === "auth" ? "Connectez-vous pour laisser un avis" : e.message),
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

      <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <h3 className="mb-3 text-sm font-semibold">Laisser un avis</h3>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" aria-label={`${n} étoiles`} onClick={() => setRating(n)}>
              <Star className={`h-7 w-7 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
            </button>
          ))}
        </div>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Partagez votre expérience…"
          rows={3}
          maxLength={500}
          className="mt-3 rounded-2xl"
        />
        <div className="mt-3 flex justify-end">
          <Button onClick={() => submit.mutate()} disabled={submit.isPending || rating < 1}>
            Publier
          </Button>
        </div>
      </section>

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
                <button className="inline-flex items-center gap-1 hover:text-foreground"><ThumbsUp className="h-3.5 w-3.5" /> Utile</button>
                <button className="inline-flex items-center gap-1 hover:text-foreground"><Flag className="h-3.5 w-3.5" /> Signaler</button>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}