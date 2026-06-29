import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/appointments")({
  head: () =>
    buildHead({
      title: "Mes rendez-vous",
      description: "Gérez vos rendez-vous médicaux à venir et passés.",
      path: "/appointments",
    }),
  component: () => (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Planning"
        title="Mes rendez-vous"
        description="À venir, passés, rappels et annulations."
        icon={<CalendarCheck className="h-5 w-5" />}
      />
      <EmptyState
        icon={CalendarCheck}
        title="Aucun rendez-vous pour l'instant"
        description="Connectez-vous pour synchroniser vos rendez-vous avec votre profil HealthLink."
      />
    </div>
  ),
});