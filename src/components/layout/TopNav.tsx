import { Link } from "@tanstack/react-router";
import {
  Bell, LogOut, Menu, Search, User as UserIcon,
  Star, Settings as SettingsIcon, Stethoscope,
} from "lucide-react";
import { useState } from "react";
import { GlobalSearchDialog, useGlobalSearchHotkey } from "@/components/search/GlobalSearchDialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { primaryNav, secondaryNav, footerNav } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { RoleSwitch } from "@/components/layout/RoleSwitch";
import { useIsDoctor } from "@/hooks/use-active-role";
import { useIsAdmin } from "@/lib/admin";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import vytalmaLogo from "@/assets/vytalma-logo.png.asset.json";

export function TopNav() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  useGlobalSearchHotkey(setSearchOpen);

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-10">
        {/* Mobile: menu + brand */}
        <div className="flex items-center gap-2 lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Ouvrir le menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <MobileMenu onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <Link to="/" className="flex items-center gap-2">
            <img src={vytalmaLogo.url} alt="Vytalma" className="h-8 w-8 rounded-lg object-cover" />
            <span className="text-base font-bold tracking-tight">Vytalma</span>
          </Link>
        </div>

        {/* Search */}
        <div className="ml-auto flex flex-1 items-center justify-end gap-2 lg:ml-0">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="group relative hidden h-10 w-full max-w-md items-center gap-3 rounded-full border border-border bg-card px-4 text-left text-sm text-muted-foreground shadow-soft transition hover:border-primary/40 hover:text-foreground sm:flex"
          >
            <Search className="h-4 w-4" />
            <span>Rechercher un médecin, pharmacie, hôpital…</span>
            <kbd className="ml-auto hidden rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium md:inline">
              ⌘K
            </kbd>
          </button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Rechercher"
            className="sm:hidden"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-5 w-5" />
          </Button>
          <NotificationBell />
          <RoleSwitch />
          <AccountButton />
        </div>
      </div>
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}

function AccountButton() {
  return <AccountButtonInner />;
}

function NotificationBell() {
  const { user } = useAuth();
  if (!user) {
    return (
      <Button asChild variant="ghost" size="icon" aria-label="Notifications" className="relative">
        <Link to="/auth"><Bell className="h-5 w-5" /></Link>
      </Button>
    );
  }
  return <NotificationBellAuthed />;
}

function NotificationBellAuthed() {
  const { unreadCount, hasUrgent } = useNotifications();
  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      aria-label={`Notifications (${unreadCount} non lues)`}
      className="relative"
    >
      <Link to="/notifications">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            className={`absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold text-white ${
              hasUrgent ? "bg-destructive animate-pulse" : "bg-primary"
            }`}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Link>
    </Button>
  );
}

function AccountButtonInner() {
  const { user, loading } = useAuth();
  const { data: isDoctor } = useIsDoctor();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  if (loading) {
    return <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />;
  }

  if (!user) {
    return (
      <Button asChild size="sm" className="rounded-full">
        <Link to="/auth">Connexion</Link>
      </Button>
    );
  }

  const meta = (user.user_metadata ?? {}) as { full_name?: string; avatar_url?: string };
  const name = meta.full_name || user.email || "Compte";
  const fallback = name.slice(0, 2).toUpperCase();

  const onSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Déconnecté");
    navigate({ to: "/", replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Compte"
          className="grid h-9 w-9 place-items-center rounded-full ring-1 ring-border transition hover:ring-primary/40"
        >
          <Avatar className="h-9 w-9">
            {meta.avatar_url ? <AvatarImage src={meta.avatar_url} alt={name} /> : null}
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {fallback}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile" className="cursor-pointer gap-2">
            <UserIcon className="h-4 w-4" /> Profil médical
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/notifications" className="cursor-pointer gap-2">
            <Bell className="h-4 w-4" /> Notifications
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/favorites" className="cursor-pointer gap-2">
            <Star className="h-4 w-4" /> Favoris
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings" className="cursor-pointer gap-2">
            <SettingsIcon className="h-4 w-4" /> Paramètres
          </Link>
        </DropdownMenuItem>
        {isDoctor ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/provider" className="cursor-pointer gap-2">
                <Stethoscope className="h-4 w-4" /> Espace Pro
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut} className="cursor-pointer gap-2 text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4" /> Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileMenu({ onNavigate }: { onNavigate: () => void }) {
  const { data: isDoctor } = useIsDoctor();
  const { isStaff } = useIsAdmin();
  const filteredSecondary = secondaryNav.filter((i) =>
    i.requires === "doctor" ? !!isDoctor : i.requires === "admin" ? isStaff : true,
  );
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <img src={vytalmaLogo.url} alt="Vytalma" className="h-9 w-9 rounded-xl object-cover shadow-soft" />
        <span className="text-lg font-bold tracking-tight">Vytalma</span>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <MenuGroup label="Services" items={primaryNav} onNavigate={onNavigate} />
        {filteredSecondary.length > 0 && (
          <MenuGroup label="Espace pro" items={filteredSecondary} onNavigate={onNavigate} className="mt-5" />
        )}
        <MenuGroup label="Aide" items={footerNav} onNavigate={onNavigate} className="mt-5" />
      </nav>
    </div>
  );
}

function MenuGroup({
  label,
  items,
  onNavigate,
  className,
}: {
  label: string;
  items: typeof primaryNav;
  onNavigate: () => void;
  className?: string;
}) {
  return (
    <div className={cn(className)}>
      <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <ul className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                onClick={onNavigate}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-accent"
              >
                <Icon className="h-[18px] w-[18px] text-muted-foreground" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}