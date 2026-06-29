import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTimeFr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/backups")({
  component: AdminBackups,
});

function formatBytes(n: number | null): string {
  if (!n) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${units[i]}`;
}

function AdminBackups() {
  const backups = useQuery({
    queryKey: ["admin-backups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backup_runs")
        .select("id, kind, status, size_bytes, duration_ms, location, error, started_at, finished_at")
        .order("started_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 60_000,
  });

  const rows = backups.data ?? [];
  const lastSuccess = rows.find((r) => r.status === "success");

  return (
    <div className="space-y-6">
      <AdminHeader icon={Database} title="Sauvegardes & restauration" description="État des sauvegardes automatisées de la base de données et du stockage." />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Dernière sauvegarde réussie</div>
          <div className="mt-1 text-lg font-semibold">{lastSuccess ? formatDateTimeFr(lastSuccess.started_at) : "—"}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Taille</div>
          <div className="mt-1 text-lg font-semibold">{formatBytes(lastSuccess?.size_bytes ?? null)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">RPO / RTO</div>
          <div className="mt-1 text-lg font-semibold">24h / 4h</div>
        </Card>
      </div>

      <Card className="p-4 text-sm">
        <div className="font-semibold">Stratégie</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Sauvegarde PostgreSQL quotidienne automatisée par Lovable Cloud, rétention 7 jours.</li>
          <li>Point-in-time recovery (PITR) disponible sur la fenêtre de rétention.</li>
          <li>Sauvegardes des buckets de stockage répliquées via Cloudflare R2.</li>
          <li>Plan de reprise: RPO 24h, RTO 4h. Exercice de restauration trimestriel.</li>
        </ul>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-border p-4 text-sm font-semibold">Historique</div>
        {backups.isLoading ? <div className="p-6 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">État</th>
              <th className="px-4 py-3 text-right">Taille</th>
              <th className="px-4 py-3 text-right">Durée</th>
              <th className="px-4 py-3 text-left">Démarrée</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3"><Badge variant="outline" className="text-[10px]">{r.kind}</Badge></td>
                  <td className="px-4 py-3"><Badge variant={r.status === "success" ? "default" : r.status === "failed" ? "destructive" : "secondary"} className="text-[10px]">{r.status}</Badge></td>
                  <td className="px-4 py-3 text-right">{formatBytes(r.size_bytes)}</td>
                  <td className="px-4 py-3 text-right">{r.duration_ms ? `${(r.duration_ms / 1000).toFixed(1)}s` : "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTimeFr(r.started_at)}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Aucune sauvegarde enregistrée — les jobs Cloud s'exécutent automatiquement.</td></tr>}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}