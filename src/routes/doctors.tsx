import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Stethoscope, Filter } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchBar } from "@/components/common/SearchBar";
import { DoctorCard } from "@/components/cards/DoctorCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/doctors")({
  head: () =>
    buildHead({
      title: "Médecins au Maroc",
      description:
        "Trouvez un médecin généraliste ou spécialiste près de chez vous et prenez rendez-vous en ligne.",
      path: "/doctors",
    }),
  component: DoctorsLayout,
});

function DoctorsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/doctors") return <Outlet />;
  return <DoctorsIndex />;
}

const specialties = [
  "Tout",
  "Généraliste",
  "Cardiologue",
  "Dermatologue",
  "Pédiatre",
  "Gynécologue",
  "Dentiste",
  "Ophtalmologue",
];

function DoctorsIndex() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("Tout");

  // Real data will come from Supabase + verified professionals network.
  const doctors: Parameters<typeof DoctorCard>[0][] = [];

  return (
    <div>
      <PageHeader
        eyebrow="Annuaire"
        title="Médecins"
        description="Spécialistes vérifiés, rendez-vous en ligne, partout au Maroc."
        icon={<Stethoscope className="h-5 w-5" />}
        actions={
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtres
          </Button>
        }
      />

      <div className="mb-6 space-y-4">
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Rechercher par nom, ville ou spécialité…"
        />
        <div className="flex flex-wrap gap-2">
          {specialties.map((s) => (
            <Badge
              key={s}
              onClick={() => setActive(s)}
              className={
                "cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition " +
                (active === s
                  ? "bg-primary text-primary-foreground hover:bg-primary"
                  : "bg-card text-foreground border border-border hover:bg-accent")
              }
            >
              {s}
            </Badge>
          ))}
        </div>
      </div>

      {doctors.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="Aucun médecin à afficher pour l'instant"
          description="L'annuaire sera alimenté par des professionnels vérifiés. Connectez Lovable Cloud pour activer la recherche en temps réel."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {doctors.map((d) => (
            <DoctorCard key={d.id} {...d} />
          ))}
        </div>
      )}
    </div>
  );
}