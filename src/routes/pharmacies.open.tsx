import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { PharmacyCard } from "@/components/pharmacies/PharmacyCard";
import { useFavorites } from "@/hooks/use-favorites";
import { useGeolocation } from "@/hooks/use-geolocation";
import { haversineKm } from "@/lib/format";
import { getOpenStatus } from "@/lib/map-utils";
import { onDutyTodayProviderIdsQuery, pharmaciesQuery } from "@/lib/pharmacies";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/pharmacies/open")({
  head: () =>
    buildHead({
      title: "Pharmacies ouvertes maintenant — Vytalma",
      description:
        "Liste en direct des pharmacies ouvertes actuellement au Maroc, avec distance et horaires.",
      path: "/pharmacies/open",
    }),
  component: OpenNowPage,
});

function OpenNowPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [city, setCity] = useState("");
  const { position } = useGeolocation();
  const { data: all = [], isLoading } = useQuery(pharmaciesQuery({}, 200));
  const { data: dutyIds } = useQuery(onDutyTodayProviderIdsQuery(today));
  const { isFavorite, toggle } = useFavorites();

  const list = useMemo(() => {
    const c = city.trim().toLowerCase();
    return all
      .map((p) => ({
        p,
        openStatus: getOpenStatus(p.working_hours),
        onDuty: dutyIds?.has(p.id) ?? false,
        distance:
          position && p.latitude && p.longitude
            ? haversineKm(
                { lat: position.lat, lng: position.lng },
                { lat: p.latitude, lng: p.longitude },
              )
            : null,
      }))
      .filter(
        (e) =>
          (e.openStatus === "open" || e.openStatus === "closing_soon") &&
          (!c || (e.p.cities?.name_fr ?? "").toLowerCase().includes(c)),
      )
      .sort((a, b) => {
        if (a.distance != null && b.distance != null) return a.distance - b.distance;
        if (a.distance != null) return -1;
        if (b.distance != null) return 1;
        return b.p.average_rating - a.p.average_rating;
      });
  }, [all, dutyIds, city, position]);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="gap-2">
        <Link to="/pharmacies">
          <ArrowLeft className="h-4 w-4" /> Toutes les pharmacies
        </Link>
      </Button>
      <PageHeader
        eyebrow="En temps réel"
        title="Pharmacies ouvertes maintenant"
        description="Mises à jour automatiquement selon les horaires d'ouverture déclarés."
        icon={<Clock className="h-5 w-5" />}
      />

      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Filtrer par ville…"
          className="h-12 rounded-2xl pl-11"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-3xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Aucune pharmacie ouverte trouvée"
          description="Essayez la page des pharmacies de garde pour la nuit."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((e) => (
            <PharmacyCard
              key={e.p.id}
              pharmacy={e.p}
              distanceKm={e.distance}
              openStatus={e.openStatus}
              onDuty={e.onDuty}
              isFavorite={isFavorite(e.p.id)}
              onToggleFavorite={toggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}