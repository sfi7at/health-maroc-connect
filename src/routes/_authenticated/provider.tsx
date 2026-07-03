import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  LayoutDashboard, UserCog, Images, Clock4, Briefcase, CalendarRange,
  Star, BarChart3, Bell, ShieldCheck, Crown, MessagesSquare, Settings,
  Stethoscope, BadgeCheck, Building2, FileText,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { buildHead } from "@/lib/seo";
import { useSelectedProvider, setSelectedProviderId } from "@/lib/provider-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/provider")({
  head: () => buildHead({
    title: "Espace prestataire — HealthLink Maroc",
    description: "Pilotez votre profil, agenda, services, avis et statistiques.",
    path: "/provider",
  }),
  component: ProviderLayout,
});

type NavEntry = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
const NAV: NavEntry[] = [
  { to: "/provider", label: "Vue d'ensemble", icon: LayoutDashboard, exact: true },
  { to: "/provider/profile", label: "Profil", icon: UserCog },
  { to: "/provider/gallery", label: "Galerie", icon: Images },
  { to: "/provider/hours", label: "Horaires", icon: Clock4 },
  { to: "/provider/services", label: "Services", icon: Briefcase },
  { to: "/provider/appointments", label: "Rendez-vous", icon: CalendarRange },
  { to: "/provider/prescriptions", label: "Ordonnances", icon: FileText },
  { to: "/provider/reviews", label: "Avis", icon: Star },
  { to: "/provider/statistics", label: "Statistiques", icon: BarChart3 },
  { to: "/provider/notifications", label: "Notifications", icon: Bell },
  { to: "/provider/verification", label: "Vérification", icon: ShieldCheck },
  { to: "/provider/subscription", label: "Abonnement", icon: Crown },
  { to: "/provider/messages", label: "Messagerie", icon: MessagesSquare },
  { to: "/provider/settings", label: "Paramètres", icon: Settings },
];

const CATEGORY_LABEL: Record<string, string> = {
  doctor: "Médecin",
  dentist: "Dentiste",
  pharmacy: "Pharmacie",
  laboratory: "Laboratoire",
  clinic: "Clinique",
  hospital: "Hôpital",
  blood_center: "Centre de don",
};

function ProviderLayout() {
  const { provider, providers, isLoading } = useSelectedProvider();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (isLoading) return <Skeleton className="h-64 rounded-3xl" />;

  if (providers.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="Aucun établissement rattaché"
        description="Votre compte n'est lié à aucun cabinet, pharmacie, laboratoire ou hôpital. Contactez notre équipe pour activer votre espace prestataire."
        action={<Button asChild><Link to="/contact">Nous contacter</Link></Button>}
      />
    );
  }

  return (
    <div className="grid gap-4 lg:gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="space-y-3 lg:space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-3 shadow-soft lg:rounded-3xl lg:p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary/15 text-primary lg:h-12 lg:w-12 lg:rounded-2xl">
              {provider?.profile_image ? (
                <img src={provider.profile_image} alt="" className="h-full w-full object-cover" />
              ) : (
                <Stethoscope className="h-5 w-5 lg:h-6 lg:w-6" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{provider?.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {provider ? CATEGORY_LABEL[provider.category] ?? provider.category : ""}
              </p>
            </div>
            <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-1 lg:hidden">
              {provider?.is_verified ? (
                <BadgeCheck className="h-4 w-4 text-emerald-600" />
              ) : null}
              {provider?.is_premium ? <Crown className="h-4 w-4 text-amber-500" /> : null}
            </div>
          </div>
          <div className="mt-3 hidden flex-wrap gap-1.5 lg:flex">
            {provider?.is_verified ? (
              <Badge className="gap-1 border-0 bg-emerald-500/15 text-emerald-700">
                <BadgeCheck className="h-3 w-3" /> Vérifié
              </Badge>
            ) : (
              <Badge variant="secondary">Non vérifié</Badge>
            )}
            {provider?.is_premium ? <Badge className="bg-amber-500/15 text-amber-700 border-0"><Crown className="mr-1 h-3 w-3" />Premium</Badge> : null}
          </div>
          {providers.length > 1 ? (
            <Select value={provider?.id} onValueChange={(v) => setSelectedProviderId(v)}>
              <SelectTrigger className="mt-3 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>

        {/* Desktop nav */}
        <nav className="hidden flex-col gap-0.5 rounded-3xl border border-border bg-card p-2 shadow-soft lg:flex">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-primary text-primary-foreground shadow-soft" : "text-foreground hover:bg-muted",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Mobile horizontal tabs (sticky under top nav for easy access) */}
        <ScrollArea className="sticky top-16 z-10 -mx-4 bg-background/95 px-4 py-2 backdrop-blur lg:hidden">
          <div className="flex gap-1.5">
            {NAV.map((item) => {
              const active = item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to + "/");
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition-colors",
                    active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-muted",
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
        className="min-w-0"
      >
        <Outlet />
      </motion.main>
    </div>
  );
}