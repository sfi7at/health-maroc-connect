import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, Filter, Plus } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { appointmentsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { buildHead } from "@/lib/seo";
import { CalendarView, type CalendarMode } from "@/components/appointments/CalendarView";
import { CalendarControls } from "@/components/appointments/CalendarControls";
import { AppointmentCard } from "@/components/appointments/AppointmentCard";
import { isUpcoming, type AppointmentRow } from "@/lib/appointments";

export const Route = createFileRoute("/_authenticated/appointments/calendar")({
  head: () => buildHead({ title: "Calendrier des rendez-vous — HealthLink Maroc", description: "Visualisez vos rendez-vous en mode jour, semaine, mois ou agenda.", path: "/appointments/calendar" }),
  component: CalendarPage,
});

const FILTERS = [
  { value: "all", label: "Tous" },
  { value: "upcoming", label: "À venir" },
  { value: "pending", label: "En attente" },
  { value: "approved", label: "Confirmés" },
  { value: "completed", label: "Terminés" },
  { value: "cancelled", label: "Annulés" },
];

function CalendarPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery(appointmentsQuery(user?.id));

  const [mode, setMode] = useState<CalendarMode>("agenda");
  const [cursor, setCursor] = useState(new Date());
  const [filter, setFilter] = useState("upcoming");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("my-appts")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `patient_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["appointments"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const items = useMemo(() => {
    let arr = data as unknown as AppointmentRow[];
    if (filter === "upcoming") arr = arr.filter((a) => isUpcoming(a));
    else if (filter !== "all") arr = arr.filter((a) => a.status === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter((a) => (a.providers?.name ?? "").toLowerCase().includes(q) || (a.reason ?? "").toLowerCase().includes(q));
    }
    return arr;
  }, [data, filter, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Suivi médical"
        title="Calendrier"
        description="Vos rendez-vous, jour par jour ou mois par mois, mis à jour en temps réel."
        icon={<CalendarCheck className="h-5 w-5" />}
        actions={
          <Button asChild className="gap-2">
            <Link to="/doctors"><Plus className="h-4 w-4" /> Nouveau RDV</Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft">
        <CalendarControls mode={mode} setMode={setMode} cursor={cursor} setCursor={setCursor} />
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un prestataire ou motif" className="h-9 w-64 pl-8" />
          </div>
          <Tabs value={filter} onValueChange={setFilter} className="ml-auto">
            <TabsList>
              {FILTERS.map((f) => (
                <TabsTrigger key={f.value} value={f.value} className="text-xs">{f.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : mode === "agenda" ? (
        <div className="grid gap-3">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
              Aucun rendez-vous correspondant.
            </div>
          ) : (
            items.map((a) => <AppointmentCard key={a.id} a={a} />)
          )}
        </div>
      ) : (
        <CalendarView
          mode={mode}
          cursor={cursor}
          appointments={items}
          onPickDay={(d) => { setCursor(d); setMode("day"); }}
        />
      )}
    </div>
  );
}