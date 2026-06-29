import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  fuzzyScore,
  normalize,
  parseIntent,
  rankHits,
  type SearchHit,
} from "./search-engine";
import type { Database } from "@/integrations/supabase/types";

type ProviderLite = Pick<
  Database["public"]["Tables"]["providers"]["Row"],
  | "id"
  | "name"
  | "address"
  | "category"
  | "is_verified"
  | "is_premium"
  | "average_rating"
  | "latitude"
  | "longitude"
> & { cities?: { id: string; name_fr: string } | null };

const SUGGESTION_LIMIT = 24;

function providerToHit(p: ProviderLite, q: string): SearchHit {
  const cityName = p.cities?.name_fr ?? "";
  const score = Math.max(fuzzyScore(q, p.name), fuzzyScore(q, p.address ?? ""));
  return {
    id: p.id,
    kind: p.category as SearchHit["kind"],
    title: p.name,
    subtitle: [cityName, p.address].filter(Boolean).join(" • ") || undefined,
    score: Math.max(0.4, score),
    to: `/providers/${p.id}`,
    verified: !!p.is_verified,
    premium: !!p.is_premium,
    rating: p.average_rating,
    latitude: p.latitude,
    longitude: p.longitude,
  };
}

/** Lightweight unified suggestions for the global Cmd+K palette. */
export function unifiedSuggestionsQuery(rawQuery: string) {
  const q = rawQuery.trim();
  return queryOptions({
    queryKey: ["unified_suggestions", normalize(q)],
    enabled: q.length >= 2,
    staleTime: 30_000,
    queryFn: async () => {
      const intent = parseIntent(q);
      const term = q.replace(/[%_]/g, " ").trim();
      const like = `%${term}%`;

      // Providers — single-shot, optionally filtered by detected category.
      let providerQ = supabase
        .from("providers")
        .select(
          "id, name, address, category, is_verified, is_premium, average_rating, latitude, longitude, cities ( id, name_fr )",
        )
        .eq("is_active", true)
        .or(`name.ilike.${like},address.ilike.${like}`)
        .order("is_premium", { ascending: false })
        .order("is_verified", { ascending: false })
        .order("average_rating", { ascending: false })
        .limit(SUGGESTION_LIMIT);
      if (intent.category && intent.category !== "blood_request") {
        providerQ = providerQ.eq("category", intent.category);
      }

      const [providersRes, citiesRes, specialtiesRes] = await Promise.all([
        providerQ,
        supabase
          .from("cities")
          .select("id, name_fr, name_ar")
          .or(`name_fr.ilike.${like},name_ar.ilike.${like}`)
          .limit(6),
        supabase
          .from("specialties")
          .select("id, slug, name_fr")
          .or(`name_fr.ilike.${like},slug.ilike.${like}`)
          .limit(6),
      ]);

      const hits: SearchHit[] = [];
      for (const p of (providersRes.data ?? []) as ProviderLite[]) hits.push(providerToHit(p, q));
      for (const c of citiesRes.data ?? []) {
        hits.push({
          id: `city-${c.id}`,
          kind: "city",
          title: c.name_fr,
          subtitle: c.name_ar ?? "Ville du Maroc",
          score: Math.max(0.55, fuzzyScore(q, c.name_fr)),
          to: `/search?q=${encodeURIComponent(c.name_fr)}`,
        });
      }
      for (const s of specialtiesRes.data ?? []) {
        hits.push({
          id: `sp-${s.id}`,
          kind: "specialty",
          title: s.name_fr,
          subtitle: "Spécialité médicale",
          score: Math.max(0.6, fuzzyScore(q, s.name_fr)),
          to: `/doctors/specialty/${s.slug}`,
        });
      }

      return {
        intent,
        hits: rankHits(hits, { emergency: intent.emergency }).slice(0, SUGGESTION_LIMIT),
      };
    },
  });
}

/** Full result page: same shape but with a higher limit + grouping by kind. */
export function unifiedSearchQuery(rawQuery: string) {
  const q = rawQuery.trim();
  return queryOptions({
    queryKey: ["unified_search", normalize(q)],
    enabled: q.length >= 2,
    staleTime: 30_000,
    queryFn: async () => {
      const intent = parseIntent(q);
      const term = q.replace(/[%_]/g, " ").trim();
      const like = `%${term}%`;

      let providerQ = supabase
        .from("providers")
        .select(
          "id, name, address, category, is_verified, is_premium, average_rating, latitude, longitude, cities ( id, name_fr )",
        )
        .eq("is_active", true)
        .or(`name.ilike.${like},address.ilike.${like}`)
        .order("is_premium", { ascending: false })
        .order("average_rating", { ascending: false })
        .limit(120);
      if (intent.category && intent.category !== "blood_request") {
        providerQ = providerQ.eq("category", intent.category);
      }

      const [providersRes, citiesRes, specialtiesRes] = await Promise.all([
        providerQ,
        supabase
          .from("cities")
          .select("id, name_fr, name_ar")
          .or(`name_fr.ilike.${like},name_ar.ilike.${like}`)
          .limit(10),
        supabase
          .from("specialties")
          .select("id, slug, name_fr")
          .or(`name_fr.ilike.${like},slug.ilike.${like}`)
          .limit(10),
      ]);

      const providerHits = ((providersRes.data ?? []) as ProviderLite[]).map((p) => providerToHit(p, q));
      const cityHits: SearchHit[] = (citiesRes.data ?? []).map((c) => ({
        id: `city-${c.id}`,
        kind: "city",
        title: c.name_fr,
        subtitle: c.name_ar ?? "Ville du Maroc",
        score: Math.max(0.55, fuzzyScore(q, c.name_fr)),
        to: `/search?q=${encodeURIComponent(c.name_fr)}`,
      }));
      const specialtyHits: SearchHit[] = (specialtiesRes.data ?? []).map((s) => ({
        id: `sp-${s.id}`,
        kind: "specialty",
        title: s.name_fr,
        subtitle: "Spécialité médicale",
        score: Math.max(0.6, fuzzyScore(q, s.name_fr)),
        to: `/doctors/specialty/${s.slug}`,
      }));

      return {
        intent,
        providers: rankHits(providerHits, { emergency: intent.emergency }),
        cities: cityHits,
        specialties: specialtyHits,
      };
    },
  });
}