import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Building2,
  Clock,
  Heart,
  Hospital,
  MapPin,
  Navigation,
  Phone,
  Siren,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceKm } from "@/lib/format";
import { OPEN_STATUS_META, type OpenStatus } from "@/lib/map-utils";
import { readHospitalMeta, type HospitalRow } from "@/lib/hospitals";

interface HospitalCardProps {
  hospital: HospitalRow;
  distanceKm?: number | null;
  openStatus?: OpenStatus;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

export function HospitalCard({
  hospital,
  distanceKm,
  openStatus,
  isFavorite,
  onToggleFavorite,
}: HospitalCardProps) {
  const meta = readHospitalMeta(hospital);
  const isClinic = hospital.category === "clinic";
  const city = hospital.cities?.name_fr ?? meta.neighborhood ?? null;
  const status = openStatus ?? "unknown";
  const statusMeta = OPEN_STATUS_META[status];
  const open24h = meta.open_24h;

  return (
    <motion.article
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-soft transition-shadow hover:shadow-elevated"
    >
      <div
        className={`relative h-32 bg-gradient-to-br ${
          isClinic
            ? "from-pink-500 via-fuchsia-500 to-rose-500"
            : "from-sky-500 via-cyan-500 to-blue-600"
        }`}
      >
        {hospital.cover_image ? (
          <img
            src={hospital.cover_image}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-90"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {hospital.is_verified ? (
            <Badge className="border-0 bg-white/95 text-foreground shadow-soft">
              <BadgeCheck className="mr-1 h-3.5 w-3.5 text-primary" /> Vérifié
            </Badge>
          ) : null}
          {hospital.is_premium ? (
            <Badge className="border-0 bg-amber-400/95 text-amber-950 shadow-soft">Premium</Badge>
          ) : null}
          {meta.emergency ? (
            <Badge className="border-0 bg-red-600 text-white shadow-soft">
              <Siren className="mr-1 h-3.5 w-3.5" /> Urgences
            </Badge>
          ) : null}
          {open24h ? (
            <Badge className="border-0 bg-emerald-600 text-white shadow-soft">24/7</Badge>
          ) : null}
        </div>

        {onToggleFavorite ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onToggleFavorite(hospital.id);
            }}
            aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-foreground shadow-soft transition hover:scale-105"
          >
            <Heart className={`h-4 w-4 ${isFavorite ? "fill-rose-500 text-rose-500" : ""}`} />
          </button>
        ) : null}

        <div className="absolute -bottom-6 left-4 grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-white text-sky-600 shadow-elevated ring-1 ring-black/5">
          {hospital.profile_image ?? meta.logo ? (
            <img
              src={hospital.profile_image ?? meta.logo}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : isClinic ? (
            <Building2 className="h-6 w-6" />
          ) : (
            <Hospital className="h-6 w-6" />
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5 pt-8">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider ${
                isClinic ? "text-fuchsia-600" : "text-sky-600"
              }`}
            >
              {isClinic ? (
                <Building2 className="h-3.5 w-3.5" />
              ) : (
                <Hospital className="h-3.5 w-3.5" />
              )}
              {isClinic ? "Clinique" : "Hôpital"}
              {meta.type ? ` · ${typeLabel(meta.type)}` : ""}
            </span>
            {status !== "unknown" || open24h ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  open24h ? "bg-emerald-500/15 text-emerald-600" : statusMeta.tint
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    open24h ? "bg-emerald-500" : statusMeta.dot
                  }`}
                />
                {open24h ? "Ouvert 24/7" : statusMeta.label}
              </span>
            ) : null}
          </div>
          <h3 className="mt-1 truncate text-base font-semibold leading-tight">{hospital.name}</h3>
          {hospital.address ? (
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{hospital.address}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {hospital.average_rating > 0 ? (
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {hospital.average_rating.toFixed(1)}
              <span className="text-muted-foreground">({hospital.reviews_count})</span>
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
          {status === "unknown" && !open24h && hospital.working_hours ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Horaires sur la fiche
            </span>
          ) : null}
        </div>

        <div className="mt-auto flex items-center gap-2 pt-2">
          <Button asChild size="sm" className="flex-1">
            <Link to="/providers/$id" params={{ id: hospital.id }}>
              Voir l'établissement
            </Link>
          </Button>
          {hospital.phone ? (
            <Button asChild size="sm" variant="outline" className="px-3" aria-label="Appeler">
              <a href={`tel:${hospital.phone}`}>
                <Phone className="h-4 w-4" />
              </a>
            </Button>
          ) : null}
          {hospital.latitude && hospital.longitude ? (
            <Button asChild size="sm" variant="outline" className="px-3" aria-label="Itinéraire">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${hospital.latitude},${hospital.longitude}`}
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

function typeLabel(t: NonNullable<ReturnType<typeof readHospitalMeta>["type"]>): string {
  switch (t) {
    case "public":
      return "Public";
    case "private":
      return "Privé";
    case "university":
      return "CHU";
    case "military":
      return "Militaire";
  }
}