import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, ShoppingBag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ProductCard } from "@/components/products/ProductCard";
import {
  browseProductsQuery,
  productCategoriesQuery,
  type ProductBrowseFilters,
} from "@/lib/pharmacy-products";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/products/")({
  head: () =>
    buildHead({
      title: "Produits pharmacie — Vytalma",
      description: "Parcourez le catalogue de médicaments, parapharmacie et matériel médical proposé par les pharmacies partenaires du Maroc.",
      path: "/products",
    }),
  component: ProductsIndex,
});

function ProductsIndex() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");
  const [rx, setRx] = useState<boolean | null>(null);
  const dq = useDebouncedValue(q, 250);

  const filters: ProductBrowseFilters = {
    q: dq,
    categorySlug: cat || undefined,
    requiresPrescription: rx,
    sort: "recent",
  };
  const { data: products = [], isLoading } = useQuery(browseProductsQuery(filters));
  const { data: categories = [] } = useQuery(productCategoriesQuery());

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Boutique"
        title="Produits & médicaments"
        description="Achetez auprès des pharmacies vérifiées du Maroc."
        icon={<ShoppingBag className="h-5 w-5" />}
      />

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un produit, une marque…"
            className="h-11 border-0 bg-transparent focus-visible:ring-0"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip label="Toutes catégories" active={!cat} onClick={() => setCat("")} />
          {categories.map((c) => (
            <Chip key={c.id} label={c.name_fr} active={cat === c.slug} onClick={() => setCat(c.slug)} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip label="Tous" active={rx === null} onClick={() => setRx(null)} />
          <Chip label="Sans ordonnance (OTC)" active={rx === false} onClick={() => setRx(false)} />
          <Chip label="Sur ordonnance" active={rx === true} onClick={() => setRx(true)} />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-3xl bg-muted/50" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="Aucun produit trouvé" description="Essayez une autre catégorie ou un autre mot-clé." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card hover:bg-muted"
      }`}
    >
      <Badge variant="outline" className="border-0 bg-transparent p-0 text-inherit">
        {label}
      </Badge>
    </button>
  );
}