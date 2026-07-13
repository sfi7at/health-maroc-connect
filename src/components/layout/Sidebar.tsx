import { Link, useRouterState } from "@tanstack/react-router";
import { primaryNav, secondaryNav, footerNav } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useIsDoctor } from "@/hooks/use-active-role";
import { useIsAdmin } from "@/lib/admin";
import vytalmaLogo from "@/assets/vytalma-logo.png.asset.json";

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: isDoctor } = useIsDoctor();
  const { isStaff } = useIsAdmin();
  const filteredSecondary = secondaryNav.filter((i) =>
    i.requires === "doctor" ? !!isDoctor : i.requires === "admin" ? isStaff : true,
  );

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-border bg-sidebar lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src={vytalmaLogo.url}
            alt="Vytalma"
            className="h-9 w-9 rounded-xl object-cover shadow-soft"
          />
          <span className="text-lg font-bold tracking-tight">Vytalma</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <SidebarSection label="Services" items={primaryNav} pathname={pathname} />
        {filteredSecondary.length > 0 && (
          <SidebarSection label="Espace pro" items={filteredSecondary} pathname={pathname} className="mt-6" />
        )}
        <SidebarSection label="Aide" items={footerNav} pathname={pathname} className="mt-6" />
      </nav>

    </aside>
  );
}

function isActiveRoute(pathname: string, to: string, allTos: string[]): boolean {
  if (to === "/") return pathname === "/";
  if (pathname !== to && !pathname.startsWith(to + "/")) return false;
  // longer sibling prefix wins
  return !allTos.some(
    (other) => other !== to && other.startsWith(to + "/") && (pathname === other || pathname.startsWith(other + "/")),
  );
}

function SidebarSection({
  label,
  items,
  pathname,
  className,
}: {
  label: string;
  items: typeof primaryNav;
  pathname: string;
  className?: string;
}) {
  const allTos = items.map((i) => i.to);
  return (
    <div className={className}>
      <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <ul className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActiveRoute(pathname, item.to, allTos);
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/70 hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-colors",
                    active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                  )}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}