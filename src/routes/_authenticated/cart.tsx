import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  Upload,
  Loader2,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/lib/cart";
import { supabase } from "@/integrations/supabase/client";
import { formatMad } from "@/lib/pharmacy-products";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/cart")({
  head: () =>
    buildHead({
      title: "Panier — Vytalma",
      description: "Finalisez votre commande auprès de nos pharmacies partenaires.",
      path: "/cart",
    }),
  component: CartPage,
});

function CartPage() {
  const { user } = useAuth();
  const { items, subtotal, count, requiresPrescription, pharmacyIds, updateQty, removeItem, clearCart, isLoading } =
    useCart();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">("pickup");
  const [notes, setNotes] = useState("");
  const [rxFiles, setRxFiles] = useState<File[]>([]);

  const multiplePharmacies = pharmacyIds.length > 1;

  const checkout = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Connectez-vous d'abord.");
      if (!phone.trim()) throw new Error("Numéro de téléphone requis.");
      if (fulfillment === "delivery" && !address.trim()) throw new Error("Adresse de livraison requise.");
      if (multiplePharmacies) throw new Error("Passez commande auprès d'une seule pharmacie à la fois.");
      if (pharmacyIds.length === 0) throw new Error("Panier vide.");
      if (requiresPrescription && rxFiles.length === 0) {
        throw new Error("Veuillez téléverser au moins une ordonnance.");
      }

      const pharmacyId = pharmacyIds[0];
      const initialStatus = requiresPrescription ? "pending_review" : "approved";

      const { data: order, error: oErr } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          pharmacy_id: pharmacyId,
          status: initialStatus,
          fulfillment,
          subtotal,
          total: subtotal,
          contact_phone: phone.trim(),
          delivery_address: fulfillment === "delivery" ? address.trim() : null,
          notes: notes.trim() || null,
          requires_prescription: requiresPrescription,
        })
        .select("id, order_number")
        .single();
      if (oErr) throw oErr;

      const itemsPayload = items.map((i) => ({
        order_id: order.id,
        product_id: i.product_id,
        name_snapshot: i.pharmacy_products?.name ?? "Produit",
        image_snapshot:
          (Array.isArray(i.pharmacy_products?.images) && (i.pharmacy_products!.images as string[])[0]) || null,
        unit_price: i.unit_price_snapshot,
        qty: i.qty,
        requires_prescription: !!i.pharmacy_products?.requires_prescription,
      }));
      const { error: iErr } = await supabase.from("order_items").insert(itemsPayload);
      if (iErr) throw iErr;

      if (requiresPrescription && rxFiles.length) {
        for (const file of rxFiles) {
          const path = `${order.id}/${Date.now()}-${crypto.randomUUID()}-${file.name}`;
          const { error: upErr } = await supabase.storage
            .from("order-prescriptions")
            .upload(path, file, { upsert: true, contentType: file.type });
          if (upErr) throw upErr;
          const { error: rxErr } = await supabase.from("order_prescriptions").insert({
            order_id: order.id,
            file_path: path,
            mime: file.type,
            uploaded_by: user.id,
          });
          if (rxErr) throw rxErr;
        }
      }

      await clearCart();
      return order;
    },
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: ["my_orders", user?.id] });
      toast.success(`Commande ${order.order_number} envoyée`);
      navigate({ to: "/orders/$id", params: { id: order.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Boutique"
        title="Mon panier"
        description={`${count} article(s) — ${formatMad(subtotal)}`}
        icon={<ShoppingCart className="h-5 w-5" />}
      />

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-3xl bg-muted/50" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Votre panier est vide"
          description="Découvrez nos produits pharmacie."
          action={
            <Button asChild>
              <Link to="/products">Voir la boutique</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section className="space-y-3">
            {multiplePharmacies ? (
              <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800">
                Vous avez des produits de plusieurs pharmacies. Retirez ceux d'une pharmacie pour continuer.
              </div>
            ) : null}
            {items.map((it) => (
              <article key={it.id} className="flex items-center gap-3 rounded-3xl border border-border bg-card p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{it.pharmacy_products?.name}</p>
                  <p className="text-xs text-muted-foreground">{formatMad(it.unit_price_snapshot)}</p>
                  {it.pharmacy_products?.requires_prescription ? (
                    <p className="mt-0.5 text-[11px] text-amber-700">Ordonnance requise</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-1 rounded-full border border-border">
                  <button
                    type="button"
                    className="grid h-8 w-8 place-items-center"
                    onClick={() => updateQty({ itemId: it.id, qty: it.qty - 1 })}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm">{it.qty}</span>
                  <button
                    type="button"
                    className="grid h-8 w-8 place-items-center"
                    onClick={() => updateQty({ itemId: it.id, qty: it.qty + 1 })}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(it.id)}
                  className="grid h-8 w-8 place-items-center rounded-full text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </article>
            ))}
          </section>

          <aside className="space-y-4">
            <div className="space-y-3 rounded-3xl border border-border bg-card p-4">
              <h2 className="text-sm font-bold">Informations de livraison</h2>
              <div>
                <Label>Mode</Label>
                <Select value={fulfillment} onValueChange={(v) => setFulfillment(v as "pickup" | "delivery")}>
                  <SelectTrigger className="mt-1 h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pickup">Retrait en pharmacie</SelectItem>
                    <SelectItem value="delivery">Livraison à domicile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Téléphone *</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+212 …"
                  className="mt-1 h-11 rounded-xl"
                />
              </div>
              {fulfillment === "delivery" ? (
                <div>
                  <Label>Adresse de livraison *</Label>
                  <Textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    className="mt-1 rounded-xl"
                  />
                </div>
              ) : null}
              <div>
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 rounded-xl" />
              </div>
            </div>

            {requiresPrescription ? (
              <div className="space-y-3 rounded-3xl border border-amber-500/40 bg-amber-500/5 p-4">
                <h2 className="flex items-center gap-1 text-sm font-bold text-amber-800">
                  <FileText className="h-4 w-4" /> Ordonnance requise
                </h2>
                <p className="text-xs text-amber-700">
                  Un ou plusieurs produits nécessitent une ordonnance médicale. Téléversez-la ici.
                </p>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-amber-400 p-4 text-sm text-amber-800 hover:bg-amber-500/10">
                  <Upload className="h-4 w-4" />
                  {rxFiles.length ? `${rxFiles.length} fichier(s) prêt(s)` : "Sélectionner un fichier"}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    className="hidden"
                    onChange={(e) => setRxFiles(Array.from(e.target.files ?? []))}
                  />
                </label>
              </div>
            ) : null}

            <div className="space-y-2 rounded-3xl border border-border bg-card p-4">
              <div className="flex justify-between text-sm">
                <span>Sous-total</span>
                <span>{formatMad(subtotal)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-bold">
                <span>Total</span>
                <span className="text-primary">{formatMad(subtotal)}</span>
              </div>
              <Button
                className="mt-2 w-full gap-1.5"
                onClick={() => checkout.mutate()}
                disabled={checkout.isPending || multiplePharmacies}
              >
                {checkout.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Passer la commande
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                Paiement à la pharmacie / à la livraison.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}