import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CalendarRange, Plus, Trash2, Users, CheckCircle2, XCircle, Clock, Settings2, Ban, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { buildHead } from "@/lib/seo";
import { formatDateTimeFr } from "@/lib/format";
import {
  blockedDatesQuery,
  providerAppointmentsQuery,
  providerSchedulesQuery,
  providerServicesQuery,
  waitlistQuery,
  WEEKDAYS_FR,
  type AppointmentRow,
} from "@/lib/appointments";
import { StatusBadge } from "@/components/appointments/StatusBadge";
import { CalendarView, type CalendarMode } from "@/components/appointments/CalendarView";
import { CalendarControls } from "@/components/appointments/CalendarControls";

export const Route = createFileRoute("/_authenticated/provider-calendar")({
  head: () => buildHead({ title: "Espace prestataire — HealthLink Maroc", description: "Gérez votre agenda, vos services et vos rendez-vous.", path: "/provider-calendar" }),
  component: ProviderCalendarPage,
});

function ProviderCalendarPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: myProviders = [], isLoading: loadingProviders } = useQuery({
    queryKey: ["my_providers", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("id, name, category, is_verified")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [providerId, setProviderId] = useState<string | null>(null);
  useEffect(() => {
    if (!providerId && myProviders.length > 0) setProviderId(myProviders[0].id);
  }, [myProviders, providerId]);

  if (loadingProviders) return <Skeleton className="h-64 rounded-2xl" />;

  if (myProviders.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title="Aucun cabinet rattaché"
        description="Vous devez d'abord créer un profil prestataire pour gérer un agenda."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Espace prestataire"
        title="Mon agenda"
        description="Pilotez vos disponibilités, services et rendez-vous en temps réel."
        icon={<CalendarRange className="h-5 w-5" />}
        actions={
          <Select value={providerId ?? undefined} onValueChange={setProviderId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Cabinet" /></SelectTrigger>
            <SelectContent>
              {myProviders.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {providerId ? <ProviderWorkspace providerId={providerId} qc={qc} /> : null}
    </div>
  );
}

function ProviderWorkspace({ providerId, qc }: { providerId: string; qc: ReturnType<typeof useQueryClient> }) {
  useEffect(() => {
    const ch = supabase.channel(`prov-${providerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `provider_id=eq.${providerId}` }, () => {
        qc.invalidateQueries({ queryKey: ["provider_appointments", providerId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [providerId, qc]);

  const fromIso = useMemo(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString(); }, []);
  const toIso = useMemo(() => { const d = new Date(); d.setMonth(d.getMonth() + 3); return d.toISOString(); }, []);
  const { data: appts = [], isLoading: loadingAppts } = useQuery(providerAppointmentsQuery(providerId, { fromIso, toIso }));

  const today = new Date().toISOString().slice(0, 10);
  const todays = appts.filter((a) => a.scheduled_for.startsWith(today));
  const upcoming = appts.filter((a) => new Date(a.scheduled_for) > new Date() && ["pending", "approved"].includes(a.status));
  const completed = appts.filter((a) => a.status === "completed");
  const cancelled = appts.filter((a) => a.status === "cancelled");
  const total = appts.length;
  const rate = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Aujourd'hui" value={todays.length} icon={Clock} />
        <Kpi label="À venir" value={upcoming.length} icon={CalendarRange} />
        <Kpi label="Taux de complétion" value={`${rate(completed.length)}%`} icon={CheckCircle2} />
        <Kpi label="Taux d'annulation" value={`${rate(cancelled.length)}%`} icon={XCircle} />
      </div>

      <Tabs defaultValue="calendar">
        <TabsList className="flex-wrap">
          <TabsTrigger value="calendar">Calendrier</TabsTrigger>
          <TabsTrigger value="today">Aujourd'hui ({todays.length})</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="schedule">Horaires</TabsTrigger>
          <TabsTrigger value="blocked">Fermetures</TabsTrigger>
          <TabsTrigger value="waitlist">Liste d'attente</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-4">
          <CalendarTab appointments={appts} loading={loadingAppts} />
        </TabsContent>
        <TabsContent value="today" className="mt-4">
          <PatientList items={todays} emptyHint="Aucun rendez-vous pour aujourd'hui." />
        </TabsContent>
        <TabsContent value="services" className="mt-4">
          <ServicesManager providerId={providerId} />
        </TabsContent>
        <TabsContent value="schedule" className="mt-4">
          <ScheduleEditor providerId={providerId} />
        </TabsContent>
        <TabsContent value="blocked" className="mt-4">
          <BlockedDatesManager providerId={providerId} />
        </TabsContent>
        <TabsContent value="waitlist" className="mt-4">
          <WaitlistTab providerId={providerId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Kpi({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </Card>
  );
}

function CalendarTab({ appointments, loading }: { appointments: AppointmentRow[]; loading: boolean }) {
  const [mode, setMode] = useState<CalendarMode>("week");
  const [cursor, setCursor] = useState(new Date());
  if (loading) return <Skeleton className="h-96 rounded-2xl" />;
  return (
    <div className="space-y-3">
      <CalendarControls mode={mode} setMode={setMode} cursor={cursor} setCursor={setCursor} />
      <CalendarView mode={mode} cursor={cursor} appointments={appointments} onPickDay={(d) => { setCursor(d); setMode("day"); }} />
    </div>
  );
}

function PatientList({ items, emptyHint }: { items: AppointmentRow[]; emptyHint: string }) {
  const qc = useQueryClient();
  const setStatus = useMutation({
    mutationFn: async ({ id, status, extra }: { id: string; status: "approved" | "rejected" | "completed" | "no_show"; extra?: Record<string, string> }) => {
      const update: Record<string, unknown> = { status, ...extra };
      if (status === "approved") update.confirmed_at = new Date().toISOString();
      if (status === "completed") update.completed_at = new Date().toISOString();
      const { error } = await supabase.from("appointments").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Statut mis à jour");
      qc.invalidateQueries({ queryKey: ["provider_appointments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  if (items.length === 0) {
    return <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">{emptyHint}</div>;
  }
  return (
    <ul className="grid gap-2">
      {items.map((a) => (
        <li key={a.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-3">
          <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-primary/10 text-primary">
            <Users className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{a.profiles?.full_name ?? "Patient"}</p>
            <p className="truncate text-xs text-muted-foreground">{formatDateTimeFr(a.scheduled_for)} · {a.provider_services?.name ?? a.reason ?? "Consultation"}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <StatusBadge status={a.status} className="hidden sm:inline-flex" />
            {a.status === "pending" ? (
              <>
                <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: a.id, status: "approved" })}>Confirmer</Button>
                <Button size="sm" variant="ghost" onClick={() => setStatus.mutate({ id: a.id, status: "rejected" })}>Refuser</Button>
              </>
            ) : a.status === "approved" ? (
              <>
                <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: a.id, status: "completed" })}>Terminer</Button>
                <Button size="sm" variant="ghost" onClick={() => setStatus.mutate({ id: a.id, status: "no_show" })}>Absent</Button>
              </>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function ServicesManager({ providerId }: { providerId: string }) {
  const qc = useQueryClient();
  const { data: services = [], isLoading } = useQuery(providerServicesQuery(providerId, { activeOnly: false }));
  const [draft, setDraft] = useState({ name: "", description: "", duration: 30, price: "", preparation: "" });

  const add = useMutation({
    mutationFn: async () => {
      if (!draft.name.trim()) throw new Error("Nom du service requis");
      const { error } = await supabase.from("provider_services").insert({
        provider_id: providerId,
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        duration_minutes: Number(draft.duration) || 30,
        price_mad: draft.price ? Number(draft.price) : null,
        preparation: draft.preparation.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Service ajouté");
      setDraft({ name: "", description: "", duration: 30, price: "", preparation: "" });
      qc.invalidateQueries({ queryKey: ["provider_services", providerId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("provider_services").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["provider_services", providerId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("provider_services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Service supprimé");
      qc.invalidateQueries({ queryKey: ["provider_services", providerId] });
    },
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-2">
        {isLoading ? <Skeleton className="h-40 rounded-2xl" /> : services.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">Aucun service. Créez-en un pour permettre les réservations.</div>
        ) : (
          services.map((s) => (
            <motion.div key={s.id} layout className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.duration_minutes} min{s.price_mad != null ? ` · ${s.price_mad} MAD` : ""}</p>
                {s.description ? <p className="mt-1 truncate text-xs text-muted-foreground">{s.description}</p> : null}
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={s.is_active} onCheckedChange={(v) => toggle.mutate({ id: s.id, is_active: v })} />
                <Button size="icon" variant="ghost" onClick={() => remove.mutate(s.id)} aria-label="Supprimer"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </motion.div>
          ))
        )}
      </div>
      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold"><Settings2 className="h-4 w-4 text-primary" /> Nouveau service</div>
        <div className="space-y-2">
          <Label htmlFor="svc-name">Nom</Label>
          <Input id="svc-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Consultation de cardiologie" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="svc-dur">Durée (min)</Label>
            <Input id="svc-dur" type="number" min={5} max={240} value={draft.duration} onChange={(e) => setDraft({ ...draft, duration: Number(e.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="svc-price">Prix (MAD)</Label>
            <Input id="svc-price" type="number" min={0} value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="svc-desc">Description</Label>
          <Textarea id="svc-desc" rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="svc-prep">Préparation</Label>
          <Textarea id="svc-prep" rows={2} value={draft.preparation} onChange={(e) => setDraft({ ...draft, preparation: e.target.value })} placeholder="À jeun depuis 8h…" />
        </div>
        <Button className="w-full gap-2" onClick={() => add.mutate()} disabled={add.isPending}><Plus className="h-4 w-4" /> Ajouter</Button>
      </Card>
    </div>
  );
}

function ScheduleEditor({ providerId }: { providerId: string }) {
  const qc = useQueryClient();
  const { data: schedules = [], isLoading } = useQuery(providerSchedulesQuery(providerId));
  const [draft, setDraft] = useState({ weekday: 1, start: "09:00", end: "17:00", slot: 30, breakStart: "12:00", breakEnd: "14:00", max: "" });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("provider_schedules").insert({
        provider_id: providerId,
        weekday: draft.weekday,
        start_time: draft.start,
        end_time: draft.end,
        slot_minutes: Number(draft.slot) || 30,
        break_start: draft.breakStart || null,
        break_end: draft.breakEnd || null,
        max_per_day: draft.max ? Number(draft.max) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plage ajoutée");
      qc.invalidateQueries({ queryKey: ["provider_schedules", providerId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("provider_schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["provider_schedules", providerId] }),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="space-y-2">
        {isLoading ? <Skeleton className="h-40 rounded-2xl" /> : schedules.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">Définissez vos horaires hebdomadaires.</div>
        ) : (
          schedules.map((s) => (
            <div key={s.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-3">
              <div>
                <p className="font-semibold">{WEEKDAYS_FR[s.weekday]}</p>
                <p className="text-xs text-muted-foreground">
                  {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)} · {s.slot_minutes} min/créneau
                  {s.break_start && s.break_end ? ` · pause ${s.break_start.slice(0,5)}–${s.break_end.slice(0,5)}` : ""}
                  {s.max_per_day ? ` · max ${s.max_per_day}` : ""}
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove.mutate(s.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))
        )}
      </div>
      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold"><Clock className="h-4 w-4 text-primary" /> Nouvelle plage</div>
        <div className="space-y-2">
          <Label>Jour</Label>
          <Select value={String(draft.weekday)} onValueChange={(v) => setDraft({ ...draft, weekday: Number(v) })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{WEEKDAYS_FR.map((d, i) => <SelectItem key={d} value={String(i)}>{d}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2"><Label>Début</Label><Input type="time" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} /></div>
          <div className="space-y-2"><Label>Fin</Label><Input type="time" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2"><Label>Pause début</Label><Input type="time" value={draft.breakStart} onChange={(e) => setDraft({ ...draft, breakStart: e.target.value })} /></div>
          <div className="space-y-2"><Label>Pause fin</Label><Input type="time" value={draft.breakEnd} onChange={(e) => setDraft({ ...draft, breakEnd: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2"><Label>Durée créneau</Label><Input type="number" min={5} max={240} value={draft.slot} onChange={(e) => setDraft({ ...draft, slot: Number(e.target.value) })} /></div>
          <div className="space-y-2"><Label>Max / jour</Label><Input type="number" min={1} value={draft.max} onChange={(e) => setDraft({ ...draft, max: e.target.value })} placeholder="∞" /></div>
        </div>
        <Button className="w-full gap-2" onClick={() => add.mutate()} disabled={add.isPending}><Plus className="h-4 w-4" /> Ajouter</Button>
      </Card>
    </div>
  );
}

function BlockedDatesManager({ providerId }: { providerId: string }) {
  const qc = useQueryClient();
  const { data: blocked = [], isLoading } = useQuery(blockedDatesQuery(providerId));
  const [draft, setDraft] = useState({ start: "", end: "", reason: "" });

  const add = useMutation({
    mutationFn: async () => {
      if (!draft.start || !draft.end) throw new Error("Dates requises");
      const { error } = await supabase.from("provider_blocked_dates").insert({
        provider_id: providerId,
        start_at: new Date(draft.start).toISOString(),
        end_at: new Date(draft.end).toISOString(),
        reason: draft.reason.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Fermeture enregistrée"); setDraft({ start: "", end: "", reason: "" }); qc.invalidateQueries({ queryKey: ["provider_blocked_dates", providerId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("provider_blocked_dates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["provider_blocked_dates", providerId] }),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-2">
        {isLoading ? <Skeleton className="h-40 rounded-2xl" /> : blocked.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">Aucune fermeture programmée.</div>
        ) : (
          blocked.map((b) => (
            <div key={b.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-3">
              <div>
                <p className="font-semibold">{formatDateTimeFr(b.start_at)} → {formatDateTimeFr(b.end_at)}</p>
                {b.reason ? <p className="text-xs text-muted-foreground">{b.reason}</p> : null}
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove.mutate(b.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))
        )}
      </div>
      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold"><Ban className="h-4 w-4 text-primary" /> Nouvelle fermeture</div>
        <div className="space-y-2"><Label>Début</Label><Input type="datetime-local" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} /></div>
        <div className="space-y-2"><Label>Fin</Label><Input type="datetime-local" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} /></div>
        <div className="space-y-2"><Label>Motif</Label><Input value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} placeholder="Vacances, congrès…" /></div>
        <Button className="w-full gap-2" onClick={() => add.mutate()} disabled={add.isPending}><Plus className="h-4 w-4" /> Ajouter</Button>
      </Card>
    </div>
  );
}

function WaitlistTab({ providerId }: { providerId: string }) {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery(waitlistQuery(providerId));
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointment_waitlist").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["waitlist", providerId] }),
  });
  if (isLoading) return <Skeleton className="h-40 rounded-2xl" />;
  if (data.length === 0) return <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">Aucun patient en attente.</div>;
  return (
    <ul className="grid gap-2">
      {data.filter((w) => w.status === "active" || w.status === "notified").map((w) => (
        <li key={w.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-3">
          <div className="min-w-0">
            <p className="truncate font-semibold">{w.profiles?.full_name ?? "Patient"}</p>
            <p className="text-xs text-muted-foreground">
              {w.provider_services?.name ?? "Consultation"}
              {w.preferred_date ? ` · préfère le ${w.preferred_date}` : ""}
            </p>
            {w.notes ? <p className="mt-1 truncate text-xs text-muted-foreground">{w.notes}</p> : null}
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary">{w.status === "notified" ? "Notifié" : "Actif"}</Badge>
            <Button size="icon" variant="ghost" onClick={() => remove.mutate(w.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </li>
      ))}
    </ul>
  );
}