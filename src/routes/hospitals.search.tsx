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
import { HospitalCard } from "@/components/hospitals/HospitalCard";
import { HospitalFilters } from "@/components/hospitals/HospitalFilters";
import { HospitalSearchBar } from "@/components/hospitals/HospitalSearchBar";
import { useFavorites } from "@/hooks/use-favorites";
import { useGeolocation } from "@/hooks/use-geolocation";
import { haversineKm } from "@/lib/format";
import { getOpenStatus } from "@/lib/map-utils";
import {
  HOSPITAL_DEPARTMENT_META,
  HOSPITAL_SERVICE_META,
  hospitalsQuery,
  matchesHospitalClientFilters,
  type HospitalDepartmentKey,
  type HospitalFiltersValue,
  type HospitalServiceKey,
} from "@/lib/hospitals";
import { buildHead } from "@/lib/seo";

const DEPARTMENT_KEYS: [HospitalDepartmentKey, ...HospitalDepartmentKey[]] = [
  "emergency",
  "cardiology",
  "neurology",
  "orthopedics",
  "radiology",
  "maternity",
  "pediatrics",
  "internal_medicine",
  "oncology",
  "icu",
  "dialysis",
  "general_surgery",
  "plastic_surgery",
  "psychiatry",
  "ent",
  "ophthalmology",
  "dermatology",
];
const SERVICE_KEYS: [HospitalServiceKey, ...HospitalServiceKey[]] = [
  "emergency",
  "mri",
  "ct_scan",
  "xray",
  "ultrasound",
  "laboratory",
  "blood_bank",
  "dialysis",
  "operating_rooms",
  "intensive_care",
  "ambulance",
  "vaccination",
];

const searchSchema = z.object({
  q: z.string().optional(),
  kind: z.enum(["all", "hospital", "clinic"]).optional(),
  type: z.enum(["public", "private", "university"]).nullish(),
  cityId: z.string().nullish(),
  neighborhood: z.string().nullish(),
  minRating: z.coerce.number().optional(),
  openNow: z.coerce.boolean().optional(),
  emergency: z.coerce.boolean().optional(),
  parking: z.coerce.boolean().optional(),
  wheelchair: z.coerce.boolean().optional(),
  verified: z.coerce.boolean().optional(),
  premium: z.coerce.boolean().optional(),
  department: z.enum(DEPARTMENT_KEYS).optional(),
  service: z.enum(SERVICE_KEYS).optional(),
  sort: z.enum(["relevance", "rating", "recent"]).optional(),
});

export const Route = createFileRoute("/hospitals/search")({
  validateSearch: zodValidator(searchSchema),
  head: () =>
    buildHead({
      title: "Recherche d'hôpitaux & cliniques — HealthLink Maroc",
      description: "Filtrez les hôpitaux et cliniques du Maroc par ville, département, service et plus.",
      path: "/hospitals/search",
    }),
  component: HospitalSearchPage,
});

function HospitalSearchPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const filters: HospitalFiltersValue = search;
  const { position } = useGeolocation();

  const { data: results = [], isLoading } = useQuery(hospitalsQuery(filters, 200));
  const { isFavorite, toggle } = useFavorites();

  const filtered = useMemo(() => {
    return results
      .map((p) => {
        const openStatus = getOpenStatus(p.working_hours);
        const distance =
          position && p.latitude && p.longitude
            ? haversineKm(
                { lat: position.lat, lng: position.lng },
                { lat: p.latitude, lng: p.longitude },
              )
            : null;
        return { p, openStatus, distance };
      })
      .filter((e) =>
        matchesHospitalClientFilters(e.p, filters, {
          openNow: e.openStatus === "open" || e.openStatus === "closing_soon",
        }),
      );
  }, [results, position, filters]);

  function update(next: HospitalFiltersValue) {
    navigate({ to: "/hospitals/search", search: next });
  }

  const activeChips = chipsFor(filters);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Annuaire"
        title="Hôpitaux & cliniques au Maroc"
        description="Filtrez par ville, département, service ou statut."
        icon={<SearchIcon className="h-5 w-5" />}
      />

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_180px]">
        <HospitalSearchBar
          initial={filters.q ?? ""}
          autoNavigate={false}
          onSubmit={(q) => update({ ...filters, q: q || undefined })}
        />
        <HospitalFilters value={filters} onChange={update} />
        <Select
          value={filters.sort ?? "relevance"}
          onValueChange={(v) => update({ ...filters, sort: v as HospitalFiltersValue["sort"] })}
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
          title="Aucun établissement ne correspond"
          description="Essayez d'élargir vos critères, de changer de ville ou de département."
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{filtered.length} résultat(s)</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((e) => (
              <HospitalCard
                key={e.p.id}
                hospital={e.p}
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

function chipsFor(f: HospitalFiltersValue): Array<{ key: keyof HospitalFiltersValue; label: string }> {
  const out: Array<{ key: keyof HospitalFiltersValue; label: string }> = [];
  if (f.q) out.push({ key: "q", label: `« ${f.q} »` });
  if (f.kind && f.kind !== "all")
    out.push({ key: "kind", label: f.kind === "hospital" ? "Hôpitaux" : "Cliniques" });
  if (f.type)
    out.push({
      key: "type",
      label: f.type === "public" ? "Public" : f.type === "private" ? "Privé" : "CHU",
    });
  if (f.cityId) out.push({ key: "cityId", label: "Ville" });
  if (f.neighborhood) out.push({ key: "neighborhood", label: f.neighborhood });
  if (f.minRating) out.push({ key: "minRating", label: `${f.minRating}★+` });
  if (f.openNow) out.push({ key: "openNow", label: "Ouvert" });
  if (f.emergency) out.push({ key: "emergency", label: "Urgences" });
  if (f.parking) out.push({ key: "parking", label: "Parking" });
  if (f.wheelchair) out.push({ key: "wheelchair", label: "Fauteuil roulant" });
  if (f.verified) out.push({ key: "verified", label: "Vérifié" });
  if (f.premium) out.push({ key: "premium", label: "Premium" });
  if (f.department)
    out.push({ key: "department", label: HOSPITAL_DEPARTMENT_META[f.department].label });
  if (f.service) out.push({ key: "service", label: HOSPITAL_SERVICE_META[f.service].label });
  return out;
}