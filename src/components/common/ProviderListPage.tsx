import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/common/PageHeader";
import { ProviderCard } from "@/components/common/ProviderCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { providersQuery, citiesQuery } from "@/lib/queries";
import { CATEGORIES } from "@/lib/categories";
import type { ProviderCategory } from "@/lib/format";

interface ProviderListPageProps {
  category: ProviderCategory;
  eyebrow?: string;
}

export function ProviderListPage({ category, eyebrow }: ProviderListPageProps) {
  const meta = CATEGORIES[category];
  const Icon = meta.icon;
  const [search, setSearch] = useState("");
  const [cityId, setCityId] = useState<string | "all">("all");

  const { data: cities = [] } = useQuery(citiesQuery());
  const { data: providers = [], isLoading } = useQuery(
    providersQuery({ category, cityId: cityId === "all" ? null : cityId, search }),
  );

  const listed = useMemo(() => providers, [providers]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={eyebrow ?? "Annuaire santé"}
        title={meta.pluralLabel}
        description={meta.description}
        icon={<Icon className="h-5 w-5" />}
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-3 sm:grid-cols-[1fr_220px]"
      >
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Rechercher un ${meta.label.toLowerCase()}…`}
            className="h-12 rounded-2xl pl-11"
            aria-label="Recherche"
          />
        </div>
        <Select value={cityId} onValueChange={(v) => setCityId(v as string)}>
          <SelectTrigger className="h-12 rounded-2xl">
            <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Toutes les villes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les villes</SelectItem>
            {cities.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name_fr}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-3xl" />
          ))}
        </div>
      ) : listed.length === 0 ? (
        <EmptyState
          icon={<Icon className="h-8 w-8" />}
          title={`Aucun ${meta.label.toLowerCase()} trouvé`}
          description="Aucun prestataire ne correspond pour le moment. Modifiez vos filtres ou revenez plus tard — l'annuaire s'enrichit chaque semaine."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listed.map((p) => (
            <ProviderCard key={p.id} provider={p} />
          ))}
        </div>
      )}
    </div>
  );
}