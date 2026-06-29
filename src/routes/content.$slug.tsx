import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { ArrowLeft, Clock, Eye, Share2, Calendar } from "lucide-react";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTimeFr } from "@/lib/format";

export const Route = createFileRoute("/content/$slug")({
  component: ArticleDetail,
  notFoundComponent: () => (
    <div className="py-20 text-center">
      <h2 className="text-2xl font-bold">Article introuvable</h2>
      <Link to="/content" className="mt-4 inline-block text-primary underline">Retour aux articles</Link>
    </div>
  ),
  errorComponent: ({ error }) => <div className="py-20 text-center text-destructive">{error.message}</div>,
});

function renderMarkdown(md: string) {
  if (!md) return "";
  const raw = marked.parse(md, { async: false, breaks: true, gfm: true }) as string;
  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["style", "script", "iframe", "object", "embed", "form"],
    FORBID_ATTR: ["style", "onerror", "onload", "onclick"],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });
}

function ArticleDetail() {
  const { slug } = Route.useParams();

  const article = useQuery({
    queryKey: ["article", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  useEffect(() => {
    const a = article.data;
    if (!a?.id) return;
    void supabase.from("article_views" as never).insert({ article_id: a.id, referrer: document.referrer || null } as never);
    void supabase.from("articles").update({ view_count: (a.view_count ?? 0) + 1 } as never).eq("id", a.id);
  }, [article.data]);

  if (article.isLoading) {
    return <div className="space-y-4"><Skeleton className="h-72 rounded-2xl" /><Skeleton className="h-8" /><Skeleton className="h-64" /></div>;
  }
  const a = article.data!;

  const share = async () => {
    const url = window.location.href;
    const nav = navigator as Navigator & { share?: (d: { title: string; text: string; url: string }) => Promise<void> };
    if (nav.share) {
      try { await nav.share({ title: a.title, text: a.excerpt || a.description || "", url }); } catch { /* */ }
    } else {
      await navigator.clipboard.writeText(url);
    }
    void supabase.from("articles").update({ share_count: (a.share_count ?? 0) + 1 } as never).eq("id", a.id);
  };

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <Link to="/content" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Tous les articles
      </Link>

      {a.cover_image && (
        <img src={a.cover_image} alt={a.title} className="h-72 w-full rounded-2xl object-cover" />
      )}

      <header className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-primary/10 text-primary">{a.category}</Badge>
          <Badge variant="outline">{a.language?.toUpperCase()}</Badge>
          {a.content_type === "emergency" && <Badge variant="destructive">🚨 Urgence</Badge>}
          {a.content_type === "campaign" && <Badge className="bg-amber-500/15 text-amber-700">Campagne</Badge>}
        </div>
        <h1 className="text-3xl font-bold leading-tight md:text-4xl">{a.title}</h1>
        {a.excerpt && <p className="text-lg text-muted-foreground">{a.excerpt}</p>}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {a.published_at && <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{formatDateTimeFr(a.published_at)}</span>}
          {a.reading_time_minutes && <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{a.reading_time_minutes} min de lecture</span>}
          <span className="flex items-center gap-1"><Eye className="h-4 w-4" />{a.view_count ?? 0} vues</span>
          <Button size="sm" variant="outline" onClick={share} className="gap-1"><Share2 className="h-4 w-4" /> Partager</Button>
        </div>
      </header>

      {a.content_type === "emergency" && (
        <Card className="border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">⚠️ Instruction d'urgence — appelez le 15 (SAMU), 19 (police) ou 150 (protection civile) en cas de danger immédiat.</p>
        </Card>
      )}

      <div
        className="prose prose-emerald max-w-none text-foreground"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(a.content || "") }}
      />
    </article>
  );
}