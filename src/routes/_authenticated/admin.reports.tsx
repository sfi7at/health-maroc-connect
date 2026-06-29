import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag, Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTimeFr } from "@/lib/format";
import { logAdminAction } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: AdminReports,
});

function AdminReports() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"open" | "resolved" | "rejected" | "all">("open");

  const reports = useQuery({
    queryKey: ["admin-reports", filter],
    queryFn: async () => {
      let q = supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(100);
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const resolve = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "resolved" | "rejected" }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("reports").update({ status, resolver_id: u.user?.id ?? null, resolved_at: new Date().toISOString() } as never).eq("id", id);
      if (error) throw error;
      await logAdminAction(`report.${status}`, "report", id);
    },
    onSuccess: () => { toast.success("Mis à jour"); qc.invalidateQueries({ queryKey: ["admin-reports"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <AdminHeader
        icon={Flag}
        title="Signalements"
        description="Modération des contenus et profils signalés par les utilisateurs."
        actions={
          <Select value={filter} onValueChange={(v) => setFilter(v as never)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Ouverts</SelectItem>
              <SelectItem value="resolved">Résolus</SelectItem>
              <SelectItem value="rejected">Rejetés</SelectItem>
              <SelectItem value="all">Tous</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {reports.isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : (reports.data?.length ?? 0) === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Aucun signalement.</Card>
      ) : (
        <div className="space-y-3">
          {(reports.data ?? []).map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{r.category}</Badge>
                    <Badge variant="secondary">{r.target_type}</Badge>
                    {r.status === "open" && <Badge variant="destructive">Ouvert</Badge>}
                    {r.status === "resolved" && <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200">Résolu</Badge>}
                    {r.status === "rejected" && <Badge variant="outline">Rejeté</Badge>}
                  </div>
                  <p className="mt-2 text-sm">{r.reason}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Signalé le {formatDateTimeFr(r.created_at)} · Cible {r.target_id ?? "—"}</p>
                </div>
                {r.status === "open" && (
                  <div className="flex flex-col gap-2">
                    <Button size="sm" onClick={() => resolve.mutate({ id: r.id, status: "resolved" })}><Check className="h-4 w-4 mr-1" /> Résoudre</Button>
                    <Button size="sm" variant="outline" onClick={() => resolve.mutate({ id: r.id, status: "rejected" })}><X className="h-4 w-4 mr-1" /> Rejeter</Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}