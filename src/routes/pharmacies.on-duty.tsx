import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Clock, Pill } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/pharmacies/on-duty")({
  head: () =>
    buildHead({
      title: "Pharmacies de garde",
      description: "Liste des pharmacies de garde ouvertes la nuit, le week-end et les jours fériés au Maroc.",
      path: "/pharmacies/on-duty",
    }),
  component: OnDutyPage,
});

function OnDutyPage() {
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="gap-2">
        <Link to="/pharmacies">
          <ArrowLeft className="h-4 w-4" /> Toutes les pharmacies
        </Link>
      </Button>
      <PageHeader
        eyebrow="24h / 24"
        title="Pharmacies de garde"
        description="Les pharmacies de garde sont mises à jour quotidiennement selon les arrêtés régionaux."
        icon={<Clock className="h-5 w-5" />}
      />
      <EmptyState
        icon={Pill}
        title="Aucune pharmacie de garde à afficher pour l'instant"
        description="Les données seront synchronisées depuis les sources officielles régionales."
      />
    </div>
  );
}