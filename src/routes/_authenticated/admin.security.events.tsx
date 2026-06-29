import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Activity, Check } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/admin/security/events")({
  component: AdminSecurityEvents,
});

function AdminSecurityEvents() {
  const qc = useQueryClient();
  const [severity, setSeverity] = useState<string>("all");
  const [status, setStatus] = useState<"open" | "resolved" | "all">("open");

  const events = useQuery({
    queryKey: ["admin-sec-events", severity, status],
    queryFn: async () => {
      let q = supabase.from("security_events").select("*").order("created_at", { ascending: false }).limit(200);
      if (severity !== "all") q = q.eq("severity", severity);
      if (status !== "all") q = q.eq("resolved", status === "resolved");
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const resolve = useMutation({
    mutationFn: async (id: string) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("security_events")
        .update({ resolved: true, resolved_by: u.user?.id ?? null, resolved_at: new Date().toISOString() } as never)
        .eq("id", id);
      if (error) throw error;
      await logAdminAction("security_event.resolve", "security_event", id);
    },
    onSuccess: () => { toast.success("Marqué comme résolu"); qc.invalidateQueries({ queryKey: ["admin-sec-events"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <AdminHeader
        icon={Activity}
        title="Journal d'événements de sécurité"
        description="Connexions suspectes, anomalies, signaux de fraude et alertes système."
        actions={
          <div className="flex gap-2">
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toute gravité</SelectItem>
                <SelectItem value="critical">Critique</SelectItem>
                <SelectItem value="high">Élevée</SelectItem>
                <SelectItem value="medium">Moyenne</SelectItem>
                <SelectItem value="low">Faible</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v as never)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Ouverts</SelectItem>
                <SelectItem value="resolved">Résolus</SelectItem>
                <SelectItem value="all">Tous</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      {events.isLoading ? (
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : (events.data?.length ?? 0) === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Aucun événement.</Card>
      ) : (
        <div className="space-y-3">
          {(events.data ?? []).map((e) => (
            <Card key={e.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={e.severity} />
                    <Badge variant="outline">{e.event_type}</Badge>
                    {e.resolved && <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200">Résolu</Badge>}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDateTimeFr(e.created_at)}
                    {e.ip_address ? ` · IP ${String(e.ip_address)}` : ""}
                    {e.user_id ? ` · user ${String(e.user_id).slice(0, 8)}…` : ""}
                  </p>
                  {e.metadata && Object.keys(e.metadata as object).length > 0 && (
                    <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-muted/40 p-2 text-[11px] leading-relaxed">
                      {JSON.stringify(e.metadata, null, 2)}
                    </pre>
                  )}
                </div>
                {!e.resolved && (
                  <Button size="sm" onClick={() => resolve.mutate(e.id)}>
                    <Check className="h-4 w-4 mr-1" /> Résoudre
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: "bg-rose-600 text-white",
    high: "bg-rose-500/15 text-rose-700 border-rose-200",
    medium: "bg-amber-500/15 text-amber-700 border-amber-200",
    low: "bg-slate-500/10 text-slate-600 border-slate-200",
  };
  const label: Record<string, string> = { critical: "Critique", high: "Élevée", medium: "Moyenne", low: "Faible" };
  return <Badge className={map[severity] ?? ""} variant="outline">{label[severity] ?? severity}</Badge>;
}
