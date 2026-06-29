import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Check, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTimeFr } from "@/lib/format";
import { logAdminAction } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/verification")({
  component: AdminVerification,
});

function AdminVerification() {
  const qc = useQueryClient();
  const pending = useQuery({
    queryKey: ["admin-verification-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("id, name, category, phone, email, address, profile_image, metadata, created_at, owner_id")
        .eq("is_verified", false)
        .order("created_at", { ascending: true })
        .limit(60);
      if (error) throw error;
      return data ?? [];
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      if (approve) {
        const { error } = await supabase.from("providers").update({ is_verified: true }).eq("id", id);
        if (error) throw error;
        await logAdminAction("verification.approve", "provider", id);
      } else {
        await logAdminAction("verification.reject", "provider", id);
        toast.info("Rejet enregistré. Le prestataire reste non vérifié.");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-verification-pending"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <AdminHeader
        icon={ShieldCheck}
        title="Vérifications"
        description="Demandes de vérification en attente de traitement."
        badge={`${pending.data?.length ?? 0} en attente`}
      />

      {pending.isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>
      ) : (pending.data?.length ?? 0) === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600"><Check className="h-6 w-6" /></div>
          <p className="font-semibold">Aucune demande en attente</p>
          <p className="text-sm text-muted-foreground">Tous les prestataires sont à jour.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(pending.data ?? []).map((p) => (
            <Card key={p.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {p.profile_image ? (
                    <img src={p.profile_image} alt={p.name} className="h-12 w-12 rounded-xl object-cover" />
                  ) : (
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-muted font-semibold">{p.name.charAt(0)}</div>
                  )}
                  <div>
                    <Link to="/providers/$id" params={{ id: p.id }} className="font-semibold hover:text-primary">{p.name}</Link>
                    <p className="text-xs text-muted-foreground">{p.category}</p>
                    <p className="text-xs text-muted-foreground mt-1">{p.address ?? "—"}</p>
                  </div>
                </div>
                <Badge variant="outline">{formatDateTimeFr(p.created_at)}</Badge>
              </div>

              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                {p.phone && <p>📞 {p.phone}</p>}
                {p.email && <p>✉️ {p.email}</p>}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button size="sm" className="gap-1" onClick={() => decide.mutate({ id: p.id, approve: true })}>
                  <Check className="h-4 w-4" /> Approuver
                </Button>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => decide.mutate({ id: p.id, approve: false })}>
                  <X className="h-4 w-4" /> Rejeter
                </Button>
                <Button asChild size="sm" variant="ghost" className="gap-1 ml-auto">
                  <Link to="/providers/$id" params={{ id: p.id }}><ExternalLink className="h-4 w-4" /> Profil</Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}