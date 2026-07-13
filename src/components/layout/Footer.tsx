import { Link } from "@tanstack/react-router";
import { legalNav } from "@/lib/nav";

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30 py-6 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-6 lg:pl-72">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6 lg:px-10">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} HealthLink Maroc. Tous droits réservés.
        </p>
        <nav aria-label="Mentions légales" className="flex flex-wrap items-center justify-center gap-4">
          {legalNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
