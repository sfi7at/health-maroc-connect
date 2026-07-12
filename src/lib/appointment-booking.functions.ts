import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getBookedSlotsForProvider = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      providerId: z.string().uuid(),
      dateIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const start = new Date(`${data.dateIso}T00:00:00`);
    const end = new Date(`${data.dateIso}T23:59:59`);

    const { data: slots, error } = await supabaseAdmin
      .from("appointments")
      .select("scheduled_for, duration_minutes, status")
      .eq("provider_id", data.providerId)
      .gte("scheduled_for", start.toISOString())
      .lte("scheduled_for", end.toISOString())
      .in("status", ["pending", "approved", "rescheduled"])
      .order("scheduled_for", { ascending: true });

    if (error) throw error;
    return slots ?? [];
  });