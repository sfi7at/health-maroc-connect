import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Medication {
  id: string;
  brand_name: string;
  dosage: string | null;
  form: string | null;
  presentation: string | null;
  dci: string | null;
  laboratory: string | null;
  therapeutic_class: string | null;
  sub_class: string | null;
  packaging: string | null;
  specification: string | null;
  schedule_table: string | null;
  shelf_life: string | null;
  public_price: number | null;
  indication: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// escape SQL wildcards used by ilike / or filters
function escapeLike(v: string) {
  return v.replace(/([\\%_,])/g, "\\$1");
}

export function medicationsQuery(params: {
  search?: string;
  therapeuticClass?: string | null;
  limit?: number;
}) {
  const { search = "", therapeuticClass = null, limit = 60 } = params;
  return queryOptions({
    queryKey: ["medications", search.trim().toLowerCase(), therapeuticClass ?? "all", limit],
    queryFn: async () => {
      let q = supabase
        .from("medications" as never)
        .select("*")
        .eq("is_active", true)
        .order("brand_name", { ascending: true })
        .limit(limit);
      if (therapeuticClass) q = q.eq("therapeutic_class", therapeuticClass);
      const s = search.trim();
      if (s.length > 1) {
        const e = escapeLike(s);
        q = q.or(`brand_name.ilike.%${e}%,dci.ilike.%${e}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Medication[];
    },
    staleTime: 30_000,
  });
}

export function medicationByIdQuery(id: string) {
  return queryOptions({
    queryKey: ["medication", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medications" as never)
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as Medication | null;
    },
  });
}

export function relatedMedicationsQuery(med: Medication | null | undefined) {
  const cls = med?.therapeutic_class ?? null;
  const sub = med?.sub_class ?? null;
  const id = med?.id ?? null;
  return queryOptions({
    queryKey: ["medications-related", id, cls, sub],
    enabled: !!med && (!!cls || !!sub),
    queryFn: async () => {
      let q = supabase
        .from("medications" as never)
        .select("*")
        .eq("is_active", true)
        .neq("id", id!)
        .limit(8);
      if (sub) q = q.eq("sub_class", sub);
      else if (cls) q = q.eq("therapeutic_class", cls);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Medication[];
    },
  });
}

export function therapeuticClassesQuery() {
  return queryOptions({
    queryKey: ["medications-therapeutic-classes"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medications" as never)
        .select("therapeutic_class")
        .eq("is_active", true)
        .not("therapeutic_class", "is", null);
      if (error) throw error;
      const rows = (data ?? []) as unknown as { therapeutic_class: string | null }[];
      const set = new Set<string>();
      for (const r of rows) if (r.therapeutic_class) set.add(r.therapeutic_class);
      return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
    },
  });
}

export function relatedArticlesForMedicationQuery(med: Medication | null | undefined) {
  const terms = [med?.therapeutic_class, med?.sub_class, med?.brand_name, med?.dci]
    .filter((v): v is string => !!v && v.length > 2);
  return queryOptions({
    queryKey: ["medication-articles", med?.id ?? "none", terms.join("|")],
    enabled: !!med && terms.length > 0,
    queryFn: async () => {
      const ors = terms
        .map((t) => {
          const e = t.replace(/([\\%_,])/g, "\\$1");
          return `title.ilike.%${e}%,excerpt.ilike.%${e}%`;
        })
        .join(",");
      const { data, error } = await supabase
        .from("articles" as never)
        .select("id, slug, title, excerpt, cover_image, published_at")
        .eq("status", "published")
        .or(ors)
        .order("published_at", { ascending: false })
        .limit(8);
      if (error) return [];
      return (data ?? []) as unknown as {
        id: string;
        slug: string;
        title: string;
        excerpt: string | null;
        cover_image: string | null;
        published_at: string | null;
      }[];
    },
  });
}

export function relatedFaqsForMedicationQuery(med: Medication | null | undefined) {
  const terms = [med?.brand_name, med?.dci, med?.therapeutic_class]
    .filter((v): v is string => !!v && v.length > 2);
  return queryOptions({
    queryKey: ["medication-faqs", med?.id ?? "none", terms.join("|")],
    enabled: !!med && terms.length > 0,
    queryFn: async () => {
      const ors = terms
        .map((t) => {
          const e = t.replace(/([\\%_,])/g, "\\$1");
          return `question.ilike.%${e}%,answer.ilike.%${e}%`;
        })
        .join(",");
      const { data, error } = await supabase
        .from("faqs" as never)
        .select("id, question, answer, category")
        .eq("is_published", true)
        .or(ors)
        .limit(6);
      if (error) return [];
      return (data ?? []) as unknown as {
        id: string;
        question: string;
        answer: string;
        category: string | null;
      }[];
    },
  });
}

export function formatMedicationTitle(m: Medication): string {
  return [m.brand_name, m.dosage, m.form, m.presentation].filter(Boolean).join(" • ");
}

export function formatPrice(price: number | null): string | null {
  if (price === null || price === undefined) return null;
  return `${price.toFixed(2).replace(/\.00$/, "")} MAD`;
}