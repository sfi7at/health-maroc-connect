import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Clock4, Plus, Trash2, Ban, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedProvider } from "@/lib/provider-store";
import { providerSchedulesQuery, blockedDatesQuery, WEEKDAYS_FR } from "@/lib/appointments";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/provider/hours")({
  head: () => buildHead({ title: "Horaires — Espace prestataire", description: "Plages d'ouverture, pauses et fermetures.", path: "/provider/hours" }),
  component: ProviderHours,
});

function ProviderHours() {
  const { provider } = useSelectedProvider();
  const id = provider?.id;
  if (!provider || !id) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Horaires"
        title="Plages d'ouverture"
        description="Définissez vos horaires, vos pauses et vos fermetures exceptionnelles."
        icon={<Clock4 className="h-5 w-5" />}
        actions={
          <Button asChild variant="outline" className="gap-2">
            <Link to="/provider-calendar">Agenda complet <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        }
      />
      <ScheduleEditor providerId={id} />
      <BlockedDatesEditor providerId={id} />
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
        provider_id: providerId, weekday: draft.weekday,
        start_time: draft.start, end_time: draft.end,
        slot_minutes: Number(draft.slot) || 30,
        break_start: draft.breakStart || null, break_end: draft.breakEnd || null,
        max_per_day: draft.max ? Number(draft.max) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Plage ajoutée"); qc.invalidateQueries({ queryKey: ["provider_schedules", providerId] }); },
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
    <section className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Horaires hebdomadaires</h2>
        {isLoading ? <Skeleton className="h-40 rounded-2xl" /> : schedules.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">Aucune plage. Ajoutez vos jours d'ouverture.</div>
        ) : schedules.map((s) => (
          <div key={s.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-3">
            <div>
              <p className="font-semibold">{WEEKDAYS_FR[s.weekday]}</p>
              <p className="text-xs text-muted-foreground">
                {s.start_time.slice(0,5)} – {s.end_time.slice(0,5)} · créneau {s.slot_minutes} min
                {s.break_start && s.break_end ? ` · pause ${s.break_start.slice(0,5)}–${s.break_end.slice(0,5)}` : ""}
              </p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => remove.mutate(s.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
      <Card className="space-y-3 p-4">
        <p className="text-sm font-bold">Nouvelle plage</p>
        <div className="space-y-1.5">
          <Label>Jour</Label>
          <Select value={String(draft.weekday)} onValueChange={(v) => setDraft({ ...draft, weekday: Number(v) })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{WEEKDAYS_FR.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Ouverture</Label><Input type="time" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} /></div>
          <div><Label>Fermeture</Label><Input type="time" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} /></div>
          <div><Label>Pause début</Label><Input type="time" value={draft.breakStart} onChange={(e) => setDraft({ ...draft, breakStart: e.target.value })} /></div>
          <div><Label>Pause fin</Label><Input type="time" value={draft.breakEnd} onChange={(e) => setDraft({ ...draft, breakEnd: e.target.value })} /></div>
          <div><Label>Créneau (min)</Label><Input type="number" min={5} value={draft.slot} onChange={(e) => setDraft({ ...draft, slot: Number(e.target.value) })} /></div>
          <div><Label>Max/jour</Label><Input type="number" min={0} value={draft.max} onChange={(e) => setDraft({ ...draft, max: e.target.value })} /></div>
        </div>
        <Button className="w-full gap-2" onClick={() => add.mutate()} disabled={add.isPending}><Plus className="h-4 w-4" /> Ajouter</Button>
      </Card>
    </section>
  );
}

function BlockedDatesEditor({ providerId }: { providerId: string }) {
  const qc = useQueryClient();
  const { data: blocked = [], isLoading } = useQuery(blockedDatesQuery(providerId, new Date().toISOString()));
  const [draft, setDraft] = useState({ start: "", end: "", reason: "" });

  const add = useMutation({
    mutationFn: async () => {
      if (!draft.start || !draft.end) throw new Error("Dates requises");
      const { error } = await supabase.from("provider_blocked_dates").insert({
        provider_id: providerId,
        start_at: new Date(draft.start).toISOString(),
        end_at: new Date(draft.end).toISOString(),
        reason: draft.reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Fermeture ajoutée"); setDraft({ start: "", end: "", reason: "" }); qc.invalidateQueries({ queryKey: ["provider_blocked_dates", providerId] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("provider_blocked_dates").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["provider_blocked_dates", providerId] }),
  });

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Fermetures & congés</h2>
        {isLoading ? <Skeleton className="h-40 rounded-2xl" /> : blocked.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">Aucune fermeture programmée.</div>
        ) : blocked.map((b) => (
          <div key={b.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-3">
            <div>
              <p className="font-semibold flex items-center gap-2"><Ban className="h-4 w-4 text-destructive" /> {new Date(b.start_at).toLocaleString("fr-FR")} → {new Date(b.end_at).toLocaleString("fr-FR")}</p>
              {b.reason ? <p className="text-xs text-muted-foreground">{b.reason}</p> : null}
            </div>
            <Button size="icon" variant="ghost" onClick={() => remove.mutate(b.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
      <Card className="space-y-3 p-4">
        <p className="text-sm font-bold">Bloquer une période</p>
        <div><Label>Début</Label><Input type="datetime-local" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} /></div>
        <div><Label>Fin</Label><Input type="datetime-local" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} /></div>
        <div><Label>Raison</Label><Input value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} placeholder="Congés, formation…" /></div>
        <Button className="w-full gap-2" onClick={() => add.mutate()} disabled={add.isPending}><Plus className="h-4 w-4" /> Bloquer</Button>
      </Card>
    </section>
  );
}