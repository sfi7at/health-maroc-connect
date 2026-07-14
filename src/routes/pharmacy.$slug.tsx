import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  Clock,
  Globe,
  Heart,
  Image as ImageIcon,
  Languages,
  MapPin,
  MessageCircle,
  Moon,
  Navigation,
  Package,
  Phone,
  Pill,
  Plus,
  Share2,
  Star,
  Truck,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHero } from "@/components/layout/PageHero";
import { ActionBar } from "@/components/layout/ActionBar";
import { StickyMobileCTA } from "@/components/layout/StickyMobileCTA";
import { MapView } from "@/components/common/MapView";
import { EmptyState } from "@/components/common/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { buildHead } from "@/lib/seo";
import { initialsOf } from "@/lib/format";
import { PHARMACY_SERVICES, pharmacyReviewsQuery, readPharmacyMeta, type PharmacyRow } from "@/lib/pharmacies";
import { browseProductsQuery, formatMad, signProductImage, type ProductWithPharmacy } from "@/lib/pharmacy-products";
import { useCart } from "@/lib/cart";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAYS: { key: string; label: string }[] = [
  { key: "monday", label: "Lundi" },
  { key: "tuesday", label: "Mardi" },
  { key: "wednesday", label: "Mercredi" },
  { key: "thursday", label: "Jeudi" },
  { key: "friday", label: "Vendredi" },
  { key: "saturday", label: "Samedi" },
  { key: "sunday", label: "Dimanche" },
];

function pharmacyBySlugOrIdQuery(slugOrId: string) {
  return {
    queryKey: ["pharmacy_profile", slugOrId],
    queryFn: async () => {
      const column = UUID_RE.test(slugOrId) ? "id" : "slug";
      const { data, error } = await supabase
        .from("providers")
        .select("*, cities(id, name_fr), districts(id, name_fr)")
        .eq(column, slugOrId)
        .eq("category", "pharmacy")
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as PharmacyRow | null;
    },
  };
}

export const Route = createFileRoute("/pharmacy/$slug")({
  head: ({ params }) =>
    buildHead({
      title: "Pharmacie — Vytalma",
      description: "Coordonnées, services, horaires et produits disponibles.",
      path: `/pharmacy/${params.slug}`,
    }),
  component: PharmacyProfilePage,
  notFoundComponent: () => (
    <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
      <h2 className="text-xl font-semibold">Pharmacie introuvable</h2>
      <p className="mt-2 text-sm text-muted-foreground">Cette pharmacie n'existe pas ou a été désactivée.</p>
      <Button asChild className="mt-6"><Link to="/pharmacies">Toutes les pharmacies</Link></Button>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
      <h2 className="text-xl font-semibold">Une erreur est survenue</h2>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
});

function PharmacyProfilePage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: pharmacy, isLoading } = useQuery(pharmacyBySlugOrIdQuery(slug));

  const pharmacyId = pharmacy?.id;
  const { data: products = [] } = useQuery({
    ...browseProductsQuery({ pharmacyId, sort: "recent" }, 60),
    enabled: !!pharmacyId,
  });
  const { data: reviews = [] } = useQuery({
    ...pharmacyReviewsQuery(pharmacyId ?? ""),
    enabled: !!pharmacyId,
  });
  const { data: favorited } = useQuery({
    queryKey: ["favorite", pharmacyId, user?.id ?? "anon"],
    enabled: !!user && !!pharmacyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("favorites")
        .select("provider_id")
        .eq("user_id", user!.id)
        .eq("provider_id", pharmacyId!)
        .maybeSingle();
      return !!data;
    },
  });
  const toggleFav = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Connectez-vous pour ajouter aux favoris.");
      if (!pharmacyId) return;
      if (favorited) {
        const { error } = await supabase.from("favorites").delete().eq("user_id", user.id).eq("provider_id", pharmacyId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("favorites").insert({ user_id: user.id, provider_id: pharmacyId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorite", pharmacyId] });
      toast.success(favorited ? "Retiré des favoris" : "Ajouté à vos favoris");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <PharmacyProfileSkeleton />;
  if (!pharmacy) throw notFound();

  const meta = readPharmacyMeta(pharmacy);
  const services = meta.services ?? [];
  const hours = ((pharmacy.working_hours ?? {}) as Record<string, { open?: string; close?: string } | string>) || {};
  const wa = meta.whatsapp ?? (pharmacy.phone ? pharmacy.phone.replace(/[^0-9]/g, "") : null);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: pharmacy.name, url: shareUrl }); } catch { /* noop */ }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Lien copié");
    }
  };

  return (
    <div className="space-y-8 pb-24 lg:pb-0">
      <Link to="/pharmacies" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Toutes les pharmacies
      </Link>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <PageHero
          coverGradientClass="bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-600"
          cover={pharmacy.cover_image ? <img src={pharmacy.cover_image} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
          avatar={
            <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-3xl bg-white text-indigo-600 shadow-elevated ring-1 ring-black/5 sm:h-28 sm:w-28">
              {pharmacy.profile_image ? (
                <img src={pharmacy.profile_image} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xl font-bold sm:text-2xl">{initialsOf(pharmacy.name) || <Pill className="h-8 w-8" />}</span>
              )}
            </div>
          }
          badges={
            <>
              <Badge className="border-0 bg-indigo-600 text-white gap-1"><Pill className="h-3.5 w-3.5" /> Pharmacie</Badge>
              {pharmacy.is_verified ? (
                <Badge className="gap-1 border-0 bg-white text-foreground"><BadgeCheck className="h-3.5 w-3.5 text-primary" /> Vérifié</Badge>
              ) : null}
              {meta.open_24h ? <Badge className="border-0 bg-emerald-600 text-white gap-1"><Zap className="h-3.5 w-3.5" /> 24h/24</Badge> : null}
              {meta.delivery || services.includes("delivery") ? (
                <Badge className="border-0 bg-sky-600 text-white gap-1"><Truck className="h-3.5 w-3.5" /> Livraison</Badge>
              ) : null}
            </>
          }
          title={<span className="block truncate">{pharmacy.name}</span>}
          meta={
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {pharmacy.average_rating > 0 ? (
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {pharmacy.average_rating.toFixed(1)}
                  <span className="text-muted-foreground">({pharmacy.reviews_count} avis)</span>
                </span>
              ) : null}
              {pharmacy.cities?.name_fr ? (
                <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {pharmacy.cities.name_fr}</span>
              ) : null}
            </div>
          }
          actions={
            <ActionBar
              primary={pharmacy.phone ? (
                <Button asChild size="lg" className="gap-2"><a href={`tel:${pharmacy.phone}`}><Phone className="h-4 w-4" /> Appeler</a></Button>
              ) : null}
              secondary={
                <Button onClick={() => toggleFav.mutate()} variant={favorited ? "default" : "outline"} size="lg" className="gap-2" disabled={toggleFav.isPending}>
                  <Heart className={`h-4 w-4 ${favorited ? "fill-current" : ""}`} /> {favorited ? "Favori" : "Favoris"}
                </Button>
              }
              icons={
                <Button variant="outline" size="lg" className="min-h-11 min-w-11 px-3" onClick={share} aria-label="Partager">
                  <Share2 className="h-4 w-4" />
                </Button>
              }
            />
          }
        />
      </motion.div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto rounded-2xl">
          <TabsTrigger value="overview">Aperçu</TabsTrigger>
          <TabsTrigger value="products">Produits ({products.length})</TabsTrigger>
          <TabsTrigger value="hours">Horaires</TabsTrigger>
          <TabsTrigger value="location">Localisation</TabsTrigger>
          <TabsTrigger value="reviews">Avis ({reviews.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              {meta.bio || pharmacy.description ? (
                <Card title="À propos">
                  <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {meta.bio ?? pharmacy.description}
                  </p>
                </Card>
              ) : null}

              {services.length ? (
                <Card title="Services proposés">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {services.map((s) => {
                      const def = PHARMACY_SERVICES.find((x) => x.value === s);
                      const Icon = def?.icon ?? Pill;
                      return (
                        <div key={s} className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm">
                          <Icon className="h-4 w-4 text-indigo-600" /> {def?.label ?? s}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ) : null}

              {meta.gallery?.length ? (
                <Card title="Galerie">
                  <div className="grid grid-cols-3 gap-2">
                    {meta.gallery.map((src, i) => (
                      <img key={i} src={src} alt="" loading="lazy" className="aspect-square rounded-xl object-cover" />
                    ))}
                  </div>
                </Card>
              ) : null}
            </div>

            <aside className="space-y-4">
              <Card title="Contact">
                <div className="space-y-2">
                  {pharmacy.phone ? (
                    <Button asChild className="w-full justify-start gap-2"><a href={`tel:${pharmacy.phone}`}><Phone className="h-4 w-4" /> {pharmacy.phone}</a></Button>
                  ) : null}
                  {wa ? (
                    <Button asChild variant="outline" className="w-full justify-start gap-2">
                      <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
                    </Button>
                  ) : null}
                  {pharmacy.website ? (
                    <Button asChild variant="outline" className="w-full justify-start gap-2">
                      <a href={pharmacy.website} target="_blank" rel="noreferrer"><Globe className="h-4 w-4" /> Site web</a>
                    </Button>
                  ) : null}
                </div>
              </Card>
              {meta.accessibility?.length || meta.parking ? (
                <Card title="Infos pratiques">
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    {meta.parking ? <li>• Parking disponible</li> : null}
                    {(meta.accessibility ?? []).map((a) => <li key={a}>• {a === "wheelchair" ? "Accès fauteuil roulant" : a}</li>)}
                  </ul>
                </Card>
              ) : null}
            </aside>
          </div>
        </TabsContent>

        <TabsContent value="products" className="pt-6">
          {products.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => <PharmacyProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <EmptyState icon={Package} title="Aucun produit publié" description="Cette pharmacie n'a pas encore ajouté de produits à son catalogue." />
          )}
        </TabsContent>

        <TabsContent value="hours" className="pt-6">
          <Card title="Horaires d'ouverture">
            <ul className="divide-y divide-border">
              {DAYS.map((d) => {
                const raw = hours[d.key] ?? hours[d.label.toLowerCase()];
                const label = typeof raw === "string" ? raw : raw?.open && raw?.close ? `${raw.open} – ${raw.close}` : "Fermé";
                return (
                  <li key={d.key} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="font-medium">{d.label}</span>
                    <span className="text-muted-foreground">{label}</span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </TabsContent>

        <TabsContent value="location" className="pt-6">
          {pharmacy.latitude && pharmacy.longitude ? (
            <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
              <div className="flex items-center justify-between px-6 pt-6">
                <h2 className="text-lg font-semibold">Localisation</h2>
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${pharmacy.latitude},${pharmacy.longitude}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                  <Navigation className="h-3.5 w-3.5" /> Itinéraire
                </a>
              </div>
              {pharmacy.address ? <p className="px-6 pt-1 text-sm text-muted-foreground">{pharmacy.address}</p> : null}
              <div className="mt-4 h-72 w-full">
                <MapView center={{ lat: pharmacy.latitude, lng: pharmacy.longitude }} zoom={15}
                  markers={[{ id: pharmacy.id, lat: pharmacy.latitude, lng: pharmacy.longitude, title: pharmacy.name }]} />
              </div>
            </section>
          ) : (
            <EmptyState icon={MapPin} title="Localisation non renseignée" description="Cette pharmacie n'a pas encore fourni ses coordonnées GPS." />
          )}
        </TabsContent>

        <TabsContent value="reviews" className="pt-6">
          {reviews.length ? (
            <ul className="space-y-3">
              {reviews.map((r) => (
                <li key={r.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-semibold">{r.rating}/5</span>
                    <span className="ml-auto text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("fr-FR")}</span>
                  </div>
                  {r.comment ? <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Star} title="Aucun avis pour le moment" description="Soyez le premier à partager votre expérience." />
          )}
        </TabsContent>
      </Tabs>

      {pharmacy.phone ? (
        <StickyMobileCTA>
          <Button asChild size="lg" className="gap-2"><a href={`tel:${pharmacy.phone}`}><Phone className="h-4 w-4" /> Appeler</a></Button>
          {wa ? (
            <Button asChild size="lg" variant="outline" className="gap-2"><a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> WhatsApp</a></Button>
          ) : null}
        </StickyMobileCTA>
      ) : null}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function PharmacyProductCard({ product }: { product: ProductWithPharmacy }) {
  const images = Array.isArray(product.images) ? (product.images as string[]) : [];
  const [thumb, setThumb] = useState<string | null>(null);
  const { addItem, isAdding } = useCart();
  useEffect(() => { if (images[0]) signProductImage(images[0]).then(setThumb); }, [images]);
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition hover:shadow-lg">
      <Link to="/products/$id" params={{ id: product.id }} className="block">
        <div className="grid aspect-square w-full place-items-center overflow-hidden bg-muted">
          {thumb ? <img src={thumb} alt={product.name} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" /> : <ImageIcon className="h-8 w-8 text-muted-foreground" />}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <Link to="/products/$id" params={{ id: product.id }} className="line-clamp-2 text-sm font-bold hover:underline">{product.name}</Link>
        {product.brand ? <p className="text-xs text-muted-foreground">{product.brand}</p> : null}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <p className="text-sm font-bold text-primary">{formatMad(product.price_mad)}</p>
          <Button size="sm" className="h-8 gap-1 rounded-full" disabled={isAdding || product.stock <= 0} onClick={() => addItem({ product })}>
            <Plus className="h-3.5 w-3.5" /> Ajouter
          </Button>
        </div>
        {product.stock <= 0 ? <p className="text-[11px] text-destructive">Rupture</p> : null}
      </div>
    </article>
  );
}

function PharmacyProfileSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-80 w-full rounded-3xl" />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    </div>
  );
}