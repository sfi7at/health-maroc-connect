import { ChevronLeft, ChevronRight, CalendarDays, CalendarRange, CalendarClock, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CalendarMode } from "./CalendarView";
import { cn } from "@/lib/utils";

const MODES: { value: CalendarMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "day", label: "Jour", icon: CalendarClock },
  { value: "week", label: "Semaine", icon: CalendarRange },
  { value: "month", label: "Mois", icon: CalendarDays },
  { value: "agenda", label: "Agenda", icon: List },
];

export function CalendarControls({
  mode,
  setMode,
  cursor,
  setCursor,
}: {
  mode: CalendarMode;
  setMode: (m: CalendarMode) => void;
  cursor: Date;
  setCursor: (d: Date) => void;
}) {
  const shift = (n: number) => {
    const d = new Date(cursor);
    if (mode === "day") d.setDate(d.getDate() + n);
    else if (mode === "week") d.setDate(d.getDate() + 7 * n);
    else if (mode === "month") d.setMonth(d.getMonth() + n);
    else d.setDate(d.getDate() + 7 * n);
    setCursor(d);
  };
  const title = mode === "month"
    ? cursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    : cursor.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shift(-1)} aria-label="Précédent">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8" onClick={() => setCursor(new Date())}>Aujourd'hui</Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shift(1)} aria-label="Suivant">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <span className="text-sm font-semibold capitalize text-foreground">{title}</span>
      <div className="ml-auto flex items-center gap-1 rounded-xl border border-border bg-card p-1">
        {MODES.map((m) => (
          <Button
            key={m.value}
            variant="ghost"
            size="sm"
            onClick={() => setMode(m.value)}
            className={cn("h-8 gap-1", mode === m.value && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground")}
          >
            <m.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{m.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}