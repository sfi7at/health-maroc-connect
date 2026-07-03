import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarCheck, Users, Star, Bell, FileText, ArrowRight, TrendingUp,
  Activity, Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedProvider } from "@/lib/provider-store";
import { formatDateTimeFr } from "@/lib/format";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/pro/")({
  head: () => buildHead({
    title: "Tableau de bord — HealthLink Pro",
    description: "Vue temps réel de votre activité clinique.",
    path: "/pro",
  }),
  component: ProDashboard,
});

function ProDashboard() {
  const { provider } = useSelectedProvider();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["pro", "stats", provider?.id],
    enabled: !!provider?.id,
    queryFn: async () => {
      const now = new Date();
      const startDay = new Date(now); startDay.setHours(0, 0, 0, 0);
      const endDay = new Date(now); endDay.setHours(23, 59, 59, 999);
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [today, upcoming, month, reviews, rx, notif] = await Promise.all([
        supabase.from("appointments").select("id, status, scheduled_for, patient_id", { count: "exact" })
          .eq("provider_id", provider!.id)
          .gte("scheduled_for", startDay.toISOString())
          .lte("scheduled_for", endDay.toISOString())
          .order("scheduled_for"),
        supabase.from("appointments").select("id, status, scheduled_for, patient_id")
          .eq("provider_id", provider!.id)
          .gt("scheduled_for", endDay.toISOString())
          .neq("status", "cancelled")
          .order("scheduled_for")
          .limit(8),
        supabase.from("appointments").select("id, status, patient_id", { count: "exact" })
          .eq("provider_id", provider!.id)
          .gte("scheduled_for", startMonth.toISOString()),
        supabase.from("reviews").select("id, rating", { count: "exact" }).eq("provider_id", provider!.id),
        supabase.from("prescriptions").select("id", { count: "exact", head: true }).eq("provider_id", provider!.id),
        supabase.from("notifications").select("id", { count: "exact", head: true })
          .eq("user_id", provider!.id).eq("read", false),
      ]);

      const monthItems = month.data ?? [];
      const cancelRate = monthItems.length
        ? Math.round((monthItems.filter((a) => a.status === "cancelled").length / monthItems.length) * 100)
        : 0;
      const completed = monthItems.filter((a) => a.status === "completed").length;
      const patients = new Set(monthItems.map((a) => a.patient_id)).size;

      const avg = (reviews.data ?? []).reduce((a, r) => a + r.rating, 0) /
        Math.max(1, (reviews.data ?? []).length);

      return {
        todayCount: today.count ?? 0,
        today: today.data ?? [],
        upcoming: upcoming.data ?? [],
        monthTotal: month.count ?? 0,
        completed,
        cancelRate,
        patients,
        reviewsAvg: avg,
        reviewsCount: reviews.count ?? 0,
        rxCount: rx.count ?? 0,
        notifCount: notif.count ?? 0,
      };
    },
  });

  if (isLoading || !stats) return <Skeleton className="h-96 rounded-3xl" />;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="HealthLink Pro"
        title={`Bonjour Dr. ${provider?.name?.split(" ")[0] ?? ""}`}
        description="Vue temps réel de votre activité clinique. Toutes les données sont synchronisées avec l'application citoyenne."
        icon={<Stethoscope className="h-5 w-5" />}
        actions={
          <Button asChild className="gap-2 bg-[#0B2545] hover:bg-[#0B2545]/90">
            <Link to="/pro/prescriptions/new">
              <FileText className="h-4 w-4" /> Nouvelle ordonnance
            </Link>
          </Button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={CalendarCheck} label="RDV aujourd'hui" value={String(stats.todayCount)} tone="from-emerald-500 to-teal-600" />
        <StatCard icon={Users} label="Patients ce mois" value={String(stats.patients)} tone="from-sky-500 to-blue-600" />
        <StatCard icon={Activity} label="Consultations réalisées" value={String(stats.completed)} tone="from-violet-500 to-fuchsia-600" />
        <StatCard icon={TrendingUp} label="Taux d'annulation" value={`${stats.cancelRate}%`} tone="from-rose-500 to-red-600" />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MiniCard icon={FileText} label="Ordonnances émises" value={String(stats.rxCount)} to="/pro/prescriptions" />
        <MiniCard icon={Star} label="Note moyenne" value={stats.reviewsAvg.toFixed(1)} to="/provider/reviews" />
        <MiniCard icon={Bell} label="Notifications non lues" value={String(stats.notifCount)} to="/provider/notifications" />
        <MiniCard icon={CalendarCheck} label="Total RDV du mois" value={String(stats.monthTotal)} to="/pro/schedule" />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <div className="flex items-end justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Aujourd'hui
            </h2>
            <Button variant="ghost" size="sm" asChild className="gap-1 text-xs">
              <Link to="/pro/schedule">Voir l'agenda <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          </div>
          {stats.today.length ? (
            <ul className="space-y-2">
              {stats.today.map((a) => (
                <li key={a.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-soft">
                  <div>
                    <p className="text-sm font-semibold">{formatDateTimeFr(a.scheduled_for)}</p>
                    <p className="text-xs text-muted-foreground">Statut : {a.status}</p>
                  </div>
                  <Badge variant="secondary">{a.status}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Aucun rendez-vous prévu aujourd'hui.
            </p>
          )}
        </div>

        <aside className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            À venir
          </h2>
          {stats.upcoming.length ? (
            <ul className="space-y-2">
              {stats.upcoming.slice(0, 6).map((a) => (
                <li key={a.id} className="rounded-2xl border border-border bg-card p-3 text-xs shadow-soft">
                  <p className="font-semibold">{formatDateTimeFr(a.scheduled_for)}</p>
                  <p className="text-muted-foreground">{a.status}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              Aucun rendez-vous à venir.
            </p>
          )}
        </aside>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: string; tone: string }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-soft">
      <div className={`mb-3 grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br ${tone} text-white`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function MiniCard({ icon: Icon, label, value, to }: { icon: React.ElementType; label: string; value: string; to: string }) {
  return (
    <Link to={to} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-soft transition-colors hover:bg-muted/40">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-lg font-bold">{value}</p>
      </div>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}