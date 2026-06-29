import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTimeFr } from "@/lib/format";
import { logAdminAction } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/notifications")({
  component: AdminNotifications,
});

function AdminNotifications() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", body: "", audience: "all", city: "", type: "system" as string });

  const recent = useQuery({
    queryKey: ["admin-notifications-recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, body, type, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const send = useMutation({
    mutationFn: async () => {
      let targets: string[] = [];

      if (form.audience === "all") {
        const { data, error } = await supabase.from("profiles").select("id");
        if (error) throw error;
        targets = (data ?? []).map((r) => r.id);
      } else if (form.audience === "city" && form.city) {
        const { data, error } = await supabase.from("profiles").select("id").ilike("city", `%${form.city}%`);
        if (error) throw error;
        targets = (data ?? []).map((r) => r.id);
      } else if (form.audience === "blood_donors") {
        const { data, error } = await supabase.from("blood_donors").select("id");
        if (error) throw error;
        targets = (data ?? []).map((r) => r.id);
      } else if (["doctors", "pharmacies", "hospitals", "laboratories"].includes(form.audience)) {
        const map: Record<string, string> = { doctors: "doctor", pharmacies: "pharmacy", hospitals: "hospital", laboratories: "laboratory" };
        const { data, error } = await supabase.from("providers").select("owner_id").eq("category", map[form.audience] as never).not("owner_id", "is", null);
        if (error) throw error;
        targets = (data ?? []).map((r) => r.owner_id!).filter(Boolean);
      }

      if (targets.length === 0) throw new Error("Aucun destinataire trouvé.");

      const rows = targets.map((uid) => ({ user_id: uid, type: form.type as never, title: form.title, body: form.body }));
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await supabase.from("notifications").insert(rows.slice(i, i + 500) as never);
        if (error) throw error;
      }
      await logAdminAction("notification.broadcast", "notification", undefined, { audience: form.audience, count: targets.length });
      return targets.length;
    },
    onSuccess: (count) => {
      toast.success(`Notification envoyée à ${count} utilisateurs`);
      setForm({ title: "", body: "", audience: "all", city: "", type: "system" });
      qc.invalidateQueries({ queryKey: ["admin-notifications-recent"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <AdminHeader icon={Bell} title="Notifications" description="Diffuser des notifications à votre audience." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 space-y-3">
          <h2 className="font-semibold">Nouvelle diffusion</h2>
          <div><Label>Titre</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Message</Label><Textarea rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Audience</Label>
              <Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les utilisateurs</SelectItem>
                  <SelectItem value="city">Par ville</SelectItem>
                  <SelectItem value="blood_donors">Donneurs de sang</SelectItem>
                  <SelectItem value="doctors">Médecins</SelectItem>
                  <SelectItem value="pharmacies">Pharmacies</SelectItem>
                  <SelectItem value="hospitals">Hôpitaux</SelectItem>
                  <SelectItem value="laboratories">Laboratoires</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">Système</SelectItem>
                  <SelectItem value="announcement">Annonce</SelectItem>
                  <SelectItem value="alert">Alerte</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.audience === "city" && (
            <div><Label>Ville</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Casablanca" /></div>
          )}
          <Button onClick={() => send.mutate()} disabled={!form.title || !form.body || send.isPending} className="w-full gap-2">
            <Send className="h-4 w-4" /> {send.isPending ? "Envoi…" : "Envoyer la notification"}
          </Button>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Historique récent</h2>
          {recent.isLoading ? (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <ul className="max-h-[500px] space-y-2 overflow-y-auto">
              {(recent.data ?? []).map((n) => (
                <li key={n.id} className="rounded-xl border border-border/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{n.title}</p>
                    <Badge variant="outline" className="text-[10px]">{n.type}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{formatDateTimeFr(n.created_at)}</p>
                </li>
              ))}
              {(recent.data?.length ?? 0) === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Aucune notification envoyée.</p>}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}