import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { motion } from "framer-motion";
import { ArrowLeft, Filter, Map as MapIcon, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DoctorCard } from "@/components/doctors/DoctorCard";
import { DoctorSearchBar } from "@/components/doctors/DoctorSearchBar";
import { DoctorFilters } from "@/components/doctors/DoctorFilters";
import { EmptyState } from "@/components/common/EmptyState";
import {
  doctorsQuery, matchesDoctorFilters, type DoctorFiltersValue,
} from "@/lib/doctors";
import { useGeolocation } from "@/hooks/use-geolocation";
import { haversineKm } from "@/lib/format";
import { getOpenStatus } from "@/lib/map-utils";
import { buildHead } from "@/lib/seo";

const searchSchema = z.object({
  q: fallback(z.string().optional(), undefined),
  cityId: fallback(z.string().optional(), undefined),
  specialty: fallback(z.string().optional(), undefined),
  verified: fallback(z.boolean().optional(), undefined),
  premium: fallback(z.boolean().optional(), undefined),
  openNow: fallback(z.boolean().optional(), undefined),
  online: fallback(z.boolean().optional(), undefined),
});

export const Route = createFileRoute("/doctors/search")({
  validateSearch: zodValidator(searchSchema),
  head: () =>
    buildHead({
      title: "Rechercher un médecin — HealthLink Maroc",
      description: "Filtres avancés : spécialité, ville, langue, assurance, prix, disponibilité.",
      path: "/doctors/search",
    }),
  component: DoctorsSearch,
});

function DoctorsSearch() {
  const search = Route.useSearch();
  const { position } = useGeolocation();

  const [filters, setFilters] = useState<DoctorFiltersValue>({
    q: search.q,
    cityId: search.cityId ?? null,
    specialty: search.specialty ?? null,
    verified: search.verified,
    premium: search.premium,
    openNow: search.openNow,
    online: search.online,
    sort: "relevance",
  });
  const [visible, setVisible] = useState(24);

  useEffect(() => {
    setFilters((f) => ({
      ...f,
      q: search.q ?? f.q,
      cityId: search.cityId ?? f.cityId ?? null,
      specialty: search.specialty ?? f.specialty ?? null,
    }));
  }, [search.q, search.cityId, search.specialty]);

  const { data: doctors = [], isLoading } = useQuery(
    doctorsQuery({
      q: filters.q,
      cityId: filters.cityId ?? null,
      verified: filters.verified,
      premium: filters.premium,
      sort: filters.sort,
    }),
  );

  const filtered = useMemo(() => {
    let list = doctors.filter((d) => matchesDoctorFilters(d, filters));
    if (filters.openNow) list = list.filter((d) => getOpenStatus(d.working_hours) !== "closed");
    if (position) {
      list = [...list].map((d) => ({
        d,
        km: d.latitude != null && d.longitude != null
          ? haversineKm(position, { lat: Number(d.latitude), lng: Number(d.longitude) })
          : null,
      })).sort((a, b) => {
        if (filters.sort === "rating" || filters.sort === "experience") return 0;
        if (a.km == null) return 1;
        if (b.km == null) return -1;
        return a.km - b.km;
      }).map(({ d, km }) => ({ ...d, _km: km as number | null }));
    }
    return list as (typeof doctors[number] & { _km?: number | null })[];
  }, [doctors, filters, position]);

  const activeChips = useMemo(() => {
    const chips: Array<{ key: keyof DoctorFiltersValue; label: string }> = [];
    if (filters.specialty) chips.push({ key: "specialty", label: filters.specialty });
    if (filters.verified) chips.push({ key: "verified", label: "Vérifié" });
    if (filters.premium) chips.push({ key: "premium", label: "Premium" });
    if (filters.openNow) chips.push({ key: "openNow", label: "Ouvert maintenant" });
    if (filters.online) chips.push({ key: "online", label: "Téléconsultation" });
    if (filters.homeVisit) chips.push({ key: "homeVisit", label: "Visite à domicile" });
    if (filters.gender) chips.push({ key: "gender", label: filters.gender === "female" ? "Femme" : "Homme" });
    if (filters.language) chips.push({ key: "language", label: filters.language.toUpperCase() });
    if (filters.insurance) chips.push({ key: "insurance", label: filters.insurance });
    if (filters.minRating) chips.push({ key: "minRating", label: `≥ ${filters.minRating} ★` });
    if (filters.maxPrice) chips.push({ key: "maxPrice", label: `≤ ${filters.maxPrice} MAD` });
    return chips;
  }, [filters]);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link to="/doctors"><ArrowLeft className="h-4 w-4" /> Médecins</Link>
          </Button>
        </div>
        <DoctorSearchBar initial={filters.q} />
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <DoctorFilters value={filters} onChange={setFilters} trigger={
            <Button size="sm" className="shrink-0 gap-2 rounded-2xl">
              <Filter className="h-4 w-4" /> Filtres
              {activeChips.length ? <Badge variant="secondary" className="ml-1">{activeChips.length}</Badge> : null}
            </Button>
          } />
          <Button asChild size="sm" variant="outline" className="shrink-0 gap-2 rounded-2xl">
            <Link to="/map"><MapIcon className="h-4 w-4" /> Carte</Link>
          </Button>
          {activeChips.map((c) => (
            <button
              key={c.key as string}
              onClick={() => setFilters((f) => ({ ...f, [c.key]: c.key === "minRating" || c.key === "maxPrice" ? undefined : c.key === "specialty" || c.key === "language" || c.key === "insurance" ? null : false }))}
              className="shrink-0 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium hover:bg-muted"
            >
              {c.label} ×
            </button>
          ))}
        </div>
      </motion.div>

      <p className="text-sm text-muted-foreground">
        {isLoading ? "Recherche en cours…" : `${filtered.length} résultat${filtered.length > 1 ? "s" : ""}`}
      </p>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (<Skeleton key={i} className="h-72 rounded-3xl" />))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="Aucun médecin trouvé"
          description="Modifiez vos filtres ou élargissez votre recherche."
        />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.slice(0, visible).map((d) => (
              <DoctorCard key={d.id} doctor={d} distanceKm={d._km ?? null} />
            ))}
          </div>
          {filtered.length > visible ? (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={() => setVisible((v) => v + 24)}>Voir plus</Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}