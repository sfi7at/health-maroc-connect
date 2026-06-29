import { createFileRoute } from "@tanstack/react-router";
import { ProviderListPage } from "@/components/common/ProviderListPage";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/doctors")({
  head: () =>
    buildHead({
      title: "Médecins au Maroc — Trouvez un spécialiste",
      description:
        "Annuaire vérifié de médecins généralistes et spécialistes au Maroc. Prenez rendez-vous en ligne en quelques secondes.",
      path: "/doctors",
    }),
  component: () => <ProviderListPage category="doctor" />,
});
