import { CATEGORY_LIST } from "@/lib/categories";
import type { ProviderCategory } from "@/lib/format";
import { cn } from "@/lib/utils";

interface CategoryChipsProps {
  value: ProviderCategory | "all";
  onChange: (value: ProviderCategory | "all") => void;
  options?: (ProviderCategory | "all")[];
}

export function CategoryChips({ value, onChange, options }: CategoryChipsProps) {
  const items: (ProviderCategory | "all")[] =
    options ?? ["all", ...CATEGORY_LIST.map((c) => c.value)];
  return (
    <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {items.map((v) => {
        const meta = v === "all" ? null : CATEGORY_LIST.find((c) => c.value === v);
        const Icon = meta?.icon;
        const active = v === value;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition",
              active
                ? "border-transparent bg-foreground text-background"
                : "border-border bg-card text-foreground hover:bg-accent/40",
            )}
          >
            {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
            {v === "all" ? "Tous" : meta?.pluralLabel}
          </button>
        );
      })}
    </div>
  );
}