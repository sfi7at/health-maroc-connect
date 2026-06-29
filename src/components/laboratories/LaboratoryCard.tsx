import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Clock,
  FlaskConical,
  Heart,
  MapPin,
  Navigation,
  Phone,
  Siren,
  Star,
  Truck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceKm, initialsOf } from "@/lib/format";
import { OPEN_STATUS_META, type OpenStatus } from "@/lib/map-utils";
import { readLabMeta, type LabRow } from "@/lib/laboratories";

interface LaboratoryCardProps {
  laboratory: LabRow;
  distanceKm?: number | null;
  openStatus?: OpenStatus;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

export function LaboratoryCard({
  laboratory,
  distanceKm,
  openStatus,
  isFavorite,
  onToggleFavorite,
}: LaboratoryCardProps) {
  const meta = readLabMeta(laboratory);
  const city = laboratory.cities?.name_fr ?? meta.neighborhood ?? null;
  const status = openStatus ?? "unknown";
  const statusMeta = OPEN_STATUS_META[status];

  return (
    <motion.article
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-soft transition-shadow hover:shadow-elevated"
    >
      <div className="relative h-32 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500">
        {laboratory.cover_image ? (
          <img
            src={laboratory.cover_image}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-90"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {laboratory.is_verified ? (
            <Badge className="border-0 bg-white/95 text-foreground shadow-soft">
              <BadgeCheck className="mr-1 h-3.5 w-3.5 text-primary" /> Vérifié
            </Badge>
          ) : null}
          {laboratory.is_premium ? (
            <Badge className="border-0 bg-amber-400/95 text-amber-950 shadow-soft">Premium</Badge>
          ) : null}
          {meta.home_sampling || meta.home_pcr ? (
            <Badge className="border-0 bg-sky-600 text-white shadow-soft">
              <Truck className="mr-1 h-3.5 w-3.5" /> Prélèvement à domicile
            </Badge>
          ) : null}
          {meta.emergency ? (
            <Badge className="border-0 bg-red-600 text-white shadow-soft">
              <Siren className="mr-1 h-3.5 w-3.5" /> Urgences
            </Badge>
          ) : null}
        </div>

        {onToggleFavorite ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onToggleFavorite(laboratory.id);
            }}
            aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-foreground shadow-soft transition hover:scale-105"
          >
            <Heart className={`h-4 w-4 ${isFavorite ? "fill-rose-500 text-rose-500" : ""}`} />
          </button>
        ) : null}

        <div className="absolute -bottom-6 left-4 grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-white text-amber-600 shadow-elevated ring-1 ring-black/5">
          {laboratory.profile_image ? (
            <img src={laboratory.profile_image} alt="" className="h-full w-full object-cover" />
          ) : (
            <FlaskConical className="h-6 w-6" />
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5 pt-8">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-amber-600">
              <FlaskConical className="h-3.5 w-3.5" /> Laboratoire
            </span>
            {status !== "unknown" ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusMeta.tint}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
                {statusMeta.label}
              </span>
            ) : null}
          </div>
          <h3 className="mt-1 truncate text-base font-semibold leading-tight">
            {initialsOf(laboratory.name) ? laboratory.name : "Laboratoire"}
          </h3>
          {laboratory.address ? (
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{laboratory.address}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {laboratory.average_rating > 0 ? (
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {laboratory.average_rating.toFixed(1)}
              <span className="text-muted-foreground">({laboratory.reviews_count})</span>
            </span>
          ) : null}
          {city ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {city}
            </span>
          ) : null}
          {distanceKm != null ? (
            <span className="inline-flex items-center gap-1">
              <Navigation className="h-3.5 w-3.5" /> {formatDistanceKm(distanceKm)}
            </span>
          ) : null}
          {status === "unknown" && laboratory.working_hours ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Horaires sur la fiche
            </span>
          ) : null}
        </div>

        <div className="mt-auto flex items-center gap-2 pt-2">
          <Button asChild size="sm" className="flex-1">
            <Link to="/providers/$id" params={{ id: laboratory.id }}>
              Voir le laboratoire
            </Link>
          </Button>
          {laboratory.phone ? (
            <Button asChild size="sm" variant="outline" className="px-3" aria-label="Appeler">
              <a href={`tel:${laboratory.phone}`}>
                <Phone className="h-4 w-4" />
              </a>
            </Button>
          ) : null}
          {laboratory.latitude && laboratory.longitude ? (
            <Button asChild size="sm" variant="outline" className="px-3" aria-label="Itinéraire">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${laboratory.latitude},${laboratory.longitude}`}
                target="_blank"
                rel="noreferrer"
              >
                <Navigation className="h-4 w-4" />
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
}