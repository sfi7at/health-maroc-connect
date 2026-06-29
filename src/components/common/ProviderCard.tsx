import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { MapPin, Phone, Star, BadgeCheck, Heart, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES } from "@/lib/categories";
import type { ProviderRow } from "@/lib/queries";
import { formatDistanceKm, initialsOf } from "@/lib/format";

interface ProviderCardProps {
  provider: ProviderRow;
  distanceKm?: number | null;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

export function ProviderCard({
  provider,
  distanceKm,
  isFavorite,
  onToggleFavorite,
}: ProviderCardProps) {
  const meta = CATEGORIES[provider.category];
  const Icon = meta.icon;
  const cityName = provider.cities?.name_fr ?? null;

  return (
    <motion.article
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-soft transition-shadow hover:shadow-elevated"
    >
      <div className={`relative h-32 bg-gradient-to-br ${meta.gradient}`}>
        {provider.cover_image ? (
          <img
            src={provider.cover_image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-90"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        <div className="absolute left-4 top-4 flex gap-2">
          {provider.is_verified ? (
            <Badge className="border-0 bg-white/90 text-foreground shadow-soft">
              <BadgeCheck className="mr-1 h-3.5 w-3.5 text-primary" /> Vérifié
            </Badge>
          ) : null}
          {provider.is_premium ? (
            <Badge className="border-0 bg-amber-400/95 text-amber-950 shadow-soft">Premium</Badge>
          ) : null}
        </div>
        {onToggleFavorite ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onToggleFavorite(provider.id);
            }}
            aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-foreground shadow-soft transition hover:bg-white"
          >
            <Heart className={`h-4 w-4 ${isFavorite ? "fill-blood text-blood" : ""}`} />
          </button>
        ) : null}
        <div className="absolute -bottom-6 left-4 grid h-14 w-14 place-items-center rounded-2xl bg-white text-foreground shadow-elevated ring-1 ring-black/5">
          {provider.profile_image ? (
            <img
              src={provider.profile_image}
              alt=""
              className="h-full w-full rounded-2xl object-cover"
            />
          ) : (
            <span className="text-sm font-semibold">{initialsOf(provider.name)}</span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5 pt-8">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Icon className="h-3.5 w-3.5" /> {meta.label}
          </div>
          <h3 className="mt-1 truncate text-base font-semibold leading-tight">{provider.name}</h3>
          {provider.description ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {provider.description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {provider.average_rating > 0 ? (
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {provider.average_rating.toFixed(1)}
              <span className="text-muted-foreground">({provider.reviews_count})</span>
            </span>
          ) : null}
          {cityName ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {cityName}
            </span>
          ) : null}
          {distanceKm != null ? (
            <span className="inline-flex items-center gap-1">
              <Navigation className="h-3.5 w-3.5" /> {formatDistanceKm(distanceKm)}
            </span>
          ) : null}
        </div>

        <div className="mt-auto flex items-center gap-2 pt-2">
          <Button asChild size="sm" className="flex-1">
            <Link to="/providers/$id" params={{ id: provider.id }}>
              Voir détails
            </Link>
          </Button>
          {provider.phone ? (
            <Button asChild size="sm" variant="outline" aria-label="Appeler" className="px-3">
              <a href={`tel:${provider.phone}`}>
                <Phone className="h-4 w-4" />
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
}