import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { mobileBottomNav } from "@/lib/nav";
import { cn } from "@/lib/utils";

function isActiveRoute(pathname: string, to: string, allTos: string[]): boolean {
  if (to === "/") return pathname === "/";
  if (pathname !== to && !pathname.startsWith(to + "/")) return false;
  return !allTos.some(
    (other) => other !== to && other.startsWith(to + "/") && (pathname === other || pathname.startsWith(other + "/")),
  );
}

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const allTos = mobileBottomNav.map((i) => i.to);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const y = window.scrollY;
        const dy = y - lastY.current;
        if (Math.abs(dy) > 6) {
          // Never hide near the top; hide on scroll-down, show on scroll-up
          setHidden(y > 120 && dy > 0);
          lastY.current = y;
        }
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      aria-label="Navigation principale"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur-xl transition-transform duration-200 ease-out lg:hidden",
        hidden ? "translate-y-full" : "translate-y-0",
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid h-16 grid-cols-5">
        {mobileBottomNav.map((item) => {
          const Icon = item.icon;
          const active = isActiveRoute(pathname, item.to, allTos);
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={cn(
                  "flex h-full min-h-[44px] flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.4]")} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}