import { useEffect, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeAlert,
  Image as ImageIcon,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
  Store,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatMad,
  productByIdQuery,
  signProductImage,
} from "@/lib/pharmacy-products";
import { useCart } from "@/lib/cart";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/products/$id")({
  head: ({ loaderData }: { loaderData?: { title: string; description: string } }) =>
    buildHead({
      title: loaderData?.title ?? "Produit — Vytalma",
      description: loaderData?.description ?? "Découvrez ce produit sur Vytalma.",
      path: "/products",
    }),
  loader: async ({ params, context }) => {
    const opts = productByIdQuery(params.id);
    const data = await context.queryClient.ensureQueryData(opts);
    if (!data) throw notFound();
    return {
      title: `${data.name} — Vytalma`,
      description: data.description?.slice(0, 155) ?? `${data.name} disponible en pharmacie.`,
    };
  },
  component: ProductDetail,
});

function ProductDetail() {
  const { id } = Route.useParams();
  const { data: product } = useQuery(productByIdQuery(id));
  const { addItem, isAdding } = useCart();
  const [qty, setQty] = useState(1);
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [signedImages, setSignedImages] = useState<string[]>([]);

  useEffect(() => {
    const paths = Array.isArray(product?.images) ? (product!.images as string[]) : [];
    Promise.all(paths.map((p) => signProductImage(p))).then((urls) => {
      const clean = urls.filter(Boolean) as string[];
      setSignedImages(clean);
      setMainImage(clean[0] ?? null);
    });
  }, [product]);

  if (!product) return <div className="p-4 text-sm text-muted-foreground">Chargement…</div>;

  const pharmacy = product.providers;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <section>
        <div className="grid aspect-square w-full place-items-center overflow-hidden rounded-3xl border border-border bg-muted">
          {mainImage ? (
            <img src={mainImage} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-10 w-10 text-muted-foreground" />
          )}
        </div>
        {signedImages.length > 1 ? (
          <div className="mt-3 grid grid-cols-5 gap-2">
            {signedImages.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setMainImage(url)}
                className={`aspect-square overflow-hidden rounded-xl border-2 ${
                  mainImage === url ? "border-primary" : "border-transparent"
                }`}
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <div>
          {product.brand ? <p className="text-xs uppercase text-muted-foreground">{product.brand}</p> : null}
          <h1 className="mt-1 text-2xl font-bold">{product.name}</h1>
          {product.dosage_form ? <p className="text-sm text-muted-foreground">{product.dosage_form}</p> : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {product.requires_prescription ? (
              <Badge className="gap-1 border-0 bg-amber-500/15 text-amber-700">
                <BadgeAlert className="h-3 w-3" /> Ordonnance requise
              </Badge>
            ) : (
              <Badge variant="secondary">Sans ordonnance</Badge>
            )}
            {product.stock <= 0 ? <Badge variant="destructive">Rupture</Badge> : null}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-4">
          <p className="text-3xl font-bold text-primary">{formatMad(product.price_mad)}</p>
          {product.compare_at_price_mad ? (
            <p className="text-sm text-muted-foreground line-through">
              {formatMad(product.compare_at_price_mad)}
            </p>
          ) : null}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex items-center rounded-full border border-border">
              <button
                type="button"
                className="h-10 w-10 text-lg"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                −
              </button>
              <span className="w-8 text-center text-sm font-medium">{qty}</span>
              <button
                type="button"
                className="h-10 w-10 text-lg"
                onClick={() => setQty((q) => q + 1)}
              >
                +
              </button>
            </div>
            <Button
              className="flex-1 gap-1"
              onClick={() => addItem({ product, qty })}
              disabled={isAdding || product.stock <= 0}
            >
              <Plus className="h-4 w-4" /> Ajouter au panier
            </Button>
          </div>
          {product.requires_prescription ? (
            <p className="mt-3 rounded-xl bg-amber-500/10 p-2 text-xs text-amber-700">
              Vous devrez téléverser une ordonnance valide avant la validation de la commande.
            </p>
          ) : null}
        </div>

        {product.description ? (
          <div className="rounded-3xl border border-border bg-card p-4">
            <h2 className="mb-2 text-sm font-bold">Description</h2>
            <p className="whitespace-pre-line text-sm text-muted-foreground">{product.description}</p>
          </div>
        ) : null}

        {pharmacy ? (
          <div className="rounded-3xl border border-border bg-card p-4">
            <h2 className="mb-2 flex items-center gap-1 text-sm font-bold">
              <Store className="h-4 w-4" /> Vendu par
            </h2>
            <Link
              to="/providers/$id"
              params={{ id: pharmacy.id }}
              className="text-base font-semibold text-primary hover:underline"
            >
              {pharmacy.name}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {pharmacy.is_verified ? (
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <ShieldCheck className="h-3 w-3" /> Vérifiée
                </span>
              ) : null}
              {pharmacy.address ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {pharmacy.address}
                </span>
              ) : null}
              {pharmacy.phone ? (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {pharmacy.phone}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}