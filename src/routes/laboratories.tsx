import { createFileRoute } from "@tanstack/react-router";
import { FlaskConical } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ComingSoon } from "@/components/common/ComingSoon";
import { SearchBar } from "@/components/common/SearchBar";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/laboratories")({
  head: () =>
    buildHead({
      title: "Laboratoires d'analyses",
      description: "Trouvez un laboratoire d'analyses biologiques ou d'imagerie médicale.",
      path: "/laboratories",
    }),
  component: () => (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Analyses & imagerie"
        title="Laboratoires"
        description="Biologie, radiologie, IRM — partout au Maroc."
        icon={<FlaskConical className="h-5 w-5" />}
      />
      <SearchBar placeholder="Laboratoire, type d'analyse…" />
      <ComingSoon />
    </div>
  ),
});