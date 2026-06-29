import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/admin/business")({
  component: AdminBusiness,
});

function AdminBusiness() {
  const events = useQuery({
    queryKey: ["admin-business-events"],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from("analytics_events")
        .select("event_name, properties, created_at")
        .gte("created_at", since)
        .limit(5000);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 120_000,
  });

  const rows = events.data ?? [];
  const byEvent = new Map<string, number>();
  const searches: string[] = [];
  const cities = new Map<string, number>();
  rows.forEach((e) => {
    byEvent.set(e.event_name, (byEvent.get(e.event_name) ?? 0) + 1);
    if (e.event_name === "search") {
      const q = (e.properties as { query?: string })?.query;
      if (q) searches.push(q);
    }
    const c = (e.properties as { city?: string })?.city;
    if (c) cities.set(c, (cities.get(c) ?? 0) + 1);
  });

  const eventBars = [...byEvent.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  const topSearches = topN(searches, 10);
  const topCities = [...cities.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  return (
    <div className="space-y-6">
      <AdminHeader icon={TrendingUp} title="Analytique business" description="Recherches, conversions et villes les plus actives — 7 derniers jours." />

      <div className="grid gap-4 md:grid-cols-4">
        {["page_view", "search", "appointment_booked", "blood_request_created"].map((k) => (
          <Card key={k} className="p-4">
            <div className="text-xs text-muted-foreground">{k}</div>
            <div className="mt-1 text-2xl font-bold">{byEvent.get(k) ?? 0}</div>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="mb-2 text-sm font-semibold">Événements (7 jours)</div>
        <div className="h-64">
          {events.isLoading ? <Skeleton className="h-full w-full" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eventBars}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 text-sm font-semibold">Top recherches</div>
          <ul className="space-y-2 text-sm">
            {topSearches.map(([term, n]) => (
              <li key={term} className="flex justify-between"><span className="truncate">{term}</span><span className="font-mono text-muted-foreground">{n}</span></li>
            ))}
            {topSearches.length === 0 && <li className="text-muted-foreground text-sm">Aucune recherche enregistrée.</li>}
          </ul>
        </Card>
        <Card className="p-4">
          <div className="mb-3 text-sm font-semibold">Villes les plus actives</div>
          <ul className="space-y-2 text-sm">
            {topCities.map(([city, n]) => (
              <li key={city} className="flex justify-between"><span>{city}</span><span className="font-mono text-muted-foreground">{n}</span></li>
            ))}
            {topCities.length === 0 && <li className="text-muted-foreground text-sm">Pas encore de données géographiques.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function topN(arr: string[], n: number): [string, number][] {
  const m = new Map<string, number>();
  arr.forEach((x) => m.set(x, (m.get(x) ?? 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}