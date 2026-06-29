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
import { LaboratoryCard } from "@/components/laboratories/LaboratoryCard";
import { LaboratoryFilters } from "@/components/laboratories/LaboratoryFilters";
import { LaboratorySearchBar } from "@/components/laboratories/LaboratorySearchBar";
import { useFavorites } from "@/hooks/use-favorites";
import { useGeolocation } from "@/hooks/use-geolocation";
import { haversineKm } from "@/lib/format";
import { getOpenStatus } from "@/lib/map-utils";
import {
  LAB_ANALYSIS_META,
  laboratoriesQuery,
  matchesLabClientFilters,
  type LabAnalysisKey,
  type LabFiltersValue,
} from "@/lib/laboratories";
import { buildHead } from "@/lib/seo";

const ANALYSIS_KEYS: [LabAnalysisKey, ...LabAnalysisKey[]] = [
  "blood",
  "urine",
  "biochemistry",
  "hormones",
  "pregnancy",
  "microbiology",
  "virology",
  "covid",
  "pcr",
  "cancer",
  "diabetes",
  "kidney",
  "liver",
  "vitamins",
  "thyroid",
  "genetics",
  "immunology",
  "toxicology",
  "emergency",
];

const searchSchema = z.object({
  q: z.string().optional(),
  cityId: z.string().nullish(),
  neighborhood: z.string().nullish(),
  minRating: z.coerce.number().optional(),
  openNow: z.coerce.boolean().optional(),
  homeSampling: z.coerce.boolean().optional(),
  emergency: z.coerce.boolean().optional(),
  covid: z.coerce.boolean().optional(),
  blood: z.coerce.boolean().optional(),
  urine: z.coerce.boolean().optional(),
  hormones: z.coerce.boolean().optional(),
  genetics: z.coerce.boolean().optional(),
  verified: z.coerce.boolean().optional(),
  premium: z.coerce.boolean().optional(),
  analysis: z.enum(ANALYSIS_KEYS).optional(),
  sort: z.enum(["relevance", "rating", "recent"]).optional(),
});

export const Route = createFileRoute("/laboratories/search")({
  validateSearch: zodValidator(searchSchema),
  head: () =>
    buildHead({
      title: "Recherche de laboratoires — HealthLink Maroc",
      description: "Filtrez les laboratoires du Maroc par ville, analyse, services et plus.",
      path: "/laboratories/search",
    }),
  component: LaboratorySearchPage,
});

function LaboratorySearchPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const filters: LabFiltersValue = search;
  const { position } = useGeolocation();

  const { data: results = [], isLoading } = useQuery(laboratoriesQuery(filters, 120));
  const { isFavorite, toggle } = useFavorites();

  const filtered = useMemo(() => {
    return results
      .map((p) => {
        const openStatus = getOpenStatus(p.working_hours);
        const distance =
          position && p.latitude && p.longitude
            ? haversineKm({ lat: position.lat, lng: position.lng }, { lat: p.latitude, lng: p.longitude })
            : null;
        return { p, openStatus, distance };
      })
      .filter((e) =>
        matchesLabClientFilters(e.p, filters, {
          openNow: e.openStatus === "open" || e.openStatus === "closing_soon",
        }),
      );
  }, [results, position, filters]);

  function update(next: LabFiltersValue) {
    navigate({ to: "/laboratories/search", search: next });
  }

  const activeChips = chipsFor(filters);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Annuaire"
        title="Laboratoires au Maroc"
        description="Trouvez le laboratoire idéal grâce aux filtres avancés."
        icon={<SearchIcon className="h-5 w-5" />}
      />

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_180px]">
        <LaboratorySearchBar
          initial={filters.q ?? ""}
          autoNavigate={false}
          onSubmit={(q) => update({ ...filters, q: q || undefined })}
        />
        <LaboratoryFilters value={filters} onChange={update} />
        <Select
          value={filters.sort ?? "relevance"}
          onValueChange={(v) => update({ ...filters, sort: v as LabFiltersValue["sort"] })}
        >
          <SelectTrigger className="h-12 rounded-2xl">
            <ArrowUpDown className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Trier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relevance">Pertinence</SelectItem>
            <SelectItem value="rating">Mieux notés</SelectItem>
            <SelectItem value="recent">Plus récents</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {activeChips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {activeChips.map((c) => (
            <Badge key={c.key} variant="secondary" className="gap-1 rounded-full px-3 py-1 text-xs">
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
          title="Aucun laboratoire ne correspond"
          description="Essayez d'élargir vos critères ou de modifier la ville."
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{filtered.length} résultat(s)</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((e) => (
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
        </>
      )}
    </div>
  );
}

function chipsFor(f: LabFiltersValue): Array<{ key: keyof LabFiltersValue; label: string }> {
  const out: Array<{ key: keyof LabFiltersValue; label: string }> = [];
  if (f.q) out.push({ key: "q", label: `« ${f.q} »` });
  if (f.cityId) out.push({ key: "cityId", label: "Ville" });
  if (f.neighborhood) out.push({ key: "neighborhood", label: f.neighborhood });
  if (f.minRating) out.push({ key: "minRating", label: `${f.minRating}★+` });
  if (f.openNow) out.push({ key: "openNow", label: "Ouvert" });
  if (f.homeSampling) out.push({ key: "homeSampling", label: "À domicile" });
  if (f.emergency) out.push({ key: "emergency", label: "Urgences" });
  if (f.covid) out.push({ key: "covid", label: "COVID/PCR" });
  if (f.blood) out.push({ key: "blood", label: "Sang" });
  if (f.urine) out.push({ key: "urine", label: "Urine" });
  if (f.hormones) out.push({ key: "hormones", label: "Hormones" });
  if (f.genetics) out.push({ key: "genetics", label: "Génétique" });
  if (f.verified) out.push({ key: "verified", label: "Vérifié" });
  if (f.premium) out.push({ key: "premium", label: "Premium" });
  if (f.analysis) out.push({ key: "analysis", label: LAB_ANALYSIS_META[f.analysis].label });
  return out;
}