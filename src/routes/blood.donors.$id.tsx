import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Droplet,
  ShieldCheck,
  Heart,
  CalendarCheck,
  Award,
  Clock,
  MapPin,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { donorByIdQuery } from "@/lib/blood-queries";
import { ACHIEVEMENTS, DONOR_STATUS_META, canDonateAgain, daysUntilEligible } from "@/lib/blood";
import { formatRelativeFr } from "@/lib/format";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/blood/donors/$id")({
  head: () =>
    buildHead({
      title: "Profil donneur — HealthLink Maroc",
      description: "Profil public d'un donneur de sang vérifié. Vos coordonnées restent privées.",
    }),
  component: DonorProfilePage,
  errorComponent: () => <ErrorView />,
  notFoundComponent: () => <ErrorView />,
});

function ErrorView() {
  return (
    <div className="grid place-items-center py-20 text-center">
      <p className="text-muted-foreground">Donneur introuvable.</p>
      <Button asChild variant="ghost" className="mt-4">
        <Link to="/blood/donors">Retour</Link>
      </Button>
    </div>
  );
}

function DonorProfilePage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const { data: donor, isLoading } = useQuery(donorByIdQuery(id));

  if (isLoading) {
    return <Skeleton className="h-[500px] rounded-3xl" />;
  }
  if (!donor) return <ErrorView />;

  const status = DONOR_STATUS_META[donor.status];
  const eligible = canDonateAgain(donor.last_donation_at);
  const waitDays = daysUntilEligible(donor.last_donation_at);
  const initials = `${donor.first_name?.[0] ?? ""}${donor.last_name?.[0] ?? ""}`.toUpperCase() || "?";

  const unlocked = ACHIEVEMENTS.filter((a) =>
    a.unlocked({ donations: donor.total_donations, verified: donor.is_verified, emergencyHelped: 0 }),
  );

  return (
    <div className="space-y-6">
      <Button variant="ghost" className="gap-2" onClick={() => router.history.back()}>
        <ArrowLeft className="h-4 w-4" /> Retour
      </Button>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-rose-50 to-white p-6 shadow-soft dark:from-rose-950/30 dark:to-card sm:p-8"
      >
        <div className="grid gap-6 sm:grid-cols-[auto_1fr_auto] sm:items-center">
          <div className="relative">
            {donor.avatar_url ? (
              <img
                src={donor.avatar_url}
                alt=""
                className="h-24 w-24 rounded-3xl object-cover shadow-elevated"
              />
            ) : (
              <div className="grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-br from-rose-500 to-red-600 text-2xl font-bold text-white shadow-elevated">
                {initials}
              </div>
            )}
            <span className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-4 border-card ${status.dot}`} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {donor.first_name ?? "Donneur"} {donor.last_name?.[0] ? `${donor.last_name[0]}.` : ""}
              </h1>
              {donor.is_verified && (
                <Badge className="border-0 bg-emerald-500/15 text-emerald-600">
                  <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Vérifié
                </Badge>
              )}
              <Badge className={`border-0 ${status.tint}`}>{status.label}</Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {donor.cities?.name_fr ?? "Maroc"}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarCheck className="h-4 w-4" /> Membre depuis {formatRelativeFr(donor.created_at)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-4 w-4" /> Actif {formatRelativeFr(donor.last_active_at)}
              </span>
            </div>
          </div>
          <div className="grid place-items-center rounded-3xl bg-rose-500/10 px-6 py-4 text-rose-600">
            <Droplet className="h-6 w-6" fill="currentColor" />
            <p className="mt-1 text-2xl font-bold">{donor.blood_group}</p>
          </div>
        </div>
      </motion.section>

      <section className="grid gap-3 sm:grid-cols-3">
        <StatTile icon={Heart} label="Dons effectués" value={donor.total_donations} tint="text-rose-600" />
        <StatTile
          icon={Sparkles}
          label="Vies aidées"
          value={donor.total_donations * 3}
          tint="text-fuchsia-600"
        />
        <StatTile
          icon={CalendarCheck}
          label="Dernier don"
          value={donor.last_donation_at ? formatRelativeFr(donor.last_donation_at) : "—"}
          tint="text-emerald-600"
        />
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center gap-2 text-sm">
          {eligible ? (
            <Badge className="border-0 bg-emerald-500/15 text-emerald-600">
              <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Éligible pour un don
            </Badge>
          ) : (
            <Badge className="border-0 bg-amber-500/15 text-amber-600">
              <Clock className="mr-1 h-3.5 w-3.5" /> Éligible dans {waitDays} j
            </Badge>
          )}
        </div>
      </section>

      {unlocked.length > 0 && (
        <section>
          <h2 className="mb-3 inline-flex items-center gap-2 text-lg font-semibold">
            <Award className="h-5 w-5 text-amber-500" /> Distinctions
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {unlocked.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-3xl border border-border bg-card p-4 shadow-soft"
              >
                <div className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${a.tint} text-white`}>
                  <a.icon className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{a.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{a.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <p className="text-sm text-muted-foreground">
          Pour contacter ce donneur, publiez une demande de sang. Ses coordonnées seront partagées
          en privé uniquement après son accord.
        </p>
        <Button asChild className="mt-4 gap-2">
          <Link to="/blood/request" search={{ donor: donor.id }}>
            <Heart className="h-4 w-4" /> Demander du sang
          </Link>
        </Button>
      </section>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: typeof Heart;
  label: string;
  value: string | number;
  tint: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
      <Icon className={`mb-2 h-5 w-5 ${tint}`} />
      <p className="text-xl font-bold tabular-nums tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}