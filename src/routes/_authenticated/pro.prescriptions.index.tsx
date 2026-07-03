import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, Plus, Search, Download, QrCode, User } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { useSelectedProvider } from "@/lib/provider-store";
import { prescriptionsByProviderQuery } from "@/lib/prescriptions";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/pro/prescriptions")({
  head: () => buildHead({
    title: "Ordonnances — HealthLink Pro",
    description: "Émettez et gérez vos ordonnances médicales numériques.",
    path: "/pro/prescriptions",
  }),
  component: PrescriptionsList,
});

function PrescriptionsList() {
  const { provider } = useSelectedProvider();
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery(prescriptionsByProviderQuery(provider?.id));

  const filtered = data.filter((r) => {
    if (!q.trim()) return true;
    const needle = q.toLowerCase();
    return (
      (r.patient_name ?? "").toLowerCase().includes(needle) ||
      (r.diagnosis ?? "").toLowerCase().includes(needle) ||
      (r.items ?? []).some((it) => it.name?.toLowerCase().includes(needle))
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Prescriptions"
        title="Ordonnances"
        description="Historique complet et création d'ordonnances signées avec QR de vérification."
        icon={<FileText className="h-5 w-5" />}
        actions={
          <Button asChild className="gap-2 bg-[#0B2545] hover:bg-[#0B2545]/90">
            <Link to="/pro/prescriptions/new"><Plus className="h-4 w-4" />Nouvelle ordonnance</Link>
          </Button>
        }
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher par patient, diagnostic ou médicament"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={q ? "Aucun résultat" : "Aucune ordonnance"}
          description={q ? "Modifiez votre recherche." : "Créez votre première ordonnance numérique en un clic."}
          action={!q ? (
            <Button asChild className="bg-[#0B2545] hover:bg-[#0B2545]/90">
              <Link to="/pro/prescriptions/new">Nouvelle ordonnance</Link>
            </Button>
          ) : undefined}
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => (
            <li key={r.id}>
              <Link
                to="/pro/prescriptions/$id"
                params={{ id: r.id }}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <p className="truncate text-sm font-semibold">{r.patient_name || "Patient non nommé"}</p>
                    <Badge variant={r.status === "active" ? "default" : "secondary"} className="text-[10px]">
                      {r.status}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {new Date(r.prescribed_at).toLocaleDateString("fr-FR")} • {r.items?.length ?? 0} médicament(s)
                    {r.diagnosis ? ` • ${r.diagnosis}` : ""}
                  </p>
                </div>
                <QrCode className="h-4 w-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const _keep = { Download };