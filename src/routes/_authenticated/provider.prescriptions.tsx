import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedProvider } from "@/lib/provider-store";
import { buildHead } from "@/lib/seo";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/provider/prescriptions")({
  head: () => buildHead({
    title: "Ordonnances — Espace prestataire",
    description: "Gérez et générez vos ordonnances au format PDF.",
    path: "/provider/prescriptions",
  }),
  component: PrescriptionsLayout,
});

function PrescriptionsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isRoot = pathname === "/provider/prescriptions";
  if (!isRoot) return <Outlet />;
  return <PrescriptionsList />;
}

function PrescriptionsList() {
  const { provider } = useSelectedProvider();
  const [q, setQ] = useState("");
  const list = useQuery({
    queryKey: ["provider-prescriptions", provider?.id, q],
    enabled: !!provider?.id,
    queryFn: async () => {
      let query = supabase
        .from("prescriptions")
        .select("id, patient_name, prescribed_at, expires_at, status, diagnosis, items, verification_token")
        .eq("provider_id", provider!.id)
        .order("prescribed_at", { ascending: false })
        .limit(200);
      if (q.trim()) query = query.ilike("patient_name", `%${q}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ordonnances"
        title="Vos ordonnances"
        description="Créez une ordonnance professionnelle, téléchargez-la en PDF, ou consultez l'historique."
        icon={<FileText className="h-5 w-5" />}
        actions={
          <Button asChild className="gap-2">
            <Link to="/provider/prescriptions/new"><Plus className="h-4 w-4" /> Nouvelle ordonnance</Link>
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un patient…" className="pl-9" />
      </div>

      {list.isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : (list.data ?? []).length === 0 ? (
        <EmptyState icon={FileText} title="Aucune ordonnance" description="Créez votre première ordonnance pour la retrouver ici." />
      ) : (
        <div className="grid gap-3">
          {(list.data ?? []).map((rx) => {
            const items = Array.isArray(rx.items) ? rx.items : [];
            return (
              <Card key={rx.id} className="p-4 transition hover:border-primary/40">
                <Link to="/provider/prescriptions/$id" params={{ id: rx.id }} className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{rx.patient_name || "Patient sans nom"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(rx.prescribed_at).toLocaleDateString("fr-FR")} · {items.length} médicament{items.length > 1 ? "s" : ""}
                      {rx.diagnosis ? ` · ${String(rx.diagnosis).slice(0, 60)}` : ""}
                    </p>
                  </div>
                  <Badge variant={rx.status === "active" ? "default" : "secondary"}>{rx.status}</Badge>
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}