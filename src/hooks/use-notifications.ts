import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Database } from "@/integrations/supabase/types";

export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

const KEY = (uid: string | undefined) => ["notifications", uid ?? "anon"];

export function useNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEY(user?.id),
    enabled: !!user,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as NotificationRow[];
    },
  });

  useEffect(() => {
    if (!user) return;
    // Use a unique channel per mount to avoid React 18 StrictMode
    // "cannot add postgres_changes callbacks after subscribe()" errors.
    const suffix = Math.random().toString(36).slice(2, 10);
    const ch = supabase
      .channel(`notif-${user.id}-${suffix}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: KEY(user.id) }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, qc]);

  const all = query.data ?? [];
  const stats = useMemo(() => {
    const active = all.filter((n) => !n.is_archived);
    const unread = active.filter((n) => !n.is_read);
    const urgent = active.filter((n) => ["urgent", "critical"].includes(n.priority ?? "normal"));
    const pinned = active.filter((n) => n.is_pinned);
    return {
      active,
      unread,
      urgent,
      pinned,
      archived: all.filter((n) => n.is_archived),
      unreadCount: unread.length,
      hasUrgent: urgent.some((n) => !n.is_read),
    };
  }, [all]);

  return { ...query, all, ...stats };
}