import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SendInput = z.object({
  user_ids: z.array(z.string().uuid()).min(1).max(500),
  title: z.string().min(1).max(160),
  body: z.string().max(2000).optional().nullable(),
  url: z.string().max(500).optional().nullable(),
  priority: z.enum(["low", "normal", "high", "urgent", "critical"]).optional().nullable(),
  data: z.record(z.string(), z.any()).optional().nullable(),
});

/**
 * Admin-only: broadcast a OneSignal push to a set of app users by their
 * profile IDs. Resolves each user's onesignal_external_user_id server-side.
 */
export const sendOneSignalPushToUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SendInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    const { data: rows, error } = await supabase
      .from("profiles")
      .select("id, onesignal_external_user_id")
      .in("id", data.user_ids);
    if (error) throw error;
    const ids = (rows ?? []).flatMap((r) => [r.id, r.onesignal_external_user_id].filter(Boolean) as string[]);

    const { sendOneSignalPush } = await import("@/lib/onesignal.server");
    const result = await sendOneSignalPush({
      externalUserIds: ids,
      title: data.title,
      body: data.body ?? null,
      url: data.url ?? null,
      priority: data.priority ?? "normal",
      data: data.data ?? null,
    });
    return { ...result, targeted: new Set(ids).size };
  });

/**
 * Send a test push notification to the currently authenticated user.
 * Resolves the recipient via profiles.onesignal_external_user_id.
 */
export const sendTestPushToSelf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        title: z.string().min(1).max(160).optional(),
        message: z.string().min(1).max(2000).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("onesignal_external_user_id")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    const claimEmail = typeof claims.email === "string" ? claims.email : null;
    const externalIds = [userId, profile?.onesignal_external_user_id, claimEmail].filter(Boolean) as string[];
    const { sendOneSignalPush } = await import("@/lib/onesignal.server");
    const result = await sendOneSignalPush({
      externalUserIds: externalIds,
      title: data.title ?? "Test Notification",
      body: data.message ?? "Push notifications are working!",
      priority: "normal",
    });
    return { ...result, targeted: new Set(externalIds).size };
  });