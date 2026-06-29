import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PencilLine, Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTimeFr } from "@/lib/format";
import { logAdminAction } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/edits")({
  component: AdminEdits,
});

function AdminEdits() {
  const qc = useQueryClient();
  const edits = useQuery({
    queryKey: ["admin-edits"],
    queryFn: async () => {
      const { data, error } = await supabase.from("edit_requests").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const review = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("edit_requests").update({
        status, reviewed_by: user.user?.id, reviewed_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
      await logAdminAction(`edit.${status}`, "edit_requests", id);
    },
    onSuccess: () => { toast.success("Mise à jour"); qc.invalidateQueries({ queryKey: ["admin-edits"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <AdminHeader icon={PencilLine} title="Demandes de correction" description="Suggestions des utilisateurs sur les fiches." badge={`${edits.data?.length ?? 0}`} />
      {edits.isLoading ? <Skeleton className="h-64 w-full" /> : (
        <div className="grid gap-3">
          {(edits.data ?? []).map((e) => (
            <Card key={e.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">{e.entity_type}</Badge>
                    <span className="font-mono text-xs text-muted-foreground">{e.entity_id.slice(0, 8)}</span>
                    <Badge className={e.status === "approved" ? "bg-emerald-500/15 text-emerald-700" : e.status === "rejected" ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-700"}>{e.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm"><span className="font-medium">{e.field ?? "—"}</span> : <span className="text-muted-foreground line-through">{e.current_value ?? ""}</span> → <span className="font-medium">{e.proposed_value}</span></p>
                  {e.reason && <p className="mt-1 text-xs text-muted-foreground">Raison: {e.reason}</p>}
                  <p className="mt-1 text-[10px] text-muted-foreground">{formatDateTimeFr(e.created_at)}</p>
                </div>
                {e.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => review.mutate({ id: e.id, status: "rejected" })}><X className="mr-1 h-3 w-3" /> Rejeter</Button>
                    <Button size="sm" onClick={() => review.mutate({ id: e.id, status: "approved" })}><Check className="mr-1 h-3 w-3" /> Approuver</Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
          {(edits.data?.length ?? 0) === 0 && <p className="text-center text-sm text-muted-foreground py-12">Aucune demande.</p>}
        </div>
      )}
    </div>
  );
}