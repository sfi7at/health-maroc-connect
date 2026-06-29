import { createFileRoute } from "@tanstack/react-router";
import { Settings as SettingsIcon, Globe, Bell, Shield, Moon } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/settings")({
  head: () =>
    buildHead({
      title: "Paramètres",
      description: "Personnalisez votre expérience HealthLink Maroc.",
      path: "/settings",
    }),
  component: SettingsPage,
});

function SettingsPage() {
  const items = [
    { icon: Globe, title: "Langue", hint: "Français · Arabe (bientôt)" },
    { icon: Bell, title: "Notifications", hint: "Rappels, alertes urgentes" },
    { icon: Moon, title: "Apparence", hint: "Clair · Sombre · Système" },
    { icon: Shield, title: "Confidentialité", hint: "Permissions et données" },
  ];
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Préférences"
        title="Paramètres"
        description="Adaptez l'application à vos besoins."
        icon={<SettingsIcon className="h-5 w-5" />}
      />
      <section className="rounded-3xl border border-border bg-card shadow-soft">
        <ul className="divide-y divide-border">
          {items.map((s) => {
            const Icon = s.icon;
            return (
              <li key={s.title} className="flex items-center gap-4 p-5">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.hint}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}