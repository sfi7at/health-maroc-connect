import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { LaboratoryCard } from "@/components/laboratories/LaboratoryCard";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useFavorites } from "@/hooks/use-favorites";
import { getOpenStatus } from "@/lib/map-utils";
import { haversineKm } from "@/lib/format";
import { laboratoriesQuery } from "@/lib/laboratories";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/laboratories/open")({
  head: () =>
    buildHead({
      title: "Laboratoires ouverts maintenant — Vytalma",
      description: "Liste en direct des laboratoires d'analyses médicales actuellement ouverts au Maroc.",
      path: "/laboratories/open",
    }),
  component: LabsOpen,
});

function LabsOpen() {
  const { position } = useGeolocation();
  const { data: labs = [], isLoading } = useQuery(laboratoriesQuery({}, 200));
  const { isFavorite, toggle } = useFavorites();

  const items = useMemo(() => {
    return labs
      .map((p) => {
        const openStatus = getOpenStatus(p.working_hours);
        const distance =
          position && p.latitude && p.longitude
            ? haversineKm({ lat: position.lat, lng: position.lng }, { lat: p.latitude, lng: p.longitude })
            : null;
        return { p, openStatus, distance };
      })
      .filter((e) => e.openStatus === "open" || e.openStatus === "closing_soon")
      .sort((a, b) => {
        if (a.distance != null && b.distance != null) return a.distance - b.distance;
        if (a.distance != null) return -1;
        if (b.distance != null) return 1;
        return b.p.average_rating - a.p.average_rating;
      });
  }, [labs, position]);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="gap-2">
        <Link to="/laboratories">
          <ArrowLeft className="h-4 w-4" /> Tous les laboratoires
        </Link>
      </Button>
      <PageHeader
        eyebrow="En direct"
        title="Laboratoires ouverts maintenant"
        description="Sélection mise à jour selon les horaires d'ouverture déclarés."
        icon={<Clock className="h-5 w-5" />}
      />

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-3xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Aucun laboratoire ouvert"
          description="Aucun établissement n'est marqué comme ouvert pour le moment."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((e) => (
            <LaboratoryCard
              key={e.p.id}
              laboratory={e.p}
              distanceKm={e.distance}
              openStatus={e.openStatus}
              isFavorite={isFavorite(e.p.id)}
              onToggleFavorite={toggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}