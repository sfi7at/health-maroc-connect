import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Heart, Calendar, MapPin, Award, Lock, Sparkles, Activity } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { donationHistoryQuery } from "@/lib/blood-queries";
import { myBloodDonorQuery } from "@/lib/queries";
import { ACHIEVEMENTS } from "@/lib/blood";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/blood/history")({
  head: () =>
    buildHead({
      title: "Historique de don — HealthLink Maroc",
      description: "Suivez vos dons de sang, vos accomplissements et votre impact.",
    }),
  component: HistoryPage,
});

function HistoryPage() {
  const { user } = useAuth();
  const { data: donor } = useQuery(myBloodDonorQuery(user?.id));
  const { data: history = [], isLoading } = useQuery(donationHistoryQuery(user?.id));

  const ctx = {
    donations: donor?.total_donations ?? 0,
    verified: donor?.is_verified ?? false,
    emergencyHelped: 0,
  };
  const livesHelped = ctx.donations * 3;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Mon parcours"
        title="Historique & accomplissements"
        description="Chaque don sauve jusqu'à 3 vies. Voici votre impact."
        icon={<Heart className="h-5 w-5" />}
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <StatTile icon={Heart} label="Dons totaux" value={ctx.donations} tint="from-rose-500 to-red-600" />
        <StatTile icon={Sparkles} label="Vies aidées" value={livesHelped} tint="from-pink-500 to-fuchsia-600" />
        <StatTile
          icon={Activity}
          label="Membre depuis"
          value={donor?.created_at ? new Date(donor.created_at).getFullYear() : "—"}
          tint="from-emerald-500 to-teal-600"
        />
      </section>

      <section>
        <h2 className="mb-4 inline-flex items-center gap-2 text-xl font-semibold tracking-tight">
          <Award className="h-5 w-5 text-amber-500" /> Distinctions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ACHIEVEMENTS.map((a, i) => {
            const unlocked = a.unlocked(ctx);
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`flex items-center gap-3 rounded-3xl border border-border bg-card p-4 shadow-soft ${
                  unlocked ? "" : "opacity-50"
                }`}
              >
                <div
                  className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${a.tint} text-white`}
                >
                  {unlocked ? <a.icon className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{a.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{a.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-4 inline-flex items-center gap-2 text-xl font-semibold tracking-tight">
          <Calendar className="h-5 w-5 text-rose-500" /> Frise des dons
        </h2>
        {isLoading ? (
          <Skeleton className="h-40 rounded-3xl" />
        ) : history.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="Aucun don enregistré"
            description="Votre premier don apparaîtra ici dès qu'il sera validé par un centre."
          />
        ) : (
          <ol className="relative space-y-4 border-l border-border pl-6">
            {history.map((h) => (
              <li key={h.id} className="relative">
                <span className="absolute -left-[31px] top-1.5 grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-white shadow ring-4 ring-card">
                  <Heart className="h-3 w-3" fill="currentColor" />
                </span>
                <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold">
                      {new Date(h.donated_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {h.units} poche{h.units > 1 ? "s" : ""}
                    </span>
                  </div>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> {h.location ?? h.cities?.name_fr ?? "Maroc"}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
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
      <div className={`mb-2 grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br ${tint} text-white`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold tabular-nums tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}