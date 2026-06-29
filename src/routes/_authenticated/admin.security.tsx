import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, AlertTriangle, Ban, Activity, Lock, Flag, BadgeCheck, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTimeFr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/security")({
  component: AdminSecurity,
});

function AdminSecurity() {
  const stats = useQuery({
    queryKey: ["admin-security-stats"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 3600_000).toISOString();
      const [failedLogins, openEvents, blocked, pendingVerif, openReports, totalDevices] = await Promise.all([
        supabase.from("login_attempts").select("*", { count: "exact", head: true }).eq("success", false).gte("created_at", since),
        supabase.from("security_events").select("*", { count: "exact", head: true }).eq("resolved", false),
        supabase.from("blocked_entities").select("*", { count: "exact", head: true }),
        supabase.from("providers").select("*", { count: "exact", head: true }).in("verification_status", ["pending", "under_review"]),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("user_devices").select("*", { count: "exact", head: true }),
      ]);
      return {
        failedLogins: failedLogins.count ?? 0,
        openEvents: openEvents.count ?? 0,
        blocked: blocked.count ?? 0,
        pendingVerif: pendingVerif.count ?? 0,
        openReports: openReports.count ?? 0,
        totalDevices: totalDevices.count ?? 0,
      };
    },
  });

  const recentEvents = useQuery({
    queryKey: ["admin-security-recent-events"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_events")
        .select("id, event_type, severity, created_at, resolved, metadata")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <AdminHeader
        icon={ShieldCheck}
        title="Centre de sécurité"
        description="Surveillez les menaces, la confiance des prestataires et l'intégrité de la plateforme en temps réel."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Lock} label="Échecs de connexion (24h)" value={stats.data?.failedLogins} tone="amber" />
        <StatCard icon={AlertTriangle} label="Alertes ouvertes" value={stats.data?.openEvents} tone="red" />
        <StatCard icon={Ban} label="Entités bloquées" value={stats.data?.blocked} tone="slate" />
        <StatCard icon={BadgeCheck} label="Vérifications en attente" value={stats.data?.pendingVerif} tone="blue" />
        <StatCard icon={Flag} label="Signalements ouverts" value={stats.data?.openReports} tone="red" />
        <StatCard icon={Activity} label="Appareils enregistrés" value={stats.data?.totalDevices} tone="green" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <QuickLink to="/admin/security/events" title="Journal d'événements" desc="Connexions suspectes, anomalies, fraudes." icon={Activity} />
        <QuickLink to="/admin/security/blocked" title="Liste de blocage" desc="IPs, e-mails, utilisateurs et appareils bloqués." icon={Ban} />
        <QuickLink to="/admin/security/trust" title="Confiance & vérifications" desc="Scores de confiance et statuts des prestataires." icon={BadgeCheck} />
        <QuickLink to="/admin/reports" title="Signalements utilisateurs" desc="Faux profils, fraudes, abus." icon={Flag} />
        <QuickLink to="/admin/logs" title="Audit administrateur" desc="Toutes les actions sensibles tracées." icon={ShieldCheck} />
        <QuickLink to="/admin/verification" title="File de vérification" desc="Documents pros à examiner." icon={BadgeCheck} />
      </div>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Dernières alertes</h3>
          <Link to="/admin/security/events" className="text-xs text-primary hover:underline">Voir tout</Link>
        </div>
        {recentEvents.isLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
        ) : (recentEvents.data?.length ?? 0) === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Aucun événement récent. Tout est calme.</p>
        ) : (
          <div className="divide-y">
            {(recentEvents.data ?? []).map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <SeverityDot severity={e.severity} />
                  <div>
                    <div className="font-medium">{e.event_type}</div>
                    <div className="text-xs text-muted-foreground">{formatDateTimeFr(e.created_at)}</div>
                  </div>
                </div>
                <Badge variant={e.resolved ? "outline" : "destructive"}>{e.resolved ? "Résolu" : "Ouvert"}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

const TONE: Record<string, string> = {
  red: "from-rose-500/10 to-rose-500/0 text-rose-700",
  amber: "from-amber-500/10 to-amber-500/0 text-amber-700",
  blue: "from-sky-500/10 to-sky-500/0 text-sky-700",
  green: "from-emerald-500/10 to-emerald-500/0 text-emerald-700",
  slate: "from-slate-500/10 to-slate-500/0 text-slate-700",
};

function StatCard({ icon: Icon, label, value, tone }: { icon: typeof Lock; label: string; value?: number; tone: keyof typeof TONE }) {
  return (
    <Card className={`bg-gradient-to-br ${TONE[tone]} p-5`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide opacity-80">{label}</div>
          <div className="mt-1 text-3xl font-bold">{value ?? "—"}</div>
        </div>
        <Icon className="h-6 w-6 opacity-80" />
      </div>
    </Card>
  );
}

function QuickLink({ to, title, desc, icon: Icon }: { to: string; title: string; desc: string; icon: typeof Lock }) {
  return (
    <Link to={to} className="group">
      <Card className="h-full p-5 transition-all hover:border-primary/40 hover:shadow-md">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">{title}</h4>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function SeverityDot({ severity }: { severity: string }) {
  const color =
    severity === "critical" ? "bg-rose-600" :
    severity === "high" ? "bg-rose-500" :
    severity === "medium" ? "bg-amber-500" :
    "bg-slate-400";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />;
}
