import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, Send } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/ai-assistant")({
  head: () =>
    buildHead({
      title: "Assistant santé IA",
      description: "Posez vos questions de santé et recevez une orientation personnalisée.",
      path: "/ai-assistant",
    }),
  component: () => (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Intelligence artificielle"
        title="Assistant santé"
        description="Orientation médicale, non-diagnostique. Toujours consulter un professionnel."
        icon={<Sparkles className="h-5 w-5" />}
      />
      <div className="rounded-3xl border border-border bg-card p-8 shadow-soft">
        <div className="grid h-14 w-14 place-items-center rounded-2xl gradient-primary text-primary-foreground">
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">Bonjour 👋</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Décrivez votre symptôme ou votre question. L'assistant vous orientera vers le bon service.
        </p>
        <form className="mt-6 flex items-center gap-2">
          <Input placeholder="Ex. : maux de tête depuis 3 jours…" className="h-12 rounded-xl" />
          <Button size="lg" type="button" className="gap-2">
            <Send className="h-4 w-4" /> Envoyer
          </Button>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">
          L'assistant sera connecté à Lovable AI dès l'activation du backend.
        </p>
      </div>
    </div>
  ),
});