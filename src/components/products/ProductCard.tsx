import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BadgeAlert, Image as ImageIcon, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMad, signProductImage, type ProductWithPharmacy } from "@/lib/pharmacy-products";
import { useCart } from "@/lib/cart";

export function ProductCard({ product }: { product: ProductWithPharmacy }) {
  const images = Array.isArray(product.images) ? (product.images as string[]) : [];
  const [thumb, setThumb] = useState<string | null>(null);
  const { addItem, isAdding } = useCart();

  useEffect(() => {
    if (images[0]) signProductImage(images[0]).then(setThumb);
  }, [images]);

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-soft transition hover:shadow-lg">
      <Link to="/products/$id" params={{ id: product.id }} className="block">
        <div className="grid aspect-square w-full place-items-center overflow-hidden bg-muted">
          {thumb ? (
            <img src={thumb} alt={product.name} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <Link
            to="/products/$id"
            params={{ id: product.id }}
            className="line-clamp-2 text-sm font-bold hover:underline"
          >
            {product.name}
          </Link>
          {product.requires_prescription ? (
            <Badge className="shrink-0 gap-1 border-0 bg-amber-500/15 text-amber-700">
              <BadgeAlert className="h-3 w-3" />
            </Badge>
          ) : null}
        </div>
        {product.brand ? <p className="text-xs text-muted-foreground">{product.brand}</p> : null}
        {product.providers ? (
          <Link
            to="/providers/$id"
            params={{ id: product.providers.id }}
            className="text-[11px] text-muted-foreground hover:underline"
          >
            {product.providers.name}
          </Link>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <p className="text-sm font-bold text-primary">{formatMad(product.price_mad)}</p>
          <Button
            size="sm"
            className="h-8 gap-1 rounded-full"
            disabled={isAdding || product.stock <= 0}
            onClick={() => addItem({ product })}
          >
            <Plus className="h-3.5 w-3.5" /> Ajouter
          </Button>
        </div>
        {product.stock <= 0 ? <p className="text-[11px] text-destructive">Rupture de stock</p> : null}
      </div>
    </article>
  );
}