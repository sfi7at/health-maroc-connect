import type { Database } from "@/integrations/supabase/types";

type NotificationPriority = Database["public"]["Enums"]["notification_priority"];

export type OneSignalPushInput = {
  externalUserIds: string[];
  title: string;
  body?: string | null;
  url?: string | null;
  priority?: NotificationPriority | null;
  data?: Record<string, unknown> | null;
};

/**
 * Send a push notification via the OneSignal REST API.
 * Server-only: reads ONESIGNAL_APP_ID / ONESIGNAL_REST_API_KEY at call time.
 * No-ops (and logs) when credentials or recipients are missing so callers
 * never fail their main flow because push delivery is down.
 */
export async function sendOneSignalPush(
  input: OneSignalPushInput,
): Promise<{ ok: boolean; skipped?: string; id?: string; error?: string; recipients?: number }> {
  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!appId || !apiKey) return { ok: false, skipped: "missing_credentials" };

  const recipients = Array.from(
    new Set(input.externalUserIds.map((v) => v?.trim()).filter((v): v is string => !!v && v.length > 0)),
  );
  if (recipients.length === 0) return { ok: false, skipped: "no_recipients" };

  const isUrgent = input.priority === "urgent" || input.priority === "critical";

  const payload: Record<string, unknown> = {
    app_id: appId,
    include_aliases: { external_id: recipients },
    target_channel: "push",
    headings: { en: input.title, fr: input.title },
    contents: { en: input.body ?? input.title, fr: input.body ?? input.title },
    priority: isUrgent ? 10 : 5,
  };
  if (input.url) payload.url = input.url;
  if (input.data) payload.data = input.data;

  try {
    const res = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
    const json = (await res.json().catch(() => ({}))) as { id?: string; errors?: unknown };
    if (!res.ok) {
      console.warn("[onesignal] send failed", res.status, json);
      return { ok: false, error: `http_${res.status}` };
    }
    if (!json.id) {
      return { ok: false, skipped: "no_matching_subscription", recipients: recipients.length };
    }
    return { ok: true, id: json.id, recipients: recipients.length };
  } catch (err) {
    console.warn("[onesignal] send threw", err);
    return { ok: false, error: "network" };
  }
}