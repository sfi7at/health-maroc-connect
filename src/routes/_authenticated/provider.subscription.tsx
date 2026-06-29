import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Crown, Check, Sparkles, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { useSelectedProvider } from "@/lib/provider-store";
import { buildHead } from "@/lib/seo";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/provider/subscription")({
  head: () => buildHead({ title: "Abonnement — Espace prestataire", description: "Choisissez votre formule.", path: "/provider/subscription" }),
  component: ProviderSubscription,
});

type Tier = { id: "free" | "premium" | "enterprise"; name: string; price: string; icon: React.ElementType; tone: string; perks: string[]; cta: string };

const TIERS: Tier[] = [
  { id: "free", name: "Découverte", price: "Gratuit", icon: Sparkles, tone: "from-slate-500 to-slate-700",
    perks: ["Profil public", "Jusqu'à 30 RDV/mois", "Statistiques de base", "Support standard"], cta: "Formule actuelle" },
  { id: "premium", name: "Premium", price: "199 MAD / mois", icon: Crown, tone: "from-amber-500 to-orange-600",
    perks: ["Badge Premium mis en avant", "RDV illimités", "Statistiques avancées", "Réponses prioritaires aux avis", "Support 7j/7"], cta: "Passer Premium" },
  { id: "enterprise", name: "Entreprise", price: "Sur devis", icon: Building2, tone: "from-violet-600 to-fuchsia-600",
    perks: ["Multi-établissements", "Gestion d'équipes", "API & exports", "Account Manager dédié", "SLA garanti"], cta: "Nous contacter" },
];

function ProviderSubscription() {
  const { provider } = useSelectedProvider();
  if (!provider) return null;
  const current = (provider.metadata as Record<string, unknown> | null)?.["subscription_tier"] as Tier["id"] | undefined;
  const tier: Tier["id"] = current ?? (provider.is_premium ? "premium" : "free");

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Abonnement" title="Boostez votre visibilité" description="Choisissez la formule qui correspond à votre activité." icon={<Crown className="h-5 w-5" />} />

      <section className="grid gap-4 lg:grid-cols-3">
        {TIERS.map((t, i) => {
          const active = tier === t.id;
          return (
            <motion.div key={t.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`relative overflow-hidden rounded-3xl border bg-card p-6 shadow-soft ${active ? "border-primary ring-2 ring-primary/30" : "border-border"}`}>
              {active ? <Badge className="absolute right-4 top-4 border-0 bg-emerald-500/15 text-emerald-700">Actuel</Badge> : null}
              <div className={`mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${t.tone} text-white`}><t.icon className="h-6 w-6" /></div>
              <p className="text-lg font-bold">{t.name}</p>
              <p className="text-2xl font-extrabold text-primary">{t.price}</p>
              <ul className="mt-4 space-y-2 text-sm">
                {t.perks.map((p) => (
                  <li key={p} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-emerald-600" />{p}</li>
                ))}
              </ul>
              <Button className="mt-5 w-full" variant={active ? "outline" : "default"} disabled={active}
                onClick={() => toast.info(t.id === "enterprise" ? "Notre équipe vous recontactera." : "Paiement bientôt disponible.")}>
                {active ? "Formule actuelle" : t.cta}
              </Button>
            </motion.div>
          );
        })}
      </section>
      <p className="text-xs text-muted-foreground">Les paiements sécurisés (CMI, Stripe) seront activés prochainement.</p>
    </div>
  );
}