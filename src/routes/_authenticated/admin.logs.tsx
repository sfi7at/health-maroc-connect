import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Search as SearchIcon, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTimeFr } from "@/lib/format";
import { downloadCsv } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/logs")({
  component: AdminLogs,
});

function AdminLogs() {
  const [search, setSearch] = useState("");
  const logs = useQuery({
    queryKey: ["admin-logs", search],
    queryFn: async () => {
      let q = supabase.from("admin_audit_log").select("id, action, entity_type, entity_id, actor_id, created_at, metadata").order("created_at", { ascending: false }).limit(200);
      if (search.trim()) q = q.ilike("action", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <AdminHeader
        icon={Activity}
        title="Journaux système"
        description="Connexions, erreurs, appels API et actions administratives."
        actions={<Button variant="outline" className="gap-2" onClick={() => downloadCsv(`audit-${Date.now()}.csv`, (logs.data ?? []) as never[])}><Download className="h-4 w-4" /> Export CSV</Button>}
      />

      <Card className="p-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une action…" className="pl-9" />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {logs.isLoading ? (
          <div className="p-6 space-y-2">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr>
              <th className="px-4 py-3 text-left">Action</th><th className="px-4 py-3 text-left">Entité</th><th className="px-4 py-3 text-left">Cible</th><th className="px-4 py-3 text-left">Acteur</th><th className="px-4 py-3 text-left">Date</th>
            </tr></thead>
            <tbody>
              {(logs.data ?? []).map((l) => (
                <tr key={l.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{l.action}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-[10px]">{l.entity_type ?? "—"}</Badge></td>
                  <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">{l.entity_id?.slice(0, 8) ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">{l.actor_id?.slice(0, 8) ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTimeFr(l.created_at)}</td>
                </tr>
              ))}
              {(logs.data?.length ?? 0) === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Aucun journal.</td></tr>}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}