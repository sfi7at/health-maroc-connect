import { createFileRoute } from "@tanstack/react-router";
import { Search, Stethoscope, Pill, Building2, FlaskConical } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchBar } from "@/components/common/SearchBar";
import { EmptyState } from "@/components/common/EmptyState";
import { ServiceCard } from "@/components/cards/ServiceCard";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/search")({
  head: () =>
    buildHead({
      title: "Recherche",
      description: "Recherchez médecins, pharmacies, hôpitaux et laboratoires partout au Maroc.",
      path: "/search",
    }),
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Recherche universelle"
        title="Tout chercher"
        description="Une seule barre de recherche pour tous les services de santé."
        icon={<Search className="h-5 w-5" />}
      />
      <SearchBar
        value={q}
        onChange={setQ}
        placeholder="Médecin, spécialité, pharmacie, hôpital, laboratoire…"
        onFilters={() => {}}
      />

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Catégories
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ServiceCard to="/doctors" icon={Stethoscope} title="Médecins" description="Annuaire & rendez-vous" accent="primary" />
          <ServiceCard to="/pharmacies" icon={Pill} title="Pharmacies" description="Proximité & garde" accent="secondary" />
          <ServiceCard to="/hospitals" icon={Building2} title="Hôpitaux" description="Publics & privés" accent="info" />
          <ServiceCard to="/laboratories" icon={FlaskConical} title="Laboratoires" description="Analyses & imagerie" accent="warning" />
        </div>
      </section>

      {q && (
        <EmptyState
          icon={Search}
          title={`Aucun résultat pour « ${q} »`}
          description="La recherche temps réel sera disponible dès la connexion aux sources de données."
        />
      )}
    </div>
  );
}