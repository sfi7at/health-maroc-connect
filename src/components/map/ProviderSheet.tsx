import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  Heart,
  MapPin,
  Navigation,
  Phone,
  Share2,
  Star,
  X,
  Car,
  Footprints,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES } from "@/lib/categories";
import type { ProviderRow } from "@/lib/queries";
import {
  buildDirectionsUrl,
  CATEGORY_COLORS,
  getOpenStatus,
  OPEN_STATUS_META,
} from "@/lib/map-utils";
import { formatDistanceKm, haversineKm, initialsOf } from "@/lib/format";
import { isBookable, directionsUrl as providerDirectionsUrl, doctorPathId } from "@/lib/doctors";

interface Props {
  provider: ProviderRow | null;
  userPosition?: { lat: number; lng: number } | null;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  onClose: () => void;
}

export function ProviderSheet({
  provider,
  userPosition,
  isFavorite,
  onToggleFavorite,
  onClose,
}: Props) {
  return (
    <AnimatePresence>
      {provider ? <Sheet
        key={provider.id}
        provider={provider}
        userPosition={userPosition}
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
        onClose={onClose}
      /> : null}
    </AnimatePresence>
  );
}

function Sheet({ provider, userPosition, isFavorite, onToggleFavorite, onClose }: Required<Pick<Props, "onClose">> & Props) {
  const meta = CATEGORIES[provider!.category];
  const color = CATEGORY_COLORS[provider!.category];
  const status = getOpenStatus(provider!.working_hours);
  const statusMeta = OPEN_STATUS_META[status];
  const distance =
    userPosition && provider!.latitude != null && provider!.longitude != null
      ? haversineKm(userPosition, { lat: provider!.latitude, lng: provider!.longitude })
      : null;
  const bookable = isBookable(provider as never);
  const isDoctorLike = provider!.category === "doctor" || provider!.category === "dentist";
  const isPharmacy = provider!.category === "pharmacy";
  const providerSlug = (provider as unknown as { slug?: string | null }).slug ?? null;
  const profileTo = isDoctorLike ? "/doctors/$id" : isPharmacy ? "/pharmacy/$slug" : "/providers/$id";
  const profileParams = isDoctorLike
    ? { id: doctorPathId(provider as never) }
    : isPharmacy
      ? { slug: providerSlug ?? provider!.id }
      : { id: provider!.id };
  const directions = providerDirectionsUrl(provider as never);

  async function share() {
    const url = typeof window !== "undefined" ? `${window.location.origin}/providers/${provider!.id}` : "";
    if (navigator.share) {
      try {
        await navigator.share({ title: provider!.name, url });
        return;
      } catch {
        /* user cancelled */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
  }

  return (
    <motion.aside
      initial={{ y: "100%", opacity: 0.9 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0.9 }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      className="pointer-events-auto absolute inset-x-2 bottom-2 z-[1100] overflow-hidden rounded-3xl border border-border bg-card shadow-elevated sm:inset-x-auto sm:bottom-4 sm:left-4 sm:max-w-sm"
      role="dialog"
      aria-label={`Fiche ${provider!.name}`}
    >
      <div className="relative h-28" style={{ background: color }}>
        {provider!.cover_image ? (
          <img
            src={provider!.cover_image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-80"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/95 text-foreground shadow-soft hover:bg-white"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="absolute left-4 top-4 flex gap-2">
          {provider!.is_verified ? (
            <Badge className="border-0 bg-white/90 text-foreground">
              <BadgeCheck className="mr-1 h-3.5 w-3.5 text-primary" /> Vérifié
            </Badge>
          ) : null}
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${statusMeta.tint}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} /> {statusMeta.label}
          </span>
        </div>
        <div className="absolute -bottom-6 left-4 grid h-14 w-14 place-items-center rounded-2xl bg-white text-foreground shadow-elevated ring-1 ring-black/5">
          {provider!.profile_image ? (
            <img src={provider!.profile_image} alt="" className="h-full w-full rounded-2xl object-cover" />
          ) : (
            <span className="text-sm font-semibold">{initialsOf(provider!.name)}</span>
          )}
        </div>
      </div>

      <div className="space-y-3 p-4 pt-8">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{meta.label}</p>
            <h3 className="truncate text-base font-semibold">{provider!.name}</h3>
            {provider!.address ? (
              <p className="mt-0.5 flex items-start gap-1 truncate text-xs text-muted-foreground">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                <span className="truncate">{provider!.address}</span>
              </p>
            ) : null}
          </div>
          <div className="text-right">
            {provider!.average_rating ? (
              <p className="flex items-center justify-end gap-1 text-sm font-medium">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                {Number(provider!.average_rating).toFixed(1)}
              </p>
            ) : null}
            {distance != null ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{formatDistanceKm(distance)}</p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {provider!.phone ? (
            <Action href={`tel:${provider!.phone}`} icon={<Phone className="h-4 w-4" />} label="Appeler" />
          ) : null}
          {provider!.latitude && provider!.longitude ? (
            <>
              <Action
                href={buildDirectionsUrl({ lat: provider!.latitude, lng: provider!.longitude }, userPosition, "driving")}
                icon={<Car className="h-4 w-4" />}
                label="Voiture"
                external
              />
              <Action
                href={buildDirectionsUrl({ lat: provider!.latitude, lng: provider!.longitude }, userPosition, "walking")}
                icon={<Footprints className="h-4 w-4" />}
                label="À pied"
                external
              />
            </>
          ) : null}
          <button
            onClick={share}
            className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card p-2 text-[11px] font-medium hover:bg-muted"
            aria-label="Partager"
          >
            <Share2 className="h-4 w-4" />
            Partager
          </button>
        </div>

        <div className="flex items-center gap-2">
          {bookable ? (
            <Button asChild className="flex-1" size="sm">
              <Link to="/appointments/new/$providerId" params={{ providerId: provider!.id }}>
                Réserver <Navigation className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : isDoctorLike ? (
            <Button asChild className="flex-1" size="sm">
              <a href={directions} target="_blank" rel="noreferrer noopener">
                Itinéraire <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </a>
            </Button>
          ) : (
            <Button asChild className="flex-1" size="sm">
              <Link to={profileTo} params={profileParams as never}>
                Voir la fiche <Navigation className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link to={profileTo} params={profileParams as never}>Fiche</Link>
          </Button>
          {onToggleFavorite ? (
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => onToggleFavorite(provider!.id)}
              aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? "fill-rose-500 text-rose-500" : ""}`} />
            </Button>
          ) : null}
        </div>
      </div>
    </motion.aside>
  );
}

function Action({
  href,
  icon,
  label,
  external,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer noopener" : undefined}
      className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card p-2 text-[11px] font-medium hover:bg-muted"
    >
      <span className="relative">
        {icon}
        {external ? <ExternalLink className="absolute -right-2 -top-1 h-2.5 w-2.5 text-muted-foreground" /> : null}
      </span>
      {label}
    </a>
  );
}