import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarRange, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock,
  User, RefreshCw, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedProvider } from "@/lib/provider-store";
import { buildHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pro/schedule")({
  head: () => buildHead({
    title: "Agenda — HealthLink Pro",
    description: "Vue journalière temps réel de vos rendez-vous.",
    path: "/pro/schedule",
  }),
  component: SchedulePage,
});

type Appt = {
  id: string; scheduled_for: string; duration_minutes: number;
  status: string; consultation_type: string;
  reason: string | null; notes: string | null; patient_id: string;
};

const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30",
  confirmed: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30",
  completed: "bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-500/30",
  cancelled: "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/30",
  no_show: "bg-muted text-muted-foreground border-border",
};

function SchedulePage() {
  const { provider } = useSelectedProvider();
  const qc = useQueryClient();
  const [day, setDay] = useState(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  });

  const range = useMemo(() => {
    const s = new Date(day);
    const e = new Date(day); e.setDate(e.getDate() + 1);
    return { start: s.toISOString(), end: e.toISOString() };
  }, [day]);

  const { data = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["pro", "appointments", provider?.id, range.start],
    enabled: !!provider?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, scheduled_for, duration_minutes, status, consultation_type, reason, notes, patient_id")
        .eq("provider_id", provider!.id)
        .gte("scheduled_for", range.start)
        .lt("scheduled_for", range.end)
        .order("scheduled_for");
      if (error) throw error;
      return (data ?? []) as Appt[];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const patch: Record<string, unknown> = { status };
      if (status === "confirmed") patch.confirmed_at = new Date().toISOString();
      if (status === "completed") patch.completed_at = new Date().toISOString();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from("appointments").update(patch as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Statut mis à jour");
      qc.invalidateQueries({ queryKey: ["pro", "appointments", provider?.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Échec"),
  });

  const goto = (delta: number) => {
    const d = new Date(day); d.setDate(d.getDate() + delta); setDay(d);
  };

  const isToday = day.toDateString() === new Date().toDateString();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agenda"
        title="Rendez-vous du jour"
        description="Synchronisé en temps réel avec l'application citoyenne."
        icon={<CalendarRange className="h-5 w-5" />}
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Rafraîchir
          </Button>
        }
      />

      <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-3 shadow-soft">
        <Button variant="ghost" size="icon" onClick={() => goto(-1)}><ChevronLeft className="h-4 w-4" /></Button>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isToday ? "Aujourd'hui" : ""}
          </p>
          <p className="text-sm font-bold">
            {day.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => goto(1)}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      {!isToday ? (
        <Button variant="outline" size="sm" onClick={() => { const d = new Date(); d.setHours(0,0,0,0); setDay(d); }}>
          Revenir à aujourd'hui
        </Button>
      ) : null}

      {isLoading ? (
        <div className="space-y-2">{[0,1,2].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : data.length === 0 ? (
        <EmptyState icon={CalendarRange} title="Aucun rendez-vous" description="Aucun rendez-vous n'est planifié pour cette journée." />
      ) : (
        <ol className="space-y-2">
          {data.map((a) => {
            const t = new Date(a.scheduled_for);
            const end = new Date(t.getTime() + a.duration_minutes * 60000);
            const fmt = (d: Date) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
            const isPending = a.status === "pending";
            const isConfirmed = a.status === "confirmed";
            const isDone = a.status === "completed" || a.status === "cancelled" || a.status === "no_show";
            return (
              <li key={a.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="w-20 shrink-0">
                    <p className="text-lg font-bold">{fmt(t)}</p>
                    <p className="text-[11px] text-muted-foreground">{fmt(end)}</p>
                    <p className="mt-1 text-[10px] uppercase text-muted-foreground">{a.duration_minutes} min</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-sm font-semibold">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        Patient <span className="text-muted-foreground">#{a.patient_id.slice(0, 8)}</span>
                      </span>
                      <Badge variant="outline" className={cn("text-[10px]", STATUS_TONE[a.status])}>
                        {a.status}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">{a.consultation_type}</Badge>
                    </div>
                    {a.reason ? <p className="mt-1 text-sm">{a.reason}</p> : null}
                    {a.notes ? <p className="mt-1 text-xs text-muted-foreground">{a.notes}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {isPending ? (
                      <Button size="sm" variant="outline" className="gap-1"
                              onClick={() => setStatus.mutate({ id: a.id, status: "confirmed" })}>
                        <CheckCircle2 className="h-3.5 w-3.5" />Confirmer
                      </Button>
                    ) : null}
                    {isConfirmed ? (
                      <Button size="sm" variant="outline" className="gap-1"
                              onClick={() => setStatus.mutate({ id: a.id, status: "completed" })}>
                        <CheckCircle2 className="h-3.5 w-3.5" />Terminée
                      </Button>
                    ) : null}
                    {!isDone ? (
                      <Button size="sm" variant="ghost" className="gap-1 text-destructive"
                              onClick={() => setStatus.mutate({ id: a.id, status: "cancelled" })}>
                        <XCircle className="h-3.5 w-3.5" />Annuler
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <Clock className="h-3 w-3" />Les modifications sont synchronisées instantanément avec l'application citoyenne.
      </p>
    </div>
  );
}