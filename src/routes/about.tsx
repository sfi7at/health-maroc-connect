import { createFileRoute } from "@tanstack/react-router";
import { Info, Heart } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/about")({
  head: () =>
    buildHead({
      title: "À propos",
      description: "HealthLink Maroc : la première Health Super App marocaine.",
      path: "/about",
    }),
  component: () => (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Notre mission"
        title="À propos de HealthLink"
        description="Rendre la santé accessible à chaque Marocain, depuis son téléphone."
        icon={<Info className="h-5 w-5" />}
      />
      <article className="prose prose-slate max-w-none rounded-3xl border border-border bg-card p-8 shadow-soft dark:prose-invert">
        <p>
          <strong>HealthLink Maroc</strong> est la première application qui centralise tous les
          services de santé du Royaume : médecins, pharmacies, hôpitaux, laboratoires, don du sang,
          téléconsultation et orientation par intelligence artificielle.
        </p>
        <p>
          Notre mission est simple : <em>simplifier l'accès aux soins</em> pour des millions de
          Marocains, dans toutes les régions, avec une expérience moderne, sécurisée et bilingue.
        </p>
        <p className="flex items-center gap-2 text-primary">
          <Heart className="h-4 w-4" fill="currentColor" /> Made in Morocco — avec passion.
        </p>
      </article>
    </div>
  ),
});