import { CATEGORIES } from "@/lib/categories";
import type { ProviderCategory } from "@/lib/format";
import { CATEGORY_COLORS } from "@/lib/map-utils";
import { Droplet, Pill, BadgeCheck, Clock, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export type FilterKey =
  | ProviderCategory
  | "pharmacy_on_duty"
  | "blood_request"
  | "verified"
  | "open_now"
  | "favorites";

export interface MapFiltersState {
  cats: Set<FilterKey>;
}

export const DEFAULT_FILTERS = (): MapFiltersState => ({
  cats: new Set<FilterKey>([
    "doctor",
    "dentist",
    "pharmacy",
    "hospital",
    "clinic",
    "laboratory",
    "blood_center",
    "blood_request",
  ]),
});

interface Chip {
  key: FilterKey;
  label: string;
  color?: string;
  icon?: typeof Pill;
}

const PROVIDER_CHIPS: Chip[] = (Object.keys(CATEGORIES) as ProviderCategory[]).map((k) => ({
  key: k,
  label: CATEGORIES[k].pluralLabel,
  color: CATEGORY_COLORS[k],
}));

const EXTRA_CHIPS: Chip[] = [
  { key: "pharmacy_on_duty", label: "Pharmacies de garde", color: CATEGORY_COLORS.pharmacy, icon: Pill },
  { key: "blood_request", label: "Demandes de sang", color: CATEGORY_COLORS.blood_request, icon: Droplet },
];

const MODIFIERS: Chip[] = [
  { key: "verified", label: "Vérifiés", icon: BadgeCheck },
  { key: "open_now", label: "Ouvert maintenant", icon: Clock },
  { key: "favorites", label: "Favoris", icon: Star },
];

interface Props {
  value: MapFiltersState;
  onChange: (next: MapFiltersState) => void;
}

export function MapFilters({ value, onChange }: Props) {
  const toggle = (key: FilterKey) => {
    const next = new Set(value.cats);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange({ cats: next });
  };

  const renderChip = (c: Chip) => {
    const active = value.cats.has(c.key);
    const Icon = c.icon;
    return (
      <button
        key={c.key}
        type="button"
        onClick={() => toggle(c.key)}
        aria-pressed={active}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
          active
            ? "border-transparent bg-foreground text-background shadow-soft"
            : "border-border bg-card text-foreground hover:bg-muted",
        )}
      >
        {Icon ? (
          <Icon className="h-3.5 w-3.5" aria-hidden />
        ) : c.color ? (
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: c.color }}
            aria-hidden
          />
        ) : null}
        {c.label}
      </button>
    );
  };

  return (
    <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
      {PROVIDER_CHIPS.map(renderChip)}
      <span className="mx-1 my-auto h-5 w-px bg-border" aria-hidden />
      {EXTRA_CHIPS.map(renderChip)}
      <span className="mx-1 my-auto h-5 w-px bg-border" aria-hidden />
      {MODIFIERS.map(renderChip)}
    </div>
  );
}