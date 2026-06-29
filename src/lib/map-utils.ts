import type { ProviderCategory } from "./format";

export const MOROCCO_CENTER = { lat: 31.7917, lng: -7.0926 };
export const DEFAULT_MAP_CENTER = { lat: 33.5731, lng: -7.5898 }; // Casablanca

// Marker colors per category — tuned for accessibility on light + dark tiles.
export const CATEGORY_COLORS: Record<ProviderCategory | "blood_request" | "user", string> = {
  doctor: "#10b981",
  dentist: "#06b6d4",
  pharmacy: "#6366f1",
  hospital: "#0ea5e9",
  clinic: "#ec4899",
  laboratory: "#f59e0b",
  blood_center: "#ef4444",
  blood_request: "#dc2626",
  user: "#0e9f6e",
};

export const EMERGENCY_NUMBERS: Array<{
  key: string;
  label: string;
  number: string;
  color: string;
}> = [
  { key: "samu", label: "SAMU / Ambulance", number: "150", color: "bg-red-500" },
  { key: "police", label: "Police secours", number: "19", color: "bg-blue-600" },
  { key: "gendarmerie", label: "Gendarmerie royale", number: "177", color: "bg-indigo-600" },
  { key: "fire", label: "Pompiers / Protection civile", number: "15", color: "bg-orange-600" },
  { key: "poison", label: "Centre antipoison", number: "0801000180", color: "bg-emerald-600" },
  { key: "intl", label: "Numéro européen", number: "112", color: "bg-slate-600" },
];

// Working hours JSON: { mon: {open:"08:00", close:"18:00", closed?:bool}, ... }
type DayHours = { open?: string; close?: string; closed?: boolean } | null | undefined;
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export type OpenStatus = "open" | "closing_soon" | "closed" | "unknown";

export function getOpenStatus(workingHours: unknown, now = new Date()): OpenStatus {
  if (!workingHours || typeof workingHours !== "object") return "unknown";
  const hours = workingHours as Record<string, DayHours>;
  const key = DAY_KEYS[now.getDay()];
  const today = hours[key];
  if (!today || today.closed || !today.open || !today.close) return "closed";
  const [oH, oM] = today.open.split(":").map(Number);
  const [cH, cM] = today.close.split(":").map(Number);
  const cur = now.getHours() * 60 + now.getMinutes();
  const open = oH * 60 + (oM || 0);
  const close = cH * 60 + (cM || 0);
  if (cur < open || cur >= close) return "closed";
  if (close - cur <= 30) return "closing_soon";
  return "open";
}

export const OPEN_STATUS_META: Record<OpenStatus, { label: string; tint: string; dot: string }> = {
  open: { label: "Ouvert", tint: "bg-emerald-500/15 text-emerald-600", dot: "bg-emerald-500" },
  closing_soon: {
    label: "Ferme bientôt",
    tint: "bg-amber-500/15 text-amber-600",
    dot: "bg-amber-500",
  },
  closed: { label: "Fermé", tint: "bg-rose-500/15 text-rose-600", dot: "bg-rose-500" },
  unknown: { label: "Horaires —", tint: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
};

/** Build category-colored SVG marker as data URL */
export function buildMarkerSvg(color: string, glyph?: string): string {
  const inner = glyph
    ? `<text x="16" y="20" text-anchor="middle" font-family="Inter,Arial" font-size="14" font-weight="700" fill="white">${glyph}</text>`
    : `<circle cx="16" cy="16" r="5" fill="white" />`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 32 42">
    <defs><filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#000" flood-opacity="0.25"/></filter></defs>
    <path filter="url(#s)" d="M16 1c8.3 0 15 6.5 15 14.5 0 10.8-15 25.5-15 25.5S1 26.3 1 15.5C1 7.5 7.7 1 16 1z" fill="${color}" stroke="white" stroke-width="2"/>
    ${inner}
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const CATEGORY_GLYPHS: Record<ProviderCategory, string> = {
  doctor: "M",
  dentist: "D",
  pharmacy: "P",
  hospital: "H",
  clinic: "C",
  laboratory: "L",
  blood_center: "B",
};

export function buildDirectionsUrl(
  to: { lat: number; lng: number },
  from?: { lat: number; lng: number } | null,
  mode: "driving" | "walking" = "driving",
) {
  const origin = from ? `${from.lat},${from.lng}` : "";
  const travel = mode === "walking" ? "walking" : "driving";
  return `https://www.google.com/maps/dir/?api=1&destination=${to.lat},${to.lng}${
    origin ? `&origin=${origin}` : ""
  }&travelmode=${travel}`;
}

const RECENT_KEY = "hl_search_recent";
export function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}
export function pushRecentSearch(q: string) {
  if (!q.trim()) return;
  const cur = getRecentSearches().filter((x) => x.toLowerCase() !== q.toLowerCase());
  const next = [q, ...cur].slice(0, 6);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export const POPULAR_SEARCHES = [
  "Dentiste Rabat",
  "Cardiologue Casablanca",
  "Pharmacie de garde Agadir",
  "Hôpital Marrakech",
  "Laboratoire Tanger",
  "Don du sang O+",
];