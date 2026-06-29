import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck, CalendarCheck, Users, Star, Stethoscope, Bell, ShieldCheck,
  ArrowRight, Crown, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ownedDoctorsQuery, readDoctorMeta } from "@/lib/doctors";
import { buildHead } from "@/lib/seo";
import { formatDateTimeFr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/doctor-dashboard")({
  head: () => buildHead({
    title: "Espace praticien — HealthLink Maroc",
    description: "Gérez votre profil, vos rendez-vous, vos avis et votre vérification.",
    path: "/doctor-dashboard",
  }),
  component: DoctorDashboard,
});

function DoctorDashboard() {
  const { user } = useAuth();
  const { data: doctors = [], isLoading } = useQuery(ownedDoctorsQuery(user?.id));
  const profile = doctors[0];

  const { data: stats } = useQuery({
    queryKey: ["doctor_dashboard_stats", profile?.id ?? "x"],
    enabled: !!profile,
    queryFn: async () => {
      const [appts, reviews] = await Promise.all([
        supabase.from("appointments").select("id, status, scheduled_for, patient_id", { count: "exact" }).eq("provider_id", profile!.id).order("scheduled_for", { ascending: false }),
        supabase.from("reviews").select("id, rating", { count: "exact" }).eq("provider_id", profile!.id),
      ]);
      const items = appts.data ?? [];
      const upcoming = items.filter((a) => new Date(a.scheduled_for) > new Date() && a.status !== "cancelled");
      const patients = new Set(items.map((a) => a.patient_id)).size;
      return {
        upcoming, total: appts.count ?? 0, patients,
        reviewsCount: reviews.count ?? 0,
        avg: (reviews.data ?? []).reduce((a, r) => a + r.rating, 0) / Math.max(1, (reviews.data ?? []).length),
      };
    },
  });

  if (isLoading) return <Skeleton className="h-72 rounded-3xl" />;

  if (!profile) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Espace praticien"
          title="Tableau de bord"
          icon={<Stethoscope className="h-5 w-5" />}
        />
        <EmptyState
          icon={Stethoscope}
          title="Vous n'êtes pas encore enregistré comme praticien"
          description="Contactez notre équipe pour créer votre profil professionnel et accéder à l'espace praticien."
          action={<Button asChild><Link to="/contact">Nous contacter</Link></Button>}
        />
      </div>
    );
  }

  const meta = readDoctorMeta(profile);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Espace praticien"
        title={`Dr. ${profile.name}`}
        description="Vue d'ensemble de votre activité sur HealthLink Maroc."
        icon={<Stethoscope className="h-5 w-5" />}
        actions={
          <Button asChild variant="outline" className="gap-2">
            <Link to="/doctors/$id" params={{ id: profile.id }}>Voir mon profil public <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={CalendarCheck} label="RDV à venir" value={String(stats?.upcoming.length ?? 0)} tone="from-emerald-500 to-teal-600" />
        <StatCard icon={Users} label="Patients" value={String(stats?.patients ?? 0)} tone="from-sky-500 to-blue-600" />
        <StatCard icon={Star} label="Note moyenne" value={(stats?.avg ?? 0).toFixed(1)} tone="from-amber-500 to-orange-600" />
        <StatCard icon={Bell} label="Total RDV" value={String(stats?.total ?? 0)} tone="from-violet-500 to-fuchsia-600" />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Prochains rendez-vous</h2>
          {stats?.upcoming.length ? (
            <ul className="space-y-2">
              {stats.upcoming.slice(0, 6).map((a) => (
                <li key={a.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-soft">
                  <div>
                    <p className="text-sm font-semibold">{formatDateTimeFr(a.scheduled_for)}</p>
                    <p className="text-xs text-muted-foreground">Statut: {a.status}</p>
                  </div>
                  <Badge variant="secondary">{a.status}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Aucun rendez-vous à venir.
            </p>
          )}
        </div>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-3 text-sm font-semibold">Vérification</h3>
            <div className="flex items-center gap-2">
              {profile.is_verified ? (
                <Badge className="gap-1 border-0 bg-emerald-500/15 text-emerald-700"><BadgeCheck className="h-3.5 w-3.5" /> Vérifié</Badge>
              ) : (
                <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3.5 w-3.5" /> En attente</Badge>
              )}
            </div>
            {!profile.is_verified ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Envoyez votre licence médicale, CNI et registre professionnel pour obtenir le badge "Vérifié".
              </p>
            ) : null}
            <Button variant="outline" className="mt-3 w-full gap-2" asChild>
              <Link to="/contact"><ShieldCheck className="h-4 w-4" /> Documents</Link>
            </Button>
          </section>

          <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Crown className="h-4 w-4 text-amber-500" /> Abonnement</h3>
            <Badge variant={profile.is_premium ? "default" : "secondary"}>
              {profile.is_premium ? "Premium" : "Standard"}
            </Badge>
            {!profile.is_premium ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Passez à Premium pour apparaître en tête de l'annuaire.
              </p>
            ) : null}
          </section>

          {meta.consultation_price_mad ? (
            <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
              <h3 className="mb-2 text-sm font-semibold">Tarif consultation</h3>
              <p className="text-2xl font-bold text-primary">{meta.consultation_price_mad} MAD</p>
            </section>
          ) : null}
        </aside>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: string; tone: string }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-soft">
      <div className={`mb-3 grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br ${tone} text-white`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}