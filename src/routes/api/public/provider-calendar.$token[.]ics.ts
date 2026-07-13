import { createFileRoute } from "@tanstack/react-router";
import { verifyProviderCalendarToken } from "@/lib/provider-calendar-token";

function icsEscape(s: string): string {
  return s.replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\r?\n/g, "\\n");
}
function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export const Route = createFileRoute("/api/public/provider-calendar/$token.ics")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const secret = process.env.CRON_SECRET;
        if (!secret) return new Response("Feed disabled", { status: 503 });
        const providerId = verifyProviderCalendarToken(params.token, secret);
        if (!providerId) return new Response("Invalid token", { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: prov } = await supabaseAdmin
          .from("providers")
          .select("id, name, address, phone")
          .eq("id", providerId)
          .maybeSingle();
        if (!prov) return new Response("Not found", { status: 404 });

        const from = new Date();
        from.setMonth(from.getMonth() - 1);
        const to = new Date();
        to.setMonth(to.getMonth() + 6);

        const { data: appts } = await supabaseAdmin
          .from("appointments")
          .select("id, scheduled_for, duration_minutes, status, reason, updated_at, patient_id, service_id, profiles:patient_id ( full_name ), provider_services:service_id ( name )")
          .eq("provider_id", providerId)
          .gte("scheduled_for", from.toISOString())
          .lte("scheduled_for", to.toISOString())
          .in("status", ["pending", "approved", "rescheduled", "completed"])
          .order("scheduled_for", { ascending: true })
          .limit(1000);

        const lines: string[] = [
          "BEGIN:VCALENDAR",
          "VERSION:2.0",
          "PRODID:-//Vytalma//Provider Calendar//FR",
          "CALSCALE:GREGORIAN",
          "METHOD:PUBLISH",
          `X-WR-CALNAME:${icsEscape(`Vytalma — ${prov.name}`)}`,
          "X-WR-TIMEZONE:Africa/Casablanca",
          "REFRESH-INTERVAL;VALUE=DURATION:PT15M",
          "X-PUBLISHED-TTL:PT15M",
        ];

        for (const a of appts ?? []) {
          const start = new Date(a.scheduled_for as string);
          const end = new Date(start.getTime() + ((a.duration_minutes as number) ?? 30) * 60_000);
          const patient = (a as { profiles?: { full_name?: string | null } | null }).profiles?.full_name ?? "Patient";
          const service = (a as { provider_services?: { name?: string | null } | null }).provider_services?.name ?? (a.reason as string | null) ?? "Consultation";
          const status = String(a.status);
          const summary = `${service} — ${patient}`;
          const description = `Statut: ${status}${a.reason ? `\nMotif: ${a.reason}` : ""}`;
          lines.push(
            "BEGIN:VEVENT",
            `UID:${a.id}@vytalma.ma`,
            `DTSTAMP:${icsDate(new Date((a.updated_at as string) ?? new Date().toISOString()))}`,
            `DTSTART:${icsDate(start)}`,
            `DTEND:${icsDate(end)}`,
            `SUMMARY:${icsEscape(summary)}`,
            `DESCRIPTION:${icsEscape(description)}`,
            prov.address ? `LOCATION:${icsEscape(prov.address)}` : "",
            status === "cancelled" || status === "rejected" ? "STATUS:CANCELLED" : status === "completed" ? "STATUS:CONFIRMED" : status === "approved" ? "STATUS:CONFIRMED" : "STATUS:TENTATIVE",
            "END:VEVENT",
          );
        }

        lines.push("END:VCALENDAR");
        const ics = lines.filter(Boolean).join("\r\n");

        return new Response(ics, {
          status: 200,
          headers: {
            "content-type": "text/calendar; charset=utf-8",
            "cache-control": "private, max-age=300",
          },
        });
      },
    },
  },
});