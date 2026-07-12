import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Responsive action row.
 *
 * Mobile: primary is full-width on its own row; secondary + icons share a
 *   second row.
 * Tablet+: everything sits inline, primary first.
 *
 * Wrap children with `data-primary`, `data-secondary`, or `data-icons`
 * attributes when using the slot variant; or use the composable
 * `<ActionBar.Primary>` / `<ActionBar.Secondary>` / `<ActionBar.Icons>` shells.
 */
export function ActionBar({
  primary,
  secondary,
  icons,
  className,
}: {
  primary?: ReactNode;
  secondary?: ReactNode;
  icons?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2",
        className,
      )}
    >
      {primary ? (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row [&>*]:w-full sm:[&>*]:w-auto">
          {primary}
        </div>
      ) : null}
      {secondary || icons ? (
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          {secondary}
          {icons}
        </div>
      ) : null}
    </div>
  );
}