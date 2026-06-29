import { queryOptions } from "@tanstack/react-query";
import {
  Activity,
  Baby,
  Bug,
  Brain,
  Dna,
  Droplet,
  FlaskConical,
  HeartPulse,
  Microscope,
  Pill,
  Ribbon,
  ShieldAlert,
  Siren,
  Stethoscope,
  TestTube,
  Thermometer,
  Truck,
  Virus,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type LabRow = Database["public"]["Tables"]["providers"]["Row"] & {
  cities?: { id: string; name_fr: string } | null;
  districts?: { id: string; name_fr: string } | null;
};

export type LabAnalysisKey =
  | "blood"
  | "urine"
  | "biochemistry"
  | "hormones"
  | "pregnancy"
  | "microbiology"
  | "virology"
  | "covid"
  | "pcr"
  | "cancer"
  | "diabetes"
  | "kidney"
  | "liver"
  | "vitamins"
  | "thyroid"
  | "genetics"
  | "immunology"
  | "toxicology"
  | "emergency";

export interface LabMeta {
  logo?: string;
  gallery?: string[];
  neighborhood?: string;
  whatsapp?: string;
  bio?: string;
  home_sampling?: boolean;
  home_pcr?: boolean;
  emergency?: boolean;
  parking?: boolean;
  accessibility?: string[]; // wheelchair, etc.
  analyses?: LabAnalysisKey[];
  faq?: { q: string; a: string }[];
}

export const LAB_ANALYSES: Array<{
  value: LabAnalysisKey;
  label: string;
  icon: LucideIcon;
  tint: string;
}> = [
  { value: "blood", label: "Analyses sanguines", icon: Droplet, tint: "bg-rose-500/10 text-rose-600" },
  { value: "urine", label: "Analyses d'urine", icon: TestTube, tint: "bg-amber-500/10 text-amber-600" },
  { value: "biochemistry", label: "Biochimie", icon: FlaskConical, tint: "bg-emerald-500/10 text-emerald-600" },
  { value: "hormones", label: "Hormones", icon: Activity, tint: "bg-violet-500/10 text-violet-600" },
  { value: "pregnancy", label: "Grossesse", icon: Baby, tint: "bg-pink-500/10 text-pink-600" },
  { value: "microbiology", label: "Microbiologie", icon: Microscope, tint: "bg-teal-500/10 text-teal-600" },
  { value: "virology", label: "Virologie", icon: Virus, tint: "bg-cyan-500/10 text-cyan-600" },
  { value: "covid", label: "Tests COVID", icon: ShieldAlert, tint: "bg-orange-500/10 text-orange-600" },
  { value: "pcr", label: "PCR", icon: Dna, tint: "bg-indigo-500/10 text-indigo-600" },
  { value: "cancer", label: "Marqueurs tumoraux", icon: Ribbon, tint: "bg-fuchsia-500/10 text-fuchsia-600" },
  { value: "diabetes", label: "Diabète", icon: Pill, tint: "bg-sky-500/10 text-sky-600" },
  { value: "kidney", label: "Fonction rénale", icon: Stethoscope, tint: "bg-blue-500/10 text-blue-600" },
  { value: "liver", label: "Fonction hépatique", icon: HeartPulse, tint: "bg-lime-500/10 text-lime-600" },
  { value: "vitamins", label: "Vitamines", icon: Thermometer, tint: "bg-yellow-500/10 text-yellow-600" },
  { value: "thyroid", label: "Thyroïde", icon: Activity, tint: "bg-purple-500/10 text-purple-600" },
  { value: "genetics", label: "Génétique", icon: Dna, tint: "bg-emerald-600/10 text-emerald-700" },
  { value: "immunology", label: "Immunologie", icon: Brain, tint: "bg-indigo-600/10 text-indigo-700" },
  { value: "toxicology", label: "Toxicologie", icon: Bug, tint: "bg-red-500/10 text-red-600" },
  { value: "emergency", label: "Tests d'urgence", icon: Siren, tint: "bg-red-600/10 text-red-700" },
];

export const LAB_ANALYSIS_META: Record<LabAnalysisKey, (typeof LAB_ANALYSES)[number]> =
  Object.fromEntries(LAB_ANALYSES.map((a) => [a.value, a])) as Record<
    LabAnalysisKey,
    (typeof LAB_ANALYSES)[number]
  >;

export const LAB_FEATURE_ICONS = { Truck, Zap };

export function readLabMeta(p: { metadata: unknown }): LabMeta {
  return (p?.metadata ?? {}) as LabMeta;
}

export interface LabFiltersValue {
  q?: string;
  cityId?: string | null;
  neighborhood?: string | null;
  minRating?: number;
  openNow?: boolean;
  homeSampling?: boolean;
  emergency?: boolean;
  covid?: boolean;
  blood?: boolean;
  urine?: boolean;
  hormones?: boolean;
  genetics?: boolean;
  verified?: boolean;
  premium?: boolean;
  analysis?: LabAnalysisKey;
  sort?: "relevance" | "rating" | "recent";
}

export function laboratoriesQuery(filters: LabFiltersValue = {}, limit = 80) {
  return queryOptions({
    queryKey: ["laboratories", filters, limit],
    queryFn: async () => {
      let q = supabase
        .from("providers")
        .select("*, cities ( id, name_fr ), districts ( id, name_fr )")
        .eq("category", "laboratory")
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
      return (data ?? []) as LabRow[];
    },
    staleTime: 30_000,
  });
}

export function labSuggestionsQuery(q: string) {
  return queryOptions({
    queryKey: ["lab_suggestions", q],
    enabled: q.trim().length > 1,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("id, name, address, cities ( name_fr )")
        .eq("category", "laboratory")
        .eq("is_active", true)
        .ilike("name", `%${q.trim()}%`)
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

export function matchesLabClientFilters(
  p: LabRow,
  filters: LabFiltersValue,
  ctx: { openNow?: boolean } = {},
): boolean {
  const meta = readLabMeta(p);
  if (filters.openNow && !ctx.openNow) return false;
  if (filters.homeSampling && !meta.home_sampling && !meta.home_pcr) return false;
  if (filters.emergency && !meta.emergency && !meta.analyses?.includes("emergency")) return false;
  if (filters.covid && !meta.analyses?.includes("covid") && !meta.analyses?.includes("pcr"))
    return false;
  if (filters.blood && !meta.analyses?.includes("blood")) return false;
  if (filters.urine && !meta.analyses?.includes("urine")) return false;
  if (filters.hormones && !meta.analyses?.includes("hormones")) return false;
  if (filters.genetics && !meta.analyses?.includes("genetics")) return false;
  if (filters.analysis && !meta.analyses?.includes(filters.analysis)) return false;
  if (filters.neighborhood) {
    const nh = filters.neighborhood.toLowerCase();
    const districtName = p.districts?.name_fr?.toLowerCase() ?? "";
    const metaNh = meta.neighborhood?.toLowerCase() ?? "";
    if (!districtName.includes(nh) && !metaNh.includes(nh)) return false;
  }
  return true;
}

export function myOwnedLaboratoriesQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["my_laboratories", userId ?? "anon"],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("*, cities ( id, name_fr )")
        .eq("category", "laboratory")
        .eq("owner_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LabRow[];
    },
  });
}

export function labReviewsQuery(providerId: string) {
  return queryOptions({
    queryKey: ["lab_reviews", providerId],
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