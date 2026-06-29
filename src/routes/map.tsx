import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Layers, LocateFixed, Moon, Sun, Loader2, ChevronRight } from "lucide-react";
import { HealthMap, type HealthMarker } from "@/components/map/HealthMap";
import {
  MapFilters,
  DEFAULT_FILTERS,
  type FilterKey,
  type MapFiltersState,
} from "@/components/map/MapFilters";
import { MapSearchBar } from "@/components/map/MapSearchBar";
import { ProviderSheet } from "@/components/map/ProviderSheet";
import { EmergencyButton } from "@/components/map/EmergencyButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { citiesQuery, providersQuery, bloodRequestsQuery, type ProviderRow } from "@/lib/queries";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useFavorites } from "@/hooks/use-favorites";
import {
  CATEGORY_COLORS,
  DEFAULT_MAP_CENTER,
  getOpenStatus,
  OPEN_STATUS_META,
} from "@/lib/map-utils";
import { CATEGORIES } from "@/lib/categories";
import { formatDistanceKm, haversineKm } from "@/lib/format";
import { buildHead } from "@/lib/seo";
import { cn } from "@/lib/utils";
import type { ProviderCategory } from "@/lib/format";

export const Route = createFileRoute("/map")({
  head: () =>
    buildHead({
      title: "Carte santé — HealthLink Maroc",
      description:
        "Trouvez médecins, pharmacies, hôpitaux, laboratoires et centres de don du sang autour de vous au Maroc.",
      path: "/map",
    }),
  component: MapPage,
});

function MapPage() {
  const [filters, setFilters] = useState<MapFiltersState>(DEFAULT_FILTERS);
  const [query, setQuery] = useState("");
  const [center, setCenter] = useState<{ lat: number; lng: number } | undefined>();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cityId, setCityId] = useState<string | null>(null);
  const [dark, setDark] = useState(false);

  const { position, status, request } = useGeolocation(true);
  const favorites = useFavorites();

  // Data
  const { data: providers = [], isLoading } = useQuery(
    providersQuery({ cityId, limit: 200 }),
  );
  const { data: requests = [] } = useQuery(bloodRequestsQuery({ cityId }));
  const { data: cities = [] } = useQuery(citiesQuery());
  const { data: onDutyIds = new Set<string>() } = useQuery({
    queryKey: ["pharmacies_on_duty_today", new Date().toISOString().slice(0, 10)],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("pharmacies_on_duty")
        .select("provider_id")
        .eq("duty_date", today);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.provider_id as string));
    },
    staleTime: 5 * 60_000,
  });

  // Auto-center on user when first fix arrives
  useEffect(() => {
    if (position && !center) setCenter({ lat: position.lat, lng: position.lng });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position?.lat, position?.lng]);

  // Build markers
  const markers = useMemo<HealthMarker[]>(() => {
    const out: HealthMarker[] = [];
    const cats = filters.cats;
    const onlyFavs = cats.has("favorites");
    const onlyVerified = cats.has("verified");
    const onlyOpen = cats.has("open_now");
    const onDutyOnly = cats.has("pharmacy_on_duty");

    providers.forEach((p) => {
      if (p.latitude == null || p.longitude == null) return;
      if (!cats.has(p.category as FilterKey)) return;
      if (onlyVerified && !p.is_verified) return;
      if (onlyFavs && !favorites.isFavorite(p.id)) return;
      if (onlyOpen) {
        const s = getOpenStatus(p.working_hours);
        if (s !== "open" && s !== "closing_soon") return;
      }
      if (onDutyOnly && p.category === "pharmacy" && !onDutyIds.has(p.id)) return;
      if (query.trim().length > 1 && !p.name.toLowerCase().includes(query.toLowerCase())) return;
      out.push({
        id: p.id,
        lat: p.latitude,
        lng: p.longitude,
        kind: p.category,
        title: p.name,
        subtitle: p.address ?? p.cities?.name_fr ?? undefined,
      });
    });

    if (cats.has("blood_request")) {
      requests.forEach((r) => {
        const lat = (r as { latitude?: number | null }).latitude;
        const lng = (r as { longitude?: number | null }).longitude;
        if (lat == null || lng == null) return;
        out.push({
          id: `req-${r.id}`,
          lat,
          lng,
          kind: "blood_request",
          title: `Demande ${r.blood_group}`,
          subtitle: r.hospital_name ?? r.cities?.name_fr ?? "Don urgent",
          urgent: r.urgency === "critical" || r.is_emergency === true,
        });
      });
    }
    return out;
  }, [providers, requests, filters, favorites, onDutyIds, query]);

  const selectedProvider = useMemo(
    () => providers.find((p) => p.id === selectedId) ?? null,
    [providers, selectedId],
  );

  // Nearby list
  const nearby = useMemo(() => {
    if (!position) return [];
    return providers
      .filter((p) => p.latitude != null && p.longitude != null)
      .map((p) => ({
        provider: p,
        distance: haversineKm(position, { lat: p.latitude!, lng: p.longitude! }),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 12);
  }, [providers, position]);

  return (
    <div className="relative -mx-4 -mt-6 h-[calc(100dvh-7rem)] overflow-hidden sm:-mx-6 lg:-mx-10 lg:h-[calc(100dvh-3rem)]">
      {/* Map */}
      <div className="absolute inset-0">
        <HealthMap
          markers={markers}
          userPosition={position}
          selectedId={selectedId}
          center={center}
          dark={dark}
          onMarkerClick={(id) => {
            if (id.startsWith("req-")) return;
            setSelectedId(id);
          }}
        />
      </div>

      {/* Top overlay: search + filters + actions */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1050] flex flex-col gap-3 p-3 sm:p-4">
        <div className="pointer-events-auto mx-auto w-full max-w-3xl">
          <MapSearchBar
            value={query}
            onChange={setQuery}
            onPick={(s) => {
              if (s.lat != null && s.lng != null) setCenter({ lat: s.lat, lng: s.lng });
              setSelectedId(s.id);
              setQuery(s.name);
            }}
            onSubmit={(q) => setQuery(q)}
          />
        </div>
        <div className="pointer-events-auto mx-auto w-full max-w-5xl">
          <MapFilters value={filters} onChange={setFilters} />
        </div>
      </div>

      {/* Floating right controls */}
      <div className="pointer-events-auto absolute right-3 top-44 z-[1050] flex flex-col gap-2 sm:right-4 sm:top-48">
        <IconBtn
          label="Centrer sur ma position"
          onClick={() => {
            if (position) setCenter({ lat: position.lat, lng: position.lng });
            else request();
          }}
        >
          {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
        </IconBtn>
        <IconBtn label="Thème de la carte" onClick={() => setDark((v) => !v)}>
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </IconBtn>
      </div>

      {/* Location prompt fallback */}
      {status === "denied" || status === "unavailable" ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-auto absolute left-1/2 top-40 z-[1100] w-[min(92vw,28rem)] -translate-x-1/2 rounded-2xl border border-border bg-card/95 p-3 text-xs shadow-elevated backdrop-blur sm:top-44"
        >
          <p className="mb-2 font-medium">Choisissez une ville pour explorer la carte</p>
          <div className="flex flex-wrap gap-1.5">
            {cities.slice(0, 8).map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setCityId(c.id);
                  setCenter(DEFAULT_MAP_CENTER);
                }}
                className={cn(
                  "rounded-full border border-border px-2.5 py-1 hover:bg-muted",
                  cityId === c.id && "bg-foreground text-background",
                )}
              >
                {c.name_fr}
              </button>
            ))}
          </div>
        </motion.div>
      ) : null}

      {/* Loading badge */}
      {isLoading ? (
        <div className="pointer-events-none absolute left-1/2 top-44 z-[1090] -translate-x-1/2 rounded-full bg-card/90 px-3 py-1 text-xs text-muted-foreground shadow-soft">
          <Loader2 className="mr-1.5 inline h-3 w-3 animate-spin" /> Chargement de la carte…
        </div>
      ) : null}

      {/* Stats / legend bottom-left */}
      <div className="pointer-events-auto absolute bottom-3 left-3 z-[1050] hidden max-w-xs items-center gap-2 rounded-full border border-border bg-card/90 px-3 py-1.5 text-[11px] text-muted-foreground shadow-soft backdrop-blur md:flex">
        <Layers className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">{markers.length}</span> résultats affichés
      </div>

      {/* Nearby panel (desktop only) */}
      {nearby.length > 0 ? (
        <div className="pointer-events-auto absolute right-3 bottom-3 top-44 z-[1040] hidden w-80 flex-col overflow-hidden rounded-3xl border border-border bg-card/95 shadow-elevated backdrop-blur xl:flex">
          <div className="border-b border-border px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Autour de vous</p>
            <p className="text-sm font-medium">Prestataires les plus proches</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {nearby.map(({ provider, distance }) => (
              <NearbyItem
                key={provider.id}
                provider={provider}
                distance={distance}
                onPick={() => {
                  setSelectedId(provider.id);
                  if (provider.latitude && provider.longitude)
                    setCenter({ lat: provider.latitude, lng: provider.longitude });
                }}
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* Provider sheet */}
      <ProviderSheet
        provider={selectedProvider}
        userPosition={position}
        isFavorite={selectedProvider ? favorites.isFavorite(selectedProvider.id) : false}
        onToggleFavorite={(id) => favorites.toggle(id)}
        onClose={() => setSelectedId(null)}
      />

      {/* Emergency */}
      <EmergencyButton className="bottom-24 right-3 sm:bottom-6 sm:right-6" />
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="h-10 w-10 rounded-full border-border bg-card/95 shadow-elevated backdrop-blur hover:bg-card"
    >
      {children}
    </Button>
  );
}

function NearbyItem({
  provider,
  distance,
  onPick,
}: {
  provider: ProviderRow;
  distance: number;
  onPick: () => void;
}) {
  const meta = CATEGORIES[provider.category as ProviderCategory];
  const status = getOpenStatus(provider.working_hours);
  const statusMeta = OPEN_STATUS_META[status];
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex w-full items-center gap-3 border-b border-border px-3 py-2.5 text-left transition hover:bg-muted/60"
    >
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white"
        style={{ background: CATEGORY_COLORS[provider.category as ProviderCategory] }}
      >
        <meta.icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{provider.name}</span>
        <span className="mt-0.5 flex items-center gap-1.5">
          <Badge variant="outline" className="border-0 px-1.5 py-0 text-[10px] font-normal">
            {formatDistanceKm(distance)}
          </Badge>
          <span className={`text-[10px] ${statusMeta.tint} rounded-full px-1.5 py-0`}>{statusMeta.label}</span>
        </span>
      </span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}