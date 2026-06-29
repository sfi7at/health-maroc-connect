import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { BloodGroup } from "./categories";
import type { DonorStatus } from "./blood";

export interface DonorPublic {
  id: string;
  first_name: string | null;
  last_name: string | null;
  blood_group: Database["public"]["Enums"]["blood_group"];
  gender: string | null;
  city_id: string | null;
  province_id: string | null;
  avatar_url: string | null;
  is_available: boolean;
  status: DonorStatus;
  is_verified: boolean;
  total_donations: number;
  last_donation_at: string | null;
  last_active_at: string;
  created_at: string;
}

const DONOR_SAFE_COLS =
  "id, first_name, last_name, blood_group, gender, city_id, province_id, avatar_url, is_available, status, is_verified, total_donations, last_donation_at, last_active_at, created_at";

export function donorsSearchQuery(params: {
  bloodGroups?: BloodGroup[];
  cityId?: string | null;
  onlyAvailable?: boolean;
  onlyVerified?: boolean;
  sort?: "newest" | "most_active" | "verified";
  limit?: number;
}) {
  const {
    bloodGroups,
    cityId,
    onlyAvailable = true,
    onlyVerified = false,
    sort = "most_active",
    limit = 80,
  } = params;
  return queryOptions({
    queryKey: ["blood_donors_search", { bloodGroups, cityId, onlyAvailable, onlyVerified, sort, limit }],
    queryFn: async () => {
      let q = supabase
        .from("blood_donors")
        .select(DONOR_SAFE_COLS)
        .limit(limit);
      if (onlyAvailable) q = q.eq("is_available", true).eq("status", "available");
      if (onlyVerified) q = q.eq("is_verified", true);
      if (cityId) q = q.eq("city_id", cityId);
      if (bloodGroups && bloodGroups.length > 0)
        q = q.in("blood_group", bloodGroups as unknown as Database["public"]["Enums"]["blood_group"][]);
      if (sort === "newest") q = q.order("created_at", { ascending: false });
      else if (sort === "verified")
        q = q.order("is_verified", { ascending: false }).order("total_donations", { ascending: false });
      else q = q.order("last_active_at", { ascending: false }).order("total_donations", { ascending: false });
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as DonorPublic[];
    },
    staleTime: 30_000,
  });
}

export function donorByIdQuery(id: string) {
  return queryOptions({
    queryKey: ["blood_donor_public", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blood_donors")
        .select(DONOR_SAFE_COLS + ", cities ( id, name_fr )")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as
        | (DonorPublic & { cities?: { id: string; name_fr: string } | null })
        | null;
    },
  });
}

export function bloodStatsQuery() {
  return queryOptions({
    queryKey: ["blood_stats"],
    queryFn: async () => {
      const [donors, requests, verified, donations] = await Promise.all([
        supabase.from("blood_donors").select("id", { count: "exact", head: true }),
        supabase.from("blood_requests").select("id", { count: "exact", head: true }),
        supabase
          .from("blood_donors")
          .select("id", { count: "exact", head: true })
          .eq("is_verified", true),
        supabase.from("donation_history").select("units"),
      ]);
      const livesHelped = (donations.data ?? []).reduce(
        (acc, d) => acc + Number((d as { units: number | null }).units ?? 1) * 3,
        0,
      );
      return {
        donors: donors.count ?? 0,
        requests: requests.count ?? 0,
        verified: verified.count ?? 0,
        livesHelped,
      };
    },
    staleTime: 60_000,
  });
}

export function bloodCampaignsQuery(filters?: { cityId?: string | null; upcoming?: boolean }) {
  return queryOptions({
    queryKey: ["blood_campaigns", filters ?? {}],
    queryFn: async () => {
      let q = supabase
        .from("blood_campaigns")
        .select("*, cities ( id, name_fr )")
        .eq("is_published", true)
        .order("starts_at", { ascending: true })
        .limit(60);
      if (filters?.cityId) q = q.eq("city_id", filters.cityId);
      if (filters?.upcoming !== false) q = q.gte("starts_at", new Date().toISOString());
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

export function bloodCentersQuery(cityId?: string | null) {
  return queryOptions({
    queryKey: ["blood_centers", cityId ?? null],
    queryFn: async () => {
      let q = supabase
        .from("providers")
        .select("*, cities ( id, name_fr )")
        .eq("category", "blood_center")
        .eq("is_active", true)
        .order("name");
      if (cityId) q = q.eq("city_id", cityId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });
}

export function donationHistoryQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["donation_history", userId ?? "anon"],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donation_history")
        .select("*, cities ( id, name_fr )")
        .eq("donor_id", userId!)
        .order("donated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function chatMessagesQuery(requestId: string | undefined) {
  return queryOptions({
    queryKey: ["blood_chat", requestId ?? "none"],
    enabled: !!requestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blood_chat_messages")
        .select("*")
        .eq("request_id", requestId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function bloodRequestByIdQuery(id: string | undefined) {
  return queryOptions({
    queryKey: ["blood_request", id ?? "none"],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blood_requests")
        .select("*, cities ( id, name_fr )")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
