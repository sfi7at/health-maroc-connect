import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  MapPin, Phone, Star, BadgeCheck, Heart, Navigation, CalendarPlus, Clock,
  Stethoscope, Crown, Languages as LangIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  readDoctorMeta, priceLabel, languageLabel, type DoctorRow,
  isBookable, doctorPathId,
} from "@/lib/doctors";
import { formatDistanceKm, initialsOf } from "@/lib/format";
import { getOpenStatus, OPEN_STATUS_META, buildDirectionsUrl } from "@/lib/map-utils";
import { useFavorites } from "@/hooks/use-favorites";

interface Props {
  doctor: DoctorRow;
  distanceKm?: number | null;
  compact?: boolean;
}

export function DoctorCard({ doctor, distanceKm, compact }: Props) {
  const meta = readDoctorMeta(doctor);
  const open = getOpenStatus(doctor.working_hours);
  const openMeta = OPEN_STATUS_META[open];
  const specialties = (doctor.provider_specialties ?? [])
    .map((s) => s.specialties?.name_fr)
    .filter(Boolean) as string[];
  const fav = useFavorites();
  const isFav = fav.isFavorite(doctor.id);
  const price = priceLabel(meta);
  const langs = (meta.languages ?? []).slice(0, 3);
  const bookable = isBookable(doctor);
  const routeId = doctorPathId(doctor);

  return (
    <motion.article
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-soft transition-shadow hover:shadow-elevated"
    >
      <div className="relative h-28 bg-gradient-to-br from-emerald-500 to-teal-600">
        {doctor.cover_image ? (
          <img src={doctor.cover_image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {doctor.is_premium ? (
            <Badge className="gap-1 border-0 bg-amber-400/95 text-amber-950 shadow-soft">
              <Crown className="h-3 w-3" /> Premium
            </Badge>
          ) : null}
          {doctor.is_verified ? (
            <Badge className="gap-1 border-0 bg-white/95 text-foreground shadow-soft">
              <BadgeCheck className="h-3.5 w-3.5 text-primary" /> Vérifié
            </Badge>
          ) : null}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            fav.toggle(doctor.id);
          }}
          aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-foreground shadow-soft transition hover:bg-white"
        >
          <Heart className={`h-4 w-4 ${isFav ? "fill-blood text-blood" : ""}`} />
        </button>
        <div className="absolute -bottom-7 left-4 grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-white text-foreground shadow-elevated ring-1 ring-black/5">
          {doctor.profile_image ? (
            <img src={doctor.profile_image} alt={doctor.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-base font-semibold">{initialsOf(doctor.name)}</span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5 pt-9">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Stethoscope className="h-3.5 w-3.5" />
            {specialties[0] ?? (doctor.category === "dentist" ? "Dentiste" : "Médecin")}
          </div>
          <h3 className="mt-1 truncate text-base font-semibold leading-tight">
            {meta.title ? `${meta.title} ` : "Dr. "}{doctor.name}
          </h3>
          {specialties.length > 1 ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {specialties.slice(1).join(" · ")}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {doctor.average_rating > 0 ? (
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {doctor.average_rating.toFixed(1)}
              <span className="text-muted-foreground">({doctor.reviews_count})</span>
            </span>
          ) : null}
          {meta.experience_years ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {meta.experience_years} ans d'exp.
            </span>
          ) : null}
          {doctor.cities?.name_fr ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {meta.neighborhood ? `${meta.neighborhood}, ${doctor.cities.name_fr}` : doctor.cities.name_fr}
            </span>
          ) : null}
          {distanceKm != null ? (
            <span className="inline-flex items-center gap-1">
              <Navigation className="h-3.5 w-3.5" /> {formatDistanceKm(distanceKm)}
            </span>
          ) : null}
        </div>

        {!compact && (langs.length || price) ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {langs.length ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <LangIcon className="h-3.5 w-3.5" />
                {langs.map(languageLabel).join(" · ")}
              </span>
            ) : null}
            {price ? (
              <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 font-semibold text-primary">
                {price}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center gap-2 pt-1">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${openMeta.tint}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${openMeta.dot}`} /> {openMeta.label}
          </span>
        </div>

        <div className="mt-auto flex items-center gap-2 pt-2">
          {bookable ? (
            <Button asChild size="sm" className="flex-1">
              <Link
                to="/appointments/new/$providerId"
                params={{ providerId: doctor.id }}
              >
                <CalendarPlus className="mr-1.5 h-4 w-4" /> Réserver
              </Link>
            </Button>
          ) : doctor.latitude != null && doctor.longitude != null ? (
            <Button asChild size="sm" className="flex-1">
              <a
                href={buildDirectionsUrl({ lat: Number(doctor.latitude), lng: Number(doctor.longitude) })}
                target="_blank"
                rel="noreferrer"
              >
                <Navigation className="mr-1.5 h-4 w-4" /> Itinéraire
              </a>
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline" className="flex-1">
              <Link to="/doctors/$id" params={{ id: routeId }}>Voir la fiche</Link>
            </Button>
          )}
          {doctor.phone ? (
            <Button asChild size="sm" variant="outline" aria-label="Appeler" className="px-3">
              <a href={`tel:${doctor.phone}`}><Phone className="h-4 w-4" /></a>
            </Button>
          ) : null}
          {bookable && doctor.latitude != null && doctor.longitude != null ? (
            <Button asChild size="sm" variant="outline" aria-label="Itinéraire" className="px-3">
              <a href={buildDirectionsUrl({ lat: Number(doctor.latitude), lng: Number(doctor.longitude) })} target="_blank" rel="noreferrer">
                <Navigation className="h-4 w-4" />
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
}