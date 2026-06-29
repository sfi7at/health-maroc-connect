import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { Search as SearchIcon } from "lucide-react";
import { z } from "zod";
import { PageHeader } from "@/components/common/PageHeader";
import { Input } from "@/components/ui/input";
import { CategoryChips } from "@/components/common/CategoryChips";
import { ProviderCard } from "@/components/common/ProviderCard";
import { providersQuery } from "@/lib/queries";
import { buildHead } from "@/lib/seo";
import type { ProviderCategory } from "@/lib/format";

const searchSchema = z.object({ q: z.string().optional().catch("") });

export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  head: () =>
    buildHead({
      title: "Recherche — HealthLink Maroc",
      description: "Recherchez médecins, pharmacies, hôpitaux et laboratoires partout au Maroc.",
      path: "/search",
    }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const [text, setText] = useState(q ?? "");
  const [debounced, setDebounced] = useState(q ?? "");
  const [category, setCategory] = useState<ProviderCategory | "all">("all");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(text), 250);
    return () => clearTimeout(t);
  }, [text]);

  const { data, isLoading } = useQuery(providersQuery({ category, search: debounced }));
  const list = useMemo(() => data ?? [], [data]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Recherche universelle"
        title="Tout chercher"
        description="Médecins, pharmacies, hôpitaux, laboratoires — partout au Maroc."
        icon={<SearchIcon className="h-5 w-5" />}
      />

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Rechercher un médecin, une pharmacie, une ville…"
          className="h-12 rounded-2xl pl-11 shadow-soft"
          aria-label="Rechercher"
        />
      </div>

      <CategoryChips value={category} onChange={setCategory} />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-3xl bg-muted/50" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Aucun résultat. Essayez un autre mot-clé ou changez de catégorie.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <ProviderCard key={p.id} provider={p} />
          ))}
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Vous ne trouvez pas ce que vous cherchez ?{" "}
        <Link to="/contact" className="font-medium text-primary hover:underline">Signalez-le</Link>
      </p>
    </div>
  );
}
