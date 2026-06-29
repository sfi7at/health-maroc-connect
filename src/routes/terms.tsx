import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/terms")({
  head: () =>
    buildHead({
      title: "Conditions d'utilisation",
      description: "Conditions générales d'utilisation de HealthLink Maroc.",
      path: "/terms",
    }),
  component: () => (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CGU"
        title="Conditions d'utilisation"
        description="Les règles d'utilisation du service HealthLink Maroc."
        icon={<FileText className="h-5 w-5" />}
      />
      <article className="prose prose-slate max-w-none rounded-3xl border border-border bg-card p-8 shadow-soft dark:prose-invert">
        <p>
          En utilisant HealthLink Maroc, vous acceptez les présentes conditions. Le service
          d'orientation ne remplace pas un avis médical professionnel.
        </p>
      </article>
    </div>
  ),
});