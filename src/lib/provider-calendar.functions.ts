import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { signProviderCalendarToken } from "@/lib/provider-calendar-token";

export const getProviderCalendarFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ providerId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prov, error } = await supabase
      .from("providers")
      .select("id, owner_id")
      .eq("id", data.providerId)
      .maybeSingle();
    if (error) throw error;
    if (!prov || prov.owner_id !== userId) throw new Error("Forbidden");

    const secret = process.env.CRON_SECRET;
    if (!secret) throw new Error("Calendar signing key is not configured");
    const token = signProviderCalendarToken(prov.id, secret);
    const path = `/api/public/provider-calendar/${token}.ics`;
    return { token, path };
  });