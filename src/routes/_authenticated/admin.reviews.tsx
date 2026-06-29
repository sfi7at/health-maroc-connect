import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTimeFr } from "@/lib/format";
import { logAdminAction } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/reviews")({
  component: AdminReviews,
});

function AdminReviews() {
  const qc = useQueryClient();
  const reviews = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, provider_id, author_id, providers(name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;
      await logAdminAction("review.delete", "review", id);
    },
    onSuccess: () => { toast.success("Avis supprimé"); qc.invalidateQueries({ queryKey: ["admin-reviews"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <AdminHeader icon={Star} title="Avis & évaluations" description="Modérer les avis publiés sur les prestataires." />

      {reviews.isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : (
        <div className="space-y-3">
          {(reviews.data ?? []).map((r) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const row = r as any;
            return (
              <Card key={row.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < row.rating ? "fill-amber-400 text-amber-400" : "text-muted"}`} />)}</div>
                      <Badge variant="outline" className="text-[10px]">{row.providers?.name ?? "?"}</Badge>
                    </div>
                    <p className="mt-2 text-sm">{row.comment ?? <span className="italic text-muted-foreground">Sans commentaire</span>}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDateTimeFr(row.created_at)}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Supprimer cet avis ?")) remove.mutate(row.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
          {(reviews.data?.length ?? 0) === 0 && <Card className="p-12 text-center text-muted-foreground">Aucun avis.</Card>}
        </div>
      )}
    </div>
  );
}