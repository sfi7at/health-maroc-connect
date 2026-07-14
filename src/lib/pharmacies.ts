import { queryOptions } from "@tanstack/react-query";
import {
  Pill,
  Syringe,
  Activity,
  Droplet,
  Truck,
  Video,
  Baby,
  Sparkles,
  Stethoscope,
  HeartPulse,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PharmacyRow = Database["public"]["Tables"]["providers"]["Row"] & {
  cities?: { id: string; name_fr: string } | null;
  districts?: { id: string; name_fr: string } | null;
};

export interface PharmacyMeta {
  logo?: string;
  gallery?: string[];
  neighborhood?: string;
  whatsapp?: string;
  delivery?: boolean;
  open_24h?: boolean;
  accessibility?: string[]; // e.g. ["wheelchair"]
  parking?: boolean;
  services?: PharmacyService[];
  faq?: { q: string; a: string }[];
  bio?: string;
}

export type PharmacyService =
  | "prescription"
  | "otc"
  | "equipment"
  | "baby"
  | "cosmetics"
  | "vaccination"
  | "blood_pressure"
  | "blood_sugar"
  | "delivery"
  | "online_consultation";

export const PHARMACY_SERVICES: Array<{
  value: PharmacyService;
  label: string;
  icon: LucideIcon;
}> = [
  { value: "prescription", label: "Médicaments sur ordonnance", icon: Pill },
  { value: "otc", label: "Médicaments OTC", icon: Pill },
  { value: "equipment", label: "Matériel médical", icon: Stethoscope },
  { value: "baby", label: "Produits bébé", icon: Baby },
  { value: "cosmetics", label: "Cosmétiques & parapharmacie", icon: Sparkles },
  { value: "vaccination", label: "Vaccination", icon: Syringe },
  { value: "blood_pressure", label: "Tension artérielle", icon: HeartPulse },
  { value: "blood_sugar", label: "Glycémie", icon: Droplet },
  { value: "delivery", label: "Livraison à domicile", icon: Truck },
  { value: "online_consultation", label: "Consultation en ligne", icon: Video },
];

export function readPharmacyMeta(p: { metadata: unknown }): PharmacyMeta {
  return (p?.metadata ?? {}) as PharmacyMeta;
}

export interface PharmacyFiltersValue {
  q?: string;
  cityId?: string | null;
  neighborhood?: string | null;
  minRating?: number;
  openNow?: boolean;
  onDuty?: boolean;
  open24h?: boolean;
  delivery?: boolean;
  vaccination?: boolean;
  equipment?: boolean;
  bloodPressure?: boolean;
  bloodSugar?: boolean;
  parking?: boolean;
  verified?: boolean;
  premium?: boolean;
  wheelchair?: boolean;
  sort?: "relevance" | "rating" | "recent";
}

export function pharmaciesQuery(filters: PharmacyFiltersValue = {}, limit = 80) {
  return queryOptions({
    queryKey: ["pharmacies", filters, limit],
    queryFn: async () => {
      let q = supabase
        .from("providers")
        .select("*, cities ( id, name_fr ), districts ( id, name_fr )")
        .eq("category", "pharmacy")
        .eq("is_active", true)
        .limit(limit);
      if (filters.cityId) q = q.eq("city_id", filters.cityId);
      if (filters.verified) q = q.eq("is_verified", true);
      if (filters.premium) q = q.eq("is_premium", true);
      if (filters.q && filters.q.trim().length > 1) {
        q = q.ilike("name", `%${filters.q.trim()}%`);
      }
      if (filters.minRating && filters.minRating > 0) {
        q = q.gte("average_rating", filters.minRating);
      }
      const sort = filters.sort ?? "relevance";
      if (sort === "rating") {
        q = q.order("average_rating", { ascending: false });
      } else if (sort === "recent") {
        q = q.order("created_at", { ascending: false });
      } else {
        q = q
          .order("is_premium", { ascending: false })
          .order("is_verified", { ascending: false })
          .order("average_rating", { ascending: false });
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PharmacyRow[];
    },
    staleTime: 30_000,
  });
}

export function pharmacySuggestionsQuery(q: string) {
  return queryOptions({
    queryKey: ["pharmacy_suggestions", q],
    enabled: q.trim().length > 1,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("id, name, slug, address, cities ( name_fr )")
        .eq("category", "pharmacy")
        .eq("is_active", true)
        .ilike("name", `%${q.trim()}%`)
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

export function onDutyTodayProviderIdsQuery(date: string) {
  return queryOptions({
    queryKey: ["on_duty_ids", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pharmacies_on_duty")
        .select("provider_id")
        .eq("duty_date", date);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.provider_id as string));
    },
    staleTime: 60_000,
  });
}

export function matchesPharmacyClientFilters(
  p: PharmacyRow,
  filters: PharmacyFiltersValue,
  ctx: { openNow?: boolean; onDuty?: boolean } = {},
): boolean {
  const meta = readPharmacyMeta(p);
  if (filters.openNow && !ctx.openNow) return false;
  if (filters.onDuty && !ctx.onDuty) return false;
  if (filters.open24h && !meta.open_24h) return false;
  if (filters.delivery && !meta.delivery && !meta.services?.includes("delivery")) return false;
  if (filters.vaccination && !meta.services?.includes("vaccination")) return false;
  if (filters.equipment && !meta.services?.includes("equipment")) return false;
  if (filters.bloodPressure && !meta.services?.includes("blood_pressure")) return false;
  if (filters.bloodSugar && !meta.services?.includes("blood_sugar")) return false;
  if (filters.parking && !meta.parking) return false;
  if (filters.wheelchair && !meta.accessibility?.includes("wheelchair")) return false;
  if (filters.neighborhood) {
    const nh = filters.neighborhood.toLowerCase();
    const districtName = p.districts?.name_fr?.toLowerCase() ?? "";
    const metaNh = meta.neighborhood?.toLowerCase() ?? "";
    if (!districtName.includes(nh) && !metaNh.includes(nh)) return false;
  }
  return true;
}

export function myOwnedPharmaciesQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["my_pharmacies", userId ?? "anon"],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("*, cities ( id, name_fr )")
        .eq("category", "pharmacy")
        .eq("owner_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PharmacyRow[];
    },
  });
}

export function pharmacyReviewsQuery(providerId: string) {
  return queryOptions({
    queryKey: ["pharmacy_reviews", providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("provider_id", providerId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}