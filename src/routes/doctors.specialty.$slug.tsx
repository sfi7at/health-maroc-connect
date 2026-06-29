import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DoctorCard } from "@/components/doctors/DoctorCard";
import { DoctorFilters } from "@/components/doctors/DoctorFilters";
import { EmptyState } from "@/components/common/EmptyState";
import {
  doctorsQuery, specialtyBySlugQuery, matchesDoctorFilters,
  SPECIALTY_ICONS, gradientForSlug, type DoctorFiltersValue,
} from "@/lib/doctors";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/doctors/specialty/$slug")({
  head: ({ params }) =>
    buildHead({
      title: `Médecins — ${params.slug}`,
      description: "Liste des praticiens vérifiés pour cette spécialité au Maroc.",
      path: `/doctors/specialty/${params.slug}`,
    }),
  component: SpecialtyPage,
  notFoundComponent: () => (
    <EmptyState icon={Stethoscope} title="Spécialité introuvable" description="Cette spécialité n'existe pas." />
  ),
  errorComponent: ({ error }) => (
    <EmptyState icon={Stethoscope} title="Erreur" description={error.message} />
  ),
});

function SpecialtyPage() {
  const { slug } = Route.useParams();
  const { data: specialty, isLoading: sLoad } = useQuery(specialtyBySlugQuery(slug));
  const [filters, setFilters] = useState<DoctorFiltersValue>({ sort: "relevance", specialty: slug });
  const { data: doctors = [], isLoading } = useQuery(doctorsQuery({ sort: filters.sort, cityId: filters.cityId ?? null }));

  const filtered = useMemo(
    () => doctors.filter((d) => matchesDoctorFilters(d, { ...filters, specialty: slug })),
    [doctors, filters, slug],
  );

  if (!sLoad && !specialty) throw notFound();
  const Icon = (specialty?.icon && SPECIALTY_ICONS[specialty.icon]) || Stethoscope;
  const gradient = gradientForSlug(slug);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="gap-2 self-start">
        <Link to="/doctors/specialties"><ArrowLeft className="h-4 w-4" /> Spécialités</Link>
      </Button>
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br ${gradient} p-8 text-white shadow-soft`}
      >
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/20 backdrop-blur">
            <Icon className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/80">Spécialité</p>
            <h1 className="text-2xl font-bold sm:text-3xl">{specialty?.name_fr ?? "—"}</h1>
          </div>
        </div>
      </motion.section>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {isLoading ? "Chargement…" : `${filtered.length} praticien${filtered.length > 1 ? "s" : ""}`}
        </p>
        <DoctorFilters value={filters} onChange={setFilters} />
      </div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (<Skeleton key={i} className="h-72 rounded-3xl" />))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Stethoscope} title="Aucun médecin" description="Aucun praticien trouvé pour cette spécialité." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => (<DoctorCard key={d.id} doctor={d} />))}
        </div>
      )}
    </div>
  );
}