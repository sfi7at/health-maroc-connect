import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Stethoscope, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SpecialtyCard } from "@/components/doctors/SpecialtyCard";
import { PageHeader } from "@/components/common/PageHeader";
import { specialtiesQuery } from "@/lib/doctors";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/doctors/specialties")({
  head: () =>
    buildHead({
      title: "Spécialités médicales — HealthLink Maroc",
      description: "Toutes les spécialités médicales disponibles au Maroc : cardiologie, dermatologie, pédiatrie, et plus.",
      path: "/doctors/specialties",
    }),
  component: SpecialtiesPage,
});

function SpecialtiesPage() {
  const { data = [], isLoading } = useQuery(specialtiesQuery());
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q.trim()) return data;
    const n = q.trim().toLowerCase();
    return data.filter((s) => s.name_fr.toLowerCase().includes(n));
  }, [data, q]);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="gap-2 self-start">
        <Link to="/doctors"><ArrowLeft className="h-4 w-4" /> Médecins</Link>
      </Button>
      <PageHeader
        eyebrow="Annuaire"
        title="Spécialités médicales"
        description="Explorez les spécialités et trouvez le bon praticien pour votre besoin."
        icon={<Stethoscope className="h-5 w-5" />}
      />
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher une spécialité…"
          className="h-12 rounded-2xl pl-11"
        />
      </div>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (<Skeleton key={i} className="h-32 rounded-3xl" />))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {filtered.map((s) => (
            <SpecialtyCard key={s.id} slug={s.slug} name={s.name_fr} icon={s.icon} />
          ))}
        </div>
      )}
    </div>
  );
}