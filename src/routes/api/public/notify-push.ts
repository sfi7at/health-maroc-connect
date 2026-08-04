import { createFileRoute } from "@tanstack/react-router";

/**
 * Internal endpoint invoked by the `trg_dispatch_notification_push`
 * DB trigger whenever a row is inserted into `public.notifications`.
 * Forwards the notification to OneSignal as a mobile push.
 *
 * Auth: shared secret in the `x-push-secret` header, mirrored between
 * `private.push_dispatch_config.secret` (read by the trigger) and
 * the `PUSH_DISPATCH_SECRET` env var (read here).
 */
export const Route = createFileRoute("/api/public/notify-push")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PUSH_DISPATCH_SECRET;
        const provided = request.headers.get("x-push-secret") ?? "";
        if (!secret || provided.length !== secret.length) {
          return new Response("unauthorized", { status: 401 });
        }
        let secretDiff = 0;
        for (let i = 0; i < secret.length; i++) secretDiff |= provided.charCodeAt(i) ^ secret.charCodeAt(i);
        if (secretDiff !== 0) return new Response("unauthorized", { status: 401 });

        const contentLength = Number(request.headers.get("content-length") ?? 0);
        if (contentLength > 16_384) return new Response("payload too large", { status: 413 });

        let payload: { notification_id?: string } | null = null;
        try {
          payload = (await request.json()) as { notification_id?: string };
        } catch {
          return new Response("bad request", { status: 400 });
        }
        const notificationId = payload?.notification_id;
        if (!notificationId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(notificationId)) {
          return new Response("bad request", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: n, error } = await supabaseAdmin
          .from("notifications")
          .select("id, user_id, title, body, action_url, priority, type, data, scheduled_for")
          .eq("id", notificationId)
          .maybeSingle();
        if (error) return new Response("internal error", { status: 500 });
        if (!n) return new Response("not found", { status: 404 });

        // Skip scheduled/future notifications — those are delivered by their own job.
        if (n.scheduled_for && new Date(n.scheduled_for).getTime() > Date.now()) {
          return Response.json({ ok: false, skipped: "scheduled" });
        }

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("onesignal_external_user_id")
          .eq("id", n.user_id)
          .maybeSingle();
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(n.user_id);
        const externalIds = [n.user_id, profile?.onesignal_external_user_id, authUser.user?.email].filter(Boolean) as string[];

        const { sendOneSignalPush } = await import("@/lib/onesignal.server");
        const result = await sendOneSignalPush({
          externalUserIds: externalIds,
          title: n.title,
          body: n.body ?? null,
          url: n.action_url ?? null,
          priority: n.priority,
          data: {
            notification_id: n.id,
            type: n.type,
            ...((n.data as Record<string, unknown> | null) ?? {}),
          },
        });
        return Response.json(result);
      },
    },
  },
});
