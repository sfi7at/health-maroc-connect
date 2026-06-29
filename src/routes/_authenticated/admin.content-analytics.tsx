import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Eye, FileText, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/content-analytics")({
  component: ContentAnalytics,
});

function ContentAnalytics() {
  const stats = useQuery({
    queryKey: ["content-analytics"],
    queryFn: async () => {
      const [pub, drafts, top, recent] = await Promise.all([
        supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "published" as never),
        supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "draft" as never),
        supabase.from("articles").select("id,title,view_count,share_count,published_at").order("view_count", { ascending: false }).limit(10),
        supabase.from("article_views" as never).select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
      ]);
      return {
        published: pub.count ?? 0,
        drafts: drafts.count ?? 0,
        top: (top.data ?? []) as Array<{ id: string; title: string; view_count: number; share_count: number; published_at: string | null }>,
        viewsThisWeek: recent.count ?? 0,
      };
    },
  });

  if (stats.isLoading) return <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>;

  const d = stats.data!;
  const cards = [
    { label: "Articles publiés", value: d.published, icon: FileText },
    { label: "Brouillons", value: d.drafts, icon: FileText },
    { label: "Vues (7 jours)", value: d.viewsThisWeek, icon: Eye },
    { label: "Top article", value: d.top[0]?.view_count ?? 0, icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <AdminHeader icon={BarChart3} title="Analytique du contenu" description="Performance, vues, partages et engagement." />
      <div className="grid gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{c.label}</p>
              <c.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-3xl font-bold">{c.value}</p>
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <h3 className="mb-3 font-semibold">Top articles (toutes périodes)</h3>
        <div className="space-y-2">
          {d.top.map((a, i) => (
            <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">{i + 1}</span>
                <span className="truncate">{a.title}</span>
              </div>
              <div className="flex shrink-0 gap-2">
                <Badge variant="secondary"><Eye className="mr-1 h-3 w-3" />{a.view_count}</Badge>
                <Badge variant="outline">⇪ {a.share_count}</Badge>
              </div>
            </div>
          ))}
          {d.top.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Pas encore de données.</p>}
        </div>
      </Card>
    </div>
  );
}