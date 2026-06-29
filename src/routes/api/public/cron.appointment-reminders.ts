import { createFileRoute } from "@tanstack/react-router";

/**
 * Cron endpoint — invoked every 5 minutes by pg_cron.
 * Scans upcoming appointments and emits notifications for the 24h / 2h / 30m windows.
 * Authenticated via the Supabase publishable key in the `apikey` header.
 */
export const Route = createFileRoute("/api/public/cron/appointment-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provided = request.headers.get("x-cron-secret") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
        const expected = process.env.CRON_SECRET ?? "";
        if (!expected || provided.length !== expected.length) {
          return new Response("Unauthorized", { status: 401 });
        }
        // timing-safe compare
        let diff = 0;
        for (let i = 0; i < expected.length; i++) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
        if (diff !== 0) return new Response("Unauthorized", { status: 401 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const now = new Date();
        const horizon = new Date(now.getTime() + 25 * 60 * 60 * 1000);

        const { data: appts, error } = await supabaseAdmin
          .from("appointments")
          .select("id, patient_id, provider_id, scheduled_for, reminder_24h_sent_at, reminder_2h_sent_at, reminder_30m_sent_at, providers ( name )")
          .gt("scheduled_for", now.toISOString())
          .lt("scheduled_for", horizon.toISOString())
          .in("status", ["pending", "approved"]);

        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

        let sent = 0;
        const updates: Array<PromiseLike<unknown>> = [];
        const notifs: Array<{
          user_id: string;
          type: "appointment";
          title: string;
          body: string;
          data: { appointment_id: string; tier: string };
        }> = [];

        for (const a of appts ?? []) {
          const when = new Date(a.scheduled_for);
          const diffMin = (when.getTime() - now.getTime()) / 60_000;
          const provName = (a as { providers?: { name?: string } | null }).providers?.name ?? "votre prestataire";
          type Tier = { window: number; field: "reminder_24h_sent_at" | "reminder_2h_sent_at" | "reminder_30m_sent_at"; label: string };
          const tiers: Tier[] = [
            { window: 1440, field: "reminder_24h_sent_at", label: "dans 24 h" },
            { window: 120, field: "reminder_2h_sent_at", label: "dans 2 h" },
            { window: 30, field: "reminder_30m_sent_at", label: "dans 30 min" },
          ];
          for (const t of tiers) {
            const sentAt = (a as unknown as Record<string, string | null>)[t.field];
            if (!sentAt && diffMin <= t.window && diffMin > t.window - 10) {
              notifs.push({
                user_id: a.patient_id,
                type: "appointment",
                title: `Rappel rendez-vous ${t.label}`,
                body: `Votre rendez-vous avec ${provName} commence ${t.label}.`,
                data: { appointment_id: a.id, tier: t.field },
              });
              const patch =
                t.field === "reminder_24h_sent_at" ? { reminder_24h_sent_at: now.toISOString() }
                : t.field === "reminder_2h_sent_at" ? { reminder_2h_sent_at: now.toISOString() }
                : { reminder_30m_sent_at: now.toISOString() };
              updates.push(
                supabaseAdmin.from("appointments").update(patch).eq("id", a.id).then(() => null),
              );
              sent++;
            }
          }
        }

        if (notifs.length > 0) {
          await supabaseAdmin.from("notifications").insert(notifs);
        }
        await Promise.all(updates);

        return Response.json({ ok: true, scanned: appts?.length ?? 0, sent });
      },
    },
  },
});