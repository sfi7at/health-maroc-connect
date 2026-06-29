import Papa from "papaparse";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

// ---------------------------------------------------------------------------
// Dataset registry — declares every importable dataset and its target schema.
// ---------------------------------------------------------------------------

export type DatasetKey =
  | "doctors"
  | "clinics"
  | "hospitals"
  | "pharmacies"
  | "pharmacies_on_duty"
  | "laboratories"
  | "blood_centers"
  | "blood_campaigns"
  | "articles"
  | "cities"
  | "insurance_companies"
  | "specialties";

export interface FieldSpec {
  key: string;
  label: string;
  required?: boolean;
  type?: "string" | "number" | "boolean" | "email" | "phone" | "url" | "uuid";
  aliases?: string[]; // header name aliases for auto-mapping
  description?: string;
}

export interface DatasetSpec {
  key: DatasetKey;
  label: string;
  description: string;
  target_table: string;
  category?: string; // for `providers` polymorphic table
  fields: FieldSpec[];
  duplicateKeys: string[]; // columns considered for duplicate detection
}

const baseProviderFields: FieldSpec[] = [
  { key: "name", label: "Nom", required: true, aliases: ["raison sociale", "denomination"] },
  { key: "phone", label: "Téléphone", type: "phone", aliases: ["tel", "telephone", "gsm", "mobile"] },
  { key: "email", label: "Email", type: "email" },
  { key: "address", label: "Adresse", aliases: ["adresse", "rue"] },
  { key: "city", label: "Ville", aliases: ["ville", "city_name"] },
  { key: "latitude", label: "Latitude", type: "number", aliases: ["lat"] },
  { key: "longitude", label: "Longitude", type: "number", aliases: ["lng", "lon", "long"] },
  { key: "website", label: "Site web", type: "url" },
  { key: "description", label: "Description" },
  { key: "license_number", label: "N° licence professionnelle", aliases: ["inpe", "rpps", "license"] },
  { key: "registration_number", label: "Registre de commerce", aliases: ["rc", "ice"] },
];

export const DATASETS: Record<DatasetKey, DatasetSpec> = {
  doctors: {
    key: "doctors",
    label: "Médecins",
    description: "Médecins généralistes et spécialistes (table providers).",
    target_table: "providers",
    category: "doctor",
    fields: [
      ...baseProviderFields,
      { key: "specialty", label: "Spécialité (slug)", aliases: ["specialite", "specialty_slug"] },
    ],
    duplicateKeys: ["phone", "email", "license_number"],
  },
  clinics: {
    key: "clinics",
    label: "Cliniques",
    description: "Cliniques privées (table providers).",
    target_table: "providers",
    category: "clinic",
    fields: baseProviderFields,
    duplicateKeys: ["phone", "email", "registration_number"],
  },
  hospitals: {
    key: "hospitals",
    label: "Hôpitaux",
    description: "Hôpitaux publics et privés (table providers).",
    target_table: "providers",
    category: "hospital",
    fields: baseProviderFields,
    duplicateKeys: ["phone", "email", "name"],
  },
  pharmacies: {
    key: "pharmacies",
    label: "Pharmacies",
    description: "Officines pharmaceutiques (table providers).",
    target_table: "providers",
    category: "pharmacy",
    fields: baseProviderFields,
    duplicateKeys: ["phone", "email", "license_number"],
  },
  pharmacies_on_duty: {
    key: "pharmacies_on_duty",
    label: "Pharmacies de garde",
    description: "Planning de garde des pharmacies (table pharmacies_on_duty).",
    target_table: "pharmacies_on_duty",
    fields: [
      { key: "pharmacy_name", label: "Nom pharmacie", required: true },
      { key: "city", label: "Ville", required: true },
      { key: "phone", label: "Téléphone", type: "phone" },
      { key: "address", label: "Adresse" },
      { key: "start_date", label: "Date début", required: true, aliases: ["debut", "from"] },
      { key: "end_date", label: "Date fin", required: true, aliases: ["fin", "to"] },
    ],
    duplicateKeys: ["pharmacy_name", "start_date"],
  },
  laboratories: {
    key: "laboratories",
    label: "Laboratoires",
    description: "Laboratoires d'analyses médicales (table providers).",
    target_table: "providers",
    category: "laboratory",
    fields: baseProviderFields,
    duplicateKeys: ["phone", "email", "registration_number"],
  },
  blood_centers: {
    key: "blood_centers",
    label: "Centres de don",
    description: "Centres régionaux de transfusion sanguine.",
    target_table: "providers",
    category: "blood_center",
    fields: baseProviderFields,
    duplicateKeys: ["phone", "name", "city"],
  },
  blood_campaigns: {
    key: "blood_campaigns",
    label: "Campagnes de don",
    description: "Campagnes de don du sang.",
    target_table: "blood_campaigns",
    fields: [
      { key: "title", label: "Titre", required: true },
      { key: "description", label: "Description" },
      { key: "city", label: "Ville" },
      { key: "starts_at", label: "Début", required: true },
      { key: "ends_at", label: "Fin", required: true },
      { key: "location", label: "Lieu" },
    ],
    duplicateKeys: ["title", "starts_at"],
  },
  articles: {
    key: "articles",
    label: "Articles santé",
    description: "Articles éditoriaux.",
    target_table: "articles",
    fields: [
      { key: "title", label: "Titre", required: true },
      { key: "slug", label: "Slug" },
      { key: "excerpt", label: "Extrait" },
      { key: "content", label: "Contenu" },
      { key: "category", label: "Catégorie" },
    ],
    duplicateKeys: ["slug", "title"],
  },
  cities: {
    key: "cities",
    label: "Villes",
    description: "Villes marocaines.",
    target_table: "cities",
    fields: [
      { key: "name_fr", label: "Nom (FR)", required: true },
      { key: "name_ar", label: "Nom (AR)" },
      { key: "province", label: "Province" },
      { key: "latitude", label: "Latitude", type: "number" },
      { key: "longitude", label: "Longitude", type: "number" },
    ],
    duplicateKeys: ["name_fr"],
  },
  insurance_companies: {
    key: "insurance_companies",
    label: "Assurances",
    description: "Compagnies d'assurance.",
    target_table: "insurance_companies",
    fields: [
      { key: "name_fr", label: "Nom (FR)", required: true },
      { key: "slug", label: "Slug", required: true },
      { key: "short_code", label: "Code" },
    ],
    duplicateKeys: ["slug"],
  },
  specialties: {
    key: "specialties",
    label: "Spécialités médicales",
    description: "Catalogue de spécialités.",
    target_table: "specialties",
    fields: [
      { key: "name_fr", label: "Nom (FR)", required: true },
      { key: "name_ar", label: "Nom (AR)" },
      { key: "slug", label: "Slug", required: true },
    ],
    duplicateKeys: ["slug"],
  },
};

export const DATASET_LIST = Object.values(DATASETS);

// ---------------------------------------------------------------------------
// File parsing — CSV / Excel / JSON
// ---------------------------------------------------------------------------

export interface ParsedFile {
  headers: string[];
  rows: Record<string, unknown>[];
  format: "csv" | "xlsx" | "json";
}

export async function parseImportFile(file: File): Promise<ParsedFile> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "json") {
    const text = await file.text();
    const data = JSON.parse(text);
    const rows = Array.isArray(data) ? data : data.rows ?? data.data ?? [];
    const headers = rows.length ? Object.keys(rows[0]) : [];
    return { headers, rows, format: "json" };
  }
  if (ext === "xlsx" || ext === "xls") {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
    const headers = rows.length ? Object.keys(rows[0]) : [];
    return { headers, rows, format: "xlsx" };
  }
  // default to CSV
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const headers = res.meta.fields ?? [];
        resolve({ headers, rows: res.data, format: "csv" });
      },
      error: reject,
    });
  });
}

// ---------------------------------------------------------------------------
// Auto-mapping: header → field key based on aliases.
// ---------------------------------------------------------------------------

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

export function autoMap(headers: string[], spec: DatasetSpec): Record<string, string> {
  const map: Record<string, string> = {};
  for (const f of spec.fields) {
    const candidates = [f.key, f.label, ...(f.aliases ?? [])].map(norm);
    const match = headers.find((h) => candidates.includes(norm(h)));
    if (match) map[match] = f.key;
  }
  return map;
}

// ---------------------------------------------------------------------------
// Row validation
// ---------------------------------------------------------------------------

export interface RowError {
  row: number;
  field?: string;
  severity: "error" | "warning";
  message: string;
}

const phoneRe = /^\+?[\d\s().-]{7,20}$/;
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const urlRe = /^https?:\/\/.+/i;

export function validateRow(
  row: Record<string, unknown>,
  idx: number,
  spec: DatasetSpec,
): RowError[] {
  const errors: RowError[] = [];
  for (const f of spec.fields) {
    const v = row[f.key];
    const empty = v === null || v === undefined || v === "";
    if (f.required && empty) {
      errors.push({ row: idx, field: f.key, severity: "error", message: `Champ requis manquant: ${f.label}` });
      continue;
    }
    if (empty) continue;
    const s = String(v);
    if (f.type === "email" && !emailRe.test(s)) errors.push({ row: idx, field: f.key, severity: "error", message: `Email invalide` });
    if (f.type === "phone" && !phoneRe.test(s)) errors.push({ row: idx, field: f.key, severity: "warning", message: `Téléphone suspect` });
    if (f.type === "url" && !urlRe.test(s)) errors.push({ row: idx, field: f.key, severity: "warning", message: `URL invalide` });
    if (f.type === "number" && isNaN(Number(s))) errors.push({ row: idx, field: f.key, severity: "error", message: `Nombre invalide` });
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Duplicate detection within the batch + against DB.
// ---------------------------------------------------------------------------

export function findInBatchDuplicates(rows: Record<string, unknown>[], keys: string[]): Set<number> {
  const seen = new Map<string, number>();
  const dup = new Set<number>();
  rows.forEach((r, i) => {
    const sig = keys.map((k) => String(r[k] ?? "").toLowerCase().trim()).filter(Boolean).join("|");
    if (!sig) return;
    if (seen.has(sig)) dup.add(i);
    else seen.set(sig, i);
  });
  return dup;
}

// ---------------------------------------------------------------------------
// Quality score (0-100) based on completeness + verification signals.
// ---------------------------------------------------------------------------

export function computeQualityScore(row: Record<string, unknown>): { score: number; signals: Record<string, boolean> } {
  const signals = {
    has_phone: !!row.phone,
    has_email: !!row.email,
    has_address: !!row.address,
    has_gps: !!(row.latitude && row.longitude),
    has_website: !!row.website,
    has_license: !!row.license_number,
    has_description: !!row.description,
    has_city: !!row.city || !!row.city_id,
  };
  const total = Object.keys(signals).length;
  const ok = Object.values(signals).filter(Boolean).length;
  return { score: Math.round((ok / total) * 100), signals };
}

// ---------------------------------------------------------------------------
// City resolver — map free-text city to existing city_id.
// ---------------------------------------------------------------------------

let cityCache: { id: string; name: string }[] | null = null;
async function loadCities() {
  if (cityCache) return cityCache;
  const { data } = await supabase.from("cities").select("id, name_fr, name_ar");
  cityCache = (data ?? []).flatMap((c) => [
    { id: c.id, name: norm(c.name_fr ?? "") },
    ...(c.name_ar ? [{ id: c.id, name: norm(c.name_ar) }] : []),
  ]);
  return cityCache;
}

export async function resolveCity(name?: string | null): Promise<string | null> {
  if (!name) return null;
  const idx = await loadCities();
  const target = norm(String(name));
  const exact = idx.find((c) => c.name === target);
  if (exact) return exact.id;
  const partial = idx.find((c) => c.name.includes(target) || target.includes(c.name));
  return partial?.id ?? null;
}

// ---------------------------------------------------------------------------
// Row transformer: from mapped CSV row → DB insert payload.
// ---------------------------------------------------------------------------

export function applyMapping(row: Record<string, unknown>, mapping: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [src, target] of Object.entries(mapping)) {
    if (!target) continue;
    out[target] = row[src];
  }
  return out;
}

export async function buildInsertPayload(row: Record<string, unknown>, spec: DatasetSpec): Promise<Record<string, unknown>> {
  const payload: Record<string, unknown> = { ...row };
  if (spec.target_table === "providers") {
    payload.category = spec.category;
    if (row.city) payload.city_id = await resolveCity(String(row.city));
    delete payload.city;
    delete payload.specialty;
  }
  // strip empty keys
  for (const k of Object.keys(payload)) {
    if (payload[k] === "" || payload[k] === undefined) delete payload[k];
  }
  return payload;
}

// ---------------------------------------------------------------------------
// Run import — chunked inserts with per-row error capture.
// ---------------------------------------------------------------------------

export interface ImportResult {
  inserted: number;
  updated: number;
  rejected: number;
  duplicates: number;
  duration_ms: number;
  errors: { row: number; message: string }[];
}

export async function runImport(
  jobId: string,
  rows: Record<string, unknown>[],
  mapping: Record<string, string>,
  spec: DatasetSpec,
): Promise<ImportResult> {
  const t0 = performance.now();
  const result: ImportResult = { inserted: 0, updated: 0, rejected: 0, duplicates: 0, duration_ms: 0, errors: [] };

  const mapped = rows.map((r) => applyMapping(r, mapping));
  const dupInBatch = findInBatchDuplicates(mapped, spec.duplicateKeys);
  result.duplicates = dupInBatch.size;

  const errorBuffer: { job_id: string; row_number: number; severity: string; field?: string; message: string; payload?: unknown }[] = [];

  for (let i = 0; i < mapped.length; i++) {
    if (dupInBatch.has(i)) {
      errorBuffer.push({ job_id: jobId, row_number: i + 1, severity: "warning", message: "Doublon dans le fichier (ignoré)" });
      continue;
    }
    const validation = validateRow(mapped[i], i + 1, spec);
    const blocking = validation.filter((e) => e.severity === "error");
    if (blocking.length) {
      result.rejected++;
      blocking.forEach((e) => errorBuffer.push({ job_id: jobId, row_number: e.row, severity: e.severity, field: e.field, message: e.message }));
      continue;
    }
    try {
      const payload = await buildInsertPayload(mapped[i], spec);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from(spec.target_table).insert(payload);
      if (error) {
        result.rejected++;
        errorBuffer.push({ job_id: jobId, row_number: i + 1, severity: "error", message: error.message, payload });
      } else {
        result.inserted++;
      }
    } catch (e) {
      result.rejected++;
      errorBuffer.push({ job_id: jobId, row_number: i + 1, severity: "error", message: (e as Error).message });
    }
  }

  // best-effort: persist error log in chunks of 500
  for (let i = 0; i < errorBuffer.length; i += 500) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("import_errors").insert(errorBuffer.slice(i, i + 500));
  }

  result.duration_ms = Math.round(performance.now() - t0);
  return result;
}

// ---------------------------------------------------------------------------
// CSV export helper
// ---------------------------------------------------------------------------

export function exportRowsToCsv(filename: string, rows: Record<string, unknown>[]) {
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}