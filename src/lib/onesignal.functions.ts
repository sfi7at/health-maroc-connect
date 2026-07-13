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
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    const { data: rows, error } = await supabase
      .from("profiles")
      .select("id, onesignal_external_user_id")
      .in("id", data.user_ids);
    if (error) throw error;
    const ids = (rows ?? [])
      .map((r) => r.onesignal_external_user_id)
      .filter((v): v is string => !!v && v.length > 0);

    const { sendOneSignalPush } = await import("@/lib/onesignal.server");
    const result = await sendOneSignalPush({
      externalUserIds: ids,
      title: data.title,
      body: data.body ?? null,
      url: data.url ?? null,
      priority: data.priority ?? "normal",
      data: data.data ?? null,
    });
    return { ...result, targeted: ids.length };
  });