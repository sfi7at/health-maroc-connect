import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Droplet, CalendarCheck, AlertTriangle, Sparkles, Mail } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { notificationsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { formatRelativeFr } from "@/lib/format";
import { buildHead } from "@/lib/seo";
import type { Database } from "@/integrations/supabase/types";

type Notif = Database["public"]["Tables"]["notifications"]["Row"];

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () =>
    buildHead({
      title: "Notifications — HealthLink Maroc",
      description: "Demandes urgentes, rappels de rendez-vous, conseils santé et alertes.",
      path: "/notifications",
    }),
  component: NotificationsPage,
});

const ICONS: Record<string, typeof Bell> = {
  blood_request: Droplet,
  appointment: CalendarCheck,
  emergency: AlertTriangle,
  medical_tip: Sparkles,
  email: Mail,
  push: Bell,
  system: Bell,
};

const TONES: Record<string, string> = {
  blood_request: "bg-blood/10 text-blood",
  emergency: "bg-destructive/10 text-destructive",
  appointment: "bg-primary/10 text-primary",
  medical_tip: "bg-info/10 text-info",
};

function NotificationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery(notificationsQuery(user?.id));

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, queryClient]);

  // Mark all as read on view
  useEffect(() => {
    if (!user || data.length === 0) return;
    const unread = data.filter((n) => !n.is_read).map((n) => n.id);
    if (unread.length === 0) return;
    void supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in("id", unread)
      .then(() => queryClient.invalidateQueries({ queryKey: ["notifications"] }));
  }, [data, user, queryClient]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Centre de notifications"
        title="Notifications"
        description="Restez informé en temps réel sur vos demandes, rendez-vous et alertes santé."
        icon={<Bell className="h-5 w-5" />}
      />

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Vous êtes à jour"
          description="Aucune notification pour le moment. Activez les alertes dans Paramètres."
        />
      ) : (
        <ul className="grid gap-3">
          {data.map((n: Notif) => {
            const Icon = ICONS[n.type] ?? Bell;
            const tone = TONES[n.type] ?? "bg-muted text-muted-foreground";
            return (
              <li
                key={n.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft"
              >
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{n.title}</p>
                  {n.body ? (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                  ) : null}
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {formatRelativeFr(n.created_at)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}