import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Newspaper, Search, Clock, Eye, Pin, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/content")({
  component: ContentPage,
  head: () => ({
    meta: [
      { title: "Articles santé & actualités médicales — HealthLink Maroc" },
      { name: "description", content: "Conseils santé, campagnes, alertes et guides médicaux validés pour le Maroc." },
      { property: "og:title", content: "Articles santé — HealthLink Maroc" },
      { property: "og:description", content: "Actualités médicales, prévention et campagnes nationales de santé au Maroc." },
    ],
  }),
});

const TYPES = [
  { v: "all", l: "Tout" },
  { v: "article", l: "Articles" },
  { v: "news", l: "Actualités" },
  { v: "campaign", l: "Campagnes" },
  { v: "guide", l: "Guides" },
  { v: "emergency", l: "Urgences" },
  { v: "seasonal", l: "Alertes saisonnières" },
  { v: "announcement", l: "Annonces" },
];

function ContentPage() {
  const [type, setType] = useState("all");
  const [q, setQ] = useState("");

  const list = useQuery({
    queryKey: ["public-content", type, q],
    queryFn: async () => {
      let query = supabase
        .from("articles")
        .select("id,slug,title,excerpt,description,cover_image,category,content_type,language,published_at,view_count,reading_time_minutes,is_pinned,is_featured")
        .eq("is_published", true)
        .order("is_pinned", { ascending: false })
        .order("published_at", { ascending: false })
        .limit(60);
      if (type !== "all") query = query.eq("content_type", type as never);
      if (q) query = query.ilike("title", `%${q}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const featured = (list.data ?? []).filter((a) => a.is_featured).slice(0, 3);

  return (
    <div className="space-y-6">
      <PageHeader icon={Newspaper} title="Santé & actualités" description="Conseils, campagnes et guides médicaux du Maroc." />

      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher un article…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <Button key={t.v} size="sm" variant={type === t.v ? "default" : "outline"} onClick={() => setType(t.v)}>
              {t.l}
            </Button>
          ))}
        </div>
      </div>

      {featured.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">À la une</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {featured.map((a) => (
              <Link key={a.id} to="/content/$slug" params={{ slug: a.slug }} className="group">
                <Card className="overflow-hidden transition-all hover:shadow-lg">
                  {a.cover_image ? (
                    <img src={a.cover_image} alt={a.title} className="h-44 w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="grid h-44 w-full place-items-center bg-gradient-to-br from-primary/20 to-emerald-200 text-primary">
                      <Newspaper className="h-10 w-10" />
                    </div>
                  )}
                  <div className="p-4">
                    <Badge className="mb-2 bg-primary/10 text-primary">{a.category}</Badge>
                    <h3 className="font-semibold leading-tight group-hover:text-primary">{a.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{a.excerpt || a.description}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Tous les contenus</h2>
        {list.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
          </div>
        ) : (list.data?.length ?? 0) === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">Aucun contenu pour le moment.</Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(list.data ?? []).map((a) => (
              <Link key={a.id} to="/content/$slug" params={{ slug: a.slug }} className="group">
                <Card className="flex h-full flex-col overflow-hidden transition-all hover:shadow-md">
                  {a.cover_image ? (
                    <img src={a.cover_image} alt={a.title} className="h-36 w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="grid h-36 w-full place-items-center bg-muted text-muted-foreground"><Newspaper className="h-8 w-8" /></div>
                  )}
                  <div className="flex flex-1 flex-col p-4">
                    <div className="mb-2 flex items-center gap-2">
                      {a.is_pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                      {a.is_featured && <Star className="h-3.5 w-3.5 text-amber-500" fill="currentColor" />}
                      <Badge variant="secondary" className="text-[10px]">{a.category}</Badge>
                    </div>
                    <h3 className="font-semibold leading-tight group-hover:text-primary">{a.title}</h3>
                    <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">{a.excerpt || a.description}</p>
                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                      {a.reading_time_minutes && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{a.reading_time_minutes} min</span>}
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{a.view_count ?? 0}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}