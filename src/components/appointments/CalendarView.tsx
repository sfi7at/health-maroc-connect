import { useMemo } from "react";
import { addDays, startOfWeek, WEEKDAYS_SHORT_FR, type AppointmentRow } from "@/lib/appointments";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { StatusBadge } from "./StatusBadge";

export type CalendarMode = "day" | "week" | "month" | "agenda";

export function CalendarView({
  mode,
  cursor,
  appointments,
  onPickDay,
}: {
  mode: CalendarMode;
  cursor: Date;
  appointments: AppointmentRow[];
  onPickDay?: (d: Date) => void;
}) {
  if (mode === "agenda") return <AgendaView appointments={appointments} />;
  if (mode === "month") return <MonthView cursor={cursor} appointments={appointments} onPickDay={onPickDay} />;
  if (mode === "week") return <WeekView cursor={cursor} appointments={appointments} />;
  return <DayView cursor={cursor} appointments={appointments} />;
}

function groupByDay(items: AppointmentRow[]): Map<string, AppointmentRow[]> {
  const map = new Map<string, AppointmentRow[]>();
  for (const a of items) {
    const key = new Date(a.scheduled_for).toISOString().slice(0, 10);
    const arr = map.get(key) ?? [];
    arr.push(a);
    map.set(key, arr);
  }
  return map;
}

function AgendaView({ appointments }: { appointments: AppointmentRow[] }) {
  const sorted = [...appointments].sort((a, b) => +new Date(a.scheduled_for) - +new Date(b.scheduled_for));
  if (sorted.length === 0) return <Empty />;
  const grouped = groupByDay(sorted);
  return (
    <div className="space-y-5">
      {[...grouped.entries()].map(([day, items]) => (
        <section key={day} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {new Date(`${day}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" })}
          </h3>
          <ul className="grid gap-2">
            {items.map((a) => (
              <li key={a.id}>
                <Link
                  to="/appointments/$id"
                  params={{ id: a.id }}
                  className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-3 hover:border-primary/40"
                >
                  <span className="font-mono text-sm font-semibold text-primary">
                    {new Date(a.scheduled_for).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{a.providers?.name ?? "Prestataire"}</span>
                    <span className="block truncate text-xs text-muted-foreground">{a.provider_services?.name ?? a.reason ?? "Consultation"}</span>
                  </span>
                  <StatusBadge status={a.status} className="hidden sm:inline-flex" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function DayView({ cursor, appointments }: { cursor: Date; appointments: AppointmentRow[] }) {
  const dayKey = cursor.toISOString().slice(0, 10);
  const items = appointments.filter((a) => a.scheduled_for.startsWith(dayKey));
  const hours = Array.from({ length: 13 }).map((_, i) => 8 + i);
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border bg-muted/30 p-3 text-sm font-semibold capitalize">
        {cursor.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
      </div>
      <div className="grid grid-cols-[60px_minmax(0,1fr)]">
        {hours.map((h) => {
          const hourItems = items.filter((a) => new Date(a.scheduled_for).getHours() === h);
          return (
            <div key={h} className="contents">
              <div className="border-b border-border/60 p-2 text-right text-xs text-muted-foreground">{String(h).padStart(2, "0")}:00</div>
              <div className="min-h-12 border-b border-l border-border/60 p-1.5">
                {hourItems.map((a) => (
                  <Link
                    key={a.id}
                    to="/appointments/$id"
                    params={{ id: a.id }}
                    className="mb-1 block truncate rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                  >
                    {new Date(a.scheduled_for).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · {a.providers?.name ?? "Patient"}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ cursor, appointments }: { cursor: Date; appointments: AppointmentRow[] }) {
  const start = startOfWeek(cursor);
  const days = Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  const byDay = groupByDay(appointments);
  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((d) => {
        const key = d.toISOString().slice(0, 10);
        const items = byDay.get(key) ?? [];
        const isToday = key === new Date().toISOString().slice(0, 10);
        return (
          <div key={key} className={cn("min-h-40 rounded-2xl border bg-card p-2", isToday ? "border-primary/40" : "border-border")}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] uppercase text-muted-foreground">{WEEKDAYS_SHORT_FR[d.getDay()]}</span>
              <span className={cn("text-sm font-semibold", isToday && "text-primary")}>{d.getDate()}</span>
            </div>
            <ul className="space-y-1">
              {items.slice(0, 4).map((a) => (
                <li key={a.id}>
                  <Link
                    to="/appointments/$id"
                    params={{ id: a.id }}
                    className="block truncate rounded-md bg-primary/10 px-1.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/20"
                  >
                    {new Date(a.scheduled_for).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} {a.providers?.name?.split(" ")[0]}
                  </Link>
                </li>
              ))}
              {items.length > 4 ? <li className="text-[10px] text-muted-foreground">+{items.length - 4}</li> : null}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function MonthView({ cursor, appointments, onPickDay }: { cursor: Date; appointments: AppointmentRow[]; onPickDay?: (d: Date) => void }) {
  const grid = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = startOfWeek(first);
    return Array.from({ length: 42 }).map((_, i) => addDays(start, i));
  }, [cursor]);
  const byDay = groupByDay(appointments);
  const monthIndex = cursor.getMonth();
  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-2 text-center text-[10px] uppercase tracking-wide text-muted-foreground">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {grid.map((d) => {
          const key = d.toISOString().slice(0, 10);
          const items = byDay.get(key) ?? [];
          const inMonth = d.getMonth() === monthIndex;
          const isToday = key === new Date().toISOString().slice(0, 10);
          return (
            <motion.button
              key={key}
              whileHover={{ y: -1 }}
              type="button"
              onClick={() => onPickDay?.(d)}
              className={cn(
                "min-h-20 rounded-xl border p-1.5 text-left transition",
                inMonth ? "border-border bg-card" : "border-transparent bg-muted/30",
                isToday && "ring-2 ring-primary/40",
              )}
            >
              <div className={cn("text-xs font-semibold", !inMonth && "text-muted-foreground/60", isToday && "text-primary")}>{d.getDate()}</div>
              <div className="mt-1 flex flex-wrap gap-0.5">
                {items.slice(0, 3).map((a) => (
                  <span key={a.id} className="h-1.5 w-1.5 rounded-full bg-primary" />
                ))}
                {items.length > 3 ? <span className="text-[10px] text-muted-foreground">+{items.length - 3}</span> : null}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
      Aucun rendez-vous sur cette période.
    </div>
  );
}