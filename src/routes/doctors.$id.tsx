import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Calendar, MapPin, Phone, Star, Stethoscope } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/doctors/$id")({
  head: ({ params }) =>
    buildHead({
      title: `Profil médecin · #${params.id}`,
      description: "Consultez le profil d'un médecin et prenez rendez-vous en ligne.",
      path: `/doctors/${params.id}`,
    }),
  component: DoctorDetail,
});

function DoctorDetail() {
  const { id } = Route.useParams();
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="gap-2">
        <Link to="/doctors">
          <ArrowLeft className="h-4 w-4" />
          Retour à l'annuaire
        </Link>
      </Button>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
        <div className="grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
          <Avatar className="h-24 w-24 ring-2 ring-primary/15">
            <AvatarFallback className="bg-primary/10 text-2xl text-primary">D{id}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Spécialiste</p>
            <h1 className="mt-1 truncate text-2xl font-bold tracking-tight sm:text-3xl">
              Profil médecin
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Référence interne · #{id} — chargement des données depuis le réseau vérifié.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1 bg-warning/15 hover:bg-warning/20">
                <Star className="h-3 w-3 fill-current text-warning-foreground" /> —
              </Badge>
              <Badge className="bg-success/15 text-foreground hover:bg-success/20">
                Nouveaux patients
              </Badge>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <Button size="lg" className="gap-2">
              <Calendar className="h-4 w-4" /> Prendre rendez-vous
            </Button>
            <Button variant="outline" size="lg" className="gap-2">
              <Phone className="h-4 w-4" /> Appeler
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Stethoscope className="h-4 w-4 text-primary" /> À propos
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Les informations détaillées du praticien (formation, langues, consultations, tarifs)
            seront affichées ici dès la connexion aux données réelles.
          </p>
        </section>
        <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <MapPin className="h-4 w-4 text-primary" /> Cabinet
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Adresse, horaires d'ouverture et itinéraire seront disponibles dès la connexion à
            Google Maps.
          </p>
        </section>
      </div>
    </div>
  );
}