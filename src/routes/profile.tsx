import { createFileRoute } from "@tanstack/react-router";
import { User, Heart, Pill, FileText, Calendar, ShieldCheck, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/profile")({
  head: () =>
    buildHead({
      title: "Profil médical",
      description:
        "Centralisez votre dossier médical : antécédents, traitements, allergies, rendez-vous et ordonnances.",
      path: "/profile",
    }),
  component: ProfilePage,
});

const sections = [
  { icon: FileText, title: "Antécédents médicaux", hint: "Historique, chirurgies, hospitalisations" },
  { icon: Pill, title: "Traitements en cours", hint: "Médicaments, posologies, rappels" },
  { icon: Heart, title: "Allergies & alertes", hint: "Réactions connues à signaler" },
  { icon: Calendar, title: "Mes rendez-vous", hint: "À venir et passés" },
  { icon: ShieldCheck, title: "Confidentialité", hint: "Qui peut accéder à vos données" },
];

function ProfilePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Votre santé"
        title="Profil médical"
        description="Vos informations de santé restent chiffrées et privées."
        icon={<User className="h-5 w-5" />}
      />

      <section className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <Avatar className="h-20 w-20 ring-2 ring-primary/15">
            <AvatarFallback className="bg-primary/10 text-xl text-primary">HL</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold">Bienvenue sur HealthLink</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Créez votre profil pour synchroniser vos rendez-vous, ordonnances et favoris sur tous
              vos appareils.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">Se connecter</Button>
            <Button>Créer un compte</Button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card shadow-soft">
        <ul className="divide-y divide-border">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <li key={s.title}>
                <button className="flex w-full items-center gap-4 p-5 text-left transition hover:bg-accent/40">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{s.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.hint}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}