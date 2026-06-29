import { createFileRoute } from "@tanstack/react-router";
import { ProviderListPage } from "@/components/common/ProviderListPage";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/pharmacies")({
  head: () =>
    buildHead({
      title: "Pharmacies au Maroc — Proximité & de garde",
      description:
        "Trouvez une pharmacie proche de vous au Maroc, y compris les pharmacies de garde de nuit, avec horaires et itinéraire.",
      path: "/pharmacies",
    }),
  component: () => <ProviderListPage category="pharmacy" />,
});
