import {
  Stethoscope,
  Pill,
  Building2,
  FlaskConical,
  Droplet,
  MapPin,
  Sparkles,
  Siren,
  Search as SearchIcon,
  type LucideIcon,
} from "lucide-react";
import type { ProviderCategory } from "./format";

// ---------------------------------------------------------------------------
// Multilingual synonyms (FR/AR transliterated/EN). Keys are normalized forms.
// ---------------------------------------------------------------------------

export type SearchIntent = {
  category?: ProviderCategory | "blood_request";
  specialtySlug?: string;
  specialtyLabel?: string;
  cityHint?: string;
  openNow?: boolean;
  onDuty?: boolean;
  emergency?: boolean;
  homeVisit?: boolean;
  online?: boolean;
  keywords: string[];
};

const CATEGORY_SYNONYMS: Array<{ cat: ProviderCategory | "blood_request"; words: string[] }> = [
  { cat: "doctor", words: ["docteur", "doctor", "médecin", "medecin", "tabib", "طبيب", "praticien"] },
  { cat: "dentist", words: ["dentiste", "dentist", "dent", "أسنان", "snan"] },
  { cat: "pharmacy", words: ["pharmacie", "pharmacy", "pharma", "صيدلية", "saydaliya"] },
  { cat: "hospital", words: ["hopital", "hôpital", "hospital", "mostachfa", "مستشفى", "chu"] },
  { cat: "clinic", words: ["clinique", "clinic", "عيادة"] },
  { cat: "laboratory", words: ["laboratoire", "lab", "laboratory", "analyse", "analyses", "biologie", "tahlil", "تحليل"] },
  { cat: "blood_center", words: ["centre de sang", "don du sang", "don de sang", "blood", "transfusion", "dam", "دم"] },
  { cat: "blood_request", words: ["urgence sang", "besoin de sang", "donneur"] },
];

// Common French / EN / AR-transliterated specialty hints → matching slugs (best-effort).
const SPECIALTY_HINTS: Array<{ words: string[]; slug: string; label: string }> = [
  { words: ["cardio", "cardiologue", "cardiology", "cœur", "coeur", "قلب"], slug: "cardiologie", label: "Cardiologie" },
  { words: ["dermato", "dermatologue", "peau", "جلد"], slug: "dermatologie", label: "Dermatologie" },
  { words: ["pediatre", "pédiatre", "pediatrician", "enfant", "أطفال", "atfal"], slug: "pediatrie", label: "Pédiatrie" },
  { words: ["gyneco", "gynécologue", "gynecologue", "femme"], slug: "gynecologie", label: "Gynécologie" },
  { words: ["ophtalmo", "ophtalmologue", "yeux", "vue", "عين"], slug: "ophtalmologie", label: "Ophtalmologie" },
  { words: ["ortho", "orthopédiste", "orthopediste", "os"], slug: "orthopedie", label: "Orthopédie" },
  { words: ["neuro", "neurologue", "cerveau"], slug: "neurologie", label: "Neurologie" },
  { words: ["psy", "psychiatre", "psychologue"], slug: "psychiatrie", label: "Psychiatrie" },
  { words: ["orl", "ent", "oreille", "gorge"], slug: "orl", label: "ORL" },
  { words: ["gastro", "gastroenterologue", "estomac"], slug: "gastro-enterologie", label: "Gastro-entérologie" },
  { words: ["uro", "urologue"], slug: "urologie", label: "Urologie" },
  { words: ["diabeto", "endocrino", "diabete", "diabète"], slug: "endocrinologie", label: "Endocrinologie" },
  { words: ["radio", "radiologue", "imagerie"], slug: "radiologie", label: "Radiologie" },
  { words: ["generaliste", "généraliste", "medecine generale"], slug: "medecine-generale", label: "Médecine générale" },
];

const EMERGENCY_WORDS = [
  "urgence", "urgences", "urgent", "emergency", "accident", "sang",
  "infarctus", "heart attack", "crise cardiaque", "avc", "stroke", "hémorragie",
  "hemorragie", "saignement", "convulsion", "intoxication", "overdose",
  "enfant urgence", "child emergency", "طوارئ", "tawari2",
];

const OPEN_WORDS = ["ouvert", "open now", "ouvert maintenant", "garde", "de garde", "24h", "nuit"];
const ON_DUTY_WORDS = ["garde", "de garde", "pharmacie garde", "duty"];
const HOME_WORDS = ["domicile", "home visit", "à domicile", "visite a domicile"];
const ONLINE_WORDS = ["teleconsultation", "téléconsultation", "online", "visio", "en ligne"];

// Major Moroccan cities — quick city hint extraction.
export const MOROCCAN_CITIES = [
  "Casablanca", "Rabat", "Marrakech", "Fès", "Fes", "Tanger", "Agadir", "Meknès", "Meknes",
  "Oujda", "Kénitra", "Kenitra", "Tétouan", "Tetouan", "Salé", "Sale", "Mohammedia",
  "Nador", "El Jadida", "Béni Mellal", "Beni Mellal", "Taza", "Settat", "Berkane",
  "Khouribga", "Errachidia", "Ouarzazate", "Essaouira", "Laâyoune", "Laayoune", "Dakhla",
  "Safi", "Khémisset", "Khemisset", "Larache", "Ifrane", "Chefchaouen", "Taroudant",
];

export const CATEGORY_META: Record<
  ProviderCategory | "blood_request" | "city" | "specialty",
  { label: string; icon: LucideIcon; color: string; to: string }
> = {
  doctor: { label: "Médecin", icon: Stethoscope, color: "text-emerald-600", to: "/doctors" },
  dentist: { label: "Dentiste", icon: Stethoscope, color: "text-cyan-600", to: "/doctors" },
  pharmacy: { label: "Pharmacie", icon: Pill, color: "text-indigo-600", to: "/pharmacies" },
  hospital: { label: "Hôpital", icon: Building2, color: "text-sky-600", to: "/hospitals" },
  clinic: { label: "Clinique", icon: Building2, color: "text-pink-600", to: "/hospitals" },
  laboratory: { label: "Laboratoire", icon: FlaskConical, color: "text-amber-600", to: "/laboratories" },
  blood_center: { label: "Don du sang", icon: Droplet, color: "text-red-600", to: "/blood/centers" },
  blood_request: { label: "Demande de sang", icon: Droplet, color: "text-red-700", to: "/blood" },
  city: { label: "Ville", icon: MapPin, color: "text-slate-600", to: "/search" },
  specialty: { label: "Spécialité", icon: Sparkles, color: "text-violet-600", to: "/doctors/specialties" },
};

// ---------------------------------------------------------------------------
// Normalization + fuzzy scoring (lightweight: no extra dependencies).
// ---------------------------------------------------------------------------

export function normalize(text: string): string {
  return (text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0600-\u06ff\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length, n = b.length;
  const prev = new Array(n + 1);
  const curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

/** Token-aware fuzzy score (0..1) — favors prefix and substring matches. */
export function fuzzyScore(query: string, target: string): number {
  const q = normalize(query);
  const t = normalize(target);
  if (!q || !t) return 0;
  if (t === q) return 1;
  if (t.startsWith(q)) return 0.95;
  if (t.includes(q)) return 0.8;
  const qTokens = q.split(" ").filter(Boolean);
  const tTokens = t.split(" ").filter(Boolean);
  let hit = 0;
  for (const qt of qTokens) {
    let best = 0;
    for (const tt of tTokens) {
      if (tt.includes(qt)) { best = Math.max(best, 0.7); continue; }
      const dist = levenshtein(qt, tt);
      const maxLen = Math.max(qt.length, tt.length);
      const sim = 1 - dist / Math.max(1, maxLen);
      if (sim > best && sim >= 0.7) best = sim * 0.6;
    }
    hit += best;
  }
  return Math.min(0.78, hit / qTokens.length);
}

// ---------------------------------------------------------------------------
// Intent extraction
// ---------------------------------------------------------------------------

export function parseIntent(rawQuery: string): SearchIntent {
  const q = normalize(rawQuery);
  const intent: SearchIntent = { keywords: [] };
  if (!q) return intent;

  for (const { cat, words } of CATEGORY_SYNONYMS) {
    if (words.some((w) => q.includes(normalize(w)))) { intent.category = cat; break; }
  }
  for (const sp of SPECIALTY_HINTS) {
    if (sp.words.some((w) => q.includes(normalize(w)))) {
      intent.specialtySlug = sp.slug;
      intent.specialtyLabel = sp.label;
      if (!intent.category) intent.category = "doctor";
      break;
    }
  }
  for (const city of MOROCCAN_CITIES) {
    if (q.includes(normalize(city))) { intent.cityHint = city; break; }
  }
  if (OPEN_WORDS.some((w) => q.includes(normalize(w)))) intent.openNow = true;
  if (ON_DUTY_WORDS.some((w) => q.includes(normalize(w)))) intent.onDuty = true;
  if (HOME_WORDS.some((w) => q.includes(normalize(w)))) intent.homeVisit = true;
  if (ONLINE_WORDS.some((w) => q.includes(normalize(w)))) intent.online = true;
  if (EMERGENCY_WORDS.some((w) => q.includes(normalize(w)))) intent.emergency = true;

  intent.keywords = q.split(" ").filter((w) => w.length > 1);
  return intent;
}

export function isEmergencyQuery(rawQuery: string): boolean {
  const q = normalize(rawQuery);
  return EMERGENCY_WORDS.some((w) => q.includes(normalize(w)));
}

// ---------------------------------------------------------------------------
// Unified suggestion shape used by the global palette + results page.
// ---------------------------------------------------------------------------

export type SearchHit = {
  id: string;
  kind: ProviderCategory | "blood_request" | "city" | "specialty" | "shortcut";
  title: string;
  subtitle?: string;
  score: number;
  to: string;
  verified?: boolean;
  premium?: boolean;
  rating?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  icon?: LucideIcon;
};

// ---------------------------------------------------------------------------
// Popular searches (Morocco) + emergency shortcuts surfaced in palette.
// ---------------------------------------------------------------------------

export const POPULAR_SEARCHES: Array<{ label: string; query: string; icon: LucideIcon }> = [
  { label: "Pharmacies de garde", query: "pharmacie de garde", icon: Pill },
  { label: "Dermatologue Casablanca", query: "dermatologue casablanca", icon: Stethoscope },
  { label: "Urgences Rabat", query: "urgence rabat", icon: Siren },
  { label: "Analyses laboratoire", query: "analyse laboratoire", icon: FlaskConical },
  { label: "Don de sang", query: "don de sang", icon: Droplet },
  { label: "Pédiatre Marrakech", query: "pediatre marrakech", icon: Stethoscope },
];

export const EMERGENCY_SHORTCUTS: SearchHit[] = [
  {
    id: "shortcut-emergency",
    kind: "shortcut",
    title: "Urgences hôpitaux à proximité",
    subtitle: "Voir les services d'urgence ouverts",
    score: 1.1,
    to: "/hospitals/emergency",
    icon: Siren,
  },
  {
    id: "shortcut-blood",
    kind: "shortcut",
    title: "Lancer une demande de sang",
    subtitle: "Alerter les donneurs compatibles",
    score: 1.05,
    to: "/blood/request",
    icon: Droplet,
  },
  {
    id: "shortcut-on-duty",
    kind: "shortcut",
    title: "Pharmacies de garde aujourd'hui",
    subtitle: "Liste mise à jour quotidiennement",
    score: 1,
    to: "/pharmacies/on-duty",
    icon: Pill,
  },
];

export const DEFAULT_SHORTCUTS: SearchHit[] = [
  { id: "s-doctors", kind: "shortcut", title: "Tous les médecins", score: 0.5, to: "/doctors", icon: Stethoscope },
  { id: "s-pharmacies", kind: "shortcut", title: "Toutes les pharmacies", score: 0.5, to: "/pharmacies", icon: Pill },
  { id: "s-hospitals", kind: "shortcut", title: "Tous les hôpitaux", score: 0.5, to: "/hospitals", icon: Building2 },
  { id: "s-labs", kind: "shortcut", title: "Tous les laboratoires", score: 0.5, to: "/laboratories", icon: FlaskConical },
  { id: "s-map", kind: "shortcut", title: "Carte santé du Maroc", score: 0.5, to: "/map", icon: MapPin },
  { id: "s-ai", kind: "shortcut", title: "Assistant IA santé", score: 0.5, to: "/ai-assistant", icon: SearchIcon },
];

// ---------------------------------------------------------------------------
// Result ranking — distance > emergency > verified > rating > relevance.
// ---------------------------------------------------------------------------

export function rankHits(
  hits: SearchHit[],
  opts: { distanceKm?: (h: SearchHit) => number | null; emergency?: boolean } = {},
): SearchHit[] {
  return [...hits].sort((a, b) => {
    if (opts.emergency) {
      const aE = a.kind === "hospital" || a.kind === "clinic" || a.kind === "shortcut" ? 1 : 0;
      const bE = b.kind === "hospital" || b.kind === "clinic" || b.kind === "shortcut" ? 1 : 0;
      if (aE !== bE) return bE - aE;
    }
    const aDist = opts.distanceKm?.(a) ?? null;
    const bDist = opts.distanceKm?.(b) ?? null;
    if (aDist != null && bDist != null && Math.abs(aDist - bDist) > 0.2) return aDist - bDist;
    if ((b.verified ? 1 : 0) !== (a.verified ? 1 : 0)) return (b.verified ? 1 : 0) - (a.verified ? 1 : 0);
    if ((b.premium ? 1 : 0) !== (a.premium ? 1 : 0)) return (b.premium ? 1 : 0) - (a.premium ? 1 : 0);
    if ((b.rating ?? 0) !== (a.rating ?? 0)) return (b.rating ?? 0) - (a.rating ?? 0);
    return b.score - a.score;
  });
}

export function categoryMeta(kind: SearchHit["kind"]) {
  if (kind === "shortcut") return { label: "Raccourci", icon: SearchIcon, color: "text-primary", to: "/search" };
  return CATEGORY_META[kind];
}