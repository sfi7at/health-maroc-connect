import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ProductRow = Database["public"]["Tables"]["pharmacy_products"]["Row"];
export type ProductInsert = Database["public"]["Tables"]["pharmacy_products"]["Insert"];
export type ProductUpdate = Database["public"]["Tables"]["pharmacy_products"]["Update"];
export type ProductCategoryRow = Database["public"]["Tables"]["product_categories"]["Row"];

export type ProductWithPharmacy = ProductRow & {
  providers?: { id: string; name: string; slug: string | null; city_id: string | null; average_rating: number | null } | null;
  product_categories?: { id: string; slug: string; name_fr: string } | null;
};

export function productCategoriesQuery() {
  return queryOptions({
    queryKey: ["product_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as ProductCategoryRow[];
    },
    staleTime: 5 * 60_000,
  });
}

export function pharmacyOwnedProductsQuery(pharmacyId: string | undefined) {
  return queryOptions({
    queryKey: ["pharmacy_owned_products", pharmacyId ?? "none"],
    enabled: !!pharmacyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pharmacy_products")
        .select("*, product_categories(id, slug, name_fr)")
        .eq("pharmacy_id", pharmacyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProductWithPharmacy[];
    },
  });
}

export interface ProductBrowseFilters {
  q?: string;
  categorySlug?: string;
  requiresPrescription?: boolean | null;
  featured?: boolean;
  pharmacyId?: string;
  sort?: "recent" | "price_asc" | "price_desc" | "rating";
}

export function browseProductsQuery(filters: ProductBrowseFilters = {}, limit = 60) {
  return queryOptions({
    queryKey: ["browse_products", filters, limit],
    queryFn: async () => {
      let q = supabase
        .from("pharmacy_products")
        .select("*, providers(id, name, slug, city_id, average_rating), product_categories(id, slug, name_fr)")
        .eq("is_active", true)
        .limit(limit);
      if (filters.pharmacyId) q = q.eq("pharmacy_id", filters.pharmacyId);
      if (filters.featured) q = q.eq("is_featured", true);
      if (filters.requiresPrescription != null) q = q.eq("requires_prescription", filters.requiresPrescription);
      if (filters.q && filters.q.trim().length > 1) {
        q = q.ilike("name", `%${filters.q.trim()}%`);
      }
      if (filters.categorySlug) {
        const { data: cat } = await supabase
          .from("product_categories")
          .select("id")
          .eq("slug", filters.categorySlug)
          .maybeSingle();
        if (cat?.id) q = q.eq("category_id", cat.id);
      }
      switch (filters.sort ?? "recent") {
        case "price_asc":
          q = q.order("price_mad", { ascending: true });
          break;
        case "price_desc":
          q = q.order("price_mad", { ascending: false });
          break;
        case "rating":
          q = q.order("avg_rating", { ascending: false });
          break;
        default:
          q = q.order("is_featured", { ascending: false }).order("created_at", { ascending: false });
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ProductWithPharmacy[];
    },
    staleTime: 30_000,
  });
}

export function productByIdQuery(id: string) {
  return queryOptions({
    queryKey: ["product_by_id", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pharmacy_products")
        .select("*, providers(id, name, slug, city_id, address, phone, working_hours, is_verified, average_rating), product_categories(id, slug, name_fr)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as ProductWithPharmacy | null;
    },
  });
}

export function formatMad(n: number | string | null | undefined) {
  if (n == null || n === "") return "—";
  const num = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(num)) return "—";
  return `${num.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`;
}

export async function signProductImage(path: string): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const { data } = await supabase.storage.from("pharmacy-products").createSignedUrl(path, 60 * 60 * 24 * 7);
  return data?.signedUrl ?? null;
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending_prescription: "En attente d'ordonnance",
  pending_review: "En attente de validation",
  approved: "Approuvée",
  rejected: "Refusée",
  preparing: "En préparation",
  ready_for_pickup: "Prête à retirer",
  out_for_delivery: "En livraison",
  delivered: "Livrée",
  cancelled: "Annulée",
};

export const ORDER_STATUS_TINT: Record<string, string> = {
  pending_prescription: "bg-amber-500/15 text-amber-700",
  pending_review: "bg-sky-500/15 text-sky-700",
  approved: "bg-emerald-500/15 text-emerald-700",
  rejected: "bg-rose-500/15 text-rose-700",
  preparing: "bg-indigo-500/15 text-indigo-700",
  ready_for_pickup: "bg-teal-500/15 text-teal-700",
  out_for_delivery: "bg-blue-500/15 text-blue-700",
  delivered: "bg-emerald-600/20 text-emerald-800",
  cancelled: "bg-muted text-muted-foreground",
};