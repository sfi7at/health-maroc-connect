import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { History, Upload, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTimeFr } from "@/lib/format";
import { downloadCsv } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/imports")({
  component: AdminImports,
});

function AdminImports() {
  const jobs = useQuery({
    queryKey: ["import-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("import_jobs").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <AdminHeader
        icon={History}
        title="Historique des imports"
        description="Tous les imports réalisés sur la plateforme."
        badge={`${jobs.data?.length ?? 0} imports`}
        actions={
          <div className="flex gap-2">
            <Button asChild><Link to="/admin/import"><Upload className="mr-2 h-4 w-4" /> Nouvel import</Link></Button>
            <Button variant="outline" onClick={() => downloadCsv(`imports-${new Date().toISOString().slice(0, 10)}.csv`, jobs.data ?? [])}><Download className="mr-2 h-4 w-4" /> Export</Button>
          </div>
        }
      />
      <Card className="overflow-hidden">
        {jobs.isLoading ? <div className="p-6 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Dataset</th>
                <th className="px-4 py-3 text-left">Fichier</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-right">Insérés</th>
                <th className="px-4 py-3 text-right">Rejetés</th>
                <th className="px-4 py-3 text-right">Doublons</th>
                <th className="px-4 py-3 text-right">Durée</th>
              </tr></thead>
              <tbody>
                {(jobs.data ?? []).map((j) => (
                  <tr key={j.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTimeFr(j.created_at)}</td>
                    <td className="px-4 py-3"><Badge variant="outline">{j.dataset}</Badge></td>
                    <td className="px-4 py-3 text-xs">{j.source_filename ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge className={j.status === "succeeded" ? "bg-emerald-500/15 text-emerald-700 border-emerald-200" : j.status === "failed" ? "bg-destructive/15 text-destructive" : "bg-muted"}>
                        {j.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">{j.inserted_count}</td>
                    <td className="px-4 py-3 text-right text-destructive">{j.rejected_count}</td>
                    <td className="px-4 py-3 text-right text-amber-700">{j.duplicate_count}</td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">{j.duration_ms ? `${(j.duration_ms / 1000).toFixed(1)}s` : "—"}</td>
                  </tr>
                ))}
                {(jobs.data?.length ?? 0) === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Aucun import.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}