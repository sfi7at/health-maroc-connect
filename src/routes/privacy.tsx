import { createFileRoute } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/privacy")({
  head: () =>
    buildHead({
      title: "Politique de confidentialité",
      description: "Comment HealthLink Maroc protège vos données de santé.",
      path: "/privacy",
    }),
  component: () => (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Vos données"
        title="Politique de confidentialité"
        description="Vos informations de santé sont chiffrées et restent votre propriété."
        icon={<Shield className="h-5 w-5" />}
      />
      <article className="prose prose-slate max-w-none rounded-3xl border border-border bg-card p-8 shadow-soft dark:prose-invert">
        <p>
          HealthLink Maroc respecte la loi 09-08 relative à la protection des personnes physiques à
          l'égard du traitement des données à caractère personnel.
        </p>
        <h2>Données collectées</h2>
        <p>Profil, antécédents, rendez-vous, géolocalisation (optionnelle), notifications.</p>
        <h2>Sécurité</h2>
        <p>Chiffrement bout-en-bout, audits réguliers, accès restreint.</p>
        <h2>Vos droits</h2>
        <p>Accès, rectification, suppression, portabilité.</p>
      </article>
    </div>
  ),
});