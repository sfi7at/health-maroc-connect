import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Bell, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/provider/notifications")({
  head: () => buildHead({ title: "Notifications — Espace prestataire", description: "Vos alertes professionnelles.", path: "/provider/notifications" }),
  component: ProviderNotifications,
});

function ProviderNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`notif-prov-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["provider_notifications", user.id] });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const { data = [], isLoading } = useQuery({
    queryKey: ["provider_notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications").select("*").eq("user_id", user!.id)
        .order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["provider_notifications", user?.id] }),
  });

  const markAll = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase.from("notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("user_id", user.id).eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["provider_notifications", user?.id] }),
  });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Notifications" title="Centre d'alertes" description="Rendez-vous, avis, vérification et annonces." icon={<Bell className="h-5 w-5" />}
        actions={<Button variant="outline" size="sm" onClick={() => markAll.mutate()} className="gap-2"><Check className="h-4 w-4" /> Tout marquer lu</Button>}
      />
      {isLoading ? <Skeleton className="h-60 rounded-3xl" /> : data.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">Aucune notification.</p>
      ) : (
        <ul className="space-y-2">
          {data.map((n) => (
            <li key={n.id} className={`flex items-start justify-between gap-3 rounded-2xl border bg-card p-4 ${n.is_read ? "border-border" : "border-primary/40 bg-primary/5"}`}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{n.title}</p>
                  <Badge variant="outline" className="text-[10px]">{n.type}</Badge>
                  {!n.is_read ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
                </div>
                {n.body ? <p className="mt-1 text-sm text-muted-foreground">{n.body}</p> : null}
                <p className="mt-1 text-[11px] text-muted-foreground">{new Date(n.created_at).toLocaleString("fr-FR")}</p>
              </div>
              {!n.is_read ? (
                <Button size="sm" variant="ghost" onClick={() => markRead.mutate(n.id)}><Check className="h-4 w-4" /></Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <Button asChild variant="ghost" className="gap-2"><Link to="/notifications">Voir toutes les notifications <ArrowRight className="h-4 w-4" /></Link></Button>
    </div>
  );
}