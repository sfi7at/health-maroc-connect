import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Clock,
  FlaskConical,
  Map as MapIcon,
  Microscope,
  Siren,
  Sparkles,
  Star,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LaboratoryCard } from "@/components/laboratories/LaboratoryCard";
import { LaboratorySearchBar } from "@/components/laboratories/LaboratorySearchBar";
import { EmptyState } from "@/components/common/EmptyState";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useFavorites } from "@/hooks/use-favorites";
import { getOpenStatus } from "@/lib/map-utils";
import { haversineKm } from "@/lib/format";
import { LAB_ANALYSES, laboratoriesQuery, type LabRow } from "@/lib/laboratories";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/laboratories")({
  head: () =>
    buildHead({
      title: "Laboratoires d'analyses au Maroc — HealthLink Maroc",
      description:
        "Trouvez le laboratoire d'analyses médicales idéal au Maroc : proximité, ouvert maintenant, prélèvement à domicile, PCR, COVID et plus.",
      path: "/laboratories",
    }),
  component: LaboratoriesHome,
});

const CATEGORY_CHIPS: Array<{
  label: string;
  to: "/laboratories/search" | "/laboratories/open" | "/laboratories/map" | "/laboratories/analyses";
  search?: Record<string, unknown>;
  icon: typeof FlaskConical;
  tint: string;
}> = [
  { label: "Ouverts maintenant", to: "/laboratories/open", icon: Clock, tint: "bg-emerald-500/10 text-emerald-600" },
  { label: "À domicile", to: "/laboratories/search", search: { homeSampling: true }, icon: Truck, tint: "bg-sky-500/10 text-sky-600" },
  { label: "Urgences", to: "/laboratories/search", search: { emergency: true }, icon: Siren, tint: "bg-red-500/10 text-red-600" },
  { label: "PCR / COVID", to: "/laboratories/search", search: { covid: true }, icon: Microscope, tint: "bg-indigo-500/10 text-indigo-600" },
  { label: "Analyses", to: "/laboratories/analyses", icon: FlaskConical, tint: "bg-amber-500/10 text-amber-600" },
  { label: "Carte", to: "/laboratories/map", icon: MapIcon, tint: "bg-rose-500/10 text-rose-600" },
];

function LaboratoriesHome() {
  const { position } = useGeolocation();
  const { data: all = [], isLoading } = useQuery(laboratoriesQuery({}, 120));
  const { isFavorite, toggle } = useFavorites();

  const enriched = useMemo(() => {
    return all.map((p) => {
      const distance =
        position && p.latitude && p.longitude
          ? haversineKm({ lat: position.lat, lng: position.lng }, { lat: p.latitude, lng: p.longitude })
          : null;
      const openStatus = getOpenStatus(p.working_hours);
      return { p, distance, openStatus };
    });
  }, [all, position]);

  const nearby = useMemo(
    () =>
      [...enriched].filter((e) => e.distance != null).sort((a, b) => a.distance! - b.distance!).slice(0, 6),
    [enriched],
  );
  const openNow = useMemo(
    () => enriched.filter((e) => e.openStatus === "open" || e.openStatus === "closing_soon").slice(0, 6),
    [enriched],
  );
  const topRated = useMemo(
    () =>
      [...all]
        .filter((p) => p.average_rating > 0)
        .sort((a, b) => b.average_rating - a.average_rating)
        .slice(0, 6),
    [all],
  );
  const featured = useMemo(
    () => [...all].filter((p) => p.is_premium || p.is_verified).slice(0, 6),
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
        title="À proximité"
        description={position ? "Triés par distance depuis votre position." : "Activez votre position pour voir les laboratoires proches."}
        href="/laboratories/map"
        items={nearby}
        loading={isLoading}
        emptyLabel="Aucun laboratoire géolocalisé à proximité."
        favoriteFn={toggle}
        isFavorite={isFavorite}
      />

      <Carousel
        title="Ouverts maintenant"
        description="Selon les horaires d'ouverture déclarés."
        href="/laboratories/open"
        items={openNow}
        loading={isLoading}
        emptyLabel="Aucun laboratoire marqué ouvert pour le moment."
        favoriteFn={toggle}
        isFavorite={isFavorite}
      />

      <SimpleGrid
        title="Les mieux notés"
        description="Laboratoires préférés de la communauté."
        icon={Star}
        items={topRated}
        loading={isLoading}
        favoriteFn={toggle}
        isFavorite={isFavorite}
      />

      <SimpleGrid
        title="Mis en avant"
        description="Établissements vérifiés et partenaires HealthLink."
        icon={Sparkles}
        items={featured}
        loading={isLoading}
        favoriteFn={toggle}
        isFavorite={isFavorite}
      />

      <AnalysisGrid />
    </div>
  );
}

function Hero() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 p-8 text-white shadow-elevated sm:p-12"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-rose-300/30 blur-3xl"
      />
      <div className="relative max-w-2xl">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur">
          <FlaskConical className="h-3.5 w-3.5" /> Laboratoires — Maroc
        </p>
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
          Tous les laboratoires d'analyses du Maroc, en un seul endroit.
        </h1>
        <p className="mt-3 text-white/85 sm:text-lg">
          Proximité GPS, prélèvement à domicile, PCR, tests COVID, hormones et plus —
          trouvez le bon laboratoire en quelques secondes.
        </p>
        <div className="mt-6">
          <LaboratorySearchBar placeholder="Laboratoire, ville, analyse…" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="secondary" className="rounded-full">
            <Link to="/laboratories/analyses">
              <Microscope className="mr-1 h-4 w-4" /> Toutes les analyses
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-full border-white/40 bg-white/10 text-white hover:bg-white/20"
          >
            <Link to="/laboratories/map">
              <MapIcon className="mr-1 h-4 w-4" /> Voir sur la carte
            </Link>
          </Button>
        </div>
      </div>
    </motion.section>
  );
}

type EnrichedItem = {
  p: LabRow;
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
}: {
  title: string;
  description?: string;
  href: "/laboratories/open" | "/laboratories/map" | "/laboratories/search";
  items: EnrichedItem[];
  loading: boolean;
  emptyLabel: string;
  favoriteFn: (id: string) => void;
  isFavorite: (id: string) => boolean;
}) {
  return (
    <section>
      <SectionHeader title={title} description={description} href={href} />
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
              <LaboratoryCard
                laboratory={it.p}
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
  items: LabRow[];
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
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
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
          title="Aucun laboratoire pour l'instant"
          description="Revenez bientôt — l'annuaire s'enrichit chaque semaine."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <LaboratoryCard
              key={p.id}
              laboratory={p}
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

function AnalysisGrid() {
  return (
    <section>
      <header className="mb-4 flex items-end justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Microscope className="h-5 w-5 text-primary" /> Analyses médicales
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Trouvez les laboratoires qui réalisent l'analyse dont vous avez besoin.
          </p>
        </div>
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link to="/laboratories/analyses">
            Tout voir <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </header>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {LAB_ANALYSES.slice(0, 8).map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.value}
              to="/laboratories/search"
              search={{ analysis: a.value }}
              className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft transition hover:shadow-elevated"
            >
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${a.tint}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-sm font-medium">{a.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function SectionHeader({
  title,
  description,
  href,
}: {
  title: string;
  description?: string;
  href: "/laboratories/open" | "/laboratories/map" | "/laboratories/search";
}) {
  return (
    <header className="mb-4 flex items-end justify-between gap-2">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <Button asChild variant="ghost" size="sm" className="gap-1">
        <Link to={href}>
          Tout voir <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </header>
  );
}