import { createFileRoute } from "@tanstack/react-router";
import { ProviderListPage } from "@/components/common/ProviderListPage";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/laboratories")({
  head: () =>
    buildHead({
      title: "Laboratoires d'analyses au Maroc",
      description:
        "Trouvez un laboratoire d'analyses médicales ou un centre d'imagerie près de chez vous au Maroc.",
      path: "/laboratories",
    }),
  component: () => <ProviderListPage category="laboratory" />,
});
