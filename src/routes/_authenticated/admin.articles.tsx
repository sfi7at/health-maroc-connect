import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Edit, Trash2, Eye, EyeOff, Star, Pin, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTimeFr } from "@/lib/format";
import { logAdminAction } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/articles")({
  component: AdminArticles,
});

const CATEGORIES = [
  "Maladies", "Prévention", "Urgences", "Nutrition", "Santé mentale",
  "Don du sang", "Guide pharmacie", "Guide hôpital", "Annonce publique",
];

const CONTENT_TYPES = [
  { v: "article", l: "Article santé" },
  { v: "news", l: "Actualité médicale" },
  { v: "campaign", l: "Campagne santé" },
  { v: "guide", l: "Guide médical" },
  { v: "emergency", l: "Instruction d'urgence" },
  { v: "seasonal", l: "Alerte saisonnière" },
  { v: "announcement", l: "Annonce publique" },
  { v: "city_info", l: "Info ville" },
] as const;

const STATUSES = [
  { v: "draft", l: "Brouillon" },
  { v: "published", l: "Publié" },
  { v: "scheduled", l: "Planifié" },
  { v: "archived", l: "Archivé" },
] as const;

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
}

function readingTime(content: string) {
  const words = (content || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

type FormState = {
  title: string; excerpt: string; description: string; content: string;
  category: string; content_type: string; status: string;
  cover_image: string; language: string;
  seo_title: string; seo_description: string;
  is_featured: boolean; is_pinned: boolean; scheduled_at: string;
};

const emptyForm: FormState = {
  title: "", excerpt: "", description: "", content: "",
  category: "Maladies", content_type: "article", status: "draft",
  cover_image: "", language: "fr",
  seo_title: "", seo_description: "",
  is_featured: false, is_pinned: false, scheduled_at: "",
};

function AdminArticles() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<null | Record<string, unknown>>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const items = useQuery({
    queryKey: ["admin-articles", filter, search],
    queryFn: async () => {
      let q = supabase
        .from("articles")
        .select("id, slug, title, description, excerpt, category, content_type, status, language, is_published, is_featured, is_pinned, published_at, scheduled_at, view_count, created_at, cover_image")
        .order("created_at", { ascending: false })
        .limit(100);
      if (filter !== "all") q = q.eq("content_type", filter as never);
      if (search) q = q.ilike("title", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const isPub = form.status === "published";
      const payload = {
        title: form.title,
        excerpt: form.excerpt || null,
        description: form.description || null,
        content: form.content,
        category: form.category,
        content_type: form.content_type,
        status: form.status,
        cover_image: form.cover_image || null,
        language: form.language,
        seo_title: form.seo_title || null,
        seo_description: form.seo_description || null,
        is_featured: form.is_featured,
        is_pinned: form.is_pinned,
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
        reading_time_minutes: readingTime(form.content),
        is_published: isPub,
        slug: editing ? (editing.slug as string) : `${slugify(form.title)}-${Date.now().toString(36)}`,
        author_id: user?.id ?? null,
        published_at: isPub ? (editing?.published_at ?? new Date().toISOString()) : null,
      };
      if (editing) {
        const { error } = await supabase.from("articles").update(payload as never).eq("id", editing.id as string);
        if (error) throw error;
        await logAdminAction("article.update", "article", editing.id as string);
      } else {
        const { error } = await supabase.from("articles").insert(payload as never);
        if (error) throw error;
        await logAdminAction("article.create", "article");
      }
    },
    onSuccess: () => {
      toast.success("Article enregistré");
      qc.invalidateQueries({ queryKey: ["admin-articles"] });
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, publish }: { id: string; publish: boolean }) => {
      const { error } = await supabase.from("articles").update({ is_published: publish, status: publish ? "published" : "draft", published_at: publish ? new Date().toISOString() : null } as never).eq("id", id);
      if (error) throw error;
      await logAdminAction(publish ? "article.publish" : "article.unpublish", "article", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-articles"] }),
  });

  const toggleFlag = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: "is_featured" | "is_pinned"; value: boolean }) => {
      const { error } = await supabase.from("articles").update({ [field]: value } as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-articles"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("articles").delete().eq("id", id);
      if (error) throw error;
      await logAdminAction("article.delete", "article", id);
    },
    onSuccess: () => { toast.success("Supprimé"); qc.invalidateQueries({ queryKey: ["admin-articles"] }); },
  });

  type ArticleRow = NonNullable<typeof items.data>[number];
  const openEdit = (a: ArticleRow) => {
    setEditing(a as unknown as Record<string, unknown>);
    setForm({
      title: a.title,
      excerpt: (a as { excerpt?: string }).excerpt ?? "",
      description: a.description ?? "",
      content: "",
      category: a.category ?? "Maladies",
      content_type: (a as { content_type?: string }).content_type ?? "article",
      status: (a as { status?: string }).status ?? (a.is_published ? "published" : "draft"),
      cover_image: a.cover_image ?? "",
      language: a.language ?? "fr",
      seo_title: "",
      seo_description: "",
      is_featured: !!(a as { is_featured?: boolean }).is_featured,
      is_pinned: !!(a as { is_pinned?: boolean }).is_pinned,
      scheduled_at: "",
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        icon={FileText}
        title="Articles & CMS"
        description="Conseils santé, annonces, campagnes et actualités."
        actions={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm); } }}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Nouvel article</Button></DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? "Modifier l'article" : "Nouvel article"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Titre</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>Extrait court</Label><Textarea rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} placeholder="Résumé en 1-2 phrases" /></div>
                <div><Label>Description (méta)</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div>
                  <Label>Contenu (markdown / HTML simple)</Label>
                  <Textarea rows={10} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="# Titre&#10;&#10;Votre contenu ici. Supportez **gras**, *italique*, [liens](url), images ![alt](url)." />
                  <p className="mt-1 text-xs text-muted-foreground">≈ {readingTime(form.content)} min de lecture</p>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <div>
                    <Label>Type de contenu</Label>
                    <Select value={form.content_type} onValueChange={(v) => setForm({ ...form, content_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CONTENT_TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Catégorie</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Langue</Label>
                    <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="fr">Français</SelectItem><SelectItem value="ar">العربية</SelectItem><SelectItem value="en">English</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Image de couverture (URL)</Label><Input value={form.cover_image} onChange={(e) => setForm({ ...form, cover_image: e.target.value })} placeholder="https://…" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Statut</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Planifier la publication</Label>
                    <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} disabled={form.status !== "scheduled"} />
                  </div>
                </div>
                <div className="rounded-xl border bg-muted/30 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">SEO</p>
                  <div className="space-y-2">
                    <Input value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} placeholder="Titre SEO (≤ 60 caractères)" />
                    <Textarea rows={2} value={form.seo_description} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} placeholder="Description SEO (≤ 160 caractères)" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} /> ⭐ À la une (homepage)</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_pinned} onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })} /> 📌 Épinglé</label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button onClick={() => save.mutate()} disabled={!form.title || save.isPending}>Enregistrer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher un titre…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {CONTENT_TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {items.isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(items.data ?? []).map((a) => (
            <Card key={a.id} className="flex gap-3 p-4">
              {a.cover_image && <img src={a.cover_image} alt="" className="h-24 w-24 rounded-xl object-cover" />}
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-tight">{a.title}</h3>
                  <div className="flex flex-col items-end gap-1">
                    {a.status === "published" && <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200">Publié</Badge>}
                    {a.status === "draft" && <Badge variant="outline">Brouillon</Badge>}
                    {a.status === "scheduled" && <Badge className="bg-amber-500/15 text-amber-700 border-amber-200">Planifié</Badge>}
                    {a.status === "archived" && <Badge variant="secondary">Archivé</Badge>}
                  </div>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.excerpt || a.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {a.content_type} · {a.category} · {a.language.toUpperCase()} · 👁 {a.view_count ?? 0} · {formatDateTimeFr(a.created_at)}
                </p>
                <div className="mt-3 flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(a)}><Edit className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => togglePublish.mutate({ id: a.id, publish: !a.is_published })}>
                    {a.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="ghost" className={a.is_featured ? "text-amber-500" : ""} onClick={() => toggleFlag.mutate({ id: a.id, field: "is_featured", value: !a.is_featured })}>
                    <Star className="h-4 w-4" fill={a.is_featured ? "currentColor" : "none"} />
                  </Button>
                  <Button size="sm" variant="ghost" className={a.is_pinned ? "text-primary" : ""} onClick={() => toggleFlag.mutate({ id: a.id, field: "is_pinned", value: !a.is_pinned })}>
                    <Pin className="h-4 w-4" fill={a.is_pinned ? "currentColor" : "none"} />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Supprimer ?")) remove.mutate(a.id); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
          {(items.data?.length ?? 0) === 0 && (
            <Card className="md:col-span-2 p-12 text-center text-muted-foreground">Aucun article. Créez le premier.</Card>
          )}
        </div>
      )}
    </div>
  );
}