import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Pill, MapPin, Clock } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchBar } from "@/components/common/SearchBar";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/pharmacies")({
  head: () =>
    buildHead({
      title: "Pharmacies au Maroc",
      description:
        "Trouvez une pharmacie ouverte près de chez vous, et consultez la liste des pharmacies de garde 24/7.",
      path: "/pharmacies",
    }),
  component: PharmaciesLayout,
});

function PharmaciesLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/pharmacies") return <Outlet />;
  return <PharmaciesIndex />;
}

function PharmaciesIndex() {
  return (
    <div>
      <PageHeader
        eyebrow="Géolocalisation"
        title="Pharmacies"
        description="Trouvez la pharmacie la plus proche et celles ouvertes en ce moment."
        icon={<Pill className="h-5 w-5" />}
        actions={
          <Button asChild className="gap-2">
            <Link to="/pharmacies/on-duty">
              <Clock className="h-4 w-4" />
              Pharmacies de garde
            </Link>
          </Button>
        }
      />

      <div className="mb-6">
        <SearchBar placeholder="Rechercher une pharmacie ou un quartier…" />
      </div>

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <FeatureTile icon={<MapPin className="h-4 w-4" />} title="À proximité" hint="Activez la géolocalisation" />
        <FeatureTile icon={<Clock className="h-4 w-4" />} title="Ouvertes maintenant" hint="Filtrage horaire automatique" />
        <FeatureTile icon={<Pill className="h-4 w-4" />} title="De garde" hint="24h / 24, 7j / 7" />
      </section>

      <EmptyState
        icon={Pill}
        title="Annuaire en cours de connexion"
        description="Les pharmacies seront chargées via Google Places et les données officielles du Ministère de la Santé."
      />
    </div>
  );
}

function FeatureTile({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}