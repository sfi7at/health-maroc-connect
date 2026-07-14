import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Phone, MapPin, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { orderByIdQuery } from "@/lib/orders";
import { formatMad, ORDER_STATUS_LABEL, ORDER_STATUS_TINT } from "@/lib/pharmacy-products";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/orders/$id")({
  head: () => buildHead({ title: "Commande — Vytalma", description: "Détails et suivi de votre commande.", path: "/orders" }),
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = Route.useParams();
  const { data: order, isLoading } = useQuery(orderByIdQuery(id));

  if (isLoading) return <div className="h-40 animate-pulse rounded-3xl bg-muted/50" />;
  if (!order) return <p className="p-4 text-sm text-muted-foreground">Commande introuvable.</p>;

  return (
    <div className="space-y-5">
      <Button asChild variant="ghost" size="sm" className="gap-1">
        <Link to="/orders">
          <ArrowLeft className="h-4 w-4" /> Mes commandes
        </Link>
      </Button>

      <header className="rounded-3xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold">{order.order_number}</h1>
            <p className="text-xs text-muted-foreground">
              {new Date(order.created_at).toLocaleString("fr-FR")}
            </p>
            {order.providers ? (
              <Link
                to="/pharmacy/$slug"
                params={{ slug: order.providers.slug ?? order.providers.id }}
                className="text-sm text-primary hover:underline"
              >
                {order.providers.name}
              </Link>
            ) : null}
          </div>
          <Badge className={`border-0 ${ORDER_STATUS_TINT[order.status] ?? "bg-muted"}`}>
            {ORDER_STATUS_LABEL[order.status] ?? order.status}
          </Badge>
        </div>
      </header>

      <section className="rounded-3xl border border-border bg-card p-4">
        <h2 className="mb-2 text-sm font-bold">Articles</h2>
        <ul className="divide-y divide-border">
          {(order.order_items ?? []).map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{it.name_snapshot}</p>
                <p className="text-xs text-muted-foreground">
                  {it.qty} × {formatMad(it.unit_price)}
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

      <section className="rounded-3xl border border-border bg-card p-4 text-sm">
        <h2 className="mb-2 text-sm font-bold">Livraison / contact</h2>
        {order.contact_phone ? (
          <p className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {order.contact_phone}</p>
        ) : null}
        {order.delivery_address ? (
          <p className="mt-1 flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {order.delivery_address}
          </p>
        ) : null}
      </section>

      {order.requires_prescription ? (
        <section className="rounded-3xl border border-border bg-card p-4 text-sm">
          <h2 className="mb-2 flex items-center gap-1 text-sm font-bold">
            <FileText className="h-4 w-4" /> Ordonnance(s)
          </h2>
          {order.order_prescriptions.length === 0 ? (
            <p className="text-muted-foreground">Aucune ordonnance téléversée.</p>
          ) : (
            <ul className="space-y-1">
              {order.order_prescriptions.map((rx) => (
                <li key={rx.id} className="flex items-center justify-between text-xs">
                  <span className="truncate">{rx.file_path.split("/").pop()}</span>
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
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}