import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, FileText, ShieldCheck, XCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  orderByIdQuery,
  signPrescriptionFile,
  type OrderPrescriptionRow,
} from "@/lib/orders";
import {
  formatMad,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TINT,
} from "@/lib/pharmacy-products";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/provider/orders/$id")({
  head: () => buildHead({ title: "Commande — Espace pharmacie", description: "Détails et validation de la commande.", path: "/provider/orders" }),
  component: ProviderOrderDetail,
});

function ProviderOrderDetail() {
  const { id } = Route.useParams();
  const { data: order, isLoading } = useQuery(orderByIdQuery(id));
  const qc = useQueryClient();

  const setStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from("orders").update({ status: status as never }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order_by_id", id] });
      qc.invalidateQueries({ queryKey: ["pharmacy_orders"] });
      toast.success("Statut mis à jour");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="h-40 animate-pulse rounded-3xl bg-muted/50" />;
  if (!order) return <div className="p-4 text-sm text-muted-foreground">Commande introuvable.</div>;

  return (
    <div className="space-y-5">
      <Button asChild variant="ghost" size="sm" className="gap-1">
        <Link to="/provider/orders">
          <ArrowLeft className="h-4 w-4" /> Retour aux commandes
        </Link>
      </Button>

      <header className="rounded-3xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold">Commande {order.order_number}</h1>
            <p className="text-xs text-muted-foreground">
              {new Date(order.created_at).toLocaleString("fr-FR")}
            </p>
          </div>
          <Badge className={`border-0 ${ORDER_STATUS_TINT[order.status] ?? "bg-muted"}`}>
            {ORDER_STATUS_LABEL[order.status] ?? order.status}
          </Badge>
        </div>
      </header>

      <section className="rounded-3xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-bold">Articles</h2>
        <ul className="divide-y divide-border">
          {(order.order_items ?? []).map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{it.name_snapshot}</p>
                <p className="text-xs text-muted-foreground">
                  {it.qty} × {formatMad(it.unit_price)}
                  {it.requires_prescription ? " · Ordonnance" : ""}
                </p>
              </div>
              <p className="text-sm font-semibold">{formatMad(Number(it.unit_price) * it.qty)}</p>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t pt-3 text-sm font-bold">
          <span>Total</span>
          <span className="text-primary">{formatMad(order.total)}</span>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-4">
        <h2 className="mb-2 text-sm font-bold">Client</h2>
        <p className="text-sm">{order.contact_phone ?? "—"}</p>
        {order.delivery_address ? (
          <p className="text-sm text-muted-foreground">{order.delivery_address}</p>
        ) : null}
        {order.notes ? <p className="mt-2 text-xs text-muted-foreground">Note : {order.notes}</p> : null}
      </section>

      {order.requires_prescription ? (
        <section className="rounded-3xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-bold">Ordonnances téléversées</h2>
          {order.order_prescriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Le client n'a pas encore envoyé son ordonnance.</p>
          ) : (
            <div className="space-y-3">
              {order.order_prescriptions.map((rx) => (
                <PrescriptionReview key={rx.id} rx={rx} orderId={id} />
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section className="flex flex-wrap gap-2">
        {order.status === "pending_review" ? (
          <>
            <Button onClick={() => setStatus.mutate("approved")} disabled={setStatus.isPending}>
              <ShieldCheck className="mr-1 h-4 w-4" /> Approuver la commande
            </Button>
            <Button
              variant="outline"
              className="border-destructive/40 text-destructive"
              onClick={() => setStatus.mutate("rejected")}
              disabled={setStatus.isPending}
            >
              <XCircle className="mr-1 h-4 w-4" /> Refuser
            </Button>
          </>
        ) : null}
        {order.status === "approved" ? (
          <Button onClick={() => setStatus.mutate("preparing")}>Marquer en préparation</Button>
        ) : null}
        {order.status === "preparing" ? (
          <>
            <Button onClick={() => setStatus.mutate("ready_for_pickup")}>Prête à retirer</Button>
            <Button onClick={() => setStatus.mutate("out_for_delivery")}>En livraison</Button>
          </>
        ) : null}
        {(order.status === "ready_for_pickup" || order.status === "out_for_delivery") ? (
          <Button onClick={() => setStatus.mutate("delivered")}>Marquer comme livrée</Button>
        ) : null}
      </section>
    </div>
  );
}

function PrescriptionReview({ rx, orderId }: { rx: OrderPrescriptionRow; orderId: string }) {
  const qc = useQueryClient();
  const [url, setUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState(rx.review_notes ?? "");

  useEffect(() => {
    signPrescriptionFile(rx.file_path).then(setUrl);
  }, [rx.file_path]);

  const review = useMutation({
    mutationFn: async (status: "approved" | "rejected") => {
      const { error } = await supabase
        .from("order_prescriptions")
        .update({
          review_status: status,
          review_notes: notes || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", rx.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order_by_id", orderId] });
      toast.success("Décision enregistrée");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-2xl border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-sm font-medium">
          <FileText className="h-4 w-4 text-primary" /> {rx.file_path.split("/").pop()}
        </span>
        <Badge
          variant="outline"
          className={
            rx.review_status === "approved"
              ? "border-emerald-500/40 text-emerald-700"
              : rx.review_status === "rejected"
                ? "border-rose-500/40 text-rose-700"
                : ""
          }
        >
          {rx.review_status ?? "en attente"}
        </Badge>
      </div>
      {url ? (
        rx.mime?.startsWith("image/") ? (
          <img src={url} alt="" className="mt-2 max-h-80 w-full rounded-xl object-contain" />
        ) : (
          <a href={url} target="_blank" rel="noopener" className="mt-2 inline-block text-xs text-primary underline">
            Ouvrir le fichier
          </a>
        )
      ) : (
        <Loader2 className="mt-2 h-4 w-4 animate-spin text-muted-foreground" />
      )}
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes internes (optionnel)"
        rows={2}
        className="mt-2 rounded-xl"
      />
      <div className="mt-2 flex gap-2">
        <Button size="sm" onClick={() => review.mutate("approved")} disabled={review.isPending}>
          Approuver
        </Button>
        <Button size="sm" variant="outline" onClick={() => review.mutate("rejected")} disabled={review.isPending}>
          Refuser
        </Button>
      </div>
    </div>
  );
}