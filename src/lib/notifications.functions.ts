import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const NotificationTypes = [
  "push","email","blood_request","appointment","emergency","medical_tip","system",
  "pharmacy_on_duty","campaign","article","doctor_availability","lab_results","ai_suggestion",
] as const;

const PrioritySchema = z.enum(["low","normal","high","urgent","critical"]);

const CreateInput = z.object({
  user_id: z.string().uuid(),
  type: z.enum(NotificationTypes),
  title: z.string().min(1).max(160),
  body: z.string().max(2000).optional().nullable(),
  priority: PrioritySchema.optional().default("normal"),
  action_url: z.string().max(500).optional().nullable(),
  action_label: z.string().max(80).optional().nullable(),
  data: z.record(z.string(), z.any()).optional().nullable(),
  dedupe_key: z.string().max(200).optional().nullable(),
  expires_at: z.string().datetime().optional().nullable(),
  scheduled_for: z.string().datetime().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
});

/**
 * Create a notification for the authenticated user (self-test/AI suggestions).
 * Admins can target any user_id; regular users may only target themselves.
 * Enforces per-type rate-limit + dedupe.
 */
export const createNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => CreateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.user_id !== userId) {
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
      if (!isAdmin) throw new Error("Forbidden");
    }
    // Rate limit check
    const { data: allowed } = await supabase.rpc("check_notification_rate_limit", {
      _user_id: data.user_id, _type: data.type, _window_minutes: 60, _max_count: 30,
    });
    if (allowed === false) throw new Error("Rate limit exceeded for this notification type");

    const { data: row, error } = await supabase
      .from("notifications")
      .insert({
        user_id: data.user_id,
        type: data.type,
        title: data.title,
        body: data.body ?? null,
        priority: data.priority ?? "normal",
        action_url: data.action_url ?? null,
        action_label: data.action_label ?? null,
        data: data.data ?? null,
        dedupe_key: data.dedupe_key ?? null,
        expires_at: data.expires_at ?? null,
        scheduled_for: data.scheduled_for ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        status: data.scheduled_for ? "pending" : "sent",
        is_pinned: data.priority === "critical",
      })
      .select("*")
      .maybeSingle();
    if (error) {
      // duplicate dedupe_key → ignore silently
      if ((error as { code?: string }).code === "23505") return { id: null, deduplicated: true };
      throw error;
    }
    return { id: row?.id ?? null, deduplicated: false };
  });

const ToggleInput = z.object({ id: z.string().uuid(), value: z.boolean() });

export const setNotificationPinned = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ToggleInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ is_pinned: data.value })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const setNotificationArchived = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ToggleInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ is_archived: data.value })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

const TrackInput = z.object({
  notification_id: z.string().uuid(),
  event_type: z.enum(["delivered","opened","clicked","dismissed","failed"]),
  metadata: z.record(z.string(), z.any()).optional().nullable(),
});

export const trackNotificationEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => TrackInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("notification_events").insert({
      notification_id: data.notification_id,
      user_id: userId,
      event_type: data.event_type,
      metadata: data.metadata ?? null,
    });
    const patch: {
      opened_at?: string;
      clicked_at?: string;
      status?: "delivered" | "opened" | "clicked" | "failed";
    } = {};
    if (data.event_type === "opened") { patch.opened_at = new Date().toISOString(); patch.status = "opened"; }
    if (data.event_type === "clicked") { patch.clicked_at = new Date().toISOString(); patch.status = "clicked"; }
    if (data.event_type === "delivered") patch.status = "delivered";
    if (data.event_type === "failed") patch.status = "failed";
    if (Object.keys(patch).length > 0) {
      await supabase.from("notifications").update(patch).eq("id", data.notification_id).eq("user_id", userId);
    }
    return { ok: true };
  });

const PushSubInput = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth_key: z.string().min(1),
  user_agent: z.string().max(500).optional().nullable(),
});

export const registerPushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => PushSubInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("push_subscriptions").upsert(
      {
        user_id: context.userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth_key: data.auth_key,
        user_agent: data.user_agent ?? null,
        enabled: true,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );
    if (error) throw error;
    return { ok: true };
  });