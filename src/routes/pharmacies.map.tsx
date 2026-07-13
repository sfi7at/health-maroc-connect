import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { HealthMap, type HealthMarker } from "@/components/map/HealthMap";
import { PharmacyFilters } from "@/components/pharmacies/PharmacyFilters";
import { PharmacyCard } from "@/components/pharmacies/PharmacyCard";
import { useFavorites } from "@/hooks/use-favorites";
import { useGeolocation } from "@/hooks/use-geolocation";
import { getOpenStatus } from "@/lib/map-utils";
import { haversineKm } from "@/lib/format";
import {
  matchesPharmacyClientFilters,
  onDutyTodayProviderIdsQuery,
  pharmaciesQuery,
  type PharmacyFiltersValue,
} from "@/lib/pharmacies";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/pharmacies/map")({
  head: () =>
    buildHead({
      title: "Carte des pharmacies — Vytalma",
      description: "Localisez toutes les pharmacies du Maroc sur une carte interactive.",
      path: "/pharmacies/map",
    }),
  component: PharmaciesMap,
});

function PharmaciesMap() {
  const today = new Date().toISOString().slice(0, 10);
  const [filters, setFilters] = useState<PharmacyFiltersValue>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { position } = useGeolocation();
  const { data: pharmacies = [] } = useQuery(pharmaciesQuery(filters, 300));
  const { data: dutyIds } = useQuery(onDutyTodayProviderIdsQuery(today));
  const { isFavorite, toggle } = useFavorites();

  const enriched = useMemo(() => {
    return pharmacies
      .map((p) => {
        const onDuty = dutyIds?.has(p.id) ?? false;
        const openStatus = getOpenStatus(p.working_hours);
        const distance =
          position && p.latitude && p.longitude
            ? haversineKm(
                { lat: position.lat, lng: position.lng },
                { lat: p.latitude, lng: p.longitude },
              )
            : null;
        return { p, onDuty, openStatus, distance };
      })
      .filter((e) =>
        matchesPharmacyClientFilters(e.p, filters, {
          openNow: e.openStatus === "open" || e.openStatus === "closing_soon",
          onDuty: e.onDuty,
        }),
      );
  }, [pharmacies, dutyIds, filters, position]);

  const markers: HealthMarker[] = useMemo(
    () =>
      enriched
        .filter((e) => e.p.latitude && e.p.longitude)
        .map((e) => ({
          id: e.p.id,
          lat: e.p.latitude!,
          lng: e.p.longitude!,
          kind: "pharmacy",
          title: e.p.name,
          subtitle: e.p.cities?.name_fr ?? e.p.address ?? undefined,
          urgent: e.onDuty,
        })),
    [enriched],
  );

  const selected = enriched.find((e) => e.p.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="gap-2">
        <Link to="/pharmacies">
          <ArrowLeft className="h-4 w-4" /> Toutes les pharmacies
        </Link>
      </Button>
      <PageHeader
        eyebrow="Carte"
        title="Pharmacies sur la carte"
        description="Zoomez, filtrez et obtenez l'itinéraire en un clic."
        icon={<MapPin className="h-5 w-5" />}
        actions={<PharmacyFilters value={filters} onChange={setFilters} />}
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
            <PharmacyCard
              pharmacy={selected.p}
              distanceKm={selected.distance}
              openStatus={selected.openStatus}
              onDuty={selected.onDuty}
              isFavorite={isFavorite(selected.p.id)}
              onToggleFavorite={toggle}
            />
          ) : (
            <div className="rounded-3xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Cliquez sur un marqueur pour voir le détail de la pharmacie.
            </div>
          )}
          <p className="px-1 text-xs text-muted-foreground">{markers.length} pharmacies affichées</p>
        </aside>
      </div>
    </div>
  );
}