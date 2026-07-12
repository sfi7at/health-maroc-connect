import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  GraduationCap,
  Hospital,
  Map as MapIcon,
  ShieldCheck,
  Siren,
  Sparkles,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HospitalCard } from "@/components/hospitals/HospitalCard";
import { HospitalSearchBar } from "@/components/hospitals/HospitalSearchBar";
import { EmptyState } from "@/components/common/EmptyState";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useFavorites } from "@/hooks/use-favorites";
import { getOpenStatus } from "@/lib/map-utils";
import { haversineKm } from "@/lib/format";
import {
  HOSPITAL_DEPARTMENTS,
  hospitalsQuery,
  readHospitalMeta,
  type HospitalRow,
} from "@/lib/hospitals";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/hospitals/")({
  head: () =>
    buildHead({
      title: "Hôpitaux & cliniques au Maroc — HealthLink Maroc",
      description:
        "Découvrez tous les hôpitaux publics, cliniques privées et CHU du Maroc : urgences, départements, services et itinéraires en un clic.",
      path: "/hospitals",
    }),
  component: HospitalsHome,
});

const CATEGORY_CHIPS: Array<{
  label: string;
  to:
    | "/hospitals/search"
    | "/hospitals/map"
    | "/hospitals/emergency"
    | "/hospitals/departments";
  search?: Record<string, unknown>;
  icon: typeof Hospital;
  tint: string;
}> = [
  { label: "Urgences", to: "/hospitals/emergency", icon: Siren, tint: "bg-red-500/10 text-red-600" },
  { label: "Cliniques privées", to: "/hospitals/search", search: { kind: "clinic", type: "private" }, icon: Building2, tint: "bg-fuchsia-500/10 text-fuchsia-600" },
  { label: "Hôpitaux publics", to: "/hospitals/search", search: { kind: "hospital", type: "public" }, icon: Hospital, tint: "bg-sky-500/10 text-sky-600" },
  { label: "CHU", to: "/hospitals/search", search: { type: "university" }, icon: GraduationCap, tint: "bg-indigo-500/10 text-indigo-600" },
  { label: "Vérifiés", to: "/hospitals/search", search: { verified: true }, icon: ShieldCheck, tint: "bg-emerald-500/10 text-emerald-600" },
  { label: "Départements", to: "/hospitals/departments", icon: Sparkles, tint: "bg-amber-500/10 text-amber-600" },
  { label: "Carte", to: "/hospitals/map", icon: MapIcon, tint: "bg-rose-500/10 text-rose-600" },
];

function HospitalsHome() {
  const { position } = useGeolocation();
  const { data: all = [], isLoading } = useQuery(hospitalsQuery({}, 160));
  const { isFavorite, toggle } = useFavorites();

  const enriched = useMemo(() => {
    return all.map((p) => {
      const distance =
        position && p.latitude && p.longitude
          ? haversineKm(
              { lat: position.lat, lng: position.lng },
              { lat: p.latitude, lng: p.longitude },
            )
          : null;
      const openStatus = getOpenStatus(p.working_hours);
      return { p, distance, openStatus };
    });
  }, [all, position]);

  const nearbyHospitals = useMemo(
    () =>
      [...enriched]
        .filter((e) => e.p.category === "hospital" && e.distance != null)
        .sort((a, b) => a.distance! - b.distance!)
        .slice(0, 6),
    [enriched],
  );
  const nearbyClinics = useMemo(
    () =>
      [...enriched]
        .filter((e) => e.p.category === "clinic" && e.distance != null)
        .sort((a, b) => a.distance! - b.distance!)
        .slice(0, 6),
    [enriched],
  );
  const emergency = useMemo(
    () =>
      enriched
        .filter((e) => {
          const m = readHospitalMeta(e.p);
          return m.emergency || m.departments?.includes("emergency") || m.open_24h;
        })
        .slice(0, 6),
    [enriched],
  );
  const privateClinics = useMemo(
    () => all.filter((p) => p.category === "clinic").slice(0, 6),
    [all],
  );
  const universityHospitals = useMemo(
    () => all.filter((p) => readHospitalMeta(p).type === "university").slice(0, 6),
    [all],
  );
  const topRated = useMemo(
    () =>
      [...all]
        .filter((p) => p.average_rating > 0)
        .sort((a, b) => b.average_rating - a.average_rating)
        .slice(0, 6),
    [all],
  );
  const recent = useMemo(
    () =>
      [...all]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .slice(0, 6),
    [all],
  );

  return (
    <div className="space-y-12">
      <Hero />

      <section
        aria-label="Catégories"
        className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1"
      >
        {CATEGORY_CHIPS.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.label}
              to={c.to}
              search={c.search}
              className="group flex shrink-0 snap-start items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft transition hover:shadow-elevated"
            >
              <span className={`grid h-9 w-9 place-items-center rounded-xl ${c.tint}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium">{c.label}</span>
              <ArrowRight className="ml-1 h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
            </Link>
          );
        })}
      </section>

      <Carousel
        title="Hôpitaux à proximité"
        description={position ? "Triés par distance depuis votre position." : "Activez votre position pour voir les hôpitaux proches."}
        href="/hospitals/map"
        items={nearbyHospitals}
        loading={isLoading}
        emptyLabel="Aucun hôpital géolocalisé à proximité."
        favoriteFn={toggle}
        isFavorite={isFavorite}
      />

      <Carousel
        title="Cliniques à proximité"
        description="Cliniques privées les plus proches."
        href="/hospitals/map"
        items={nearbyClinics}
        loading={isLoading}
        emptyLabel="Aucune clinique géolocalisée à proximité."
        favoriteFn={toggle}
        isFavorite={isFavorite}
      />

      <Carousel
        title="Urgences"
        description="Établissements disposant d'un service d'urgence."
        href="/hospitals/emergency"
        items={emergency}
        loading={isLoading}
        emptyLabel="Aucun service d'urgence référencé pour le moment."
        favoriteFn={toggle}
        isFavorite={isFavorite}
        accent="emergency"
      />

      <SimpleGrid
        title="Cliniques privées"
        description="Notre sélection de cliniques privées au Maroc."
        icon={Building2}
        items={privateClinics}
        loading={isLoading}
        favoriteFn={toggle}
        isFavorite={isFavorite}
      />

      <SimpleGrid
        title="CHU & hôpitaux universitaires"
        description="Centres hospitaliers universitaires de référence."
        icon={GraduationCap}
        items={universityHospitals}
        loading={isLoading}
        favoriteFn={toggle}
        isFavorite={isFavorite}
      />

      <SimpleGrid
        title="Les mieux notés"
        description="Établissements préférés de la communauté."
        icon={Star}
        items={topRated}
        loading={isLoading}
        favoriteFn={toggle}
        isFavorite={isFavorite}
      />

      <SimpleGrid
        title="Récemment ajoutés"
        description="Les nouveaux établissements sur HealthLink Maroc."
        icon={Sparkles}
        items={recent}
        loading={isLoading}
        favoriteFn={toggle}
        isFavorite={isFavorite}
      />

      <DepartmentsGrid />
    </div>
  );
}

function Hero() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-sky-600 via-cyan-600 to-blue-700 p-8 text-white shadow-elevated sm:p-12"
    >
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-cyan-300/30 blur-3xl" />
      <div className="relative max-w-2xl">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur">
          <Hospital className="h-3.5 w-3.5" /> Hôpitaux & cliniques — Maroc
        </p>
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
          Trouvez le bon hôpital ou la bonne clinique, partout au Maroc.
        </h1>
        <p className="mt-3 text-white/85 sm:text-lg">
          Urgences, départements, équipements et avis — tout pour décider et
          vous rendre rapidement au bon endroit.
        </p>
        <div className="mt-6">
          <HospitalSearchBar placeholder="Hôpital, clinique, ville, spécialité…" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="secondary" className="rounded-full">
            <Link to="/hospitals/emergency">
              <Siren className="mr-1 h-4 w-4" /> Urgences proches
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-full border-white/40 bg-white/10 text-white hover:bg-white/20"
          >
            <Link to="/hospitals/map">
              <MapIcon className="mr-1 h-4 w-4" /> Voir sur la carte
            </Link>
          </Button>
        </div>
      </div>
    </motion.section>
  );
}

type EnrichedItem = {
  p: HospitalRow;
  distance: number | null;
  openStatus: ReturnType<typeof getOpenStatus>;
};

function Carousel({
  title,
  description,
  href,
  items,
  loading,
  emptyLabel,
  favoriteFn,
  isFavorite,
  accent,
}: {
  title: string;
  description?: string;
  href: "/hospitals/map" | "/hospitals/emergency" | "/hospitals/search";
  items: EnrichedItem[];
  loading: boolean;
  emptyLabel: string;
  favoriteFn: (id: string) => void;
  isFavorite: (id: string) => boolean;
  accent?: "emergency";
}) {
  return (
    <section>
      <header className="mb-4 flex items-end justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            {accent === "emergency" ? (
              <Siren className="h-5 w-5 text-red-600" />
            ) : null}
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link to={href}>
            Tout voir <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </header>
      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-[300px] shrink-0 rounded-3xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          {emptyLabel}
        </p>
      ) : (
        <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2">
          {items.map((it) => (
            <div key={it.p.id} className="w-[300px] shrink-0 snap-start sm:w-[320px]">
              <HospitalCard
                hospital={it.p}
                distanceKm={it.distance}
                openStatus={it.openStatus}
                isFavorite={isFavorite(it.p.id)}
                onToggleFavorite={favoriteFn}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SimpleGrid({
  title,
  description,
  icon: Icon,
  items,
  loading,
  favoriteFn,
  isFavorite,
}: {
  title: string;
  description?: string;
  icon: typeof Star;
  items: HospitalRow[];
  loading: boolean;
  favoriteFn: (id: string) => void;
  isFavorite: (id: string) => boolean;
}) {
  return (
    <section>
      <header className="mb-4 flex items-end justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Icon className="h-5 w-5 text-primary" /> {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </header>
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-3xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Icon}
          title="Aucun établissement pour l'instant"
          description="Revenez bientôt — l'annuaire s'enrichit chaque semaine."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <HospitalCard
              key={p.id}
              hospital={p}
              openStatus={getOpenStatus(p.working_hours)}
              isFavorite={isFavorite(p.id)}
              onToggleFavorite={favoriteFn}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function DepartmentsGrid() {
  return (
    <section>
      <header className="mb-4 flex items-end justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Sparkles className="h-5 w-5 text-primary" /> Départements médicaux
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Trouvez l'établissement qui dispose du département dont vous avez besoin.
          </p>
        </div>
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link to="/hospitals/departments">
            Tout voir <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </header>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {HOSPITAL_DEPARTMENTS.slice(0, 8).map((d) => {
          const Icon = d.icon;
          return (
            <Link
              key={d.value}
              to="/hospitals/search"
              search={{ department: d.value }}
              className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft transition hover:shadow-elevated"
            >
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${d.tint}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-sm font-medium">{d.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}