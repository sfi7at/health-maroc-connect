import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Ban, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatDateTimeFr } from "@/lib/format";
import { logAdminAction } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/security/blocked")({
  component: AdminBlocked,
});

type Kind = "ip" | "email" | "user" | "phone" | "device";

function AdminBlocked() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Kind | "all">("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ kind: Kind; value: string; reason: string }>({ kind: "ip", value: "", reason: "" });

  const items = useQuery({
    queryKey: ["admin-blocked", filter],
    queryFn: async () => {
      let q = supabase.from("blocked_entities").select("*").order("created_at", { ascending: false }).limit(200);
      if (filter !== "all") q = q.eq("kind", filter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!form.value.trim()) throw new Error("Valeur requise");
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("blocked_entities").insert({
        kind: form.kind,
        value: form.value.trim(),
        reason: form.reason.trim() || null,
        blocked_by: u.user?.id ?? null,
      } as never);
      if (error) throw error;
      await logAdminAction("blocked.add", "blocked_entity", undefined, { kind: form.kind, value: form.value });
    },
    onSuccess: () => {
      toast.success("Entrée bloquée");
      setOpen(false);
      setForm({ kind: "ip", value: "", reason: "" });
      qc.invalidateQueries({ queryKey: ["admin-blocked"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blocked_entities").delete().eq("id", id);
      if (error) throw error;
      await logAdminAction("blocked.remove", "blocked_entity", id);
    },
    onSuccess: () => { toast.success("Débloqué"); qc.invalidateQueries({ queryKey: ["admin-blocked"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <AdminHeader
        icon={Ban}
        title="Liste de blocage"
        description="IPs, e-mails, téléphones, utilisateurs et appareils interdits d'accès à la plateforme."
        actions={
          <div className="flex gap-2">
            <Select value={filter} onValueChange={(v) => setFilter(v as never)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="ip">IP</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Téléphone</SelectItem>
                <SelectItem value="user">Utilisateur</SelectItem>
                <SelectItem value="device">Appareil</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-1.5" /> Ajouter</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader><DialogTitle>Bloquer une entité</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select value={form.kind} onValueChange={(v) => setForm((f) => ({ ...f, kind: v as Kind }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ip">Adresse IP</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Téléphone</SelectItem>
                        <SelectItem value="user">ID utilisateur</SelectItem>
                        <SelectItem value="device">Empreinte appareil</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Valeur</Label>
                    <Input value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} placeholder="192.168.1.1 ou user@example.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Raison (optionnel)</Label>
                    <Input value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Spam, fraude, abus…" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                  <Button onClick={() => add.mutate()} disabled={add.isPending}>{add.isPending ? "…" : "Bloquer"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {items.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
      ) : (items.data?.length ?? 0) === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Aucune entité bloquée.</Card>
      ) : (
        <Card className="divide-y">
          {(items.data ?? []).map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="uppercase">{b.kind}</Badge>
                  <code className="truncate text-sm">{b.value}</code>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {b.reason ?? "Aucune raison"} · {formatDateTimeFr(b.created_at)}
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => remove.mutate(b.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
