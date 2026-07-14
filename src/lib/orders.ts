import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];
export type OrderPrescriptionRow = Database["public"]["Tables"]["order_prescriptions"]["Row"];

export type OrderWithRelations = OrderRow & {
  order_items: (OrderItemRow & { pharmacy_products: { name: string; images: unknown } | null })[];
  order_prescriptions: OrderPrescriptionRow[];
  providers: { id: string; name: string; slug: string | null; phone: string | null } | null;
};

export function myOrdersQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["my_orders", userId ?? "anon"],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "*, order_items(*, pharmacy_products(name, images)), order_prescriptions(*), providers(id, name, slug, phone)",
        )
        .eq("buyer_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OrderWithRelations[];
    },
  });
}

export function pharmacyOrdersQuery(pharmacyId: string | undefined) {
  return queryOptions({
    queryKey: ["pharmacy_orders", pharmacyId ?? "none"],
    enabled: !!pharmacyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "*, order_items(*, pharmacy_products(name, images)), order_prescriptions(*), providers(id, name, slug, phone)",
        )
        .eq("pharmacy_id", pharmacyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OrderWithRelations[];
    },
  });
}

export function orderByIdQuery(id: string) {
  return queryOptions({
    queryKey: ["order_by_id", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "*, order_items(*, pharmacy_products(name, images)), order_prescriptions(*), providers(id, name, slug, phone, address)",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as OrderWithRelations | null;
    },
  });
}

export async function signPrescriptionFile(path: string): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("order-prescriptions").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}