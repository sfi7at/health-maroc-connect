import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { HealthMap, type HealthMarker } from "@/components/map/HealthMap";
import { HospitalFilters } from "@/components/hospitals/HospitalFilters";
import { HospitalCard } from "@/components/hospitals/HospitalCard";
import { useFavorites } from "@/hooks/use-favorites";
import { useGeolocation } from "@/hooks/use-geolocation";
import { getOpenStatus } from "@/lib/map-utils";
import { haversineKm } from "@/lib/format";
import {
  hospitalsQuery,
  matchesHospitalClientFilters,
  type HospitalFiltersValue,
} from "@/lib/hospitals";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/hospitals/map")({
  head: () =>
    buildHead({
      title: "Carte des hôpitaux & cliniques — Vytalma",
      description: "Localisez tous les hôpitaux et cliniques du Maroc sur une carte interactive.",
      path: "/hospitals/map",
    }),
  component: HospitalsMap,
});

function HospitalsMap() {
  const [filters, setFilters] = useState<HospitalFiltersValue>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { position } = useGeolocation();
  const { data: items = [] } = useQuery(hospitalsQuery(filters, 400));
  const { isFavorite, toggle } = useFavorites();

  const enriched = useMemo(() => {
    return items
      .map((p) => {
        const openStatus = getOpenStatus(p.working_hours);
        const distance =
          position && p.latitude && p.longitude
            ? haversineKm({ lat: position.lat, lng: position.lng }, { lat: p.latitude, lng: p.longitude })
            : null;
        return { p, openStatus, distance };
      })
      .filter((e) =>
        matchesHospitalClientFilters(e.p, filters, {
          openNow: e.openStatus === "open" || e.openStatus === "closing_soon",
        }),
      );
  }, [items, filters, position]);

  const markers: HealthMarker[] = useMemo(
    () =>
      enriched
        .filter((e) => e.p.latitude && e.p.longitude)
        .map((e) => ({
          id: e.p.id,
          lat: e.p.latitude!,
          lng: e.p.longitude!,
          kind: e.p.category === "clinic" ? "clinic" : "hospital",
          title: e.p.name,
          subtitle: e.p.cities?.name_fr ?? e.p.address ?? undefined,
        })),
    [enriched],
  );

  const selected = enriched.find((e) => e.p.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="gap-2">
        <Link to="/hospitals">
          <ArrowLeft className="h-4 w-4" /> Tous les hôpitaux
        </Link>
      </Button>
      <PageHeader
        eyebrow="Carte"
        title="Hôpitaux & cliniques sur la carte"
        description="Zoomez, filtrez et obtenez l'itinéraire en un clic."
        icon={<MapPin className="h-5 w-5" />}
        actions={<HospitalFilters value={filters} onChange={setFilters} />}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-3xl border border-border shadow-soft">
          <HealthMap
            markers={markers}
            userPosition={position}
            selectedId={selectedId}
            onMarkerClick={setSelectedId}
            className="h-[70vh] w-full"
          />
        </div>
        <aside className="space-y-3">
          {selected ? (
            <HospitalCard
              hospital={selected.p}
              distanceKm={selected.distance}
              openStatus={selected.openStatus}
              isFavorite={isFavorite(selected.p.id)}
              onToggleFavorite={toggle}
            />
          ) : (
            <div className="rounded-3xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Cliquez sur un marqueur pour voir le détail de l'établissement.
            </div>
          )}
          <p className="px-1 text-xs text-muted-foreground">
            {markers.length} établissements affichés
          </p>
        </aside>
      </div>
    </div>
  );
}