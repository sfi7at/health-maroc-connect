import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { GitBranch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTimeFr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/versions")({
  component: AdminVersions,
});

function AdminVersions() {
  const versions = useQuery({
    queryKey: ["admin-versions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("record_versions").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <AdminHeader icon={GitBranch} title="Historique des modifications" description="Trace complète des changements sur les enregistrements." badge={`${versions.data?.length ?? 0}`} />
      {versions.isLoading ? <Skeleton className="h-64 w-full" /> : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase"><tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Entité</th>
                <th className="px-4 py-2 text-left">Version</th>
                <th className="px-4 py-2 text-left">Raison</th>
              </tr></thead>
              <tbody>
                {(versions.data ?? []).map((v) => (
                  <tr key={v.id} className="border-t border-border">
                    <td className="px-4 py-2 text-xs text-muted-foreground">{formatDateTimeFr(v.created_at)}</td>
                    <td className="px-4 py-2"><Badge variant="outline">{v.entity_type}</Badge></td>
                    <td className="px-4 py-2 font-mono text-xs">{v.entity_id.slice(0, 8)}</td>
                    <td className="px-4 py-2 text-xs">v{v.version}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{v.change_reason ?? "—"}</td>
                  </tr>
                ))}
                {(versions.data?.length ?? 0) === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Aucune version.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}