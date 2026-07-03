import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, Search, User, CalendarCheck, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedProvider } from "@/lib/provider-store";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/pro/patients")({
  head: () => buildHead({
    title: "Patients — HealthLink Pro",
    description: "Base de patients agrégée depuis vos consultations.",
    path: "/pro/patients",
  }),
  component: PatientsPage,
});

type Row = {
  patient_id: string;
  last_visit: string;
  first_visit: string;
  visits: number;
  last_status: string;
  last_reason: string | null;
  full_name: string | null;
  rx_count: number;
};

function PatientsPage() {
  const { provider } = useSelectedProvider();
  const [q, setQ] = useState("");

  const { data = [], isLoading } = useQuery<Row[]>({
    queryKey: ["pro", "patients", provider?.id],
    enabled: !!provider?.id,
    queryFn: async () => {
      const { data: appts, error } = await supabase
        .from("appointments")
        .select("patient_id, scheduled_for, status, reason")
        .eq("provider_id", provider!.id)
        .order("scheduled_for", { ascending: false })
        .limit(1000);
      if (error) throw error;

      // Aggregate by patient_id
      const map = new Map<string, Row>();
      for (const a of appts ?? []) {
        const cur = map.get(a.patient_id);
        if (!cur) {
          map.set(a.patient_id, {
            patient_id: a.patient_id,
            last_visit: a.scheduled_for,
            first_visit: a.scheduled_for,
            visits: 1,
            last_status: a.status,
            last_reason: a.reason,
            full_name: null,
            rx_count: 0,
          });
        } else {
          cur.visits += 1;
          if (a.scheduled_for < cur.first_visit) cur.first_visit = a.scheduled_for;
        }
      }

      const ids = Array.from(map.keys());
      if (ids.length === 0) return [];

      // Best-effort profile enrichment (RLS may hide names) & prescription counts
      const [profilesRes, rxRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name").in("id", ids),
        supabase.from("prescriptions").select("user_id").eq("provider_id", provider!.id).in("user_id", ids),
      ]);
      (profilesRes.data ?? []).forEach((p) => {
        const r = map.get(p.id); if (r) r.full_name = p.full_name;
      });
      (rxRes.data ?? []).forEach((p) => {
        if (!p.user_id) return;
        const r = map.get(p.user_id); if (r) r.rx_count += 1;
      });

      return Array.from(map.values()).sort((a, b) => b.last_visit.localeCompare(a.last_visit));
    },
  });

  const filtered = useMemo(() => {
    if (!q.trim()) return data;
    const n = q.toLowerCase();
    return data.filter((r) => (r.full_name ?? "").toLowerCase().includes(n) || r.patient_id.includes(n));
  }, [data, q]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Patients"
        title="Ma base patients"
        description="Historique agrégé de vos consultations. Cliquez pour voir le dossier."
        icon={<Users className="h-5 w-5" />}
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un patient" className="pl-9" />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[0,1,2].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title={q ? "Aucun résultat" : "Aucun patient"}
                    description={q ? "Modifiez votre recherche." : "Vos patients apparaîtront ici après leurs premières consultations."} />
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => (
            <li key={r.patient_id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="flex flex-wrap items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-muted">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {r.full_name ?? `Patient #${r.patient_id.slice(0, 8)}`}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Dernière visite : {new Date(r.last_visit).toLocaleDateString("fr-FR")}
                    {r.last_reason ? ` • ${r.last_reason}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="gap-1">
                    <CalendarCheck className="h-3 w-3" />{r.visits} RDV
                  </Badge>
                  {r.rx_count ? (
                    <Badge variant="outline" className="gap-1">
                      <FileText className="h-3 w-3" />{r.rx_count} ordo.
                    </Badge>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}