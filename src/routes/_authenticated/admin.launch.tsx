import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/launch")({
  component: AdminLaunch,
});

type Status = "pending" | "in_progress" | "done" | "skipped";
const STATUSES: Status[] = ["pending", "in_progress", "done", "skipped"];
const STATUS_LABEL: Record<Status, string> = {
  pending: "À faire",
  in_progress: "En cours",
  done: "Terminé",
  skipped: "Ignoré",
};

function AdminLaunch() {
  const qc = useQueryClient();
  const items = useQuery({
    queryKey: ["launch-checklist"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("launch_checklist_items")
        .select("id, category, title, description, priority, status")
        .order("category", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const mut = useMutation({
    mutationFn: async (input: { id: string; status: Status }) => {
      const { error } = await supabase
        .from("launch_checklist_items")
        .update({ status: input.status, completed_at: input.status === "done" ? new Date().toISOString() : null })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["launch-checklist"] }),
  });

  const rows = items.data ?? [];
  const groups = new Map<string, typeof rows>();
  rows.forEach((r) => {
    const arr = groups.get(r.category) ?? [];
    arr.push(r);
    groups.set(r.category, arr);
  });

  const total = rows.length;
  const done = rows.filter((r) => r.status === "done" || r.status === "skipped").length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <AdminHeader icon={Rocket} title="Checklist de lancement" description="Préparez Vytalma pour la production nationale." />

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Progression globale</div>
          <Badge variant={pct >= 90 ? "default" : "secondary"} className="font-mono">{done}/{total} • {pct}%</Badge>
        </div>
        <div className="mt-3 h-2 rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </Card>

      {items.isLoading ? <Skeleton className="h-96 w-full" /> : (
        <div className="space-y-6">
          {[...groups.entries()].map(([cat, list]) => (
            <Card key={cat} className="overflow-hidden">
              <div className="border-b border-border p-4">
                <div className="text-sm font-semibold">{cat}</div>
                <div className="text-xs text-muted-foreground">
                  {list.filter((l) => l.status === "done").length} / {list.length} terminés
                </div>
              </div>
              <ul className="divide-y divide-border">
                {list.map((it) => (
                  <li key={it.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{it.title}</span>
                        <Badge variant={it.priority === "critical" ? "destructive" : "outline"} className="text-[10px]">{it.priority}</Badge>
                      </div>
                      {it.description && <div className="text-xs text-muted-foreground">{it.description}</div>}
                    </div>
                    <Select value={it.status} onValueChange={(v) => mut.mutate({ id: it.id, status: v as Status })}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
                    </Select>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}