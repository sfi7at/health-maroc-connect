import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Clock,
  Map as MapIcon,
  Moon,
  Pill,
  Sparkles,
  Star,
  Truck,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PharmacyCard } from "@/components/pharmacies/PharmacyCard";
import { PharmacySearchBar } from "@/components/pharmacies/PharmacySearchBar";
import { EmptyState } from "@/components/common/EmptyState";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useFavorites } from "@/hooks/use-favorites";
import { getOpenStatus } from "@/lib/map-utils";
import { haversineKm } from "@/lib/format";
import {
  onDutyTodayProviderIdsQuery,
  pharmaciesQuery,
  readPharmacyMeta,
  type PharmacyRow,
} from "@/lib/pharmacies";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/pharmacies")({
  head: () =>
    buildHead({
      title: "Pharmacies au Maroc — Proches, ouvertes & de garde",
      description:
        "Trouvez instantanément une pharmacie au Maroc : proximité GPS, ouvertes maintenant, de garde de nuit, livraison à domicile et vérifiées.",
      path: "/pharmacies",
    }),
  component: PharmaciesHome,
});

const CATEGORY_CHIPS: Array<{
  label: string;
  to: "/pharmacies/on-duty" | "/pharmacies/open" | "/pharmacies/search" | "/pharmacies/map";
  search?: Record<string, unknown>;
  icon: typeof Pill;
  tint: string;
}> = [
  { label: "De garde", to: "/pharmacies/on-duty", icon: Moon, tint: "bg-indigo-500/10 text-indigo-600" },
  { label: "Ouvertes maintenant", to: "/pharmacies/open", icon: Clock, tint: "bg-emerald-500/10 text-emerald-600" },
  { label: "24h / 24", to: "/pharmacies/search", search: { open24h: true }, icon: Zap, tint: "bg-amber-500/10 text-amber-600" },
  { label: "Livraison", to: "/pharmacies/search", search: { delivery: true }, icon: Truck, tint: "bg-sky-500/10 text-sky-600" },
  { label: "Vérifiées", to: "/pharmacies/search", search: { verified: true }, icon: Sparkles, tint: "bg-fuchsia-500/10 text-fuchsia-600" },
  { label: "Carte", to: "/pharmacies/map", icon: MapIcon, tint: "bg-rose-500/10 text-rose-600" },
];

function PharmaciesHome() {
  const { position } = useGeolocation();
  const today = new Date().toISOString().slice(0, 10);
  const { data: all = [], isLoading } = useQuery(pharmaciesQuery({}, 120));
  const { data: dutyIds } = useQuery(onDutyTodayProviderIdsQuery(today));
  const { isFavorite, toggle } = useFavorites();

  const enriched = useMemo(() => {
    return all.map((p) => {
      const distance =
        position && p.latitude && p.longitude
          ? haversineKm({ lat: position.lat, lng: position.lng }, { lat: p.latitude, lng: p.longitude })
          : null;
      const openStatus = getOpenStatus(p.working_hours);
      const onDuty = dutyIds?.has(p.id) ?? false;
      return { p, distance, openStatus, onDuty };
    });
  }, [all, dutyIds, position]);

  const nearby = useMemo(
    () => [...enriched].filter((e) => e.distance != null).sort((a, b) => (a.distance! - b.distance!)).slice(0, 6),
    [enriched],
  );
  const openNow = useMemo(
    () => enriched.filter((e) => e.openStatus === "open" || e.openStatus === "closing_soon").slice(0, 6),
    [enriched],
  );
  const onDuty = useMemo(() => enriched.filter((e) => e.onDuty).slice(0, 6), [enriched]);
  const topRated = useMemo(
    () => [...all].filter((p) => p.average_rating > 0).sort((a, b) => b.average_rating - a.average_rating).slice(0, 6),
    [all],
  );
  const recent = useMemo(
    () => [...all].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 6),
    [all],
  );

  return (
    <div className="space-y-12">
      <Hero />

      <section aria-label="Catégories" className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
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
        description={position ? "Triées par distance depuis votre position." : "Activez votre position pour voir les pharmacies proches."}
        href="/pharmacies/map"
        items={nearby}
        loading={isLoading}
        emptyLabel="Aucune pharmacie géolocalisée à proximité."
        favoriteFn={(id) => toggle.mutate(id)}
        isFavorite={isFavorite}
      />

      <Carousel
        title="Ouvertes maintenant"
        description="Selon les horaires d'ouverture déclarés."
        href="/pharmacies/open"
        items={openNow}
        loading={isLoading}
        emptyLabel="Aucune pharmacie marquée ouverte pour le moment."
        favoriteFn={(id) => toggle.mutate(id)}
        isFavorite={isFavorite}
      />

      <Carousel
        title="De garde aujourd'hui"
        description="Mises à jour quotidiennement selon les arrêtés régionaux marocains."
        href="/pharmacies/on-duty"
        items={onDuty}
        loading={isLoading}
        emptyLabel="Aucune pharmacie de garde répertoriée pour aujourd'hui."
        favoriteFn={(id) => toggle.mutate(id)}
        isFavorite={isFavorite}
      />

      <SimpleGrid
        title="Les mieux notées"
        description="Pharmacies préférées de la communauté."
        icon={Star}
        items={topRated}
        loading={isLoading}
        favoriteFn={(id) => toggle.mutate(id)}
        isFavorite={isFavorite}
      />

      <SimpleGrid
        title="Récemment ajoutées"
        description="Nouveaux établissements vérifiés sur HealthLink Maroc."
        icon={Sparkles}
        items={recent}
        loading={isLoading}
        favoriteFn={(id) => toggle.mutate(id)}
        isFavorite={isFavorite}
      />
    </div>
  );
}

function Hero() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-8 text-white shadow-elevated sm:p-12"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-fuchsia-300/30 blur-3xl"
      />
      <div className="relative max-w-2xl">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur">
          <Pill className="h-3.5 w-3.5" /> Pharmacies — Maroc
        </p>
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
          Toutes les pharmacies du Maroc, à portée de main.
        </h1>
        <p className="mt-3 text-white/85 sm:text-lg">
          Proximité GPS, garde de nuit, ouvertes 24h/24, livraison à domicile et vaccination —
          retrouvez la bonne pharmacie en quelques secondes.
        </p>
        <div className="mt-6">
          <PharmacySearchBar placeholder="Pharmacie, ville, quartier, service…" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="secondary" className="rounded-full">
            <Link to="/pharmacies/on-duty">
              <Moon className="mr-1 h-4 w-4" /> Pharmacies de garde
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-full border-white/40 bg-white/10 text-white hover:bg-white/20"
          >
            <Link to="/pharmacies/map">
              <MapIcon className="mr-1 h-4 w-4" /> Voir sur la carte
            </Link>
          </Button>
        </div>
      </div>
    </motion.section>
  );
}

type EnrichedItem = {
  p: PharmacyRow;
  distance: number | null;
  openStatus: ReturnType<typeof getOpenStatus>;
  onDuty: boolean;
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
  href: "/pharmacies/on-duty" | "/pharmacies/open" | "/pharmacies/map" | "/pharmacies/search";
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
              <PharmacyCard
                pharmacy={it.p}
                distanceKm={it.distance}
                openStatus={it.openStatus}
                onDuty={it.onDuty}
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
  items: PharmacyRow[];
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
          title="Aucune pharmacie pour l'instant"
          description="Revenez bientôt — l'annuaire s'enrichit chaque semaine."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => {
            const meta = readPharmacyMeta(p);
            void meta;
            return (
              <PharmacyCard
                key={p.id}
                pharmacy={p}
                openStatus={getOpenStatus(p.working_hours)}
                isFavorite={isFavorite(p.id)}
                onToggleFavorite={favoriteFn}
              />
            );
          })}
        </div>
      )}
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
  href: "/pharmacies/on-duty" | "/pharmacies/open" | "/pharmacies/map" | "/pharmacies/search";
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
