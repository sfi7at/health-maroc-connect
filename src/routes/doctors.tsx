import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Stethoscope, Sparkles, ArrowRight, Star, Crown, Award, ChevronRight, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DoctorCard } from "@/components/doctors/DoctorCard";
import { SpecialtyCard } from "@/components/doctors/SpecialtyCard";
import { DoctorSearchBar } from "@/components/doctors/DoctorSearchBar";
import { EmptyState } from "@/components/common/EmptyState";
import { doctorsQuery, specialtiesQuery } from "@/lib/doctors";
import { haversineKm } from "@/lib/format";
import { useGeolocation } from "@/hooks/use-geolocation";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/doctors")({
  head: () =>
    buildHead({
      title: "Médecins au Maroc — Trouvez un spécialiste vérifié",
      description:
        "Annuaire premium de médecins, dentistes et spécialistes au Maroc. Recherche par spécialité, ville, langue, assurance. Prise de rendez-vous en ligne.",
      path: "/doctors",
    }),
  component: DoctorsHome,
});

function DoctorsHome() {
  const { position } = useGeolocation();
  const { data: specs = [], isLoading: specsLoading } = useQuery(specialtiesQuery());
  const { data: doctors = [], isLoading } = useQuery(doctorsQuery({ sort: "relevance" }));

  const featured = useMemo(
    () => doctors.filter((d) => d.is_premium).slice(0, 6),
    [doctors],
  );
  const verifiedOnly = useMemo(
    () => doctors.filter((d) => d.is_verified && !d.is_premium),
    [doctors],
  );
  const topRated = useMemo(
    () => [...doctors].sort((a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0)).slice(0, 6),
    [doctors],
  );
  const recent = useMemo(
    () => [...doctors].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 6),
    [doctors],
  );
  const nearby = useMemo(() => {
    if (!position) return [];
    return doctors
      .filter((d) => d.latitude != null && d.longitude != null)
      .map((d) => ({
        d,
        km: haversineKm(position, { lat: Number(d.latitude), lng: Number(d.longitude) }),
      }))
      .sort((a, b) => a.km - b.km)
      .slice(0, 6);
  }, [doctors, position]);

  return (
    <div className="space-y-12">
      {/* HERO */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-emerald-500/10 via-card to-teal-500/10 p-6 shadow-soft sm:p-10"
      >
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl" aria-hidden />
        <div className="absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-teal-500/10 blur-3xl" aria-hidden />
        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Annuaire médical vérifié
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Trouvez le bon médecin, partout au Maroc.
          </h1>
          <p className="mt-3 max-w-xl text-base text-muted-foreground sm:text-lg">
            Plus de spécialités, des profils vérifiés, des avis authentiques.
            Réservez en quelques secondes.
          </p>
          <div className="mt-6">
            <DoctorSearchBar className="max-w-2xl" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {["Cardiologue", "Dentiste", "Gynécologue", "Pédiatre", "Dermatologue"].map((t) => (
              <Link
                key={t}
                to="/doctors/search"
                search={{ q: t }}
                className="rounded-full border border-border bg-card px-3 py-1.5 font-medium text-muted-foreground transition hover:bg-muted"
              >{t}</Link>
            ))}
          </div>
        </div>
      </motion.section>

      {/* SPECIALTIES */}
      <SectionHeader
        eyebrow="Catégories"
        title="Spécialités médicales"
        action={<Link to="/doctors/specialties" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">Tout voir <ChevronRight className="h-4 w-4" /></Link>}
      />
      {specsLoading ? (
        <RowSkeleton h="h-32" cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {specs.slice(0, 10).map((s) => (
            <SpecialtyCard key={s.id} slug={s.slug} name={s.name_fr} icon={s.icon} />
          ))}
        </div>
      )}

      {/* FEATURED */}
      {featured.length ? (
        <>
          <SectionHeader
            eyebrow={<><Crown className="h-3.5 w-3.5" /> Premium</>}
            title="Médecins en vedette"
          />
          <CarouselGrid loading={isLoading}>
            {featured.map((d) => (<DoctorCard key={d.id} doctor={d} />))}
          </CarouselGrid>
        </>
      ) : null}

      {/* NEARBY */}
      {nearby.length ? (
        <>
          <SectionHeader eyebrow="À proximité" title="Médecins près de vous" />
          <CarouselGrid loading={false}>
            {nearby.map((n) => (<DoctorCard key={n.d.id} doctor={n.d} distanceKm={n.km} />))}
          </CarouselGrid>
        </>
      ) : null}

      {/* TOP RATED */}
      <SectionHeader
        eyebrow={<><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> Excellence</>}
        title="Mieux notés"
      />
      <CarouselGrid loading={isLoading}>
        {topRated.map((d) => (<DoctorCard key={d.id} doctor={d} />))}
      </CarouselGrid>

      {/* RECENTLY ADDED */}
      <SectionHeader
        eyebrow={<><Clock className="h-3.5 w-3.5" /> Nouveau</>}
        title="Récemment ajoutés"
      />
      <CarouselGrid loading={isLoading}>
        {recent.map((d) => (<DoctorCard key={d.id} doctor={d} />))}
      </CarouselGrid>

      {/* VERIFIED */}
      {verifiedOnly.length ? (
        <>
          <SectionHeader
            eyebrow={<><Award className="h-3.5 w-3.5" /> Vérifié</>}
            title="Praticiens vérifiés"
            action={<Link to="/doctors/search" search={{ verified: true }} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">Tout voir <ChevronRight className="h-4 w-4" /></Link>}
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {verifiedOnly.slice(0, 6).map((d) => (<DoctorCard key={d.id} doctor={d} />))}
          </div>
        </>
      ) : null}

      {!isLoading && !doctors.length ? (
        <EmptyState
          icon={Stethoscope}
          title="Aucun médecin pour le moment"
          description="L'annuaire s'enrichit chaque semaine. Revenez bientôt."
          action={<Button asChild><Link to="/doctors/specialties">Parcourir les spécialités</Link></Button>}
        />
      ) : null}
    </div>
  );
}

function SectionHeader({
  eyebrow, title, action,
}: { eyebrow: React.ReactNode; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <p className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function CarouselGrid({ children, loading }: { children: React.ReactNode; loading: boolean }) {
  if (loading) return <RowSkeleton h="h-72" cols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" />;
  return (
    <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-3 lg:gap-5 lg:overflow-visible">
      {Array.isArray(children) ? (children as React.ReactNode[]).map((c, i) => (
        <div key={i} className="w-[85%] shrink-0 snap-start sm:w-[55%] lg:w-auto">{c}</div>
      )) : children}
    </div>
  );
}

function RowSkeleton({ h, cols }: { h: string; cols: string }) {
  return (
    <div className={`grid gap-4 ${cols}`}>
      {Array.from({ length: 5 }).map((_, i) => (<Skeleton key={i} className={`${h} rounded-3xl`} />))}
    </div>
  );
}
