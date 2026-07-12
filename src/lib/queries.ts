import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { ProviderCategory } from "./format";

export type ProviderRow = Database["public"]["Tables"]["providers"]["Row"] & {
  cities?: { id: string; name_fr: string } | null;
};

export function providersQuery(params: {
  category?: ProviderCategory | "all";
  cityId?: string | null;
  search?: string;
  limit?: number;
}) {
  const { category = "all", cityId, search, limit = 60 } = params;
  return queryOptions({
    queryKey: ["providers", category, cityId ?? null, search ?? "", limit],
    queryFn: async () => {
      let q = supabase
        .from("providers")
        .select("*, cities ( id, name_fr, latitude, longitude )")
        .eq("is_active", true)
        .order("is_premium", { ascending: false })
        .order("average_rating", { ascending: false })
        .limit(limit);
      if (category !== "all") q = q.eq("category", category);
      if (cityId) q = q.eq("city_id", cityId);
      if (search && search.trim().length > 1) {
        q = q.ilike("name", `%${search.trim()}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ProviderRow[];
    },
    staleTime: 30_000,
  });
}

export function providerByIdQuery(id: string) {
  return queryOptions({
    queryKey: ["provider", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select(
          "*, cities ( id, name_fr ), provider_specialties ( specialty_id, specialties ( id, name_fr, slug ) )",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function citiesQuery() {
  return queryOptions({
    queryKey: ["cities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cities")
        .select("id, name_fr, name_ar")
        .order("name_fr");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });
}

export function bloodRequestsQuery(filters?: {
  bloodGroup?: string;
  cityId?: string | null;
  status?: Database["public"]["Enums"]["blood_request_status"];
}) {
  return queryOptions({
    queryKey: ["blood_requests", filters ?? {}],
    queryFn: async () => {
      let q = supabase
        .from("blood_requests")
        .select("*, cities ( id, name_fr )")
        .order("is_emergency", { ascending: false })
        .order("urgency", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(80);
      if (filters?.bloodGroup)
        q = q.eq("blood_group", filters.bloodGroup as Database["public"]["Enums"]["blood_group"]);
      if (filters?.cityId) q = q.eq("city_id", filters.cityId);
      q = q.eq("status", filters?.status ?? "open");
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 15_000,
  });
}

export function myBloodDonorQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["blood_donor", userId ?? "anon"],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blood_donors")
        .select("*")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function appointmentsQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["appointments", userId ?? "anon"],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, providers ( id, name, category, profile_image )")
        .eq("patient_id", userId!)
        .order("scheduled_for", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function notificationsQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["notifications", userId ?? "anon"],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function favoritesQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["favorites", userId ?? "anon"],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("provider_id, created_at, providers ( * )")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function medicalProfileQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["medical_profile", userId ?? "anon"],
    enabled: !!userId,
    queryFn: async () => {
      const [profile, allergies, vacc, cond, contacts] = await Promise.all([
        supabase.from("medical_profiles").select("*").eq("user_id", userId!).maybeSingle(),
        supabase.from("allergies").select("*").eq("user_id", userId!).order("created_at"),
        supabase.from("vaccinations").select("*").eq("user_id", userId!).order("vaccinated_at", { ascending: false }),
        supabase.from("medical_conditions").select("*").eq("user_id", userId!).order("created_at"),
        supabase.from("emergency_contacts").select("*").eq("user_id", userId!).order("created_at"),
      ]);
      return {
        profile: profile.data,
        allergies: allergies.data ?? [],
        vaccinations: vacc.data ?? [],
        conditions: cond.data ?? [],
        emergencyContacts: contacts.data ?? [],
      };
    },
  });
}

export function pharmaciesOnDutyQuery(date: string) {
  return queryOptions({
    queryKey: ["pharmacies_on_duty", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pharmacies_on_duty")
        .select("*, providers ( id, name, address, phone, latitude, longitude ), cities ( id, name_fr )")
        .eq("duty_date", date)
        .order("night_shift", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}