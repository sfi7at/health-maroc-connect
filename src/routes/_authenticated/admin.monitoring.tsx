import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, CheckCircle2, Cpu, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTimeFr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/monitoring")({
  component: AdminMonitoring,
});

function AdminMonitoring() {
  const errors = useQuery({
    queryKey: ["admin-errors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("error_reports")
        .select("id, fingerprint, message, severity, source, occurrences, last_seen, resolved, url")
        .eq("resolved", false)
        .order("last_seen", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30_000,
  });

  const health = useQuery({
    queryKey: ["admin-health-probe"],
    queryFn: async () => {
      const res = await fetch("/api/public/health", { cache: "no-store" });
      return (await res.json()) as { status: string; checks: Record<string, { ok: boolean; latencyMs?: number; error?: string }>; totalLatencyMs: number };
    },
    refetchInterval: 30_000,
  });

  const stats = useQuery({
    queryKey: ["admin-error-stats"],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const [total, fatal, unresolved] = await Promise.all([
        supabase.from("error_reports").select("id", { count: "exact", head: true }).gte("last_seen", since),
        supabase.from("error_reports").select("id", { count: "exact", head: true }).eq("severity", "fatal").gte("last_seen", since),
        supabase.from("error_reports").select("id", { count: "exact", head: true }).eq("resolved", false),
      ]);
      return { total: total.count ?? 0, fatal: fatal.count ?? 0, unresolved: unresolved.count ?? 0 };
    },
    refetchInterval: 60_000,
  });

  async function markResolved(id: string) {
    await supabase.from("error_reports").update({ resolved: true, resolved_at: new Date().toISOString() }).eq("id", id);
    errors.refetch();
    stats.refetch();
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        icon={Activity}
        title="Monitoring & erreurs"
        description="Santé système, erreurs en temps réel, latence des APIs."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="État système" value={health.data?.status ?? "—"} icon={CheckCircle2} tone={health.data?.status === "healthy" ? "ok" : "warn"} />
        <Stat label="Latence health" value={health.data ? `${health.data.totalLatencyMs} ms` : "—"} icon={Zap} />
        <Stat label="Erreurs 24h" value={String(stats.data?.total ?? 0)} icon={AlertTriangle} />
        <Stat label="Non résolues" value={String(stats.data?.unresolved ?? 0)} icon={Cpu} tone={(stats.data?.unresolved ?? 0) > 10 ? "warn" : "ok"} />
      </div>

      <Card className="p-4">
        <div className="mb-3 text-sm font-semibold">Composants</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(health.data?.checks ?? {}).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
              <div>
                <div className="text-sm font-medium capitalize">{k}</div>
                {v.error && <div className="text-xs text-destructive">{v.error}</div>}
              </div>
              <Badge variant={v.ok ? "default" : "destructive"}>{v.ok ? `${v.latencyMs}ms` : "down"}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-border p-4 text-sm font-semibold">Erreurs ouvertes</div>
        {errors.isLoading ? (
          <div className="p-6 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr>
              <th className="px-4 py-3 text-left">Message</th>
              <th className="px-4 py-3 text-left">Source</th>
              <th className="px-4 py-3 text-left">Sévérité</th>
              <th className="px-4 py-3 text-right">Occurrences</th>
              <th className="px-4 py-3 text-left">Vue récente</th>
              <th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>
              {(errors.data ?? []).map((e) => (
                <tr key={e.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3 max-w-md truncate font-mono text-xs">{e.message}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-[10px]">{e.source}</Badge></td>
                  <td className="px-4 py-3"><Badge variant={e.severity === "fatal" ? "destructive" : "secondary"} className="text-[10px]">{e.severity}</Badge></td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{e.occurrences}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTimeFr(e.last_seen)}</td>
                  <td className="px-4 py-3 text-right"><Button size="sm" variant="outline" onClick={() => markResolved(e.id)}>Résolu</Button></td>
                </tr>
              ))}
              {(errors.data?.length ?? 0) === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Aucune erreur ouverte 🎉</td></tr>}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Activity; tone?: "ok" | "warn" }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-bold tracking-tight">{value}</div>
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${tone === "warn" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}