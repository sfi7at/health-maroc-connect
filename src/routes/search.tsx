import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Search as SearchIcon,
  MapPin,
  Siren,
  CheckCircle2,
  Star,
  Phone,
  Map as MapIcon,
  Sparkles,
  TrendingUp,
  Clock,
} from "lucide-react";
import { z } from "zod";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/common/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { buildHead } from "@/lib/seo";
import { unifiedSearchQuery } from "@/lib/search-queries";
import {
  categoryMeta,
  EMERGENCY_SHORTCUTS,
  POPULAR_SEARCHES,
  isEmergencyQuery,
  type SearchHit,
  type SearchIntent,
} from "@/lib/search-engine";
import { EMERGENCY_NUMBERS } from "@/lib/map-utils";
import { useSearchHistory } from "@/hooks/use-search-history";
import { useGeolocation } from "@/hooks/use-geolocation";
import { haversineKm, formatDistanceKm } from "@/lib/format";

const searchSchema = z.object({ q: z.string().optional().catch("") });

export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  head: () =>
    buildHead({
      title: "Recherche universelle — HealthLink Maroc",
      description:
        "Trouvez instantanément médecins, pharmacies, hôpitaux, laboratoires, urgences et services de santé au Maroc.",
      path: "/search",
    }),
  component: SearchPage,
});

type Filters = {
  kind: "all" | SearchHit["kind"];
  openNow: boolean;
  verified: boolean;
  minRating: number;
  emergency: boolean;
  homeVisit: boolean;
  sort: "relevance" | "distance" | "rating";
};

const initialFilters: Filters = {
  kind: "all",
  openNow: false,
  verified: false,
  minRating: 0,
  emergency: false,
  homeVisit: false,
  sort: "relevance",
};

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const { push, history } = useSearchHistory();
  const { position } = useGeolocation();

  const [text, setText] = useState(q ?? "");
  const [debounced, setDebounced] = useState(q ?? "");
  const [filters, setFilters] = useState<Filters>(initialFilters);

  useEffect(() => { setText(q ?? ""); setDebounced(q ?? ""); }, [q]);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(text), 220);
    return () => clearTimeout(t);
  }, [text]);
  useEffect(() => { if (debounced.trim().length >= 2) push(debounced); }, [debounced, push]);

  const { data, isLoading } = useQuery(unifiedSearchQuery(debounced));
  const emergency = useMemo(() => isEmergencyQuery(debounced), [debounced]);

  const distanceFor = (h: SearchHit) =>
    position && h.latitude != null && h.longitude != null
      ? haversineKm(position, { lat: Number(h.latitude), lng: Number(h.longitude) })
      : null;

  const filteredProviders = useMemo(() => {
    const list = (data?.providers ?? []).filter((h) => {
      if (filters.kind !== "all" && h.kind !== filters.kind) return false;
      if (filters.verified && !h.verified) return false;
      if (filters.minRating > 0 && (h.rating ?? 0) < filters.minRating) return false;
      if (filters.emergency && h.kind !== "hospital" && h.kind !== "clinic") return false;
      return true;
    });
    const withDist = list.map((h) => ({ ...h, _km: distanceFor(h) }));
    if (filters.sort === "distance" && position) {
      withDist.sort((a, b) => (a._km ?? 1e9) - (b._km ?? 1e9));
    } else if (filters.sort === "rating") {
      withDist.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }
    return withDist;
  }, [data, filters, position]);

  const totalCount =
    (data?.providers.length ?? 0) + (data?.cities.length ?? 0) + (data?.specialties.length ?? 0);

  const submit = (value: string) => {
    const next = value.trim();
    if (!next) return;
    navigate({ to: "/search", search: { q: next } });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Recherche universelle"
        title="Trouvez tout, partout au Maroc"
        description="Médecins, pharmacies, hôpitaux, laboratoires, urgences, spécialités, villes — un seul endroit."
        icon={<SearchIcon className="h-5 w-5" />}
      />

      <form
        onSubmit={(e) => { e.preventDefault(); submit(text); }}
        className="relative"
      >
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ex : dermatologue ouvert maintenant à Rabat, pharmacie de garde, urgence enfant…"
          className="h-14 rounded-2xl pl-11 pr-32 text-base shadow-soft"
          aria-label="Rechercher"
        />
        <Button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl"
          size="sm"
        >
          Rechercher
        </Button>
      </form>

      {emergency && debounced.length > 1 ? (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-red-500/30 bg-red-500/5 p-5"
        >
          <div className="mb-3 flex items-center gap-2 text-red-600">
            <Siren className="h-5 w-5" />
            <p className="text-sm font-semibold uppercase tracking-wider">Mode urgence détecté</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {EMERGENCY_NUMBERS.slice(0, 6).map((n) => (
              <a
                key={n.key}
                href={`tel:${n.number}`}
                className={`flex items-center gap-3 rounded-2xl ${n.color} px-4 py-3 text-white shadow-soft transition hover:opacity-90`}
              >
                <Phone className="h-5 w-5" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium opacity-90">{n.label}</p>
                  <p className="text-base font-bold">{n.number}</p>
                </div>
              </a>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {EMERGENCY_SHORTCUTS.map((s) => {
              const Icon = s.icon ?? Siren;
              return (
                <Button key={s.id} asChild variant="outline" size="sm" className="gap-2 rounded-full">
                  <Link to={s.to}><Icon className="h-4 w-4" /> {s.title}</Link>
                </Button>
              );
            })}
          </div>
        </motion.div>
      ) : null}

      {debounced.trim().length < 2 ? (
        <DiscoverySection history={history} onPick={submit} />
      ) : (
        <>
          <FilterBar filters={filters} setFilters={setFilters} hasGeo={!!position} />

          {data?.intent ? <IntentChips intent={data.intent} /> : null}

          <p className="text-sm text-muted-foreground">
            {isLoading
              ? "Recherche en cours…"
              : `${totalCount} résultat${totalCount > 1 ? "s" : ""} pour « ${debounced} »`}
          </p>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-3xl" />
              ))}
            </div>
          ) : totalCount === 0 ? (
            <EmptyState
              icon={SearchIcon}
              title="Aucun résultat"
              description="Essayez d'autres mots-clés, vérifiez l'orthographe ou élargissez votre recherche."
            />
          ) : (
            <div className="space-y-6">
              {data!.specialties.length > 0 ? (
                <ResultGroup title="Spécialités" hits={data!.specialties} distanceFor={distanceFor} />
              ) : null}
              {data!.cities.length > 0 ? (
                <ResultGroup title="Villes" hits={data!.cities} distanceFor={distanceFor} />
              ) : null}
              {filteredProviders.length > 0 ? (
                <ResultGroup
                  title="Établissements & professionnels"
                  hits={filteredProviders}
                  distanceFor={distanceFor}
                  trailing={
                    <Button asChild variant="outline" size="sm" className="gap-2 rounded-full">
                      <Link to="/map">
                        <MapIcon className="h-4 w-4" /> Voir sur la carte
                      </Link>
                    </Button>
                  }
                />
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function IntentChips({ intent }: { intent: SearchIntent }) {
  const chips: string[] = [];
  if (intent.category) chips.push(`Type : ${intent.category}`);
  if (intent.specialtyLabel) chips.push(intent.specialtyLabel);
  if (intent.cityHint) chips.push(intent.cityHint);
  if (intent.openNow) chips.push("Ouvert maintenant");
  if (intent.onDuty) chips.push("De garde");
  if (intent.online) chips.push("Téléconsultation");
  if (intent.homeVisit) chips.push("Domicile");
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
        <Sparkles className="h-3 w-3" /> Compris :
      </span>
      {chips.map((c) => (
        <span key={c} className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium">
          {c}
        </span>
      ))}
    </div>
  );
}

function FilterBar({
  filters, setFilters, hasGeo,
}: { filters: Filters; setFilters: (f: Filters) => void; hasGeo: boolean }) {
  const kinds: Array<{ value: Filters["kind"]; label: string }> = [
    { value: "all", label: "Tout" },
    { value: "doctor", label: "Médecins" },
    { value: "pharmacy", label: "Pharmacies" },
    { value: "hospital", label: "Hôpitaux" },
    { value: "clinic", label: "Cliniques" },
    { value: "laboratory", label: "Laboratoires" },
    { value: "blood_center", label: "Don du sang" },
  ];
  const toggle = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    setFilters({ ...filters, [k]: v });
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {kinds.map((k) => (
          <button
            key={k.value}
            onClick={() => toggle("kind", k.value)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              filters.kind === k.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:border-primary/40"
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <FilterToggle
          active={filters.verified}
          onClick={() => toggle("verified", !filters.verified)}
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          label="Vérifiés"
        />
        <FilterToggle
          active={filters.emergency}
          onClick={() => toggle("emergency", !filters.emergency)}
          icon={<Siren className="h-3.5 w-3.5" />}
          label="Urgences"
        />
        <FilterToggle
          active={filters.minRating >= 4}
          onClick={() => toggle("minRating", filters.minRating >= 4 ? 0 : 4)}
          icon={<Star className="h-3.5 w-3.5" />}
          label="≥ 4 ★"
        />
        <FilterToggle
          active={filters.sort === "distance"}
          onClick={() => toggle("sort", filters.sort === "distance" ? "relevance" : "distance")}
          icon={<MapPin className="h-3.5 w-3.5" />}
          label={hasGeo ? "Plus proches" : "Géoloc requise"}
          disabled={!hasGeo}
        />
        <FilterToggle
          active={filters.sort === "rating"}
          onClick={() => toggle("sort", filters.sort === "rating" ? "relevance" : "rating")}
          icon={<Star className="h-3.5 w-3.5" />}
          label="Mieux notés"
        />
      </div>
    </div>
  );
}

function FilterToggle({
  active, onClick, icon, label, disabled,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card hover:border-primary/40"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function ResultGroup({
  title, hits, distanceFor, trailing,
}: {
  title: string;
  hits: SearchHit[];
  distanceFor: (h: SearchHit) => number | null;
  trailing?: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
        {trailing}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {hits.map((h) => <HitCard key={h.id} hit={h} km={distanceFor(h)} />)}
      </div>
    </section>
  );
}

function HitCard({ hit, km }: { hit: SearchHit; km: number | null }) {
  const meta = categoryMeta(hit.kind);
  const Icon = hit.icon ?? meta.icon;
  return (
    <Link
      to={hit.to}
      className="group flex items-start gap-3 rounded-3xl border border-border bg-card p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
    >
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-muted ${meta.color}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-semibold">{hit.title}</p>
          {hit.verified ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : null}
        </div>
        {hit.subtitle ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{hit.subtitle}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">{meta.label}</Badge>
          {hit.rating ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
              <Star className="h-3 w-3 fill-current" /> {hit.rating.toFixed(1)}
            </span>
          ) : null}
          {km != null ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" /> {formatDistanceKm(km)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function DiscoverySection({
  history, onPick,
}: { history: string[]; onPick: (q: string) => void }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <div className="mb-3 flex items-center gap-2 text-primary">
          <TrendingUp className="h-4 w-4" />
          <h2 className="text-sm font-semibold uppercase tracking-wider">Tendances au Maroc</h2>
        </div>
        <ul className="space-y-1.5">
          {POPULAR_SEARCHES.map((p) => {
            const Icon = p.icon;
            return (
              <li key={p.query}>
                <button
                  onClick={() => onPick(p.query)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium hover:bg-muted"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">{p.label}</span>
                  <span className="text-xs text-muted-foreground">↗</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <div className="mb-3 flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <h2 className="text-sm font-semibold uppercase tracking-wider">Recherches récentes</h2>
        </div>
        {history.length === 0 ? (
          <p className="rounded-xl bg-muted/40 px-3 py-6 text-center text-xs text-muted-foreground">
            Vos recherches récentes apparaîtront ici.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {history.slice(0, 8).map((h) => (
              <li key={h}>
                <button
                  onClick={() => onPick(h)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{h}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
