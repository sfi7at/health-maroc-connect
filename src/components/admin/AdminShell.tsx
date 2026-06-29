import { type ReactNode, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Stethoscope, Pill, Building2, FlaskConical,
  Droplet, CalendarCheck, FileText, Bell, Flag, Star, Tags, MapPin,
  Settings, Activity, BarChart3, ShieldCheck, Search, Menu, X, LogOut,
  Upload, History, PencilLine, Database, Gauge, GitBranch,
  HelpCircle, TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useIsAdmin, STAFF_ROLE_LABELS } from "@/lib/admin";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface NavGroup {
  label: string;
  items: { to: string; label: string; icon: LucideIcon }[];
}

const NAV: NavGroup[] = [
  {
    label: "Aperçu",
    items: [
      { to: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
      { to: "/admin/analytics", label: "Analytique", icon: BarChart3 },
    ],
  },
  {
    label: "Communauté",
    items: [
      { to: "/admin/users", label: "Utilisateurs", icon: Users },
      { to: "/admin/providers", label: "Prestataires", icon: Stethoscope },
      { to: "/admin/verification", label: "Vérifications", icon: ShieldCheck },
      { to: "/admin/reviews", label: "Avis", icon: Star },
      { to: "/admin/reports", label: "Signalements", icon: Flag },
    ],
  },
  {
    label: "Opérations",
    items: [
      { to: "/admin/appointments", label: "Rendez-vous", icon: CalendarCheck },
      { to: "/admin/blood", label: "Don du sang", icon: Droplet },
      { to: "/admin/articles", label: "Articles & CMS", icon: FileText },
      { to: "/admin/faqs", label: "FAQ", icon: HelpCircle },
      { to: "/admin/content-analytics", label: "Analytique contenu", icon: TrendingUp },
      { to: "/admin/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Configuration",
    items: [
      { to: "/admin/cities", label: "Villes & Régions", icon: MapPin },
      { to: "/admin/categories", label: "Spécialités", icon: Tags },
      { to: "/admin/settings", label: "Paramètres", icon: Settings },
      { to: "/admin/logs", label: "Journaux", icon: Activity },
    ],
  },
  {
    label: "Moteur de données",
    items: [
      { to: "/admin/import", label: "Centre d'import", icon: Upload },
      { to: "/admin/imports", label: "Historique imports", icon: History },
      { to: "/admin/master-data", label: "Données maîtres", icon: Database },
      { to: "/admin/quality", label: "Qualité des données", icon: Gauge },
      { to: "/admin/claims", label: "Revendications", icon: ShieldCheck },
      { to: "/admin/edits", label: "Corrections suggérées", icon: PencilLine },
      { to: "/admin/versions", label: "Versions", icon: GitBranch },
    ],
  },
];

function NavLink({ to, label, icon: Icon, collapsed, onNav }: { to: string; label: string; icon: LucideIcon; collapsed?: boolean; onNav?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const active = to === "/admin" ? path === "/admin" : path.startsWith(to);
  return (
    <Link
      to={to}
      onClick={onNav}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all",
        active
          ? "bg-primary/10 text-primary shadow-sm"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

function SidebarContents({ onNav }: { onNav?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-1 overflow-y-auto px-3 py-4">
      <Link to="/admin" onClick={onNav} className="mb-4 flex items-center gap-3 px-2">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-primary to-emerald-600 text-primary-foreground shadow-lg">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-bold leading-tight">HealthLink</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Console admin</div>
        </div>
      </Link>
      {NAV.map((group) => (
        <div key={group.label} className="mt-3">
          <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            {group.label}
          </div>
          <div className="space-y-0.5">
            {group.items.map((it) => (
              <NavLink key={it.to} {...it} onNav={onNav} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { roles } = useIsAdmin();
  const initials = (user?.email ?? "A").slice(0, 2).toUpperCase();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur lg:px-8">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenMenu}>
        <Menu className="h-5 w-5" />
      </Button>
      <div className="relative hidden flex-1 max-w-xl md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Rechercher utilisateurs, prestataires, articles…" className="pl-9 bg-muted/40 border-0" />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition">
          ← Retour à l'app
        </Link>
        <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-2 py-1">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="hidden text-xs sm:block">
            <div className="font-medium leading-tight">{user?.email}</div>
            <div className="text-muted-foreground">{roles.map((r) => STAFF_ROLE_LABELS[r]).join(" · ") || "Staff"}</div>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut} title="Déconnexion">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isStaff, isLoading } = useIsAdmin();

  if (isLoading) {
    return (
      <div className="min-h-dvh grid place-items-center bg-background">
        <div className="space-y-3 w-72">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="min-h-dvh grid place-items-center bg-background p-6">
        <div className="max-w-md text-center space-y-4 rounded-3xl border border-border bg-card p-8 shadow-xl">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">Accès refusé</h1>
          <p className="text-muted-foreground">
            Cette console est réservée aux administrateurs. Si vous pensez qu'il s'agit d'une erreur, contactez l'équipe HealthLink Maroc.
          </p>
          <Badge variant="outline">403 — Forbidden</Badge>
          <div>
            <Button asChild className="mt-2"><Link to="/">Retour à l'accueil</Link></Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-muted/20 text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-border bg-background lg:block">
        <SidebarContents />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-background shadow-2xl">
            <div className="flex items-center justify-end p-2">
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <SidebarContents onNav={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-72">
        <TopBar onOpenMenu={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

/** Standard admin page header. */
export function AdminHeader({ title, description, icon: Icon, actions, badge }: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  badge?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            {badge && <Badge variant="secondary">{badge}</Badge>}
          </div>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, hint, accent = "primary" }: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  accent?: "primary" | "info" | "warning" | "destructive" | "success";
}) {
  const accents: Record<string, string> = {
    primary: "from-primary/10 to-primary/5 text-primary",
    info: "from-blue-500/10 to-blue-500/5 text-blue-600",
    warning: "from-amber-500/10 to-amber-500/5 text-amber-600",
    destructive: "from-destructive/10 to-destructive/5 text-destructive",
    success: "from-emerald-500/10 to-emerald-500/5 text-emerald-600",
  };
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-lg">
      <div className={cn("absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-60 blur-2xl", accents[accent])} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn("grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br", accents[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}