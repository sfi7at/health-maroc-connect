import { addDays, dateToIsoDate, WEEKDAYS_SHORT_FR } from "@/lib/appointments";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DateScroller({
  value,
  onChange,
  days = 21,
  disabled,
}: {
  value: string;
  onChange: (iso: string) => void;
  days?: number;
  disabled?: (iso: string) => boolean;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const items = Array.from({ length: days }).map((_, i) => addDays(today, i));
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
      {items.map((d) => {
        const iso = dateToIsoDate(d);
        const active = iso === value;
        const dis = disabled?.(iso) ?? false;
        return (
          <Button
            key={iso}
            type="button"
            variant={active ? "default" : "outline"}
            disabled={dis}
            onClick={() => onChange(iso)}
            className={cn(
              "h-auto min-w-[64px] flex-col gap-0.5 rounded-2xl px-2 py-2",
              active && "ring-2 ring-primary/30",
            )}
          >
            <span className="text-[10px] uppercase tracking-wide">{WEEKDAYS_SHORT_FR[d.getDay()]}</span>
            <span className="text-lg font-semibold leading-none">{d.getDate()}</span>
            <span className="text-[10px] opacity-70">{d.toLocaleDateString("fr-FR", { month: "short" })}</span>
          </Button>
        );
      })}
    </div>
  );
}