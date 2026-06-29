import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarRange, Search, MessageSquare, CheckCircle2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedProvider } from "@/lib/provider-store";
import { providerAppointmentsQuery, type AppointmentRow } from "@/lib/appointments";
import { StatusBadge } from "@/components/appointments/StatusBadge";
import { formatDateTimeFr } from "@/lib/format";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/provider/appointments")({
  head: () => buildHead({ title: "Rendez-vous — Espace prestataire", description: "Gérez les demandes patients.", path: "/provider/appointments" }),
  component: ProviderAppointments,
});

function ProviderAppointments() {
  const { provider } = useSelectedProvider();
  const id = provider?.id;
  const qc = useQueryClient();

  const fromIso = useMemo(() => { const d = new Date(); d.setMonth(d.getMonth() - 2); return d.toISOString(); }, []);
  const toIso = useMemo(() => { const d = new Date(); d.setMonth(d.getMonth() + 3); return d.toISOString(); }, []);

  useEffect(() => {
    if (!id) return;
    const ch = supabase.channel(`prov-appts-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `provider_id=eq.${id}` }, () => {
        qc.invalidateQueries({ queryKey: ["provider_appointments", id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, qc]);

  const { data: appts = [], isLoading } = useQuery(providerAppointmentsQuery(id, { fromIso, toIso }));
  const [q, setQ] = useState("");
  const [noteFor, setNoteFor] = useState<AppointmentRow | null>(null);
  const [note, setNote] = useState("");
  const [reschFor, setReschFor] = useState<AppointmentRow | null>(null);
  const [reschTime, setReschTime] = useState("");

  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  const filtered = appts.filter((a) => {
    if (!q.trim()) return true;
    const txt = q.toLowerCase();
    return (a.profiles?.full_name ?? "").toLowerCase().includes(txt)
      || (a.reason ?? "").toLowerCase().includes(txt)
      || (a.provider_services?.name ?? "").toLowerCase().includes(txt);
  });

  const buckets = {
    today: filtered.filter((a) => new Date(a.scheduled_for) >= today && new Date(a.scheduled_for) < tomorrow),
    upcoming: filtered.filter((a) => new Date(a.scheduled_for) >= tomorrow && ["pending","approved"].includes(a.status)),
    completed: filtered.filter((a) => a.status === "completed"),
    cancelled: filtered.filter((a) => ["cancelled","rejected","no_show"].includes(a.status)),
    rescheduled: filtered.filter((a) => a.status === "rescheduled" || a.rescheduled_from),
  };

  const setStatus = useMutation({
    mutationFn: async ({ id: aid, status }: { id: string; status: "approved" | "rejected" | "completed" | "cancelled" | "no_show" }) => {
      const patch: Record<string, unknown> = { status };
      if (status === "approved") patch.confirmed_at = new Date().toISOString();
      if (status === "completed") patch.completed_at = new Date().toISOString();
      if (status === "cancelled") patch.cancelled_at = new Date().toISOString();
      const { error } = await supabase.from("appointments").update(patch).eq("id", aid);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Statut mis à jour"); qc.invalidateQueries({ queryKey: ["provider_appointments"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveNote = useMutation({
    mutationFn: async () => {
      if (!noteFor) return;
      const { error } = await supabase.from("appointments").update({ provider_notes: note }).eq("id", noteFor.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Note enregistrée"); setNoteFor(null); qc.invalidateQueries({ queryKey: ["provider_appointments"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const reschedule = useMutation({
    mutationFn: async () => {
      if (!reschFor || !reschTime) return;
      const newIso = new Date(reschTime).toISOString();
      const { error } = await supabase.from("appointments").update({
        scheduled_for: newIso,
        status: "rescheduled",
        rescheduled_from: reschFor.scheduled_for,
      }).eq("id", reschFor.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Nouveau créneau proposé"); setReschFor(null); setReschTime(""); qc.invalidateQueries({ queryKey: ["provider_appointments"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!provider) return null;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Rendez-vous" title="Demandes patients" description="Acceptez, refusez ou reprogrammez les demandes." icon={<CalendarRange className="h-5 w-5" />} />

      <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 shadow-soft">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un patient, motif, service…" className="border-0 p-0 shadow-none focus-visible:ring-0" />
      </div>

      <Tabs defaultValue="today">
        <TabsList className="flex-wrap">
          <TabsTrigger value="today">Aujourd'hui <Badge variant="secondary" className="ml-2">{buckets.today.length}</Badge></TabsTrigger>
          <TabsTrigger value="upcoming">À venir <Badge variant="secondary" className="ml-2">{buckets.upcoming.length}</Badge></TabsTrigger>
          <TabsTrigger value="completed">Terminés <Badge variant="secondary" className="ml-2">{buckets.completed.length}</Badge></TabsTrigger>
          <TabsTrigger value="cancelled">Annulés <Badge variant="secondary" className="ml-2">{buckets.cancelled.length}</Badge></TabsTrigger>
          <TabsTrigger value="rescheduled">Reprogrammés <Badge variant="secondary" className="ml-2">{buckets.rescheduled.length}</Badge></TabsTrigger>
        </TabsList>
        {(["today","upcoming","completed","cancelled","rescheduled"] as const).map((k) => (
          <TabsContent key={k} value={k} className="mt-4">
            {isLoading ? <Skeleton className="h-40 rounded-2xl" /> : (
              <ApptList
                items={buckets[k]}
                onStatus={(a, status) => setStatus.mutate({ id: a.id, status })}
                onNote={(a) => { setNoteFor(a); setNote(a.provider_notes ?? ""); }}
                onReschedule={(a) => { setReschFor(a); setReschTime(a.scheduled_for.slice(0,16)); }}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!noteFor} onOpenChange={(o) => !o && setNoteFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Note interne</DialogTitle></DialogHeader>
          <Textarea rows={5} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notes confidentielles sur ce rendez-vous…" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNoteFor(null)}>Annuler</Button>
            <Button onClick={() => saveNote.mutate()} disabled={saveNote.isPending}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reschFor} onOpenChange={(o) => !o && setReschFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Proposer un nouveau créneau</DialogTitle></DialogHeader>
          <Input type="datetime-local" value={reschTime} onChange={(e) => setReschTime(e.target.value)} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReschFor(null)}>Annuler</Button>
            <Button onClick={() => reschedule.mutate()} disabled={reschedule.isPending}>Proposer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ApptList({ items, onStatus, onNote, onReschedule }: {
  items: AppointmentRow[];
  onStatus: (a: AppointmentRow, status: "approved" | "rejected" | "completed" | "cancelled" | "no_show") => void;
  onNote: (a: AppointmentRow) => void;
  onReschedule: (a: AppointmentRow) => void;
}) {
  if (items.length === 0) return <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">Aucun rendez-vous.</div>;
  return (
    <ul className="space-y-2">
      {items.map((a) => (
        <li key={a.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold">{a.profiles?.full_name ?? "Patient"}</p>
              <p className="text-xs text-muted-foreground">{formatDateTimeFr(a.scheduled_for)} · {a.provider_services?.name ?? a.reason ?? "Consultation"}</p>
              {a.profiles?.phone ? <p className="text-xs text-muted-foreground">Tél: {a.profiles.phone}</p> : null}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge status={a.status} />
              {a.status === "pending" ? (
                <>
                  <Button size="sm" variant="default" className="gap-1" onClick={() => onStatus(a, "approved")}><CheckCircle2 className="h-3.5 w-3.5" />Accepter</Button>
                  <Button size="sm" variant="ghost" className="gap-1" onClick={() => onStatus(a, "rejected")}><XCircle className="h-3.5 w-3.5" />Refuser</Button>
                </>
              ) : null}
              {["pending","approved"].includes(a.status) ? (
                <Button size="sm" variant="outline" onClick={() => onReschedule(a)}>Proposer un créneau</Button>
              ) : null}
              {a.status === "approved" ? (
                <Button size="sm" variant="outline" onClick={() => onStatus(a, "completed")}>Terminer</Button>
              ) : null}
              {!["cancelled","completed"].includes(a.status) ? (
                <Button size="sm" variant="ghost" onClick={() => onStatus(a, "cancelled")}>Annuler</Button>
              ) : null}
              <Button size="icon" variant="ghost" onClick={() => onNote(a)}><MessageSquare className="h-4 w-4" /></Button>
            </div>
          </div>
          {a.provider_notes ? <p className="mt-2 rounded-xl bg-muted/50 p-2 text-xs text-muted-foreground"><strong>Note: </strong>{a.provider_notes}</p> : null}
        </li>
      ))}
    </ul>
  );
}