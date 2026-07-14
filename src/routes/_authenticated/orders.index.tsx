import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuth } from "@/hooks/use-auth";
import { myOrdersQuery } from "@/lib/orders";
import { formatMad, ORDER_STATUS_LABEL, ORDER_STATUS_TINT } from "@/lib/pharmacy-products";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/orders/")({
  head: () =>
    buildHead({
      title: "Mes commandes — Vytalma",
      description: "Suivez l'état de vos commandes pharmacie.",
      path: "/orders",
    }),
  component: OrdersIndex,
});

function OrdersIndex() {
  const { user } = useAuth();
  const { data: orders = [], isLoading } = useQuery(myOrdersQuery(user?.id));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Boutique"
        title="Mes commandes"
        description="Suivi et historique de vos achats en pharmacie."
        icon={<ShoppingBag className="h-5 w-5" />}
      />

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-3xl bg-muted/50" />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Aucune commande"
          description="Explorez la boutique pour votre première commande."
          action={
            <Button asChild>
              <Link to="/products">Voir les produits</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link
              key={o.id}
              to="/orders/$id"
              params={{ id: o.id }}
              className="block rounded-3xl border border-border bg-card p-4 shadow-soft transition hover:border-primary"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold">{o.order_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleString("fr-FR")}
                    {o.providers ? ` · ${o.providers.name}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`border-0 ${ORDER_STATUS_TINT[o.status] ?? "bg-muted"}`}>
                    {ORDER_STATUS_LABEL[o.status] ?? o.status}
                  </Badge>
                  <span className="text-sm font-bold text-primary">{formatMad(o.total)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}