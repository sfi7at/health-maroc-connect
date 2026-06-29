import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppointmentStatus = Database["public"]["Enums"]["appointment_status"] | "rescheduled";

export type ProviderService = {
  id: string;
  provider_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_mad: number | null;
  preparation: string | null;
  category: string | null;
  is_active: boolean;
  is_online_eligible: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ProviderSchedule = {
  id: string;
  provider_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  slot_minutes: number;
  break_start: string | null;
  break_end: string | null;
  max_per_day: number | null;
  is_active: boolean;
};

export type BlockedDate = {
  id: string;
  provider_id: string;
  start_at: string;
  end_at: string;
  reason: string | null;
};

export type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"] & {
  providers?: { id: string; name: string; category: string; profile_image: string | null; address: string | null; phone: string | null; latitude: number | null; longitude: number | null } | null;
  provider_services?: { id: string; name: string; duration_minutes: number; price_mad: number | null } | null;
  profiles?: { id: string; full_name: string | null; avatar_url: string | null; phone: string | null } | null;
};

// ---------- Queries ----------

export function providerServicesQuery(providerId: string | undefined, opts?: { activeOnly?: boolean }) {
  return queryOptions({
    queryKey: ["provider_services", providerId, opts?.activeOnly ?? true],
    enabled: !!providerId,
    queryFn: async () => {
      let q = supabase
        .from("provider_services" as never)
        .select("*")
        .eq("provider_id", providerId!)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (opts?.activeOnly !== false) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ProviderService[];
    },
    staleTime: 30_000,
  });
}

export function providerSchedulesQuery(providerId: string | undefined) {
  return queryOptions({
    queryKey: ["provider_schedules", providerId],
    enabled: !!providerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_schedules" as never)
        .select("*")
        .eq("provider_id", providerId!)
        .order("weekday")
        .order("start_time");
      if (error) throw error;
      return (data ?? []) as unknown as ProviderSchedule[];
    },
    staleTime: 60_000,
  });
}

export function blockedDatesQuery(providerId: string | undefined, fromIso?: string) {
  return queryOptions({
    queryKey: ["provider_blocked_dates", providerId, fromIso ?? null],
    enabled: !!providerId,
    queryFn: async () => {
      let q = supabase
        .from("provider_blocked_dates" as never)
        .select("*")
        .eq("provider_id", providerId!)
        .order("start_at");
      if (fromIso) q = q.gte("end_at", fromIso);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as BlockedDate[];
    },
    staleTime: 30_000,
  });
}

export function providerAppointmentsQuery(providerId: string | undefined, range?: { fromIso?: string; toIso?: string }) {
  return queryOptions({
    queryKey: ["provider_appointments", providerId, range?.fromIso ?? null, range?.toIso ?? null],
    enabled: !!providerId,
    queryFn: async () => {
      let q = supabase
        .from("appointments")
        .select("*, profiles:patient_id ( id, full_name, avatar_url, phone ), provider_services:service_id ( id, name, duration_minutes, price_mad )")
        .eq("provider_id", providerId!)
        .order("scheduled_for", { ascending: true })
        .limit(500);
      if (range?.fromIso) q = q.gte("scheduled_for", range.fromIso);
      if (range?.toIso) q = q.lte("scheduled_for", range.toIso);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as AppointmentRow[];
    },
    staleTime: 10_000,
  });
}

export function appointmentByIdQuery(id: string | undefined) {
  return queryOptions({
    queryKey: ["appointment", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, providers ( id, name, category, profile_image, address, phone, latitude, longitude ), provider_services:service_id ( id, name, duration_minutes, price_mad )")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as AppointmentRow | null;
    },
  });
}

export function bookedSlotsQuery(providerId: string | undefined, dateIso: string) {
  return queryOptions({
    queryKey: ["booked_slots", providerId, dateIso],
    enabled: !!providerId && !!dateIso,
    queryFn: async () => {
      const start = new Date(`${dateIso}T00:00:00`);
      const end = new Date(`${dateIso}T23:59:59`);
      const { data, error } = await supabase
        .from("appointments")
        .select("scheduled_for, duration_minutes, status")
        .eq("provider_id", providerId!)
        .gte("scheduled_for", start.toISOString())
        .lte("scheduled_for", end.toISOString())
        .in("status", ["pending", "approved"]);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5_000,
  });
}

export function waitlistQuery(providerId: string | undefined) {
  return queryOptions({
    queryKey: ["waitlist", providerId],
    enabled: !!providerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointment_waitlist" as never)
        .select("*, profiles:patient_id ( id, full_name, phone ), provider_services:service_id ( id, name )")
        .eq("provider_id", providerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Array<{ id: string; patient_id: string; provider_id: string; service_id: string | null; preferred_date: string | null; preferred_period: string | null; notes: string | null; status: string; created_at: string; profiles?: { full_name: string | null; phone: string | null } | null; provider_services?: { name: string } | null }>;
    },
  });
}

// ---------- Slot generation ----------

export function dateToIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export type Slot = { time: string; iso: string; available: boolean; reason?: "booked" | "blocked" | "past" };

export function generateSlots(params: {
  dateIso: string;
  schedules: ProviderSchedule[];
  blocked: BlockedDate[];
  bookedAt: Array<{ scheduled_for: string; duration_minutes: number }>;
  slotMinutes?: number;
}): Slot[] {
  const { dateIso, schedules, blocked, bookedAt } = params;
  const dayDate = new Date(`${dateIso}T12:00:00`);
  const weekday = dayDate.getDay();
  const active = schedules.filter((s) => s.weekday === weekday && s.is_active);
  if (active.length === 0) return [];

  const slots: Slot[] = [];
  const now = Date.now();
  const bookedKeys = new Set(bookedAt.map((b) => new Date(b.scheduled_for).toISOString().slice(0, 16)));

  for (const sched of active) {
    const step = params.slotMinutes ?? sched.slot_minutes ?? 30;
    const startM = timeToMinutes(sched.start_time);
    const endM = timeToMinutes(sched.end_time);
    const breakStart = sched.break_start ? timeToMinutes(sched.break_start) : null;
    const breakEnd = sched.break_end ? timeToMinutes(sched.break_end) : null;

    for (let m = startM; m + step <= endM; m += step) {
      if (breakStart != null && breakEnd != null && m >= breakStart && m < breakEnd) continue;
      const time = minutesToTime(m);
      const slotDate = new Date(`${dateIso}T${time}:00`);
      const iso = slotDate.toISOString();
      const key = iso.slice(0, 16);
      const past = slotDate.getTime() < now;
      const isBlocked = blocked.some(
        (b) => slotDate >= new Date(b.start_at) && slotDate < new Date(b.end_at),
      );
      const isBooked = bookedKeys.has(key);
      let reason: Slot["reason"] | undefined;
      if (past) reason = "past";
      else if (isBlocked) reason = "blocked";
      else if (isBooked) reason = "booked";
      slots.push({ time, iso, available: !past && !isBlocked && !isBooked, reason });
    }
  }
  return slots.sort((a, b) => a.time.localeCompare(b.time));
}

// ---------- Status helpers ----------

export const STATUS_META: Record<string, { label: string; tone: string; dot: string }> = {
  pending: { label: "En attente", tone: "bg-warning/15 text-warning-foreground border-warning/30", dot: "bg-warning" },
  approved: { label: "Confirmé", tone: "bg-primary/15 text-primary border-primary/30", dot: "bg-primary" },
  rejected: { label: "Refusé", tone: "bg-destructive/15 text-destructive border-destructive/30", dot: "bg-destructive" },
  cancelled: { label: "Annulé", tone: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
  completed: { label: "Terminé", tone: "bg-info/15 text-info border-info/30", dot: "bg-info" },
  no_show: { label: "Absence", tone: "bg-destructive/15 text-destructive border-destructive/30", dot: "bg-destructive" },
  rescheduled: { label: "Reprogrammé", tone: "bg-accent text-accent-foreground border-border", dot: "bg-accent-foreground" },
};

export function isUpcoming(a: { scheduled_for: string; status: string }): boolean {
  return new Date(a.scheduled_for).getTime() > Date.now() && ["pending", "approved"].includes(a.status);
}

// ---------- ICS export ----------

function icsEscape(s: string): string {
  return s.replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
}

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function buildIcs(a: {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startIso: string;
  durationMinutes: number;
}): string {
  const start = new Date(a.startIso);
  const end = new Date(start.getTime() + a.durationMinutes * 60_000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HealthLink Maroc//Appointments//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${a.id}@healthlink.ma`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsEscape(a.title)}`,
    a.description ? `DESCRIPTION:${icsEscape(a.description)}` : "",
    a.location ? `LOCATION:${icsEscape(a.location)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}

export function downloadIcs(filename: string, ics: string) {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function googleCalendarUrl(a: { title: string; description?: string; location?: string; startIso: string; durationMinutes: number }): string {
  const start = new Date(a.startIso);
  const end = new Date(start.getTime() + a.durationMinutes * 60_000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: a.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: a.description ?? "",
    location: a.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

export function outlookCalendarUrl(a: { title: string; description?: string; location?: string; startIso: string; durationMinutes: number }): string {
  const start = new Date(a.startIso);
  const end = new Date(start.getTime() + a.durationMinutes * 60_000);
  const p = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: a.title,
    body: a.description ?? "",
    location: a.location ?? "",
    startdt: start.toISOString(),
    enddt: end.toISOString(),
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${p.toString()}`;
}

export const WEEKDAYS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
export const WEEKDAYS_SHORT_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday-first
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}