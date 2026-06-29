import {
  Stethoscope,
  Pill,
  Building2,
  FlaskConical,
  HeartPulse,
  Smile,
  Droplet,
  type LucideIcon,
} from "lucide-react";
import type { ProviderCategory } from "./format";

export interface CategoryMeta {
  value: ProviderCategory;
  label: string;
  pluralLabel: string;
  icon: LucideIcon;
  gradient: string;
  tint: string;
  description: string;
}

export const CATEGORIES: Record<ProviderCategory, CategoryMeta> = {
  doctor: {
    value: "doctor",
    label: "Médecin",
    pluralLabel: "Médecins",
    icon: Stethoscope,
    gradient: "from-emerald-500 to-teal-600",
    tint: "bg-emerald-500/10 text-emerald-600",
    description: "Généralistes et spécialistes vérifiés",
  },
  dentist: {
    value: "dentist",
    label: "Dentiste",
    pluralLabel: "Dentistes",
    icon: Smile,
    gradient: "from-cyan-500 to-blue-600",
    tint: "bg-cyan-500/10 text-cyan-600",
    description: "Soins et chirurgie dentaire",
  },
  pharmacy: {
    value: "pharmacy",
    label: "Pharmacie",
    pluralLabel: "Pharmacies",
    icon: Pill,
    gradient: "from-indigo-500 to-violet-600",
    tint: "bg-indigo-500/10 text-indigo-600",
    description: "Pharmacies de proximité et de garde",
  },
  hospital: {
    value: "hospital",
    label: "Hôpital",
    pluralLabel: "Hôpitaux",
    icon: Building2,
    gradient: "from-sky-500 to-blue-700",
    tint: "bg-sky-500/10 text-sky-600",
    description: "Hôpitaux publics et privés",
  },
  clinic: {
    value: "clinic",
    label: "Clinique",
    pluralLabel: "Cliniques",
    icon: HeartPulse,
    gradient: "from-fuchsia-500 to-pink-600",
    tint: "bg-fuchsia-500/10 text-fuchsia-600",
    description: "Cliniques privées et centres de soins",
  },
  laboratory: {
    value: "laboratory",
    label: "Laboratoire",
    pluralLabel: "Laboratoires",
    icon: FlaskConical,
    gradient: "from-amber-500 to-orange-600",
    tint: "bg-amber-500/10 text-amber-600",
    description: "Analyses médicales et imagerie",
  },
  blood_center: {
    value: "blood_center",
    label: "Centre de don",
    pluralLabel: "Centres de don",
    icon: Droplet,
    gradient: "from-rose-500 to-red-600",
    tint: "bg-rose-500/10 text-rose-600",
    description: "Centres de don du sang",
  },
};

export const CATEGORY_LIST = Object.values(CATEGORIES);

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export const URGENCY_META: Record<
  "low" | "normal" | "high" | "critical",
  { label: string; tint: string }
> = {
  low: { label: "Faible", tint: "bg-muted text-muted-foreground" },
  normal: { label: "Normal", tint: "bg-info/10 text-info" },
  high: { label: "Urgent", tint: "bg-warning/15 text-warning-foreground" },
  critical: { label: "Critique", tint: "bg-blood/15 text-blood" },
};