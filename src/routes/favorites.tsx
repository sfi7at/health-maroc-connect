import { createFileRoute } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/favorites")({
  head: () =>
    buildHead({
      title: "Favoris",
      description: "Vos médecins, pharmacies et hôpitaux favoris à portée de main.",
      path: "/favorites",
    }),
  component: () => (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Accès rapide"
        title="Favoris"
        description="Gardez vos services préférés à portée de main."
        icon={<Star className="h-5 w-5" />}
      />
      <EmptyState icon={Star} title="Aucun favori" description="Ajoutez vos services préférés depuis leur page." />
    </div>
  ),
});