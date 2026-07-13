import { useMemo, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Bell, Droplet, CalendarCheck, AlertTriangle, Sparkles, Mail, Pin, PinOff,
  Archive, ArchiveRestore, Filter, CheckCheck, Pill, Newspaper, FlaskConical,
  Stethoscope, Megaphone, ExternalLink, Phone,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications, type NotificationRow } from "@/hooks/use-notifications";
import { supabase } from "@/integrations/supabase/client";
import { setNotificationArchived, setNotificationPinned, trackNotificationEvent } from "@/lib/notifications.functions";
import { formatRelativeFr } from "@/lib/format";
import { buildHead } from "@/lib/seo";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () =>
    buildHead({
      title: "Notifications — Vytalma",
      description: "Centre de notifications intelligent : urgences, rendez-vous, don de sang, pharmacies de garde, conseils santé.",
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
  pharmacy_on_duty: Pill,
  campaign: Megaphone,
  article: Newspaper,
  doctor_availability: Stethoscope,
  lab_results: FlaskConical,
  ai_suggestion: Sparkles,
};

const TONES: Record<string, string> = {
  blood_request: "bg-blood/10 text-blood",
  emergency: "bg-destructive/10 text-destructive",
  appointment: "bg-primary/10 text-primary",
  medical_tip: "bg-info/10 text-info",
  pharmacy_on_duty: "bg-warning/10 text-warning-foreground",
  campaign: "bg-secondary/10 text-secondary",
  article: "bg-muted text-foreground",
  doctor_availability: "bg-primary/10 text-primary",
  lab_results: "bg-info/10 text-info",
  ai_suggestion: "bg-primary/10 text-primary",
};

const TYPE_LABELS: Record<string, string> = {
  emergency: "Urgences", blood_request: "Don de sang", appointment: "Rendez-vous",
  pharmacy_on_duty: "Pharmacies de garde", campaign: "Campagnes", article: "Articles",
  doctor_availability: "Médecins", lab_results: "Résultats labo", medical_tip: "Conseils",
  ai_suggestion: "Suggestions IA", system: "Système", push: "Push", email: "E-mail",
};

function NotificationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const { all, unread, urgent, pinned, archived, isLoading, unreadCount } = useNotifications();
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const pin = useServerFn(setNotificationPinned);
  const archive = useServerFn(setNotificationArchived);
  const track = useServerFn(trackNotificationEvent);

  const pinMut = useMutation({
    mutationFn: (v: { id: string; value: boolean }) => pin({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const archMut = useMutation({
    mutationFn: (v: { id: string; value: boolean }) => archive({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = async () => {
    if (!user || unread.length === 0) return;
    const ids = unread.map((n) => n.id);
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in("id", ids);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["notifications"] });
    toast.success(`${ids.length} notification(s) marquée(s) comme lues`);
  };

  const handleClick = (n: NotificationRow, e: React.MouseEvent<HTMLAnchorElement>) => {
    void track({ data: { notification_id: n.id, event_type: "clicked" } }).catch(() => undefined);
    // Mark as read locally so the row de-highlights immediately.
    if (!n.is_read) {
      void supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", n.id)
        .then(() => qc.invalidateQueries({ queryKey: ["notifications"] }));
    }
    // Client-side navigation for internal URLs (avoid full page reload).
    const url = n.action_url ?? "";
    if (url.startsWith("/") && !url.startsWith("//") && !e.defaultPrevented && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      router.navigate({ to: url });
    }
  };

  const filterByType = (rows: NotificationRow[]) =>
    typeFilter === "all" ? rows : rows.filter((n) => n.type === typeFilter);

  const types = useMemo(() => {
    const s = new Set<string>(all.map((n) => n.type));
    return Array.from(s);
  }, [all]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Centre de notifications"
        title="Notifications"
        description="Real-time, filtré et personnalisé pour le Maroc."
        icon={<Bell className="h-5 w-5" />}
        actions={
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={unreadCount === 0}>
            <CheckCheck className="mr-2 h-4 w-4" /> Tout marquer lu
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <button
          onClick={() => setTypeFilter("all")}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            typeFilter === "all" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
          }`}
        >
          Tous
        </button>
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              typeFilter === t ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
            }`}
          >
            {TYPE_LABELS[t] ?? t}
          </button>
        ))}
      </div>

      <Tabs defaultValue={urgent.length > 0 ? "urgent" : "unread"} className="space-y-4">
        <TabsList className="no-scrollbar flex w-full max-w-full items-center justify-start gap-1 overflow-x-auto">
          <TabsTrigger value="urgent" className="gap-2">
            Urgentes {urgent.length > 0 && <Badge variant="destructive">{urgent.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="unread" className="gap-2">
            Non lues {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="pinned" className="gap-2">
            Épinglées {pinned.length > 0 && <Badge variant="secondary">{pinned.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="all">Toutes</TabsTrigger>
          <TabsTrigger value="archived">Archives</TabsTrigger>
        </TabsList>

        {isLoading ? (
          <div className="grid gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : (
          <>
            <TabsContent value="urgent">
              <NotificationList
                rows={filterByType(urgent)}
                onPin={(id, value) => pinMut.mutate({ id, value })}
                onArchive={(id, value) => archMut.mutate({ id, value })}
                onClick={handleClick}
              />
            </TabsContent>
            <TabsContent value="unread">
              <NotificationList
                rows={filterByType(unread)}
                onPin={(id, value) => pinMut.mutate({ id, value })}
                onArchive={(id, value) => archMut.mutate({ id, value })}
                onClick={handleClick}
              />
            </TabsContent>
            <TabsContent value="pinned">
              <NotificationList
                rows={filterByType(pinned)}
                onPin={(id, value) => pinMut.mutate({ id, value })}
                onArchive={(id, value) => archMut.mutate({ id, value })}
                onClick={handleClick}
              />
            </TabsContent>
            <TabsContent value="all">
              <NotificationList
                rows={filterByType(all.filter((n) => !n.is_archived))}
                onPin={(id, value) => pinMut.mutate({ id, value })}
                onArchive={(id, value) => archMut.mutate({ id, value })}
                onClick={handleClick}
              />
            </TabsContent>
            <TabsContent value="archived">
              <NotificationList
                rows={filterByType(archived)}
                onPin={(id, value) => pinMut.mutate({ id, value })}
                onArchive={(id, value) => archMut.mutate({ id, value })}
                onClick={handleClick}
              />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

function NotificationList({
  rows, onPin, onArchive, onClick,
}: {
  rows: NotificationRow[];
  onPin: (id: string, value: boolean) => void;
  onArchive: (id: string, value: boolean) => void;
  onClick: (n: NotificationRow, e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="Rien à afficher"
        description="Aucune notification dans cette catégorie."
      />
    );
  }
  return (
    <ul className="grid gap-3">
      {rows.map((n) => {
        const Icon = ICONS[n.type] ?? Bell;
        const tone = TONES[n.type] ?? "bg-muted text-muted-foreground";
        const isUrgent = n.priority === "urgent" || n.priority === "critical";
        return (
          <li
            key={n.id}
            className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-4 rounded-2xl border bg-card p-4 shadow-soft transition ${
              isUrgent ? "border-destructive/40 bg-destructive/5" : "border-border"
            } ${n.is_read ? "" : "ring-1 ring-primary/20"}`}
          >
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold">{n.title}</p>
                {n.is_pinned && <Pin className="h-3 w-3 text-primary" />}
                {isUrgent && <Badge variant="destructive" className="h-5">URGENT</Badge>}
                {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary" />}
              </div>
              {n.body && <p className="line-clamp-3 text-xs text-muted-foreground">{n.body}</p>}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] text-muted-foreground">{formatRelativeFr(n.created_at)}</span>
                {n.action_url && (
                  <a
                    href={n.action_url}
                    onClick={(e) => onClick(n, e)}
                    className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground hover:opacity-90"
                  >
                    {n.action_label ?? "Ouvrir"} <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {n.type === "emergency" && (
                  <a
                    href="tel:141"
                    className="inline-flex items-center gap-1 rounded-full bg-destructive px-3 py-1 text-[11px] font-semibold text-destructive-foreground"
                  >
                    <Phone className="h-3 w-3" /> Appeler 141
                  </a>
                )}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                aria-label={n.is_pinned ? "Désépingler" : "Épingler"}
                onClick={() => onPin(n.id, !n.is_pinned)}
              >
                {n.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                aria-label={n.is_archived ? "Désarchiver" : "Archiver"}
                onClick={() => onArchive(n.id, !n.is_archived)}
              >
                {n.is_archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
