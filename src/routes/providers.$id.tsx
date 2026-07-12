import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarPlus,
  Globe,
  Heart,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Share2,
  Star,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapView } from "@/components/common/MapView";
import { CATEGORIES } from "@/lib/categories";
import { providerByIdQuery } from "@/lib/queries";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { buildHead } from "@/lib/seo";
import { initialsOf } from "@/lib/format";
import { PageHero } from "@/components/layout/PageHero";
import { ActionBar } from "@/components/layout/ActionBar";
import { StickyMobileCTA } from "@/components/layout/StickyMobileCTA";

export const Route = createFileRoute("/providers/$id")({
  head: ({ params }) =>
    buildHead({
      title: "Détails du prestataire — HealthLink Maroc",
      description: "Coordonnées, services et avis vérifiés.",
      path: `/providers/${params.id}`,
    }),
  component: ProviderDetailPage,
  notFoundComponent: () => (
    <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
      <h2 className="text-xl font-semibold">Prestataire introuvable</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Ce profil n'existe plus ou a été désactivé.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Retour à l'accueil</Link>
      </Button>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
      <h2 className="text-xl font-semibold">Une erreur est survenue</h2>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
});

function ProviderDetailPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: provider, isLoading } = useQuery(providerByIdQuery(id));

  const { data: favorited } = useQuery({
    queryKey: ["favorite", id, user?.id ?? "anon"],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("favorites")
        .select("provider_id")
        .eq("user_id", user!.id)
        .eq("provider_id", id)
        .maybeSingle();
      return !!data;
    },
  });

  const toggleFav = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Connectez-vous pour ajouter aux favoris.");
      if (favorited) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("provider_id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ user_id: user.id, provider_id: id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorite", id] });
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      toast.success(favorited ? "Retiré des favoris" : "Ajouté à vos favoris");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <ProviderDetailSkeleton />;
  if (!provider) throw notFound();

  const meta = CATEGORIES[provider.category];
  const Icon = meta.icon;
  const specialties = (provider.provider_specialties ?? [])
    .map((ps: { specialties: { name_fr: string } | null }) => ps.specialties?.name_fr)
    .filter(Boolean) as string[];

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: provider.name, url: shareUrl });
      } catch {
        /* user cancelled */
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Lien copié dans le presse-papiers");
    }
  };

  const wa = provider.phone ? provider.phone.replace(/[^0-9]/g, "") : null;

  return (
    <div className="space-y-8 pb-24 lg:pb-0">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Retour
      </Link>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <PageHero
          coverGradientClass={`bg-gradient-to-br ${meta.gradient}`}
          cover={
            provider.cover_image ? (
              <img src={provider.cover_image} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : null
          }
          avatar={
            <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-3xl bg-white text-foreground shadow-elevated ring-1 ring-black/5 sm:h-28 sm:w-28">
              {provider.profile_image ? (
                <img src={provider.profile_image} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xl font-bold sm:text-2xl">{initialsOf(provider.name)}</span>
              )}
            </div>
          }
          badges={
            <>
              <Badge variant="secondary" className="gap-1">
                <Icon className="h-3.5 w-3.5" /> {meta.label}
              </Badge>
              {provider.is_verified ? (
                <Badge className="gap-1 border-0 bg-primary/10 text-primary">
                  <BadgeCheck className="h-3.5 w-3.5" /> Vérifié
                </Badge>
              ) : null}
              {provider.is_premium ? (
                <Badge className="border-0 bg-amber-400 text-amber-950">Premium</Badge>
              ) : null}
            </>
          }
          title={<span className="block truncate">{provider.name}</span>}
          meta={
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {provider.average_rating > 0 ? (
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {provider.average_rating.toFixed(1)}
                  <span className="text-muted-foreground">({provider.reviews_count} avis)</span>
                </span>
              ) : null}
              {provider.cities?.name_fr ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {provider.cities.name_fr}
                </span>
              ) : null}
            </div>
          }
          actions={
            <ActionBar
              primary={
                provider.phone ? (
                  <Button asChild size="lg" className="gap-2">
                    <a href={`tel:${provider.phone}`}>
                      <Phone className="h-4 w-4" /> Appeler
                    </a>
                  </Button>
                ) : null
              }
              secondary={
                <Button
                  onClick={() => toggleFav.mutate()}
                  variant={favorited ? "default" : "outline"}
                  size="lg"
                  className="gap-2"
                  disabled={toggleFav.isPending}
                >
                  <Heart className={`h-4 w-4 ${favorited ? "fill-current" : ""}`} />
                  {favorited ? "Favori" : "Favoris"}
                </Button>
              }
              icons={
                <Button
                  variant="outline"
                  size="lg"
                  className="min-h-11 min-w-11 px-3"
                  onClick={handleShare}
                  aria-label="Partager"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              }
            />
          }
        />
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {provider.description ? (
            <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <h2 className="text-lg font-semibold">À propos</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {provider.description}
              </p>
            </section>
          ) : null}

          {specialties.length > 0 ? (
            <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <h2 className="text-lg font-semibold">Spécialités</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {specialties.map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs">
                    {s}
                  </Badge>
                ))}
              </div>
            </section>
          ) : null}

          {provider.latitude && provider.longitude ? (
            <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
              <div className="flex items-center justify-between px-6 pt-6">
                <h2 className="text-lg font-semibold">Localisation</h2>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${provider.latitude},${provider.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary"
                >
                  <Navigation className="h-3.5 w-3.5" /> Itinéraire
                </a>
              </div>
              {provider.address ? (
                <p className="px-6 pt-1 text-sm text-muted-foreground">{provider.address}</p>
              ) : null}
              <div className="mt-4 h-72 w-full">
                <MapView
                  center={{ lat: provider.latitude, lng: provider.longitude }}
                  zoom={15}
                  markers={[
                    {
                      id: provider.id,
                      lat: provider.latitude,
                      lng: provider.longitude,
                      title: provider.name,
                    },
                  ]}
                />
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Contact
            </h3>
            <div className="mt-3 space-y-2">
              {provider.phone ? (
                <Button asChild className="w-full justify-start gap-2">
                  <a href={`tel:${provider.phone}`}>
                    <Phone className="h-4 w-4" /> {provider.phone}
                  </a>
                </Button>
              ) : null}
              {wa ? (
                <Button asChild variant="outline" className="w-full justify-start gap-2">
                  <a
                    href={`https://wa.me/${wa}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                </Button>
              ) : null}
              {provider.website ? (
                <Button asChild variant="outline" className="w-full justify-start gap-2">
                  <a href={provider.website} target="_blank" rel="noreferrer">
                    <Globe className="h-4 w-4" /> Site web
                  </a>
                </Button>
              ) : null}
              {provider.category === "doctor" || provider.category === "dentist" ? (
                <Button asChild variant="secondary" className="w-full justify-start gap-2">
                  <Link to="/appointments">
                    <CalendarPlus className="h-4 w-4" /> Prendre rendez-vous
                  </Link>
                </Button>
              ) : null}
            </div>
          </section>

          {provider.working_hours &&
          typeof provider.working_hours === "object" &&
          Object.keys(provider.working_hours).length > 0 ? (
            <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Horaires
              </h3>
              <ul className="mt-3 space-y-1.5 text-sm">
                {Object.entries(provider.working_hours as Record<string, string>).map(([k, v]) => (
                  <li key={k} className="flex justify-between">
                    <span className="capitalize text-muted-foreground">{k}</span>
                    <span className="font-medium">{v}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>

      {provider.phone ? (
        <StickyMobileCTA>
          <Button asChild size="lg" className="gap-2">
            <a href={`tel:${provider.phone}`}>
              <Phone className="h-4 w-4" /> Appeler
            </a>
          </Button>
          {wa ? (
            <Button asChild size="lg" variant="outline" className="gap-2">
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </Button>
          ) : null}
        </StickyMobileCTA>
      ) : null}
    </div>
  );
}

function ProviderDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-80 w-full rounded-3xl" />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    </div>
  );
}