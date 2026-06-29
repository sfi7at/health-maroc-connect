import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  Stethoscope, HeartPulse, Sparkles, Smile, Baby, Flower2, Eye, Bone, Brain,
  BrainCircuit, Droplets, Ear, ScanLine, Ribbon, Activity, Droplet, Wind, Soup,
  Microscope, Siren, type LucideIcon,
} from "lucide-react";

export type DoctorRow = Database["public"]["Tables"]["providers"]["Row"] & {
  cities?: { id: string; name_fr: string } | null;
  districts?: { id: string; name_fr: string } | null;
  provider_specialties?: Array<{
    specialty_id: string;
    specialties: { id: string; slug: string; name_fr: string } | null;
  }>;
};

export interface DoctorMeta {
  bio?: string;
  experience_years?: number;
  consultation_price_mad?: number;
  consultation_price_min?: number;
  consultation_price_max?: number;
  gender?: "male" | "female";
  languages?: string[];
  education?: string[];
  certifications?: string[];
  online_appointment?: boolean;
  home_visit?: boolean;
  insurance_accepted?: string[];
  whatsapp?: string;
  gallery?: string[];
  faq?: { q: string; a: string }[];
  neighborhood?: string;
  accessibility?: string[];
  parking?: string;
  title?: string; // Dr., Pr., etc.
}

export function readDoctorMeta(p: { metadata: unknown }): DoctorMeta {
  return (p?.metadata ?? {}) as DoctorMeta;
}

export const SPECIALTY_ICONS: Record<string, LucideIcon> = {
  Stethoscope, HeartPulse, Sparkles, Smile, Baby, Flower2, Eye, Bone, Brain,
  BrainCircuit, Droplets, Ear, ScanLine, Ribbon, Activity, Droplet, Wind, Soup,
  Microscope, Siren,
};

export const SPECIALTY_GRADIENTS = [
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-red-600",
  "from-amber-500 to-orange-600",
  "from-sky-500 to-blue-600",
  "from-violet-500 to-fuchsia-600",
  "from-indigo-500 to-violet-600",
  "from-cyan-500 to-blue-700",
  "from-pink-500 to-rose-600",
  "from-lime-500 to-emerald-600",
  "from-orange-500 to-red-600",
];

export function gradientForSlug(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return SPECIALTY_GRADIENTS[h % SPECIALTY_GRADIENTS.length];
}

export const LANGUAGES: Array<{ value: string; label: string }> = [
  { value: "fr", label: "Français" },
  { value: "ar", label: "العربية" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "ber", label: "Tamazight" },
];

export const INSURANCES = ["CNSS", "CNOPS", "RMA", "Saham", "Axa", "Wafa Assurance", "MGPAP", "FAR"];

export type SortBy = "relevance" | "rating" | "price_asc" | "price_desc" | "experience";

export interface DoctorFiltersValue {
  q?: string;
  specialty?: string | null;
  cityId?: string | null;
  gender?: "male" | "female" | null;
  language?: string | null;
  verified?: boolean;
  premium?: boolean;
  openNow?: boolean;
  online?: boolean;
  homeVisit?: boolean;
  insurance?: string | null;
  minRating?: number;
  maxPrice?: number | null;
  sort?: SortBy;
}

export function specialtiesQuery() {
  return queryOptions({
    queryKey: ["specialties", "doctor"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("specialties")
        .select("id, slug, name_fr, name_ar, icon, category")
        .in("category", ["doctor", "dentist"])
        .order("name_fr");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10 * 60_000,
  });
}

export function specialtyBySlugQuery(slug: string) {
  return queryOptions({
    queryKey: ["specialty", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("specialties")
        .select("id, slug, name_fr, name_ar, icon, category")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60_000,
  });
}

export function doctorsQuery(filters: DoctorFiltersValue = {}) {
  const {
    q, cityId, verified, premium, sort = "relevance",
  } = filters;
  return queryOptions({
    queryKey: ["doctors", filters],
    queryFn: async () => {
      let qb = supabase
        .from("providers")
        .select(
          "*, cities ( id, name_fr ), provider_specialties ( specialty_id, specialties ( id, slug, name_fr ) )",
        )
        .in("category", ["doctor", "dentist"])
        .eq("is_active", true)
        .limit(120);

      if (cityId) qb = qb.eq("city_id", cityId);
      if (verified) qb = qb.eq("is_verified", true);
      if (premium) qb = qb.eq("is_premium", true);
      if (q && q.trim().length > 1) qb = qb.ilike("name", `%${q.trim()}%`);

      if (sort === "rating") qb = qb.order("average_rating", { ascending: false });
      else if (sort === "price_asc") qb = qb.order("is_premium", { ascending: false });
      else if (sort === "price_desc") qb = qb.order("is_premium", { ascending: false });
      else {
        qb = qb
          .order("is_premium", { ascending: false })
          .order("is_verified", { ascending: false })
          .order("average_rating", { ascending: false });
      }

      const { data, error } = await qb;
      if (error) throw error;
      return (data ?? []) as DoctorRow[];
    },
    staleTime: 30_000,
  });
}

export function doctorByIdQuery(id: string) {
  return queryOptions({
    queryKey: ["doctor", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select(
          "*, cities ( id, name_fr ), provider_specialties ( specialty_id, specialties ( id, slug, name_fr ) )",
        )
        .eq("id", id)
        .in("category", ["doctor", "dentist"])
        .maybeSingle();
      if (error) throw error;
      return data as DoctorRow | null;
    },
  });
}

export function doctorReviewsQuery(providerId: string) {
  return queryOptions({
    queryKey: ["doctor_reviews", providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, profiles!reviews_author_id_fkey ( id, full_name, avatar_url )")
        .eq("provider_id", providerId)
        .order("created_at", { ascending: false });
      if (error) {
        // Fallback if FK alias not exposed in PostgREST
        const { data: plain } = await supabase
          .from("reviews")
          .select("*")
          .eq("provider_id", providerId)
          .order("created_at", { ascending: false });
        return (plain ?? []).map((r) => ({ ...r, profiles: null }));
      }
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

export function ownedDoctorsQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["doctors_owned", userId ?? "anon"],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("*, cities ( id, name_fr )")
        .eq("owner_id", userId!)
        .in("category", ["doctor", "dentist"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DoctorRow[];
    },
  });
}

export function matchesDoctorFilters(d: DoctorRow, f: DoctorFiltersValue): boolean {
  const m = readDoctorMeta(d);
  if (f.specialty) {
    const has = (d.provider_specialties ?? []).some((s) => s.specialties?.slug === f.specialty);
    if (!has) return false;
  }
  if (f.gender && m.gender !== f.gender) return false;
  if (f.language && !(m.languages ?? []).includes(f.language)) return false;
  if (f.online && !m.online_appointment) return false;
  if (f.homeVisit && !m.home_visit) return false;
  if (f.insurance && !(m.insurance_accepted ?? []).includes(f.insurance)) return false;
  if (f.minRating && (d.average_rating ?? 0) < f.minRating) return false;
  if (f.maxPrice != null && m.consultation_price_mad != null && m.consultation_price_mad > f.maxPrice)
    return false;
  if (f.q && f.q.trim().length > 1) {
    const needle = f.q.trim().toLowerCase();
    const hay = [
      d.name, d.address, d.cities?.name_fr, m.neighborhood,
      ...(d.provider_specialties ?? []).map((s) => s.specialties?.name_fr ?? ""),
    ].filter(Boolean).join(" ").toLowerCase();
    if (!hay.includes(needle)) return false;
  }
  return true;
}

export function priceLabel(m: DoctorMeta): string | null {
  if (m.consultation_price_mad != null) return `${m.consultation_price_mad} MAD`;
  if (m.consultation_price_min != null && m.consultation_price_max != null)
    return `${m.consultation_price_min}–${m.consultation_price_max} MAD`;
  return null;
}

export function languageLabel(code: string): string {
  return LANGUAGES.find((l) => l.value === code)?.label ?? code.toUpperCase();
}