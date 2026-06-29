import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Gauge } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/admin/performance")({
  component: AdminPerformance,
});

function AdminPerformance() {
  const metrics = useQuery({
    queryKey: ["admin-perf-metrics"],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from("api_metrics")
        .select("route, status_code, duration_ms, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 60_000,
  });

  const rows = metrics.data ?? [];
  const byRoute = new Map<string, { count: number; total: number; max: number; errors: number }>();
  rows.forEach((r) => {
    const cur = byRoute.get(r.route) ?? { count: 0, total: 0, max: 0, errors: 0 };
    cur.count += 1;
    cur.total += r.duration_ms;
    cur.max = Math.max(cur.max, r.duration_ms);
    if (r.status_code >= 400) cur.errors += 1;
    byRoute.set(r.route, cur);
  });
  const table = [...byRoute.entries()]
    .map(([route, s]) => ({ route, count: s.count, avg: Math.round(s.total / s.count), max: s.max, errors: s.errors }))
    .sort((a, b) => b.avg - a.avg);

  // hourly latency series
  const hourly = new Map<string, { sum: number; count: number }>();
  rows.forEach((r) => {
    const h = r.created_at.slice(0, 13);
    const cur = hourly.get(h) ?? { sum: 0, count: 0 };
    cur.sum += r.duration_ms;
    cur.count += 1;
    hourly.set(h, cur);
  });
  const series = [...hourly.entries()]
    .sort()
    .map(([h, s]) => ({ hour: h.slice(11), avg: Math.round(s.sum / s.count) }));

  return (
    <div className="space-y-6">
      <AdminHeader icon={Gauge} title="Performance API" description="Latence moyenne, p95, taux d'erreurs sur 24h." />

      <Card className="p-4">
        <div className="mb-2 text-sm font-semibold">Latence moyenne (24h)</div>
        <div className="h-56">
          {metrics.isLoading ? <Skeleton className="h-full w-full" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Area type="monotone" dataKey="avg" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-border p-4 text-sm font-semibold">Top routes par latence</div>
        {metrics.isLoading ? <div className="p-6 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr>
              <th className="px-4 py-3 text-left">Route</th>
              <th className="px-4 py-3 text-right">Appels</th>
              <th className="px-4 py-3 text-right">Moy (ms)</th>
              <th className="px-4 py-3 text-right">Max (ms)</th>
              <th className="px-4 py-3 text-right">Erreurs</th>
            </tr></thead>
            <tbody>
              {table.slice(0, 50).map((r) => (
                <tr key={r.route} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{r.route}</td>
                  <td className="px-4 py-3 text-right">{r.count}</td>
                  <td className="px-4 py-3 text-right">{r.avg > 800 ? <Badge variant="destructive">{r.avg}</Badge> : r.avg}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{r.max}</td>
                  <td className="px-4 py-3 text-right">{r.errors > 0 ? <Badge variant="destructive">{r.errors}</Badge> : 0}</td>
                </tr>
              ))}
              {table.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Aucune donnée pour les dernières 24h.</td></tr>}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}