import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, Users, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell } from "recharts";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  component: AdminAnalytics,
});

function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); d.setHours(0,0,0,0); return d;
}

function formatDay(d: Date) {
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

const COLORS = ["#0E9F6E", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#10B981"];

function AdminAnalytics() {
  const range = 30;

  const series = useQuery({
    queryKey: ["admin-analytics-series", range],
    queryFn: async () => {
      const since = daysAgo(range).toISOString();
      const [users, appts, requests] = await Promise.all([
        supabase.from("profiles").select("created_at").gte("created_at", since),
        supabase.from("appointments").select("created_at").gte("created_at", since),
        supabase.from("blood_requests").select("created_at").gte("created_at", since),
      ]);
      if (users.error) throw users.error;
      const bucket = (rows: { created_at: string }[]) => {
        const m: Record<string, number> = {};
        rows.forEach((r) => { const k = r.created_at.slice(0, 10); m[k] = (m[k] ?? 0) + 1; });
        return m;
      };
      const u = bucket(users.data ?? []);
      const a = bucket(appts.data ?? []);
      const b = bucket(requests.data ?? []);
      const out: { day: string; users: number; appointments: number; blood: number }[] = [];
      for (let i = range - 1; i >= 0; i--) {
        const d = daysAgo(i); const k = d.toISOString().slice(0, 10);
        out.push({ day: formatDay(d), users: u[k] ?? 0, appointments: a[k] ?? 0, blood: b[k] ?? 0 });
      }
      return out;
    },
  });

  const cities = useQuery({
    queryKey: ["admin-analytics-cities"],
    queryFn: async () => {
      const { data, error } = await supabase.from("providers").select("city_id, cities(name)").not("city_id", "is", null).limit(1000);
      if (error) throw error;
      const counts: Record<string, number> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data ?? []).forEach((p: any) => { const n = p.cities?.name ?? "—"; counts[n] = (counts[n] ?? 0) + 1; });
      return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
    },
  });

  const topDoctors = useQuery({
    queryKey: ["admin-analytics-top-doctors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("providers").select("name, average_rating, reviews_count").eq("category", "doctor" as never).order("reviews_count", { ascending: false }).limit(8);
      if (error) throw error;
      return (data ?? []).map((d) => ({ name: d.name.slice(0, 24), reviews: d.reviews_count, rating: Number(d.average_rating) }));
    },
  });

  return (
    <div className="space-y-6">
      <AdminHeader icon={BarChart3} title="Analytique" description="Tendances de la plateforme sur les 30 derniers jours." badge="30 jours" />

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /><h2 className="font-semibold">Activité quotidienne</h2></div>
        {series.isLoading ? <Skeleton className="h-64 w-full" /> : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={series.data ?? []}>
              <defs>
                <linearGradient id="gU" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0E9F6E" stopOpacity={0.4} /><stop offset="95%" stopColor="#0E9F6E" stopOpacity={0} /></linearGradient>
                <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} /><stop offset="95%" stopColor="#3B82F6" stopOpacity={0} /></linearGradient>
                <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} /><stop offset="95%" stopColor="#EF4444" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="users" stroke="#0E9F6E" fill="url(#gU)" name="Utilisateurs" />
              <Area type="monotone" dataKey="appointments" stroke="#3B82F6" fill="url(#gA)" name="RDV" />
              <Area type="monotone" dataKey="blood" stroke="#EF4444" fill="url(#gB)" name="Don de sang" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-primary" /><h2 className="font-semibold">Villes les plus actives</h2></div>
          {cities.isLoading ? <Skeleton className="h-64 w-full" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={cities.data ?? []} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {(cities.data ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2"><Stethoscope className="h-4 w-4 text-primary" /><h2 className="font-semibold">Top prestataires (par avis)</h2></div>
          {topDoctors.isLoading ? <Skeleton className="h-64 w-full" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topDoctors.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="reviews" fill="#0E9F6E" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}