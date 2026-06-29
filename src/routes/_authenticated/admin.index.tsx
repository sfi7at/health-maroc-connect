import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users, Stethoscope, Pill, Building2, FlaskConical, Droplet, HeartHandshake,
  CalendarCheck, ShieldCheck, Flag, Activity, TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader, StatCard } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTimeFr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function useCount(table: string, filter?: (q: ReturnType<typeof supabase.from>) => unknown) {
  return useQuery({
    queryKey: ["admin-count", table, filter?.toString()],
    queryFn: async () => {
      let q: ReturnType<typeof supabase.from> = supabase.from(table as never);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let req: any = (q as any).select("*", { count: "exact", head: true });
      if (filter) req = filter(req);
      const { count, error } = await req;
      if (error) throw error;
      return count ?? 0;
    },
  });
}

function AdminDashboard() {
  const users = useCount("profiles");
  const doctors = useCount("providers", (q) => (q as never as { eq: (c: string, v: string) => unknown }).eq("category", "doctor"));
  const pharmacies = useCount("providers", (q) => (q as never as { eq: (c: string, v: string) => unknown }).eq("category", "pharmacy"));
  const hospitals = useCount("providers", (q) => (q as never as { eq: (c: string, v: string) => unknown }).eq("category", "hospital"));
  const labs = useCount("providers", (q) => (q as never as { eq: (c: string, v: string) => unknown }).eq("category", "laboratory"));
  const bloodDonors = useCount("blood_donors");
  const bloodRequests = useCount("blood_requests");
  const pendingVerifs = useCount("providers", (q) => (q as never as { eq: (c: string, v: boolean) => unknown }).eq("is_verified", false));
  const reports = useCount("reports", (q) => (q as never as { eq: (c: string, v: string) => unknown }).eq("status", "open"));

  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
  const apptsToday = useQuery({
    queryKey: ["admin-appts-today"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .gte("scheduled_for", todayStart.toISOString())
        .lte("scheduled_for", todayEnd.toISOString());
      if (error) throw error;
      return count ?? 0;
    },
  });

  const recent = useQuery({
    queryKey: ["admin-recent-activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_audit_log")
        .select("id, action, entity_type, entity_id, created_at, actor_id")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });

  const recentUsers = useQuery({
    queryKey: ["admin-recent-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, created_at, city")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const stat = (q: ReturnType<typeof useCount>) => q.isLoading ? "…" : (q.data ?? 0).toLocaleString("fr-FR");

  return (
    <div className="space-y-8">
      <AdminHeader
        icon={ShieldCheck}
        title="Tableau de bord"
        description="Vue d'ensemble en temps réel de la plateforme HealthLink Maroc."
        badge="Live"
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Utilisateurs" value={stat(users)} accent="primary" />
        <StatCard icon={Stethoscope} label="Médecins" value={stat(doctors)} accent="info" />
        <StatCard icon={Pill} label="Pharmacies" value={stat(pharmacies)} accent="success" />
        <StatCard icon={Building2} label="Hôpitaux" value={stat(hospitals)} accent="warning" />
        <StatCard icon={FlaskConical} label="Laboratoires" value={stat(labs)} accent="info" />
        <StatCard icon={Droplet} label="Donneurs de sang" value={stat(bloodDonors)} accent="destructive" />
        <StatCard icon={HeartHandshake} label="Demandes de sang" value={stat(bloodRequests)} accent="destructive" />
        <StatCard icon={CalendarCheck} label="RDV aujourd'hui" value={apptsToday.isLoading ? "…" : (apptsToday.data ?? 0).toLocaleString("fr-FR")} accent="primary" />
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Link to="/admin/verification" className="block">
          <Card className="group flex items-center justify-between p-5 transition hover:shadow-md hover:border-primary/50">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-600" />
                <p className="text-sm font-medium">Vérifications en attente</p>
              </div>
              <p className="mt-2 text-3xl font-bold">{stat(pendingVerifs)}</p>
            </div>
            <Badge variant="outline" className="group-hover:bg-primary/10">Traiter →</Badge>
          </Card>
        </Link>
        <Link to="/admin/reports" className="block">
          <Card className="group flex items-center justify-between p-5 transition hover:shadow-md hover:border-primary/50">
            <div>
              <div className="flex items-center gap-2">
                <Flag className="h-4 w-4 text-destructive" />
                <p className="text-sm font-medium">Signalements ouverts</p>
              </div>
              <p className="mt-2 text-3xl font-bold">{stat(reports)}</p>
            </div>
            <Badge variant="outline" className="group-hover:bg-primary/10">Modérer →</Badge>
          </Card>
        </Link>
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-600" />
            <p className="text-sm font-medium">Statut système</p>
          </div>
          <p className="mt-2 text-3xl font-bold text-emerald-600">Opérationnel</p>
          <p className="text-xs text-muted-foreground">Tous les services fonctionnent normalement.</p>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Activités récentes</h2>
            <Link to="/admin/logs" className="text-xs text-primary hover:underline">Voir tout</Link>
          </div>
          {recent.isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : recent.data && recent.data.length > 0 ? (
            <ul className="space-y-3">
              {recent.data.map((r) => (
                <li key={r.id} className="flex items-start gap-3 rounded-xl border border-border/60 p-3">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{r.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.entity_type ?? "système"} · {formatDateTimeFr(r.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">Aucune activité récente.</p>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Nouveaux utilisateurs</h2>
            <Link to="/admin/users" className="text-xs text-primary hover:underline">Gérer →</Link>
          </div>
          {recentUsers.isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : recentUsers.data && recentUsers.data.length > 0 ? (
            <ul className="space-y-3">
              {recentUsers.data.map((u) => (
                <li key={u.id} className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-muted text-sm font-semibold">
                    {(u.full_name ?? "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{u.full_name ?? "Sans nom"}</p>
                    <p className="text-xs text-muted-foreground">{u.city ?? "—"} · {formatDateTimeFr(u.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">Aucun nouvel utilisateur.</p>
          )}
        </Card>
      </section>
    </div>
  );
}