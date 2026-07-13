import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Responsive profile hero.
 *
 * Mobile (<640px): avatar sits on its own row on top of the cover, then a
 *   stacked title/badges/meta block, then a full-width action row.
 * Tablet+ (≥640px): avatar + text align to the bottom-left of the cover,
 *   actions align to the right.
 *
 * Uses `min-w-0` + `truncate` + `shrink-0` guards so nothing collides on
 * narrow screens (per project responsive-layout-patterns rule).
 */
export interface PageHeroProps {
  cover?: ReactNode;
  coverGradientClass?: string;
  avatar: ReactNode;
  badges?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function PageHero({
  cover,
  coverGradientClass = "bg-gradient-to-br from-emerald-500 to-teal-600",
  avatar,
  badges,
  title,
  subtitle,
  meta,
  actions,
  footer,
  className,
}: PageHeroProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border bg-card shadow-soft",
        className,
      )}
    >
      <div className={cn("relative h-40 sm:h-56", coverGradientClass)}>
        {cover}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
      </div>

      <div className="relative -mt-14 px-4 pb-5 sm:-mt-16 sm:px-8 sm:pb-8">
        {/* Mobile & narrow desktop: stack. Wide (xl+): avatar + text on the
            left, actions on the right — prevents icon buttons from being
            clipped when the sidebar constrains the content width. */}
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between xl:gap-6">
          {/* Always stack avatar on top of the text block until xl. Going
              horizontal earlier pulls the title UP into the cover image
              whenever the sidebar constrains the available width. */}
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:gap-4 min-w-0">
            <div className="shrink-0">{avatar}</div>
            <div className="min-w-0 xl:pb-1">
              {badges ? (
                <div className="flex flex-wrap items-center gap-1.5">{badges}</div>
              ) : null}
              <h1 className="mt-1.5 text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
              ) : null}
              {meta ? <div className="mt-2">{meta}</div> : null}
            </div>
          </div>
          {actions ? (
            <div className="w-full xl:w-auto xl:shrink-0">{actions}</div>
          ) : null}
        </div>

        {footer}
      </div>
    </section>
  );
}