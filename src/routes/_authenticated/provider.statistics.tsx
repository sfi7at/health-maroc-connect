import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, CalendarCheck, Heart } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedProvider } from "@/lib/provider-store";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/provider/statistics")({
  head: () => buildHead({ title: "Statistiques — Espace prestataire", description: "Analyses et tendances.", path: "/provider/statistics" }),
  component: ProviderStatistics,
});

function ProviderStatistics() {
  const { provider } = useSelectedProvider();
  const id = provider?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["provider_stats", id],
    enabled: !!id,
    queryFn: async () => {
      const from = new Date(); from.setMonth(from.getMonth() - 5); from.setDate(1); from.setHours(0,0,0,0);
      const [appts, favs, reviews] = await Promise.all([
        supabase.from("appointments").select("created_at, status").eq("provider_id", id!).gte("created_at", from.toISOString()),
        supabase.from("favorites").select("created_at").eq("provider_id", id!).gte("created_at", from.toISOString()),
        supabase.from("reviews").select("created_at, rating").eq("provider_id", id!).gte("created_at", from.toISOString()),
      ]);
      const months: string[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
        months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,"0")}`);
      }
      const bucket = (rows: { created_at: string }[]) => months.map((m) => ({
        month: m.slice(5) + "/" + m.slice(2,4),
        value: rows.filter((r) => r.created_at.startsWith(m)).length,
      }));
      return {
        appointments: bucket(appts.data ?? []),
        favorites: bucket(favs.data ?? []),
        reviews: bucket(reviews.data ?? []),
        statusBreakdown: ["pending","approved","completed","cancelled","no_show"].map((s) => ({
          name: s, value: (appts.data ?? []).filter((a) => a.status === s).length,
        })),
      };
    },
  });

  if (!provider) return null;
  if (isLoading || !data) return <Skeleton className="h-96 rounded-3xl" />;

  const total = (xs: { value: number }[]) => xs.reduce((s, x) => s + x.value, 0);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Statistiques" title="Performance & tendances" description="Suivi sur les 6 derniers mois." icon={<BarChart3 className="h-5 w-5" />} />

      <section className="grid gap-3 sm:grid-cols-3">
        <Kpi label="RDV (6 mois)" value={total(data.appointments)} icon={CalendarCheck} tone="from-emerald-500 to-teal-600" />
        <Kpi label="Nouveaux favoris" value={total(data.favorites)} icon={Heart} tone="from-rose-500 to-pink-600" />
        <Kpi label="Avis reçus" value={total(data.reviews)} icon={TrendingUp} tone="from-violet-500 to-fuchsia-600" />
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">Évolution des rendez-vous</h2>
        <div className="h-64 w-full">
          <ResponsiveContainer>
            <AreaChart data={data.appointments}>
              <defs>
                <linearGradient id="appts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#appts)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">Nouveaux favoris</h2>
          <div className="h-56 w-full">
            <ResponsiveContainer>
              <BarChart data={data.favorites}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">Répartition des statuts</h2>
          <div className="h-56 w-full">
            <ResponsiveContainer>
              <BarChart data={data.statusBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={90} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0,6,6,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">Les vues du profil et apparitions en recherche seront disponibles dans une prochaine mise à jour.</p>
    </div>
  );
}

function Kpi({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: React.ElementType; tone: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-border bg-card p-4 shadow-soft">
      <div className={`mb-2 grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br ${tone} text-white`}><Icon className="h-4 w-4" /></div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </motion.div>
  );
}