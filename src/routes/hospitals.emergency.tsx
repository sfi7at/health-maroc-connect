import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Navigation, Phone, Siren } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { HospitalCard } from "@/components/hospitals/HospitalCard";
import { useFavorites } from "@/hooks/use-favorites";
import { useGeolocation } from "@/hooks/use-geolocation";
import { haversineKm } from "@/lib/format";
import { EMERGENCY_NUMBERS, getOpenStatus } from "@/lib/map-utils";
import { hospitalsQuery, readHospitalMeta } from "@/lib/hospitals";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/hospitals/emergency")({
  head: () =>
    buildHead({
      title: "Urgences hospitalières au Maroc — Vytalma",
      description: "Trouvez l'hôpital d'urgence le plus proche au Maroc avec distance, itinéraire et appel direct.",
      path: "/hospitals/emergency",
    }),
  component: EmergencyPage,
});

// Average city traffic speed ~ 28 km/h
const AVG_KMH = 28;
function formatEta(km: number): string {
  const minutes = Math.max(1, Math.round((km / AVG_KMH) * 60));
  if (minutes < 60) return `~${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `~${h}h${m.toString().padStart(2, "0")}`;
}

function EmergencyPage() {
  const { position, request, status } = useGeolocation();
  const { data: items = [], isLoading } = useQuery(hospitalsQuery({}, 200));
  const { isFavorite, toggle } = useFavorites();

  const emergencies = useMemo(() => {
    return items
      .filter((p) => {
        const m = readHospitalMeta(p);
        return m.emergency || m.departments?.includes("emergency") || m.open_24h;
      })
      .map((p) => {
        const distance =
          position && p.latitude && p.longitude
            ? haversineKm(
                { lat: position.lat, lng: position.lng },
                { lat: p.latitude, lng: p.longitude },
              )
            : null;
        return { p, distance, openStatus: getOpenStatus(p.working_hours) };
      })
      .sort((a, b) => {
        if (a.distance != null && b.distance != null) return a.distance - b.distance;
        if (a.distance != null) return -1;
        if (b.distance != null) return 1;
        return (b.p.average_rating ?? 0) - (a.p.average_rating ?? 0);
      });
  }, [items, position]);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="gap-2">
        <Link to="/hospitals">
          <ArrowLeft className="h-4 w-4" /> Tous les hôpitaux
        </Link>
      </Button>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-red-600 via-rose-600 to-orange-600 p-6 text-white shadow-elevated sm:p-10"
      >
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
        <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur">
          <Siren className="h-3.5 w-3.5" /> Urgences
        </p>
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
          Les urgences hospitalières les plus proches.
        </h1>
        <p className="mt-2 max-w-2xl text-white/85">
          En cas d'urgence vitale, composez le <strong>150 (SAMU)</strong>. Cette
          page vous aide à choisir l'établissement adapté et à vous y rendre rapidement.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {EMERGENCY_NUMBERS.slice(0, 4).map((n) => (
            <a
              key={n.key}
              href={`tel:${n.number}`}
              className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-foreground shadow-soft transition hover:scale-[1.02]"
            >
              <Phone className="h-4 w-4 text-red-600" /> {n.label} · {n.number}
            </a>
          ))}
        </div>

        {status !== "granted" ? (
          <Button
            onClick={request}
            variant="secondary"
            className="mt-5 rounded-full"
          >
            <Navigation className="mr-1 h-4 w-4" /> Activer ma position
          </Button>
        ) : null}
      </motion.section>

      <PageHeader
        eyebrow="Proches de vous"
        title="Hôpitaux d'urgence à proximité"
        description={
          position
            ? "Triés par distance et temps de trajet estimé."
            : "Activez votre position pour un tri précis selon votre localisation."
        }
        icon={<Siren className="h-5 w-5 text-red-600" />}
      />

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-3xl" />
          ))}
        </div>
      ) : emergencies.length === 0 ? (
        <EmptyState
          icon={Siren}
          title="Aucun service d'urgence référencé"
          description="Composez le 150 (SAMU) en cas d'urgence vitale."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {emergencies.map((e) => (
            <div key={e.p.id} className="space-y-2">
              <HospitalCard
                hospital={e.p}
                distanceKm={e.distance}
                openStatus={e.openStatus}
                isFavorite={isFavorite(e.p.id)}
                onToggleFavorite={toggle}
              />
              {e.distance != null ? (
                <p className="px-1 text-xs text-muted-foreground">
                  Temps de trajet estimé : <strong>{formatEta(e.distance)}</strong>
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}