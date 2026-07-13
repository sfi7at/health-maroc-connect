import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { ArrowUpDown, Search as SearchIcon, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { PharmacyCard } from "@/components/pharmacies/PharmacyCard";
import { PharmacyFilters } from "@/components/pharmacies/PharmacyFilters";
import { PharmacySearchBar } from "@/components/pharmacies/PharmacySearchBar";
import { useFavorites } from "@/hooks/use-favorites";
import { useGeolocation } from "@/hooks/use-geolocation";
import { haversineKm } from "@/lib/format";
import { getOpenStatus } from "@/lib/map-utils";
import {
  matchesPharmacyClientFilters,
  onDutyTodayProviderIdsQuery,
  pharmaciesQuery,
  type PharmacyFiltersValue,
} from "@/lib/pharmacies";
import { buildHead } from "@/lib/seo";

const searchSchema = z.object({
  q: z.string().optional(),
  cityId: z.string().nullish(),
  neighborhood: z.string().nullish(),
  minRating: z.coerce.number().optional(),
  openNow: z.coerce.boolean().optional(),
  onDuty: z.coerce.boolean().optional(),
  open24h: z.coerce.boolean().optional(),
  delivery: z.coerce.boolean().optional(),
  vaccination: z.coerce.boolean().optional(),
  equipment: z.coerce.boolean().optional(),
  bloodPressure: z.coerce.boolean().optional(),
  bloodSugar: z.coerce.boolean().optional(),
  parking: z.coerce.boolean().optional(),
  verified: z.coerce.boolean().optional(),
  premium: z.coerce.boolean().optional(),
  wheelchair: z.coerce.boolean().optional(),
  sort: z.enum(["relevance", "rating", "recent"]).optional(),
});

export const Route = createFileRoute("/pharmacies/search")({
  validateSearch: zodValidator(searchSchema),
  head: () =>
    buildHead({
      title: "Recherche de pharmacies — Vytalma",
      description:
        "Filtrez les pharmacies du Maroc par ville, quartier, services, livraison, vaccination et plus.",
      path: "/pharmacies/search",
    }),
  component: PharmacySearchPage,
});

function PharmacySearchPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const filters: PharmacyFiltersValue = search;
  const today = new Date().toISOString().slice(0, 10);
  const { position } = useGeolocation();

  const { data: results = [], isLoading } = useQuery(pharmaciesQuery(filters, 120));
  const { data: dutyIds } = useQuery(onDutyTodayProviderIdsQuery(today));
  const { isFavorite, toggle } = useFavorites();

  const filtered = useMemo(() => {
    return results
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
  }, [results, dutyIds, position, filters]);

  function update(next: PharmacyFiltersValue) {
    navigate({ to: "/pharmacies/search", search: next });
  }

  const activeChips = chipsFor(filters);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Annuaire"
        title="Pharmacies au Maroc"
        description="Trouvez la pharmacie idéale grâce aux filtres avancés."
        icon={<SearchIcon className="h-5 w-5" />}
      />

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_180px]">
        <PharmacySearchBar
          initial={filters.q ?? ""}
          autoNavigate={false}
          onSubmit={(q) => update({ ...filters, q: q || undefined })}
        />
        <PharmacyFilters value={filters} onChange={update} />
        <Select
          value={filters.sort ?? "relevance"}
          onValueChange={(v) =>
            update({ ...filters, sort: v as PharmacyFiltersValue["sort"] })
          }
        >
          <SelectTrigger className="h-12 rounded-2xl">
            <ArrowUpDown className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Trier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relevance">Pertinence</SelectItem>
            <SelectItem value="rating">Mieux notées</SelectItem>
            <SelectItem value="recent">Plus récentes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {activeChips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {activeChips.map((c) => (
            <Badge
              key={c.key}
              variant="secondary"
              className="gap-1 rounded-full px-3 py-1 text-xs"
            >
              {c.label}
              <button
                type="button"
                onClick={() => update({ ...filters, [c.key]: undefined })}
                aria-label="Retirer ce filtre"
                className="ml-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={() => update({ sort: filters.sort })}>
            Tout effacer
          </Button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-3xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title="Aucune pharmacie ne correspond"
          description="Essayez d'élargir vos critères ou de modifier la ville."
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{filtered.length} résultat(s)</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((e) => (
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
        </>
      )}
    </div>
  );
}

function chipsFor(f: PharmacyFiltersValue): Array<{ key: keyof PharmacyFiltersValue; label: string }> {
  const out: Array<{ key: keyof PharmacyFiltersValue; label: string }> = [];
  if (f.q) out.push({ key: "q", label: `« ${f.q} »` });
  if (f.cityId) out.push({ key: "cityId", label: "Ville" });
  if (f.neighborhood) out.push({ key: "neighborhood", label: f.neighborhood });
  if (f.minRating) out.push({ key: "minRating", label: `${f.minRating}★+` });
  if (f.openNow) out.push({ key: "openNow", label: "Ouvert" });
  if (f.onDuty) out.push({ key: "onDuty", label: "De garde" });
  if (f.open24h) out.push({ key: "open24h", label: "24h/24" });
  if (f.delivery) out.push({ key: "delivery", label: "Livraison" });
  if (f.vaccination) out.push({ key: "vaccination", label: "Vaccination" });
  if (f.equipment) out.push({ key: "equipment", label: "Matériel" });
  if (f.bloodPressure) out.push({ key: "bloodPressure", label: "Tension" });
  if (f.bloodSugar) out.push({ key: "bloodSugar", label: "Glycémie" });
  if (f.parking) out.push({ key: "parking", label: "Parking" });
  if (f.wheelchair) out.push({ key: "wheelchair", label: "PMR" });
  if (f.verified) out.push({ key: "verified", label: "Vérifié" });
  if (f.premium) out.push({ key: "premium", label: "Premium" });
  return out;
}