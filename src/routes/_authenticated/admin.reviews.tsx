import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, Trash2, Eye, EyeOff, Check, Flag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTimeFr } from "@/lib/format";
import { logAdminAction } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/reviews")({
  component: AdminReviews,
});

const STATUS_LABEL: Record<string, string> = {
  approved: "Publié", pending: "En attente", hidden: "Masqué", rejected: "Rejeté",
};
const STATUS_TINT: Record<string, string> = {
  approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  hidden: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  rejected: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

function AdminReviews() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const reviews = useQuery({
    queryKey: ["admin-reviews", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("reviews")
        .select("id, rating, comment, created_at, provider_id, author_id, status, report_count, providers(name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const reports = useQuery({
    queryKey: ["admin-review-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_reports")
        .select("id, review_id, reporter_id, reason, details, status, created_at, reviews(id, rating, comment, provider_id, providers(name))")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("reviews")
        .update({ status, moderation_reason: reason ?? null, moderated_by: userRes.user?.id ?? null, moderated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      await logAdminAction(`review.${status}`, "review", id);
    },
    onSuccess: () => {
      toast.success("Statut mis à jour");
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      qc.invalidateQueries({ queryKey: ["admin-review-reports"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resolveReport = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "reviewed" | "dismissed" | "actioned" }) => {
      const { error } = await supabase.from("review_reports").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-review-reports"] });
    },
    onError: (e: Error) => toast.error(e.message),
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
      <AdminHeader icon={Star} title="Avis & modération" description="Approuver, masquer ou supprimer les avis. Traiter les signalements." />

      <Tabs defaultValue="reviews">
        <TabsList>
          <TabsTrigger value="reviews">Avis</TabsTrigger>
          <TabsTrigger value="reports">
            Signalements
            {(reports.data?.length ?? 0) > 0 ? (
              <Badge className="ml-2 h-5 px-1.5 text-[10px]" variant="destructive">{reports.data!.length}</Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reviews" className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Filtrer :</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="approved">Publiés</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="hidden">Masqués</SelectItem>
                <SelectItem value="rejected">Rejetés</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_TINT[row.status] ?? ""}`}>{STATUS_LABEL[row.status] ?? row.status}</span>
                      {row.report_count > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                          <Flag className="h-3 w-3" /> {row.report_count}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm">{row.comment ?? <span className="italic text-muted-foreground">Sans commentaire</span>}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDateTimeFr(row.created_at)}</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {row.status !== "approved" ? (
                      <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: row.id, status: "approved" })}><Check className="mr-1 h-3.5 w-3.5" /> Approuver</Button>
                    ) : null}
                    {row.status !== "hidden" ? (
                      <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: row.id, status: "hidden", reason: "hidden by moderator" })}><EyeOff className="mr-1 h-3.5 w-3.5" /> Masquer</Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: row.id, status: "approved" })}><Eye className="mr-1 h-3.5 w-3.5" /> Rétablir</Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Supprimer cet avis ?")) remove.mutate(row.id); }}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Supprimer
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
          {(reviews.data?.length ?? 0) === 0 && <Card className="p-12 text-center text-muted-foreground">Aucun avis.</Card>}
        </div>
          )}
        </TabsContent>

        <TabsContent value="reports" className="mt-4 space-y-3">
          {reports.isLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
          ) : (reports.data ?? []).length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">Aucun signalement en cours.</Card>
          ) : (
            (reports.data ?? []).map((rep) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const row = rep as any;
              const rv = row.reviews;
              return (
                <Card key={row.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="destructive" className="text-[10px]">{row.reason}</Badge>
                        <span className="text-muted-foreground">{formatDateTimeFr(row.created_at)}</span>
                      </div>
                      {row.details ? <p className="mt-1 text-xs text-muted-foreground">{row.details}</p> : null}
                      {rv ? (
                        <div className="mt-3 rounded-xl border border-border bg-muted/40 p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < rv.rating ? "fill-amber-400 text-amber-400" : "text-muted"}`} />)}</div>
                            <Badge variant="outline" className="text-[10px]">{rv.providers?.name ?? "?"}</Badge>
                          </div>
                          <p className="mt-2 text-sm">{rv.comment ?? <span className="italic text-muted-foreground">Sans commentaire</span>}</p>
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => { if (rv) setStatus.mutate({ id: rv.id, status: "hidden", reason: `reported: ${row.reason}` }); resolveReport.mutate({ id: row.id, status: "actioned" }); }}>
                        <EyeOff className="mr-1 h-3.5 w-3.5" /> Masquer l'avis
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => resolveReport.mutate({ id: row.id, status: "dismissed" })}>Ignorer</Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}