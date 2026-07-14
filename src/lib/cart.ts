import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Database } from "@/integrations/supabase/types";
import type { ProductRow } from "@/lib/pharmacy-products";

export type CartItemRow = Database["public"]["Tables"]["cart_items"]["Row"] & {
  pharmacy_products: (ProductRow & {
    providers: { id: string; name: string; slug: string | null } | null;
  }) | null;
};

async function ensureCart(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (data?.id) return data.id;
  const { data: created, error: insertError } = await supabase
    .from("carts")
    .insert({ user_id: userId })
    .select("id")
    .single();
  if (insertError) throw insertError;
  return created.id;
}

export function cartQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["cart", userId ?? "anon"],
    enabled: !!userId,
    queryFn: async () => {
      const cartId = await ensureCart(userId!);
      const { data, error } = await supabase
        .from("cart_items")
        .select("*, pharmacy_products(*, providers(id, name, slug))")
        .eq("cart_id", cartId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return { cartId, items: (data ?? []) as CartItemRow[] };
    },
    staleTime: 10_000,
  });
}

export function useCart() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const query = useQuery(cartQuery(user?.id));

  const invalidate = () => qc.invalidateQueries({ queryKey: ["cart", user?.id ?? "anon"] });

  const addItem = useMutation({
    mutationFn: async (args: { product: ProductRow; qty?: number }) => {
      if (!user) throw new Error("Connectez-vous pour ajouter au panier.");
      const cartId = await ensureCart(user.id);
      const qty = args.qty ?? 1;
      const { data: existing } = await supabase
        .from("cart_items")
        .select("id, qty")
        .eq("cart_id", cartId)
        .eq("product_id", args.product.id)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from("cart_items")
          .update({ qty: existing.qty + qty })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cart_items").insert({
          cart_id: cartId,
          product_id: args.product.id,
          qty,
          unit_price_snapshot: args.product.price_mad,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Ajouté au panier");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateQty = useMutation({
    mutationFn: async (args: { itemId: string; qty: number }) => {
      if (args.qty <= 0) {
        const { error } = await supabase.from("cart_items").delete().eq("id", args.itemId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cart_items").update({ qty: args.qty }).eq("id", args.itemId);
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("cart_items").delete().eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const clearCart = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const cartId = await ensureCart(user.id);
      await supabase.from("cart_items").delete().eq("cart_id", cartId);
    },
    onSuccess: invalidate,
  });

  const items = query.data?.items ?? [];
  const count = items.reduce((n, i) => n + i.qty, 0);
  const subtotal = items.reduce((n, i) => n + Number(i.unit_price_snapshot) * i.qty, 0);
  const requiresPrescription = items.some((i) => i.pharmacy_products?.requires_prescription);
  const pharmacyIds = Array.from(new Set(items.map((i) => i.pharmacy_products?.pharmacy_id).filter(Boolean))) as string[];

  return {
    ...query,
    items,
    count,
    subtotal,
    requiresPrescription,
    pharmacyIds,
    addItem: addItem.mutate,
    isAdding: addItem.isPending,
    updateQty: updateQty.mutate,
    removeItem: removeItem.mutate,
    clearCart: clearCart.mutateAsync,
  };
}