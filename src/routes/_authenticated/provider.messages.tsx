import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/provider/messages")({
  head: () => buildHead({ title: "Messages — Espace prestataire", description: "Messagerie sécurisée prestataire-patient.", path: "/provider/messages" }),
  component: ProviderMessages,
});

function ProviderMessages() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Messages" title="Messagerie sécurisée" description="Échanges chiffrés entre vous et vos patients." icon={<MessageSquare className="h-5 w-5" />} />

      <section className="rounded-3xl border border-dashed border-border bg-gradient-to-br from-primary/5 to-transparent p-10 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary">
          <Sparkles className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold">Bientôt disponible</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          L'architecture de messagerie sécurisée est en place. L'interface complète sera activée dans une prochaine mise à jour.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" /> Chiffré bout-en-bout</Badge>
          <Badge variant="outline" className="gap-1"><ShieldCheck className="h-3 w-3" /> Conforme RGPD</Badge>
          <Badge variant="outline">Aucune app tierce</Badge>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Card title="Conversations" value="0" hint="Aucune conversation active" />
        <Card title="Non lus" value="0" hint="Tout est à jour" />
        <Card title="Réponse moyenne" value="—" hint="Indicateur à venir" />
      </section>
    </div>
  );
}

function Card({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-soft">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}