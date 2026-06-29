import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
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

const CATEGORIES = ["Conseil santé", "Annonce", "Campagne", "Actualité", "Don du sang"];

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
}

function AdminArticles() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<null | Record<string, unknown>>(null);
  const [form, setForm] = useState({ title: "", description: "", content: "", category: "Conseil santé", cover_image: "", language: "fr", is_published: false });

  const items = useQuery({
    queryKey: ["admin-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, slug, title, description, category, language, is_published, published_at, created_at, cover_image")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        slug: editing ? (editing.slug as string) : `${slugify(form.title)}-${Date.now().toString(36)}`,
        author_id: user?.id ?? null,
        published_at: form.is_published ? (editing?.published_at ?? new Date().toISOString()) : null,
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
      setForm({ title: "", description: "", content: "", category: "Conseil santé", cover_image: "", language: "fr", is_published: false });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, publish }: { id: string; publish: boolean }) => {
      const { error } = await supabase.from("articles").update({ is_published: publish, published_at: publish ? new Date().toISOString() : null } as never).eq("id", id);
      if (error) throw error;
      await logAdminAction(publish ? "article.publish" : "article.unpublish", "article", id);
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
      title: a.title, description: a.description ?? "", content: "", category: a.category ?? "Conseil santé",
      cover_image: a.cover_image ?? "", language: a.language ?? "fr", is_published: !!a.is_published,
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
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Nouvel article</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>{editing ? "Modifier l'article" : "Nouvel article"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Titre</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div><Label>Contenu (markdown)</Label><Textarea rows={6} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
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
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /> Publier immédiatement</label>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button onClick={() => save.mutate()} disabled={!form.title || save.isPending}>Enregistrer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

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
                  {a.is_published
                    ? <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200">Publié</Badge>
                    : <Badge variant="outline">Brouillon</Badge>}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">{a.category} · {a.language.toUpperCase()} · {formatDateTimeFr(a.created_at)}</p>
                <div className="mt-3 flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(a)}><Edit className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => togglePublish.mutate({ id: a.id, publish: !a.is_published })}>
                    {a.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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