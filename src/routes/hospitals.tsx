import { createFileRoute } from "@tanstack/react-router";
import { ProviderListPage } from "@/components/common/ProviderListPage";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/hospitals")({
  head: () =>
    buildHead({
      title: "Hôpitaux & cliniques au Maroc",
      description:
        "Annuaire des hôpitaux publics, cliniques privées et centres de santé au Maroc avec coordonnées et services.",
      path: "/hospitals",
    }),
  component: () => <ProviderListPage category="hospital" />,
});
