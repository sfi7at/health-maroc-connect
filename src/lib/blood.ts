import {
  Heart,
  ShieldCheck,
  Award,
  Droplet,
  Trophy,
  Star,
  Sparkles,
  Flame,
  Crown,
  type LucideIcon,
} from "lucide-react";
import type { BloodGroup } from "./categories";

/** Who a donor can give to */
export const DONATE_TO: Record<BloodGroup, BloodGroup[]> = {
  "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
  "O+": ["O+", "A+", "B+", "AB+"],
  "A-": ["A-", "A+", "AB-", "AB+"],
  "A+": ["A+", "AB+"],
  "B-": ["B-", "B+", "AB-", "AB+"],
  "B+": ["B+", "AB+"],
  "AB-": ["AB-", "AB+"],
  "AB+": ["AB+"],
};

/** Who a recipient can receive from */
export const RECEIVE_FROM: Record<BloodGroup, BloodGroup[]> = {
  "O-": ["O-"],
  "O+": ["O-", "O+"],
  "A-": ["O-", "A-"],
  "A+": ["O-", "O+", "A-", "A+"],
  "B-": ["O-", "B-"],
  "B+": ["O-", "O+", "B-", "B+"],
  "AB-": ["O-", "A-", "B-", "AB-"],
  "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
};

export type DonorStatus = "available" | "unavailable" | "busy" | "traveling" | "inactive";

export const DONOR_STATUS_META: Record<DonorStatus, { label: string; tint: string; dot: string }> = {
  available: { label: "Disponible", tint: "bg-emerald-500/15 text-emerald-600", dot: "bg-emerald-500" },
  unavailable: { label: "Indisponible", tint: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  busy: { label: "Occupé", tint: "bg-amber-500/15 text-amber-600", dot: "bg-amber-500" },
  traveling: { label: "En voyage", tint: "bg-sky-500/15 text-sky-600", dot: "bg-sky-500" },
  inactive: { label: "Inactif", tint: "bg-zinc-500/15 text-zinc-500", dot: "bg-zinc-400" },
};

/** Eligibility: 56-day cooldown for whole blood donation */
export const DONATION_COOLDOWN_DAYS = 56;

export function canDonateAgain(lastDonationAt: string | null | undefined): boolean {
  if (!lastDonationAt) return true;
  const last = new Date(lastDonationAt).getTime();
  const ageDays = (Date.now() - last) / (1000 * 60 * 60 * 24);
  return ageDays >= DONATION_COOLDOWN_DAYS;
}

export function daysUntilEligible(lastDonationAt: string | null | undefined): number {
  if (!lastDonationAt) return 0;
  const last = new Date(lastDonationAt).getTime();
  const ageDays = (Date.now() - last) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(DONATION_COOLDOWN_DAYS - ageDays));
}

/** Haversine distance in km */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface Achievement {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  tint: string;
  unlocked: (ctx: { donations: number; verified: boolean; emergencyHelped: number }) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first",
    label: "Premier don",
    description: "Votre tout premier don de sang",
    icon: Droplet,
    tint: "from-rose-400 to-red-500",
    unlocked: (c) => c.donations >= 1,
  },
  {
    id: "verified",
    label: "Donneur vérifié",
    description: "Profil et identité vérifiés",
    icon: ShieldCheck,
    tint: "from-emerald-400 to-teal-600",
    unlocked: (c) => c.verified,
  },
  {
    id: "five",
    label: "5 dons",
    description: "Vous avez sauvé jusqu'à 15 vies",
    icon: Heart,
    tint: "from-pink-400 to-rose-600",
    unlocked: (c) => c.donations >= 5,
  },
  {
    id: "ten",
    label: "10 dons",
    description: "Donneur engagé",
    icon: Star,
    tint: "from-amber-400 to-orange-600",
    unlocked: (c) => c.donations >= 10,
  },
  {
    id: "twenty",
    label: "20 dons",
    description: "Donneur d'élite",
    icon: Sparkles,
    tint: "from-violet-400 to-fuchsia-600",
    unlocked: (c) => c.donations >= 20,
  },
  {
    id: "fifty",
    label: "50 dons",
    description: "Héros médical",
    icon: Award,
    tint: "from-indigo-400 to-blue-600",
    unlocked: (c) => c.donations >= 50,
  },
  {
    id: "hundred",
    label: "100 dons",
    description: "Légende vivante",
    icon: Crown,
    tint: "from-yellow-400 to-amber-600",
    unlocked: (c) => c.donations >= 100,
  },
  {
    id: "emergency",
    label: "Héros d'urgence",
    description: "Vous avez répondu à un appel critique",
    icon: Flame,
    tint: "from-red-500 to-rose-700",
    unlocked: (c) => c.emergencyHelped >= 1,
  },
  {
    id: "gold",
    label: "Donneur or",
    description: "Récompense annuelle d'engagement",
    icon: Trophy,
    tint: "from-amber-500 to-yellow-600",
    unlocked: (c) => c.donations >= 25,
  },
];
