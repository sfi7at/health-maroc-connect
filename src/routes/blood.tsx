import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Droplet,
  Heart,
  MapPin,
  Clock,
  Search,
  PlusCircle,
  Users,
  ShieldCheck,
  Activity,
  CalendarHeart,
  Building2,
  Map as MapIcon,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { bloodRequestsQuery } from "@/lib/queries";
import { bloodStatsQuery } from "@/lib/blood-queries";
import { URGENCY_META } from "@/lib/categories";
import { formatRelativeFr } from "@/lib/format";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/blood")({
  head: () =>
    buildHead({
      title: "Don du sang au Maroc — HealthLink",
      description:
        "Donnez votre sang, sauvez des vies. Trouvez des donneurs ou devenez donneur en quelques clics au Maroc.",
      path: "/blood",
    }),
  component: BloodHubPage,
});

function BloodHubPage() {
  const queryClient = useQueryClient();
  const { data: stats } = useQuery(bloodStatsQuery());
  const { data: requests = [], isLoading } = useQuery(bloodRequestsQuery({}));

  // Realtime: refetch when new requests arrive
  useEffect(() => {
    const ch = supabase
      .channel("blood_hub_requests")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blood_requests" },
        () => queryClient.invalidateQueries({ queryKey: ["blood_requests"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [queryClient]);

  return (
    <div className="space-y-10">
      <Hero />
      <StatsBand stats={stats} />
      <QuickLinks />
      <EmergencyStrip requests={requests.slice(0, 6)} loading={isLoading} />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-rose-600 via-red-600 to-rose-700 p-6 text-white shadow-elevated sm:p-12">
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center"
      >
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] backdrop-blur">
            <Heart className="h-3.5 w-3.5" fill="currentColor" /> HealthLink Maroc
          </span>
          <h1 className="mt-4 text-[2.2rem] font-bold leading-[1.05] tracking-tight sm:text-5xl">
            Donnez votre sang.
            <br />
            <span className="bg-gradient-to-r from-white to-rose-100 bg-clip-text text-transparent">
              Sauvez des vies.
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-sm opacity-90 sm:text-base">
            Trouvez des donneurs ou devenez donneur en quelques clics. Vos coordonnées restent
            strictement privées jusqu'à votre accord.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="h-12 gap-2 rounded-full bg-white px-6 text-rose-700 shadow-lg hover:bg-white/95"
            >
              <Link to="/blood/donors">
                <Droplet className="h-4 w-4" /> Trouver des donneurs
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 gap-2 rounded-full border-white/40 bg-white/10 px-6 text-white backdrop-blur hover:bg-white/20"
            >
              <Link to="/blood/become-donor">
                <Heart className="h-4 w-4" fill="currentColor" /> Devenir donneur
              </Link>
            </Button>
          </div>
        </div>

        <HeroIllustration />
      </motion.div>
    </section>
  );
}

function HeroIllustration() {
  return (
    <div className="relative hidden h-72 items-center justify-center lg:flex">
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="relative grid h-56 w-56 place-items-center rounded-full bg-white/15 backdrop-blur"
      >
        <div className="absolute inset-3 rounded-full border border-white/30" />
        <div className="absolute inset-8 rounded-full border border-white/20" />
        <Droplet className="h-24 w-24 text-white drop-shadow-2xl" fill="currentColor" />
      </motion.div>
      {(["A+", "O-", "B+", "AB+"] as const).map((g, i) => (
        <motion.div
          key={g}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 + i * 0.1, type: "spring", stiffness: 200 }}
          style={{
            top: `${20 + ((i * 37) % 60)}%`,
            left: `${10 + ((i * 53) % 70)}%`,
          }}
          className="absolute grid h-12 w-12 place-items-center rounded-2xl bg-white text-sm font-bold text-rose-600 shadow-xl"
        >
          {g}
        </motion.div>
      ))}
    </div>
  );
}

function StatsBand({ stats }: { stats?: { donors: number; requests: number; verified: number; livesHelped: number } }) {
  const items = [
    { label: "Donneurs inscrits", value: stats?.donors ?? 0, icon: Users, tint: "from-rose-500 to-red-600" },
    { label: "Demandes publiées", value: stats?.requests ?? 0, icon: Droplet, tint: "from-amber-500 to-orange-600" },
    { label: "Vies aidées", value: stats?.livesHelped ?? 0, icon: Heart, tint: "from-pink-500 to-fuchsia-600" },
    { label: "Donneurs vérifiés", value: stats?.verified ?? 0, icon: ShieldCheck, tint: "from-emerald-500 to-teal-600" },
  ];
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((it, i) => (
        <motion.div
          key={it.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06, duration: 0.4 }}
          className="group relative overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-soft sm:p-5"
        >
          <div className={`mb-3 grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br ${it.tint} text-white shadow`}>
            <it.icon className="h-5 w-5" />
          </div>
          <p className="text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">
            {it.value.toLocaleString("fr-FR")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{it.label}</p>
        </motion.div>
      ))}
    </section>
  );
}

function QuickLinks() {
  const tiles = [
    { to: "/blood/donors", label: "Rechercher des donneurs", desc: "Filtres avancés, compatibilité", icon: Search, tint: "from-rose-500 to-red-600" },
    { to: "/blood/request", label: "Publier une demande", desc: "Recevez des dons rapidement", icon: PlusCircle, tint: "from-amber-500 to-orange-600" },
    { to: "/blood/become-donor", label: "Devenir donneur", desc: "Rejoignez la communauté", icon: Heart, tint: "from-pink-500 to-fuchsia-600" },
    { to: "/blood/campaigns", label: "Campagnes", desc: "Collectes et événements", icon: CalendarHeart, tint: "from-violet-500 to-purple-600" },
    { to: "/blood/centers", label: "Centres de don", desc: "Près de chez vous", icon: Building2, tint: "from-sky-500 to-blue-600" },
    { to: "/blood/map", label: "Carte interactive", desc: "Demandes, centres, donneurs", icon: MapIcon, tint: "from-emerald-500 to-teal-600" },
  ] as const;
  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold tracking-tight">Accès rapides</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t, i) => (
          <motion.div
            key={t.to}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Link
              to={t.to}
              className="group relative flex items-center gap-4 overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elevated"
            >
              <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${t.tint} text-white shadow`}>
                <t.icon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{t.label}</p>
                <p className="truncate text-xs text-muted-foreground">{t.desc}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1" />
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

type ReqRow = Awaited<ReturnType<typeof getReqRow>>;
async function getReqRow() {
  return null as unknown as {
    id: string;
    patient_name: string;
    blood_group: string;
    urgency: "low" | "normal" | "high" | "critical";
    is_emergency: boolean;
    units_needed: number;
    hospital_name: string | null;
    created_at: string;
    cities?: { name_fr: string } | null;
  };
}

function EmergencyStrip({ requests, loading }: { requests: ReqRow[]; loading: boolean }) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Demandes urgentes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Mises à jour en temps réel. Réagissez pour partager vos coordonnées.
          </p>
        </div>
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link to="/blood/donors">
            Tout voir <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-3xl" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          <Activity className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
          Aucune demande active pour l'instant.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {requests.map((r) => {
            const u = URGENCY_META[r.urgency];
            return (
              <motion.article
                key={r.id}
                whileHover={{ y: -3 }}
                className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4 shadow-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-500/10 text-rose-600">
                    <span className="text-sm font-bold">{r.blood_group}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={`border-0 ${u.tint}`}>{u.label}</Badge>
                    {r.is_emergency && (
                      <Badge className="border-0 bg-rose-600 text-white">
                        <AlertTriangle className="mr-1 h-3 w-3" /> URGENCE
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <p className="truncate font-semibold">{r.patient_name}</p>
                  {r.hospital_name && (
                    <p className="truncate text-xs text-muted-foreground">{r.hospital_name}</p>
                  )}
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {r.cities?.name_fr ?? "Maroc"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {formatRelativeFr(r.created_at)}
                  </span>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </section>
  );
}