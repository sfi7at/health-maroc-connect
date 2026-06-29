import { Link } from "@tanstack/react-router";
import { CalendarDays, Clock, MapPin, Stethoscope } from "lucide-react";
import { formatDateTimeFr, initialsOf } from "@/lib/format";
import type { AppointmentRow } from "@/lib/appointments";
import { StatusBadge } from "./StatusBadge";

export function AppointmentCard({ a }: { a: AppointmentRow }) {
  return (
    <Link
      to="/appointments/$id"
      params={{ id: a.id }}
      className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft transition hover:border-primary/40 hover:shadow-md sm:p-5"
    >
      <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary/10 text-primary">
        {a.providers?.profile_image ? (
          <img src={a.providers.profile_image} alt="" className="h-full w-full object-cover" />
        ) : (
          <Stethoscope className="h-5 w-5" />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{a.providers?.name ?? "Prestataire"}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {a.provider_services?.name ?? a.reason ?? "Consultation"}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {formatDateTimeFr(a.scheduled_for)}</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {a.duration_minutes} min</span>
          {a.providers?.address ? (
            <span className="inline-flex items-center gap-1 truncate"><MapPin className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{a.providers.address}</span></span>
          ) : null}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <StatusBadge status={a.status} />
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {initialsOf(a.providers?.name)}
        </span>
      </div>
    </Link>
  );
}