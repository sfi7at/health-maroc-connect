import { queryOptions } from "@tanstack/react-query";
import {
  Activity,
  Baby,
  Bone,
  Brain,
  Building2,
  Droplet,
  Ear,
  Eye,
  FlaskConical,
  HeartPulse,
  Hospital,
  Microscope,
  Pill,
  Ribbon,
  Scissors,
  Scan,
  Siren,
  Smile,
  Sparkles,
  Stethoscope,
  Syringe,
  Truck,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type HospitalRow = Database["public"]["Tables"]["providers"]["Row"] & {
  cities?: { id: string; name_fr: string } | null;
  districts?: { id: string; name_fr: string } | null;
};

export type HospitalKind = "hospital" | "clinic";

export type HospitalDepartmentKey =
  | "emergency"
  | "cardiology"
  | "neurology"
  | "orthopedics"
  | "radiology"
  | "maternity"
  | "pediatrics"
  | "internal_medicine"
  | "oncology"
  | "icu"
  | "dialysis"
  | "general_surgery"
  | "plastic_surgery"
  | "psychiatry"
  | "ent"
  | "ophthalmology"
  | "dermatology";

export type HospitalServiceKey =
  | "emergency"
  | "mri"
  | "ct_scan"
  | "xray"
  | "ultrasound"
  | "laboratory"
  | "blood_bank"
  | "dialysis"
  | "operating_rooms"
  | "intensive_care"
  | "ambulance"
  | "vaccination";

export interface HospitalMeta {
  logo?: string;
  gallery?: string[];
  neighborhood?: string;
  whatsapp?: string;
  website?: string;
  bio?: string;
  kind?: HospitalKind;
  type?: "public" | "private" | "university" | "military";
  emergency?: boolean;
  emergency_phone?: string;
  open_24h?: boolean;
  parking?: boolean;
  wheelchair?: boolean;
  languages?: string[];
  beds?: number;
  departments?: HospitalDepartmentKey[];
  services?: HospitalServiceKey[];
  equipment?: string[];
  doctors?: string[]; // provider ids of doctors
  faq?: { q: string; a: string }[];
}

export const HOSPITAL_DEPARTMENTS: Array<{
  value: HospitalDepartmentKey;
  label: string;
  icon: LucideIcon;
  tint: string;
}> = [
  { value: "emergency", label: "Urgences", icon: Siren, tint: "bg-red-500/10 text-red-600" },
  { value: "cardiology", label: "Cardiologie", icon: HeartPulse, tint: "bg-rose-500/10 text-rose-600" },
  { value: "neurology", label: "Neurologie", icon: Brain, tint: "bg-indigo-500/10 text-indigo-600" },
  { value: "orthopedics", label: "Orthopédie", icon: Bone, tint: "bg-amber-500/10 text-amber-600" },
  { value: "radiology", label: "Radiologie", icon: Scan, tint: "bg-sky-500/10 text-sky-600" },
  { value: "maternity", label: "Maternité", icon: Baby, tint: "bg-pink-500/10 text-pink-600" },
  { value: "pediatrics", label: "Pédiatrie", icon: Baby, tint: "bg-fuchsia-500/10 text-fuchsia-600" },
  { value: "internal_medicine", label: "Médecine interne", icon: Stethoscope, tint: "bg-emerald-500/10 text-emerald-600" },
  { value: "oncology", label: "Oncologie", icon: Ribbon, tint: "bg-purple-500/10 text-purple-600" },
  { value: "icu", label: "Réanimation", icon: Activity, tint: "bg-red-600/10 text-red-700" },
  { value: "dialysis", label: "Dialyse", icon: Waves, tint: "bg-cyan-500/10 text-cyan-600" },
  { value: "general_surgery", label: "Chirurgie générale", icon: Scissors, tint: "bg-slate-500/10 text-slate-600" },
  { value: "plastic_surgery", label: "Chirurgie plastique", icon: Sparkles, tint: "bg-violet-500/10 text-violet-600" },
  { value: "psychiatry", label: "Psychiatrie", icon: Brain, tint: "bg-teal-500/10 text-teal-600" },
  { value: "ent", label: "ORL", icon: Ear, tint: "bg-orange-500/10 text-orange-600" },
  { value: "ophthalmology", label: "Ophtalmologie", icon: Eye, tint: "bg-blue-500/10 text-blue-600" },
  { value: "dermatology", label: "Dermatologie", icon: Smile, tint: "bg-lime-500/10 text-lime-600" },
];

export const HOSPITAL_DEPARTMENT_META: Record<
  HospitalDepartmentKey,
  (typeof HOSPITAL_DEPARTMENTS)[number]
> = Object.fromEntries(HOSPITAL_DEPARTMENTS.map((d) => [d.value, d])) as Record<
  HospitalDepartmentKey,
  (typeof HOSPITAL_DEPARTMENTS)[number]
>;

export const HOSPITAL_SERVICES: Array<{
  value: HospitalServiceKey;
  label: string;
  icon: LucideIcon;
  tint: string;
}> = [
  { value: "emergency", label: "Urgences 24/7", icon: Siren, tint: "bg-red-500/10 text-red-600" },
  { value: "mri", label: "IRM", icon: Scan, tint: "bg-indigo-500/10 text-indigo-600" },
  { value: "ct_scan", label: "Scanner (CT)", icon: Scan, tint: "bg-sky-500/10 text-sky-600" },
  { value: "xray", label: "Radiographie", icon: Zap, tint: "bg-amber-500/10 text-amber-600" },
  { value: "ultrasound", label: "Échographie", icon: Activity, tint: "bg-cyan-500/10 text-cyan-600" },
  { value: "laboratory", label: "Laboratoire", icon: FlaskConical, tint: "bg-emerald-500/10 text-emerald-600" },
  { value: "blood_bank", label: "Banque du sang", icon: Droplet, tint: "bg-rose-500/10 text-rose-600" },
  { value: "dialysis", label: "Dialyse", icon: Waves, tint: "bg-teal-500/10 text-teal-600" },
  { value: "operating_rooms", label: "Blocs opératoires", icon: Scissors, tint: "bg-slate-500/10 text-slate-600" },
  { value: "intensive_care", label: "Soins intensifs", icon: Activity, tint: "bg-red-600/10 text-red-700" },
  { value: "ambulance", label: "Ambulance", icon: Truck, tint: "bg-orange-500/10 text-orange-600" },
  { value: "vaccination", label: "Vaccination", icon: Syringe, tint: "bg-violet-500/10 text-violet-600" },
];

export const HOSPITAL_SERVICE_META: Record<
  HospitalServiceKey,
  (typeof HOSPITAL_SERVICES)[number]
> = Object.fromEntries(HOSPITAL_SERVICES.map((s) => [s.value, s])) as Record<
  HospitalServiceKey,
  (typeof HOSPITAL_SERVICES)[number]
>;

export const HOSPITAL_ICONS = { Hospital, Building2, Pill, Microscope };

export function readHospitalMeta(p: { metadata: unknown }): HospitalMeta {
  return (p?.metadata ?? {}) as HospitalMeta;
}

export interface HospitalFiltersValue {
  q?: string;
  kind?: HospitalKind | "all";
  type?: "public" | "private" | "university" | null;
  cityId?: string | null;
  neighborhood?: string | null;
  minRating?: number;
  openNow?: boolean;
  emergency?: boolean;
  parking?: boolean;
  wheelchair?: boolean;
  verified?: boolean;
  premium?: boolean;
  department?: HospitalDepartmentKey;
  service?: HospitalServiceKey;
  sort?: "relevance" | "rating" | "recent";
}

export function hospitalsQuery(filters: HospitalFiltersValue = {}, limit = 80) {
  return queryOptions({
    queryKey: ["hospitals", filters, limit],
    queryFn: async () => {
      let q = supabase
        .from("providers")
        .select("*, cities ( id, name_fr ), districts ( id, name_fr )")
        .eq("is_active", true)
        .limit(limit);

      if (filters.kind === "hospital") q = q.eq("category", "hospital");
      else if (filters.kind === "clinic") q = q.eq("category", "clinic");
      else q = q.in("category", ["hospital", "clinic"]);

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
      return (data ?? []) as HospitalRow[];
    },
    staleTime: 30_000,
  });
}

export function hospitalSuggestionsQuery(q: string) {
  return queryOptions({
    queryKey: ["hospital_suggestions", q],
    enabled: q.trim().length > 1,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("id, name, address, category, cities ( name_fr )")
        .in("category", ["hospital", "clinic"])
        .eq("is_active", true)
        .ilike("name", `%${q.trim()}%`)
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

export function matchesHospitalClientFilters(
  p: HospitalRow,
  filters: HospitalFiltersValue,
  ctx: { openNow?: boolean } = {},
): boolean {
  const meta = readHospitalMeta(p);
  if (filters.openNow && !ctx.openNow && !meta.open_24h) return false;
  if (filters.emergency && !meta.emergency && !meta.departments?.includes("emergency")) return false;
  if (filters.parking && !meta.parking) return false;
  if (filters.wheelchair && !meta.wheelchair) return false;
  if (filters.type && meta.type !== filters.type) return false;
  if (filters.department && !meta.departments?.includes(filters.department)) return false;
  if (filters.service && !meta.services?.includes(filters.service)) return false;
  if (filters.neighborhood) {
    const nh = filters.neighborhood.toLowerCase();
    const districtName = p.districts?.name_fr?.toLowerCase() ?? "";
    const metaNh = meta.neighborhood?.toLowerCase() ?? "";
    if (!districtName.includes(nh) && !metaNh.includes(nh)) return false;
  }
  return true;
}

export function myOwnedHospitalsQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["my_hospitals", userId ?? "anon"],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("*, cities ( id, name_fr )")
        .in("category", ["hospital", "clinic"])
        .eq("owner_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as HospitalRow[];
    },
  });
}

export function hospitalReviewsQuery(providerId: string) {
  return queryOptions({
    queryKey: ["hospital_reviews", providerId],
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