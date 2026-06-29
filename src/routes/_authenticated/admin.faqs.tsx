import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HelpCircle, Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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

export const Route = createFileRoute("/_authenticated/admin/faqs")({
  component: AdminFaqs,
});

type FaqRow = {
  id: string; question: string; answer: string; category: string | null;
  language: string; sort_order: number; is_published: boolean;
};

const CATEGORIES = ["Général", "Compte", "Rendez-vous", "Don du sang", "Pharmacie", "Hôpital", "Médecin"];

function AdminFaqs() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FaqRow | null>(null);
  const [form, setForm] = useState({ question: "", answer: "", category: "Général", language: "fr", sort_order: 0, is_published: true });

  const items = useQuery({
    queryKey: ["admin-faqs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faqs" as never)
        .select("*")
        .order("category")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as FaqRow[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase.from("faqs" as never).update(form as never).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("faqs" as never).insert(form as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("FAQ enregistrée");
      qc.invalidateQueries({ queryKey: ["admin-faqs"] });
      setOpen(false); setEditing(null);
      setForm({ question: "", answer: "", category: "Général", language: "fr", sort_order: 0, is_published: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("faqs" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Supprimé"); qc.invalidateQueries({ queryKey: ["admin-faqs"] }); },
  });

  const openEdit = (f: FaqRow) => {
    setEditing(f);
    setForm({ question: f.question, answer: f.answer, category: f.category ?? "Général", language: f.language, sort_order: f.sort_order, is_published: f.is_published });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        icon={HelpCircle}
        title="FAQ"
        description="Questions fréquentes pour les utilisateurs."
        actions={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Nouvelle question</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>{editing ? "Modifier" : "Nouvelle question"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Question</Label><Input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} /></div>
                <div><Label>Réponse</Label><Textarea rows={6} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} /></div>
                <div className="grid grid-cols-3 gap-3">
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
                      <SelectContent>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="ar">العربية</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Ordre</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
                </div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /> Publié</label>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button onClick={() => save.mutate()} disabled={!form.question || !form.answer || save.isPending}>Enregistrer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      {items.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : (
        <div className="space-y-2">
          {(items.data ?? []).map((f) => (
            <Card key={f.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{f.question}</h3>
                    {!f.is_published && <Badge variant="outline">Brouillon</Badge>}
                    <Badge variant="secondary">{f.category}</Badge>
                    <Badge variant="outline">{f.language.toUpperCase()}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{f.answer}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(f)}><Edit className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Supprimer ?")) remove.mutate(f.id); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
          {(items.data?.length ?? 0) === 0 && (
            <Card className="p-12 text-center text-muted-foreground">Aucune FAQ.</Card>
          )}
        </div>
      )}
    </div>
  );
}