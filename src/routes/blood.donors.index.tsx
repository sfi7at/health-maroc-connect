import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Droplet,
  MapPin,
  ShieldCheck,
  Heart,
  Filter,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { citiesQuery } from "@/lib/queries";
import { donorsSearchQuery, type DonorPublic } from "@/lib/blood-queries";
import { BLOOD_GROUPS, type BloodGroup } from "@/lib/categories";
import { DONOR_STATUS_META, RECEIVE_FROM } from "@/lib/blood";
import { formatRelativeFr } from "@/lib/format";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/blood/donors/")({
  head: () =>
    buildHead({
      title: "Trouver des donneurs de sang — HealthLink Maroc",
      description:
        "Recherchez des donneurs de sang vérifiés et disponibles au Maroc selon la compatibilité, la ville et le statut.",
      path: "/blood/donors",
    }),
  component: DonorsSearchPage,
});

function DonorsSearchPage() {
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | "all">("all");
  const [useCompatibility, setUseCompatibility] = useState(true);
  const [cityId, setCityId] = useState<string | "all">("all");
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [sort, setSort] = useState<"most_active" | "newest" | "verified">("most_active");

  const { data: cities = [] } = useQuery(citiesQuery());

  const bloodGroups = useMemo<BloodGroup[] | undefined>(() => {
    if (bloodGroup === "all") return undefined;
    return useCompatibility ? RECEIVE_FROM[bloodGroup] : [bloodGroup];
  }, [bloodGroup, useCompatibility]);

  const { data: donors = [], isLoading } = useQuery(
    donorsSearchQuery({
      bloodGroups,
      cityId: cityId === "all" ? null : cityId,
      onlyAvailable,
      onlyVerified,
      sort,
    }),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Communauté"
        title="Donneurs de sang"
        description="Trouvez rapidement un donneur compatible et disponible près de chez vous."
        icon={<Droplet className="h-5 w-5" />}
        actions={
          <Button asChild className="gap-2">
            <Link to="/blood/request">
              <Heart className="h-4 w-4" /> Publier une demande
            </Link>
          </Button>
        }
      />

      <section className="grid gap-3 rounded-3xl border border-border bg-card p-4 shadow-soft sm:p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" /> Filtres
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-1.5">
            <Label className="text-xs">Groupe sanguin du patient</Label>
            <Select value={bloodGroup} onValueChange={(v) => setBloodGroup(v as BloodGroup | "all")}>
              <SelectTrigger className="h-11 rounded-xl">
                <Droplet className="mr-2 h-4 w-4 text-rose-500" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les groupes</SelectItem>
                {BLOOD_GROUPS.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Ville</Label>
            <Select value={cityId} onValueChange={setCityId}>
              <SelectTrigger className="h-11 rounded-xl">
                <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les villes</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name_fr}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Tri</Label>
            <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="most_active">Plus actifs</SelectItem>
                <SelectItem value="newest">Plus récents</SelectItem>
                <SelectItem value="verified">Vérifiés</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col justify-end gap-2 rounded-xl border border-border p-3">
            <label className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">Compatibilité ABO/Rh</span>
              <Switch checked={useCompatibility} onCheckedChange={setUseCompatibility} />
            </label>
            <label className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">Disponibles uniquement</span>
              <Switch checked={onlyAvailable} onCheckedChange={setOnlyAvailable} />
            </label>
            <label className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">Donneurs vérifiés</span>
              <Switch checked={onlyVerified} onCheckedChange={setOnlyVerified} />
            </label>
          </div>
        </div>
        {bloodGroup !== "all" && useCompatibility && (
          <p className="text-xs text-muted-foreground">
            Compatible avec : {RECEIVE_FROM[bloodGroup].join(" • ")}
          </p>
        )}
      </section>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-3xl" />
          ))}
        </div>
      ) : donors.length === 0 ? (
        <EmptyState
          icon={Droplet}
          title="Aucun donneur trouvé"
          description="Essayez d'élargir les filtres ou désactivez la compatibilité stricte."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {donors.map((d) => <DonorCard key={d.id} donor={d} />)}
        </div>
      )}
    </div>
  );
}

function DonorCard({ donor }: { donor: DonorPublic }) {
  const status = DONOR_STATUS_META[donor.status];
  const initials = `${donor.first_name?.[0] ?? ""}${donor.last_name?.[0] ?? ""}`.toUpperCase() || "?";
  return (
    <motion.div whileHover={{ y: -3 }}>
      <Link
        to="/blood/donors/$id"
        params={{ id: donor.id }}
        className="group block overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-soft transition-all hover:shadow-elevated"
      >
        <div className="flex items-start gap-3">
          <div className="relative">
            {donor.avatar_url ? (
              <img
                src={donor.avatar_url}
                alt=""
                className="h-14 w-14 rounded-2xl object-cover"
                loading="lazy"
              />
            ) : (
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-base font-bold text-white">
                {initials}
              </div>
            )}
            <span className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-card ${status.dot}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate font-semibold">
                {donor.first_name ?? "Donneur"} {donor.last_name?.[0] ? `${donor.last_name[0]}.` : ""}
              </p>
              {donor.is_verified && <ShieldCheck className="h-4 w-4 text-emerald-600" />}
            </div>
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> Actif {formatRelativeFr(donor.last_active_at)}
            </p>
          </div>
          <Badge className="border-0 bg-rose-500/10 text-rose-600 text-sm font-bold">
            {donor.blood_group}
          </Badge>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className={`border-0 ${status.tint}`}>
            {status.label}
          </Badge>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> Maroc
          </span>
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> {donor.total_donations} dons
          </span>
        </div>
      </Link>
    </motion.div>
  );
}