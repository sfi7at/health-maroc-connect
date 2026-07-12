import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreateDoctorSchema = z.object({
  email: z.string().email(),
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).optional().nullable(),
  specialty_slug: z.string().trim().max(60).optional().nullable(),
  specialty_label: z.string().trim().max(120).optional().nullable(),
  city_id: z.string().uuid().optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  google_maps_url: z.string().trim().url().optional().or(z.literal("")).nullable().optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  languages: z.array(z.string()).optional().default([]),
  insurances: z.array(z.string().uuid()).optional().default([]),
  is_verified: z.boolean().optional().default(true),
  is_active: z.boolean().optional().default(true),
});

function makeTempPassword(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return "HL-" + Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 14) + "!";
}

export const adminCreateDoctor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => CreateDoctorSchema.parse(data))
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
        full_name: data.full_name,
        phone: data.phone ?? undefined,
        role: "doctor",
      },
    });
    if (createErr || !created?.user) {
      throw new Error(createErr?.message ?? "Impossible de créer l'utilisateur");
    }
    const newUserId = created.user.id;

    // Provider row
    const { data: provider, error: provErr } = await supabaseAdmin
      .from("providers")
      .insert({
        owner_id: newUserId,
        category: "doctor",
        name: data.full_name,
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
          specialties: data.specialty_label ? [data.specialty_label] : [],
        },
      })
      .select("id, slug")
      .single();
    if (provErr) throw new Error(provErr.message);

    // Roles
    await supabaseAdmin.from("user_roles").insert([
      { user_id: newUserId, role: "doctor" },
      { user_id: newUserId, role: "user" },
    ]);

    // Provider specialty link
    if (data.specialty_slug) {
      const { data: specialty } = await supabaseAdmin
        .from("specialties")
        .select("id")
        .eq("slug", data.specialty_slug)
        .maybeSingle();
      if (specialty?.id) {
        await supabaseAdmin.from("provider_specialties").insert({
          provider_id: provider.id,
          specialty_id: specialty.id,
        });
      }
    }

    // Insurances
    if (data.insurances?.length) {
      await supabaseAdmin.from("provider_insurance").insert(
        data.insurances.map((iid) => ({ provider_id: provider.id, insurance_id: iid })),
      );
    }

    // Default availability so patients can book immediately: Mon-Sat 09-13 / 14-18
    await supabaseAdmin.from("provider_schedules").insert(
      [1, 2, 3, 4, 5, 6].map((weekday) => ({
        provider_id: provider.id,
        weekday,
        start_time: "09:00",
        end_time: "18:00",
        slot_minutes: 30,
        break_start: "13:00",
        break_end: "14:00",
        is_active: true,
      })),
    );

    // Default consultation service
    await supabaseAdmin.from("provider_services").insert({
      provider_id: provider.id,
      name: "Consultation générale",
      description: "Consultation médicale standard",
      duration_minutes: 30,
      is_active: true,
      is_online_eligible: false,
      sort_order: 0,
    });

    // Recovery link so the doctor can set their own password
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