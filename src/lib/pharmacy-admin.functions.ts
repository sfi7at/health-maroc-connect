import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreatePharmacySchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(2).max(160),
  owner_full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).optional().nullable(),
  city_id: z.string().uuid().optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  google_maps_url: z.string().trim().url().optional().or(z.literal("")).nullable().optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  languages: z.array(z.string()).optional().default([]),
  is_verified: z.boolean().optional().default(true),
  is_active: z.boolean().optional().default(true),
  is_on_duty: z.boolean().optional().default(false),
});

function makeTempPassword(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return "HL-" + Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 14) + "!";
}

export const adminCreatePharmacy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => CreatePharmacySchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tempPassword = makeTempPassword();

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: data.owner_full_name,
        phone: data.phone ?? undefined,
        role: "pharmacy",
      },
    });
    if (createErr || !created?.user) {
      throw new Error(createErr?.message ?? "Impossible de créer l'utilisateur");
    }
    const newUserId = created.user.id;

    const { data: provider, error: provErr } = await supabaseAdmin
      .from("providers")
      .insert({
        owner_id: newUserId,
        category: "pharmacy",
        name: data.name,
        phone: data.phone ?? null,
        email: data.email,
        address: data.address ?? null,
        city_id: data.city_id ?? null,
        description: data.description ?? null,
        google_maps_url: data.google_maps_url || null,
        is_verified: data.is_verified ?? true,
        is_active: data.is_active ?? true,
        verification_status: (data.is_verified ?? true) ? "verified" : "pending",
        verified_at: (data.is_verified ?? true) ? new Date().toISOString() : null,
        verified_by: userId,
        metadata: {
          languages: data.languages ?? [],
          owner_full_name: data.owner_full_name,
          is_on_duty: data.is_on_duty ?? false,
        },
      })
      .select("id, slug")
      .single();
    if (provErr) throw new Error(provErr.message);

    await supabaseAdmin.from("user_roles").insert([
      { user_id: newUserId, role: "pharmacy" },
      { user_id: newUserId, role: "user" },
    ]);

    let recoveryLink: string | null = null;
    try {
      const { data: link } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: data.email,
      });
      recoveryLink = link?.properties?.action_link ?? null;
    } catch {
      /* non-fatal */
    }

    return {
      user_id: newUserId,
      provider_id: provider.id,
      email: data.email,
      temporary_password: tempPassword,
      recovery_link: recoveryLink,
    };
  });