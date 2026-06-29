import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Stethoscope,
  Pill,
  Building2,
  FlaskConical,
  Droplet,
  Sparkles,
  CalendarCheck,
  Search,
  ShieldCheck,
  MapPin,
  ArrowRight,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServiceCard } from "@/components/cards/ServiceCard";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () =>
    buildHead({
      title: "HealthLink Maroc — Tous les services de santé en une app",
      description:
        "Médecins, pharmacies de garde, hôpitaux, laboratoires, don du sang et téléconsultation. Toute la santé marocaine, réunie dans une application moderne.",
      path: "/",
    }),
  component: HomePage,
});

const services = [
  {
    to: "/doctors",
    icon: Stethoscope,
    title: "Médecins",
    description: "Trouvez un spécialiste près de chez vous et prenez rendez-vous en quelques secondes.",
    accent: "primary" as const,
  },
  {
    to: "/pharmacies",
    icon: Pill,
    title: "Pharmacies",
    description: "Localisez les pharmacies à proximité et celles de garde 24/7.",
    accent: "secondary" as const,
  },
  {
    to: "/hospitals",
    icon: Building2,
    title: "Hôpitaux & cliniques",
    description: "Annuaire complet des hôpitaux publics et cliniques privées au Maroc.",
    accent: "info" as const,
  },
  {
    to: "/laboratories",
    icon: FlaskConical,
    title: "Laboratoires",
    description: "Analyses biologiques, imagerie et résultats en ligne.",
    accent: "warning" as const,
  },
  {
    to: "/blood",
    icon: Droplet,
    title: "Don du sang",
    description: "Sauvez des vies. Trouvez ou répondez à une demande de sang urgente.",
    accent: "blood" as const,
  },
  {
    to: "/ai-assistant",
    icon: Sparkles,
    title: "Assistant santé IA",
    description: "Posez vos questions et recevez une orientation médicale personnalisée.",
    accent: "primary" as const,
  },
];

function HomePage() {
  return (
    <div className="space-y-12">
      <Hero />
      <Services />
      <Trust />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-soft sm:p-10 lg:p-14">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full gradient-primary opacity-20 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full gradient-secondary opacity-15 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-2 lg:items-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            Health Super App du Maroc
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Toute votre santé,
            <br />
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              en une seule app.
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            HealthLink Maroc réunit médecins, pharmacies de garde, hôpitaux, laboratoires, don du
            sang et téléconsultation. Plus simple, plus rapide, plus humain.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link to="/search">
                <Search className="h-4 w-4" />
                Rechercher un service
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link to="/appointments">
                <CalendarCheck className="h-4 w-4" />
                Mes rendez-vous
              </Link>
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> Disponible dans tout le Maroc
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Données chiffrées & sécurisées
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="relative hidden lg:block"
        >
          <HeroVisual />
        </motion.div>
      </div>
    </section>
  );
}

function HeroVisual() {
  return (
    <div className="relative mx-auto aspect-[5/4] w-full max-w-md">
      <div className="absolute inset-0 rounded-[2rem] gradient-primary opacity-10" />
      <div className="absolute left-6 top-8 w-64 rounded-2xl border border-border bg-card p-4 shadow-elevated">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Dr. spécialiste</p>
            <p className="text-xs text-muted-foreground">Disponible aujourd'hui</p>
          </div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-muted">
          <div className="h-2 w-3/4 rounded-full gradient-primary" />
        </div>
      </div>
      <div className="absolute bottom-10 right-4 w-56 rounded-2xl border border-border bg-card p-4 shadow-elevated">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-blood/10 text-blood">
            <Droplet className="h-4 w-4" fill="currentColor" />
          </div>
          <div>
            <p className="text-sm font-semibold">Don du sang</p>
            <p className="text-xs text-muted-foreground">Demande urgente près de vous</p>
          </div>
        </div>
      </div>
      <div className="absolute bottom-2 left-10 w-52 rounded-2xl border border-border bg-card p-3 shadow-elevated">
        <div className="flex items-center gap-2 text-xs">
          <Heart className="h-4 w-4 text-primary" fill="currentColor" />
          <span className="font-medium">+1 250 services connectés</span>
        </div>
      </div>
    </div>
  );
}

function Services() {
  return (
    <section>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Services
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Tout ce dont vous avez besoin
          </h2>
        </div>
        <Link
          to="/search"
          className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline sm:inline-flex"
        >
          Tout voir <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <ServiceCard key={s.to} {...s} />
        ))}
      </div>
    </section>
  );
}

function Trust() {
  const items = [
    { label: "Professionnels vérifiés", value: "Réseau certifié" },
    { label: "Sécurité", value: "Chiffrement bout-en-bout" },
    { label: "Disponibilité", value: "24h / 24, 7j / 7" },
    { label: "Couverture", value: "Tout le Maroc" },
  ];
  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-10">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => (
          <div key={it.label}>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {it.label}
            </p>
            <p className="mt-1 text-lg font-semibold">{it.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
