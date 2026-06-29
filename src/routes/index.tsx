import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search, Sparkles, Droplet, Stethoscope, Pill, Building2, FlaskConical,
  CalendarCheck, Smile, HeartPulse, MoonStar, Heart, MapPin, Bell, ArrowRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProviderCard } from "@/components/common/ProviderCard";
import { providersQuery } from "@/lib/queries";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () =>
    buildHead({
      title: "HealthLink Maroc — Tous les services de santé en une app",
      description:
        "Médecins, pharmacies de garde, hôpitaux, laboratoires, don du sang et téléconsultation au Maroc.",
      path: "/",
    }),
  component: HomePage,
});

const tiles = [
  { to: "/blood", icon: Droplet, label: "Don du sang", desc: "Sauver des vies", gradient: "from-rose-500 to-red-600" },
  { to: "/doctors", icon: Stethoscope, label: "Médecins", desc: "Spécialistes vérifiés", gradient: "from-emerald-500 to-teal-600" },
  { to: "/pharmacies", icon: Pill, label: "Pharmacies", desc: "Près de chez vous", gradient: "from-indigo-500 to-violet-600" },
  { to: "/pharmacies/on-duty", icon: MoonStar, label: "Garde", desc: "24h / 24", gradient: "from-violet-500 to-fuchsia-600" },
  { to: "/hospitals", icon: Building2, label: "Hôpitaux", desc: "Publics & privés", gradient: "from-sky-500 to-blue-700" },
  { to: "/laboratories", icon: FlaskConical, label: "Laboratoires", desc: "Analyses & imagerie", gradient: "from-amber-500 to-orange-600" },
  { to: "/appointments", icon: CalendarCheck, label: "Rendez-vous", desc: "Gérer vos RDV", gradient: "from-cyan-500 to-blue-600" },
  { to: "/ai-assistant", icon: Sparkles, label: "Assistant IA", desc: "Questions santé", gradient: "from-fuchsia-500 to-pink-600" },
  { to: "/profile", icon: Heart, label: "Profil médical", desc: "Vos données", gradient: "from-primary to-secondary" },
] as const;

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return "Bonne nuit";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: meta } = useQuery({
    queryKey: ["profile", "me-mini", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, city")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: nearby } = useQuery({
    ...providersQuery({ limit: 12 }),
  });

  const featured = useMemo(() => nearby ?? [], [nearby]);
  const firstName = meta?.full_name?.split(" ")[0] ?? null;

  return (
    <div className="space-y-8">
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-secondary/10 p-6 shadow-soft sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {greeting()}{firstName ? `, ${firstName}` : ""}
            </p>
            <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
              Toute votre santé, à portée de main
            </h1>
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {meta?.city ?? "Maroc"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full" aria-label="Notifications">
              <Link to={user ? "/_authenticated/notifications" : "/auth"}><Bell className="h-5 w-5" /></Link>
            </Button>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/search", search: { q: search } as never });
          }}
          className="mt-6"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher médecins, pharmacies, hôpitaux…"
              className="h-12 rounded-2xl border-border bg-background pl-11 text-sm shadow-soft"
              aria-label="Rechercher"
            />
          </div>
        </form>
      </motion.section>

      <section>
        <header className="mb-4 flex items-end justify-between">
          <h2 className="text-base font-semibold">Services</h2>
        </header>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {tiles.map((t, i) => {
            const Icon = t.icon;
            return (
              <motion.div
                key={t.to}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link
                  to={t.to}
                  className="group relative block overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-elevated"
                >
                  <div className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${t.gradient} text-white shadow-soft`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-3 text-sm font-semibold">{t.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t.desc}</p>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section>
        <header className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-base font-semibold">Près de vous</h2>
            <p className="text-xs text-muted-foreground">Établissements vérifiés au Maroc</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="gap-1">
            <Link to="/search">Tout voir <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </header>
        {featured.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Aucun établissement à afficher pour le moment.
          </div>
        ) : (
          <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 lg:grid lg:grid-cols-3 lg:overflow-visible">
            {featured.slice(0, 9).map((p) => (
              <div key={p.id} className="min-w-[280px] max-w-[320px] snap-start lg:min-w-0 lg:max-w-none">
                <ProviderCard provider={p} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/blood"
          className="group relative flex items-center gap-4 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-rose-500/10 via-card to-red-500/10 p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-elevated"
        >
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-soft">
            <Droplet className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Don du sang</p>
            <p className="text-xs text-muted-foreground">Répondez à une demande urgente</p>
          </div>
          <Badge className="border-0 bg-rose-500/15 text-rose-600">Urgent</Badge>
        </Link>
        <Link
          to="/ai-assistant"
          className="group relative flex items-center gap-4 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-fuchsia-500/10 via-card to-pink-500/10 p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-elevated"
        >
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white shadow-soft">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Assistant IA santé</p>
            <p className="text-xs text-muted-foreground">Posez votre question en français</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </section>
    </div>
  );
}
