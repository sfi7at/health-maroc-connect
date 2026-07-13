import { type ReactNode, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  UserCog,
  Images,
  Clock4,
  Briefcase,
  CalendarRange,
  Star,
  BarChart3,
  Bell,
  ShieldCheck,
  Crown,
  MessagesSquare,
  Settings,
  Stethoscope,
  BadgeCheck,
  FileText,
  Menu,
  Search,
  Plus,
  ChevronDown,
  Home,
  MoreHorizontal,
  LogOut,
  ExternalLink,
  Building2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { useSelectedProvider, setSelectedProviderId } from "@/lib/provider-store";
import { useNotifications } from "@/hooks/use-notifications";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/Logo";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };

const NAV_SECTIONS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Aujourd'hui",
    items: [
      { to: "/provider", label: "Vue d'ensemble", icon: LayoutDashboard, exact: true },
      { to: "/provider/appointments", label: "Rendez-vous", icon: CalendarRange },
      { to: "/provider/messages", label: "Messagerie", icon: MessagesSquare },
    ],
  },
  {
    label: "Cabinet",
    items: [
      { to: "/provider/hours", label: "Horaires", icon: Clock4 },
      { to: "/provider/services", label: "Services & tarifs", icon: Briefcase },
      { to: "/provider/profile", label: "Profil public", icon: UserCog },
      { to: "/provider/gallery", label: "Galerie", icon: Images },
    ],
  },
  {
    label: "Patients",
    items: [
      { to: "/provider/prescriptions", label: "Ordonnances", icon: FileText },
      { to: "/provider/reviews", label: "Avis patients", icon: Star },
    ],
  },
  {
    label: "Pilotage",
    items: [
      { to: "/provider/statistics", label: "Statistiques", icon: BarChart3 },
      { to: "/provider/notifications", label: "Notifications", icon: Bell },
      { to: "/provider/verification", label: "Vérification", icon: ShieldCheck },
      { to: "/provider/subscription", label: "Abonnement", icon: Crown },
      { to: "/provider/settings", label: "Paramètres", icon: Settings },
    ],
  },
];

const ALL_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);

const BOTTOM_TABS: NavItem[] = [
  { to: "/provider", label: "Accueil", icon: LayoutDashboard, exact: true },
  { to: "/provider/appointments", label: "RDV", icon: CalendarRange },
  { to: "/provider/messages", label: "Msgs", icon: MessagesSquare },
  { to: "/provider/prescriptions", label: "Ordonn.", icon: FileText },
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

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(item.to + "/");
}

function currentPageLabel(pathname: string): string {
  const match = ALL_ITEMS.find((i) => isActive(pathname, i));
  return match?.label ?? "Espace pro";
}

export function PortalShell({ children }: { children: ReactNode }) {
  const { provider, providers, isLoading } = useSelectedProvider();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-muted/30 p-4 sm:p-6">
        <Skeleton className="h-16 rounded-3xl" />
        <Skeleton className="mt-4 h-96 rounded-3xl" />
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <div className="grid min-h-dvh place-items-center bg-muted/30 px-4">
        <EmptyState
          icon={Building2}
          title="Aucun établissement rattaché"
          description="Votre compte n'est lié à aucun cabinet, pharmacie, laboratoire ou hôpital. Contactez notre équipe pour activer votre espace prestataire."
          action={
            <Button asChild>
              <Link to="/contact">Nous contacter</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-muted/30 text-foreground">
      {/* Desktop sidebar */}
      <DesktopSidebar pathname={pathname} />

      <div className="lg:pl-72">
        <PortalTopBar
          pathname={pathname}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />

        <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-4 sm:px-6 sm:pt-6 lg:px-10 lg:pb-12">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileBottomNav pathname={pathname} onMore={() => setMobileNavOpen(true)} />

      {/* Mobile "Plus" drawer with full nav */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[85vw] max-w-sm p-0">
          <SheetHeader className="border-b border-border p-4">
            <SheetTitle>Espace pro</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-1 overflow-y-auto p-3">
            <ProviderCard
              provider={provider}
              providers={providers}
              onSelect={(id) => {
                setSelectedProviderId(id);
                setMobileNavOpen(false);
              }}
            />
            <nav aria-label="Navigation portail" className="mt-3 flex flex-col gap-4">
              {NAV_SECTIONS.map((section) => (
                <div key={section.label}>
                  <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.label}
                  </p>
                  <div className="flex flex-col">
                    {section.items.map((item) => (
                      <NavLink
                        key={item.to}
                        item={item}
                        active={isActive(pathname, item)}
                        onClick={() => setMobileNavOpen(false)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DesktopSidebar({ pathname }: { pathname: string }) {
  const { provider, providers } = useSelectedProvider();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-border bg-card lg:flex">
      <div className="border-b border-border p-4">
        <Link to="/" className="flex items-center gap-2 text-sm font-bold">
          <Logo className="h-9 w-9" />
          <span className="flex flex-col leading-tight">
            <span className="text-[15px] font-black tracking-tight">Vytalma</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Espace pro
            </span>
          </span>
        </Link>
      </div>

      <div className="border-b border-border p-3">
        <ProviderCard
          provider={provider}
          providers={providers}
          onSelect={(id) => setSelectedProviderId(id)}
        />
      </div>

      <nav
        aria-label="Navigation portail"
        className="flex flex-1 flex-col gap-4 overflow-y-auto p-3"
      >
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {section.label}
            </p>
            <div className="flex flex-col">
              {section.items.map((item) => (
                <NavLink key={item.to} item={item} active={isActive(pathname, item)} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
        >
          <Home className="h-4 w-4" />
          Retour à l'app patient
        </Link>
      </div>
    </aside>
  );
}

function NavLink({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-soft"
          : "text-foreground hover:bg-muted",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function ProviderCard({
  provider,
  providers,
  onSelect,
}: {
  provider: ReturnType<typeof useSelectedProvider>["provider"];
  providers: ReturnType<typeof useSelectedProvider>["providers"];
  onSelect: (id: string) => void;
}) {
  if (!provider) return null;
  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-3">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary/15 text-primary">
          {provider.profile_image ? (
            <img src={provider.profile_image} alt="" className="h-full w-full object-cover" />
          ) : (
            <Stethoscope className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{provider.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {CATEGORY_LABEL[provider.category] ?? provider.category}
          </p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {provider.is_verified ? (
          <Badge className="gap-1 border-0 bg-emerald-500/15 text-emerald-700">
            <BadgeCheck className="h-3 w-3" /> Vérifié
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">
            Non vérifié
          </Badge>
        )}
        {provider.is_premium ? (
          <Badge className="gap-1 border-0 bg-amber-500/15 text-amber-700">
            <Crown className="h-3 w-3" /> Premium
          </Badge>
        ) : null}
      </div>
      {providers.length > 1 ? (
        <Select value={provider.id} onValueChange={onSelect}>
          <SelectTrigger className="mt-2 h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {providers.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );
}

function PortalTopBar({
  pathname,
  onOpenMobileNav,
}: {
  pathname: string;
  onOpenMobileNav: () => void;
}) {
  const label = currentPageLabel(pathname);
  const { unreadCount } = useNotifications();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-2 px-4 sm:h-16 sm:px-6 lg:px-10">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onOpenMobileNav}
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Espace pro
          </p>
          <h1 className="truncate text-base font-black sm:text-lg">{label}</h1>
        </div>

        {/* Quick create */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="gap-1.5 rounded-full">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nouveau</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Créer</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/provider/prescriptions/new">
                <FileText className="mr-2 h-4 w-4" /> Nouvelle ordonnance
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/provider/services">
                <Briefcase className="mr-2 h-4 w-4" /> Nouveau service
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/provider/hours">
                <Clock4 className="mr-2 h-4 w-4" /> Modifier les horaires
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Search (desktop) */}
        <Link
          to="/search"
          className="hidden h-9 items-center gap-2 rounded-full border border-border bg-card px-3 text-xs text-muted-foreground hover:bg-muted md:flex"
        >
          <Search className="h-3.5 w-3.5" />
          Rechercher
        </Link>

        {/* Notifications */}
        <Button asChild variant="ghost" size="icon" className="relative">
          <Link to="/notifications" aria-label="Notifications">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 ? (
              <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </Link>
        </Button>

        {/* Account */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Compte">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                {(user?.email ?? "?").slice(0, 1).toUpperCase()}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/provider/settings">
                <Settings className="mr-2 h-4 w-4" /> Paramètres
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/">
                <ExternalLink className="mr-2 h-4 w-4" /> Espace patient
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                void supabase.auth.signOut();
              }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function MobileBottomNav({
  pathname,
  onMore,
}: {
  pathname: string;
  onMore: () => void;
}) {
  return (
    <nav
      aria-label="Navigation portail mobile"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid h-16 grid-cols-5">
        {BOTTOM_TABS.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item);
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.4]")} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={onMore}
            className="flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>Plus</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}