import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTimeFr } from "@/lib/format";
import { logAdminAction } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/claims")({
  component: AdminClaims,
});

function AdminClaims() {
  const qc = useQueryClient();
  const claims = useQuery({
    queryKey: ["admin-claims"],
    queryFn: async () => {
      const { data, error } = await supabase.from("claim_requests").select("*, providers(name, category)").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const review = useMutation({
    mutationFn: async ({ id, status, providerId }: { id: string; status: "approved" | "rejected"; providerId?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("claim_requests").update({
        status, reviewed_by: user.user?.id, reviewed_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
      if (status === "approved" && providerId) {
        await supabase.from("providers").update({ owner_id: user.user?.id, is_verified: true }).eq("id", providerId);
      }
      await logAdminAction(`claim.${status}`, "claim_requests", id);
    },
    onSuccess: () => { toast.success("Mise à jour"); qc.invalidateQueries({ queryKey: ["admin-claims"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <AdminHeader icon={ShieldCheck} title="Revendications de profil" description="Approuver ou rejeter les demandes de prise de possession." badge={`${claims.data?.length ?? 0}`} />
      {claims.isLoading ? <Skeleton className="h-64 w-full" /> : (
        <div className="grid gap-3">
          {(claims.data ?? []).map((c) => {
            const prov = (c as unknown as { providers?: { name?: string; category?: string } }).providers;
            return (
            <Card key={c.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{prov?.name ?? "Prestataire"}</h3>
                    <Badge variant="outline">{prov?.category}</Badge>
                    <Badge className={c.status === "approved" ? "bg-emerald-500/15 text-emerald-700" : c.status === "rejected" ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-700"}>{c.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{c.full_name} · {c.professional_license ?? "—"} · {formatDateTimeFr(c.created_at)}</p>
                  {c.notes && <p className="mt-2 text-sm">{c.notes}</p>}
                </div>
                {c.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => review.mutate({ id: c.id, status: "rejected" })}><X className="mr-1 h-3 w-3" /> Rejeter</Button>
                    <Button size="sm" onClick={() => review.mutate({ id: c.id, status: "approved", providerId: c.provider_id })}><Check className="mr-1 h-3 w-3" /> Approuver</Button>
                  </div>
                )}
              </div>
            </Card>
            );
          })}
          {(claims.data?.length ?? 0) === 0 && <p className="text-center text-sm text-muted-foreground py-12">Aucune revendication.</p>}
        </div>
      )}
    </div>
  );
}