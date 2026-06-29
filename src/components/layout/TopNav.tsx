import { Link } from "@tanstack/react-router";
import { Bell, Heart, Menu, Search } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { primaryNav, secondaryNav, footerNav } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function TopNav() {
  const [open, setOpen] = useState(false);

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
            <div className="grid h-8 w-8 place-items-center rounded-lg gradient-primary text-primary-foreground">
              <Heart className="h-4 w-4" fill="currentColor" />
            </div>
            <span className="text-sm font-bold tracking-tight">HealthLink</span>
          </Link>
        </div>

        {/* Search */}
        <div className="ml-auto flex flex-1 items-center justify-end gap-2 lg:ml-0">
          <Link
            to="/search"
            className="group relative hidden h-10 w-full max-w-md items-center gap-3 rounded-full border border-border bg-card px-4 text-sm text-muted-foreground shadow-soft transition hover:border-primary/40 hover:text-foreground sm:flex"
          >
            <Search className="h-4 w-4" />
            <span>Rechercher un médecin, pharmacie, hôpital…</span>
            <kbd className="ml-auto hidden rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium md:inline">
              ⌘K
            </kbd>
          </Link>
          <Link to="/search" className="sm:hidden">
            <Button variant="ghost" size="icon" aria-label="Rechercher">
              <Search className="h-5 w-5" />
            </Button>
          </Link>
          <Link to="/notifications">
            <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

function MobileMenu({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <div className="grid h-9 w-9 place-items-center rounded-xl gradient-primary text-primary-foreground">
          <Heart className="h-5 w-5" fill="currentColor" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-base font-bold tracking-tight">HealthLink</span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Maroc
          </span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <MenuGroup label="Services" items={primaryNav} onNavigate={onNavigate} />
        <MenuGroup label="Compte" items={secondaryNav} onNavigate={onNavigate} className="mt-5" />
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