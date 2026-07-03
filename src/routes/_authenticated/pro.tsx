import { useEffect } from "react";
import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  LayoutDashboard, FileText, CalendarRange, Users, UserCog, Bell, ShieldCheck,
  Stethoscope, BadgeCheck, AlertCircle, Building2, Crown, ArrowLeft,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { buildHead } from "@/lib/seo";
import { useSelectedProvider, setSelectedProviderId } from "@/lib/provider-store";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pro")({
  head: () => buildHead({
    title: "HealthLink Pro — Espace praticien",
    description: "L'espace professionnel des médecins marocains. Ordonnances, agenda, patients — en temps réel.",
    path: "/pro",
  }),
  component: ProLayout,
});

type NavEntry = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
const NAV: NavEntry[] = [
  { to: "/pro", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { to: "/pro/schedule", label: "Agenda", icon: CalendarRange },
  { to: "/pro/patients", label: "Patients", icon: Users },
  { to: "/pro/prescriptions", label: "Ordonnances", icon: FileText },
  { to: "/provider/profile", label: "Profil praticien", icon: UserCog },
  { to: "/provider/notifications", label: "Notifications", icon: Bell },
  { to: "/provider/verification", label: "Vérification", icon: ShieldCheck },
];

function ProLayout() {
  const { provider, providers, isLoading } = useSelectedProvider();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const qc = useQueryClient();

  // Realtime cross-app sync: any change to appointments / prescriptions / notifications
  // scoped to this provider triggers cache invalidation, so the Pro workspace stays live.
  useEffect(() => {
    if (!provider?.id) return;
    const ch = supabase
      .channel(`pro-${provider.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `provider_id=eq.${provider.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["pro", "appointments", provider.id] });
        qc.invalidateQueries({ queryKey: ["pro", "stats", provider.id] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "prescriptions", filter: `provider_id=eq.${provider.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["prescriptions", "provider", provider.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [provider?.id, qc]);

  if (isLoading) return <Skeleton className="h-64 rounded-3xl" />;

  if (providers.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="Aucun profil professionnel"
        description="HealthLink Pro est réservé aux praticiens vérifiés. Créez d'abord votre fiche via l'espace prestataire ou contactez notre équipe."
        action={<Button asChild><Link to="/contact">Nous contacter</Link></Button>}
      />
    );
  }

  const isDoctor = provider ? ["doctor", "dentist"].includes(provider.category) : false;
  const notVerified = provider ? !provider.is_verified : true;

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        {/* Pro brand block */}
        <div className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-[#0B2545] via-[#123055] to-[#0E8C7F] p-4 text-white shadow-soft">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur">
              <Stethoscope className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">HealthLink</p>
              <p className="text-sm font-bold leading-none">Pro</p>
            </div>
            <Badge className="ml-auto border-0 bg-white/15 text-[10px] text-white">PRATICIEN</Badge>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white/15">
              {provider?.profile_image ? (
                <img src={provider.profile_image} alt="" className="h-full w-full object-cover" />
              ) : (
                <Stethoscope className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Dr. {provider?.name}</p>
              <p className="truncate text-[11px] text-white/70">
                {provider?.is_verified ? "Compte vérifié" : "Vérification en cours"}
              </p>
            </div>
          </div>
          {providers.length > 1 ? (
            <Select value={provider?.id} onValueChange={(v) => setSelectedProviderId(v)}>
              <SelectTrigger className="mt-3 h-9 border-white/20 bg-white/10 text-xs text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>

        <nav className="hidden flex-col gap-0.5 rounded-3xl border border-border bg-card p-2 shadow-soft lg:flex">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-[#0B2545] text-white shadow-soft"
                    : "text-foreground hover:bg-muted",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
          <div className="my-2 border-t border-border" />
          <Link to="/" className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted">
            <ArrowLeft className="h-4 w-4" /> Retour à HealthLink Maroc
          </Link>
        </nav>

        <ScrollArea className="lg:hidden">
          <div className="flex gap-1.5 pb-2">
            {NAV.map((item) => {
              const active = item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to + "/");
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    active ? "border-[#0B2545] bg-[#0B2545] text-white" : "border-border bg-card",
                  )}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </aside>

      <motion.main
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="min-w-0 space-y-6"
      >
        {notVerified ? (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0 text-sm">
              <p className="font-semibold">Compte en cours de vérification</p>
              <p className="text-amber-800/90 dark:text-amber-200/80">
                Votre compte est actuellement en cours de vérification par l'équipe HealthLink Maroc.
                Les fonctionnalités sensibles (émission d'ordonnances, publication de créneaux) restent limitées jusqu'à validation.
              </p>
              <Button asChild variant="link" className="h-auto p-0 text-amber-900 dark:text-amber-100">
                <Link to="/provider/verification">Envoyer mes documents</Link>
              </Button>
            </div>
          </div>
        ) : null}

        {!isDoctor && provider ? (
          <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/30 p-4 text-sm">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p>
              HealthLink Pro est optimisé pour les médecins. Certains modules (ordonnances) sont réservés
              aux profils <strong>médecin</strong> ou <strong>dentiste</strong>. Utilisez l'espace prestataire pour votre catégorie.
            </p>
          </div>
        ) : null}

        <Outlet />
      </motion.main>
    </div>
  );
}

export const _unused = { BadgeCheck, Crown };