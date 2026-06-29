import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/notifications")({
  head: () =>
    buildHead({
      title: "Notifications",
      description: "Alertes rendez-vous, ordonnances, demandes de don du sang et plus encore.",
      path: "/notifications",
    }),
  component: () => (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Centre d'alertes"
        title="Notifications"
        description="Tout ce qui compte, au bon moment."
        icon={<Bell className="h-5 w-5" />}
      />
      <EmptyState
        icon={Bell}
        title="Aucune notification"
        description="Vous recevrez ici les alertes importantes liées à votre santé."
      />
    </div>
  ),
});