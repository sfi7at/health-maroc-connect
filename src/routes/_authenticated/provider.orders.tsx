import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShoppingBag,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  FileText,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { useSelectedProvider } from "@/lib/provider-store";
import { supabase } from "@/integrations/supabase/client";
import {
  pharmacyOrdersQuery,
  type OrderWithRelations,
} from "@/lib/orders";
import {
  formatMad,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TINT,
} from "@/lib/pharmacy-products";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/provider/orders")({
  head: () =>
    buildHead({
      title: "Commandes — Espace pharmacie",
      description: "Gérez les commandes et prescriptions de vos clients.",
      path: "/provider/orders",
    }),
  component: ProviderOrders,
});

const FILTER_TABS: Array<{ value: string; label: string; states: string[] }> = [
  { value: "active", label: "En cours", states: ["pending_prescription", "pending_review", "approved", "preparing", "ready_for_pickup", "out_for_delivery"] },
  { value: "prescription", label: "Ordonnances", states: ["pending_prescription", "pending_review"] },
  { value: "done", label: "Terminées", states: ["delivered"] },
  { value: "cancelled", label: "Annulées / Refusées", states: ["cancelled", "rejected"] },
  { value: "all", label: "Toutes", states: [] },
];

function ProviderOrders() {
  const { provider } = useSelectedProvider();
  const { data: orders = [], isLoading } = useQuery(pharmacyOrdersQuery(provider?.id));
  const [tab, setTab] = useState("active");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const t = FILTER_TABS.find((x) => x.value === tab)!;
    let list = t.states.length ? orders.filter((o) => t.states.includes(o.status)) : orders;
    if (q.trim()) {
      const n = q.toLowerCase();
      list = list.filter((o) => o.order_number.toLowerCase().includes(n));
    }
    return list;
  }, [orders, tab, q]);

  if (provider?.category !== "pharmacy") {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Commandes réservées aux pharmacies"
        description="Sélectionnez un établissement de type pharmacie pour voir les commandes."
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Boutique"
        title="Commandes"
        description="Validez les ordonnances, préparez et livrez les commandes."
        icon={<ShoppingBag className="h-5 w-5" />}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Tabs value={tab} onValueChange={setTab} className="min-w-0 flex-1 overflow-x-auto">
          <TabsList className="flex w-max">
            {FILTER_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 sm:w-64">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="N° de commande…"
            className="h-11 border-0 bg-transparent focus-visible:ring-0"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-3xl bg-muted/50" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Package} title="Aucune commande" description="Les nouvelles commandes apparaîtront ici." />
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <OrderCard key={o.id} order={o} pharmacyId={provider.id} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, pharmacyId }: { order: OrderWithRelations; pharmacyId: string }) {
  const qc = useQueryClient();
  const setStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase
        .from("orders")
        .update({ status: status as OrderWithRelations["status"] })
        .eq("id", order.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Statut mis à jour");
      qc.invalidateQueries({ queryKey: ["pharmacy_orders", pharmacyId] });
      qc.invalidateQueries({ queryKey: ["order_by_id", order.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const nextActions = getNextActions(order.status);
  const items = order.order_items ?? [];
  const rxCount = (order.order_prescriptions ?? []).length;

  return (
    <article className="rounded-3xl border border-border bg-card p-4 shadow-soft">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link
            to="/provider/orders/$id"
            params={{ id: order.id }}
            className="text-sm font-bold hover:underline"
          >
            {order.order_number}
          </Link>
          <p className="text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleString("fr-FR")} · {items.length} article(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`border-0 ${ORDER_STATUS_TINT[order.status] ?? "bg-muted"}`}>
            {ORDER_STATUS_LABEL[order.status] ?? order.status}
          </Badge>
          <p className="text-sm font-bold text-primary">{formatMad(order.total)}</p>
        </div>
      </header>
      {order.requires_prescription ? (
        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700">
          <FileText className="h-3 w-3" /> Ordonnance : {rxCount > 0 ? `${rxCount} fichier(s)` : "en attente"}
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/provider/orders/$id" params={{ id: order.id }}>
            Détails
          </Link>
        </Button>
        {nextActions.map((a) => (
          <Button
            key={a.status}
            size="sm"
            variant={a.tone === "danger" ? "outline" : "default"}
            className={a.tone === "danger" ? "border-destructive/40 text-destructive" : ""}
            onClick={() => setStatus.mutate(a.status)}
            disabled={setStatus.isPending}
          >
            {a.icon ? <a.icon className="mr-1 h-3.5 w-3.5" /> : null}
            {a.label}
          </Button>
        ))}
      </div>
    </article>
  );
}

function getNextActions(status: string) {
  switch (status) {
    case "pending_prescription":
      return [{ status: "cancelled", label: "Annuler", tone: "danger" as const, icon: XCircle }];
    case "pending_review":
      return [
        { status: "approved", label: "Approuver", tone: "primary" as const, icon: CheckCircle2 },
        { status: "rejected", label: "Refuser", tone: "danger" as const, icon: XCircle },
      ];
    case "approved":
      return [{ status: "preparing", label: "En préparation", tone: "primary" as const, icon: Package }];
    case "preparing":
      return [
        { status: "ready_for_pickup", label: "Prête à retirer", tone: "primary" as const, icon: CheckCircle2 },
        { status: "out_for_delivery", label: "En livraison", tone: "primary" as const, icon: Truck },
      ];
    case "ready_for_pickup":
    case "out_for_delivery":
      return [{ status: "delivered", label: "Marquer livrée", tone: "primary" as const, icon: CheckCircle2 }];
    default:
      return [] as Array<{ status: string; label: string; tone: "primary" | "danger"; icon?: typeof Clock }>;
  }
}