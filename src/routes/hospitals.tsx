import { createFileRoute } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ComingSoon } from "@/components/common/ComingSoon";
import { SearchBar } from "@/components/common/SearchBar";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/hospitals")({
  head: () =>
    buildHead({
      title: "Hôpitaux & cliniques",
      description: "Annuaire des hôpitaux publics et cliniques privées au Maroc.",
      path: "/hospitals",
    }),
  component: () => (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Annuaire"
        title="Hôpitaux & cliniques"
        description="Trouvez un établissement de santé partout au Maroc."
        icon={<Building2 className="h-5 w-5" />}
      />
      <SearchBar placeholder="Hôpital, clinique, ville…" />
      <ComingSoon />
    </div>
  ),
});