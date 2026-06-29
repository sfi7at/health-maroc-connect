import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BadgeCheck, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TrustBadge } from "@/components/security/TrustBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { logAdminAction } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/security/trust")({
  component: AdminTrust,
});

const STATUSES = ["pending", "under_review", "verified", "official_verified", "rejected", "suspended"] as const;
const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  under_review: "En revue",
  verified: "Vérifié",
  official_verified: "Vérifié officiel",
  rejected: "Rejeté",
  suspended: "Suspendu",
};

function AdminTrust() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const list = useQuery({
    queryKey: ["admin-trust", q, filter],
    queryFn: async () => {
      let req = supabase
        .from("providers")
        .select("id, name, category, verification_status, is_verified, provider_trust_scores(score, level)")
        .order("updated_at", { ascending: false })
        .limit(100);
      if (q) req = req.ilike("name", `%${q}%`);
      if (filter !== "all") req = req.eq("verification_status", filter as typeof STATUSES[number]);
      const { data, error } = await req;
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const patch: Record<string, unknown> = { verification_status: status };
      if (status === "verified" || status === "official_verified") {
        patch.verified_at = new Date().toISOString();
        patch.verified_by = u.user?.id ?? null;
        patch.is_verified = true;
      }
      if (status === "suspended") {
        patch.suspended_at = new Date().toISOString();
        patch.is_verified = false;
      }
      if (status === "rejected") patch.is_verified = false;
      const { error } = await supabase.from("providers").update(patch as never).eq("id", id);
      if (error) throw error;
      await supabase.rpc("compute_provider_trust", { _provider: id } as never);
      await logAdminAction(`verification.${status}`, "provider", id);
    },
    onSuccess: () => { toast.success("Statut mis à jour"); qc.invalidateQueries({ queryKey: ["admin-trust"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const recompute = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("compute_provider_trust", { _provider: id } as never);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Score recalculé"); qc.invalidateQueries({ queryKey: ["admin-trust"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <AdminHeader
        icon={BadgeCheck}
        title="Confiance & vérifications"
        description="Statut de vérification et score de confiance pour chaque prestataire."
        actions={
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8 w-56" placeholder="Chercher…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {list.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : (list.data?.length ?? 0) === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Aucun prestataire.</Card>
      ) : (
        <Card className="divide-y">
          {(list.data ?? []).map((p) => {
            const trustRaw = (p as { provider_trust_scores?: unknown }).provider_trust_scores;
            const trust = Array.isArray(trustRaw) ? trustRaw[0] as { score: number; level: string } | undefined : trustRaw as { score: number; level: string } | undefined;
            return (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{p.name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="uppercase">{p.category}</span>
                    <span>·</span>
                    <TrustBadge level={trust?.level} score={trust?.score} size="sm" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={p.verification_status ?? "pending"}
                    onValueChange={(v) => updateStatus.mutate({ id: p.id, status: v })}
                  >
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={() => recompute.mutate(p.id)}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
