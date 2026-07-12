import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Mobile-only sticky bar that sits ABOVE the BottomNav (`h-16 = 4rem`).
 * Safe-area aware. Hidden on `lg` where the desktop sidebar is visible.
 *
 * Pair with `pb-24` on the page container so the last content isn't hidden
 * behind this bar (AppShell already adds the BottomNav clearance).
 */
export function StickyMobileCTA({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 z-20 border-t border-border bg-background/95 backdrop-blur-xl lg:hidden",
        "px-4 py-3",
        className,
      )}
      style={{
        bottom: "calc(4rem + env(safe-area-inset-bottom))",
      }}
    >
      <div className="mx-auto flex max-w-3xl items-center gap-2 [&>*]:flex-1">
        {children}
      </div>
    </div>
  );
}