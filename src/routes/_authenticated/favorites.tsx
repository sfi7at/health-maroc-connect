import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ProviderCard } from "@/components/common/ProviderCard";
import { useAuth } from "@/hooks/use-auth";
import { favoritesQuery, type ProviderRow } from "@/lib/queries";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/favorites")({
  head: () =>
    buildHead({
      title: "Mes favoris — HealthLink Maroc",
      description: "Vos médecins, pharmacies et établissements de santé favoris.",
      path: "/favorites",
    }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { user } = useAuth();
  const { data = [], isLoading } = useQuery(favoritesQuery(user?.id));
  const providers = data
    .map((f) => f.providers as ProviderRow | null)
    .filter((p): p is ProviderRow => !!p);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Votre sélection"
        title="Favoris"
        description="Retrouvez en un clic les prestataires que vous avez sauvegardés."
        icon={<Star className="h-5 w-5" />}
      />

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-3xl" />
          ))}
        </div>
      ) : providers.length === 0 ? (
        <EmptyState
          icon={Star}
          title="Pas encore de favoris"
          description="Touchez le cœur sur la fiche d'un prestataire pour l'ajouter ici."
          action={
            <Button asChild>
              <Link to="/doctors">Explorer les médecins</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((p) => (
            <ProviderCard key={p.id} provider={p} isFavorite />
          ))}
        </div>
      )}
    </div>
  );
}