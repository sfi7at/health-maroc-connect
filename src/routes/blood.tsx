import { createFileRoute } from "@tanstack/react-router";
import { Droplet, Heart, AlertCircle, Users } from "lucide-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/blood")({
  head: () =>
    buildHead({
      title: "Don du sang au Maroc",
      description:
        "Sauvez des vies. Trouvez des demandes urgentes de don du sang et rejoignez la communauté HealthLink.",
      path: "/blood",
    }),
  component: BloodPage,
});

const types = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

function BloodPage() {
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl gradient-blood p-6 text-blood-foreground shadow-elevated sm:p-10">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative max-w-xl"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <Heart className="h-3.5 w-3.5" fill="currentColor" /> Communauté
          </span>
          <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
            Donnez votre sang. Sauvez des vies.
          </h1>
          <p className="mt-3 text-sm opacity-90 sm:text-base">
            Recevez des alertes lorsqu'une demande urgente correspond à votre groupe sanguin près
            de chez vous.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button size="lg" variant="secondary" className="gap-2">
              <Droplet className="h-4 w-4" /> Devenir donneur
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 border-white/30 bg-white/10 text-blood-foreground hover:bg-white/20"
            >
              <AlertCircle className="h-4 w-4" /> Lancer une demande
            </Button>
          </div>
        </motion.div>
      </section>

      <PageHeader
        eyebrow="Groupes sanguins"
        title="Compatibilités"
        description="Sélectionnez votre groupe pour voir les demandes pertinentes."
        icon={<Users className="h-5 w-5" />}
      />
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
        {types.map((t) => (
          <button
            key={t}
            className="group flex flex-col items-center gap-1 rounded-2xl border border-border bg-card p-4 shadow-soft transition hover:border-blood/40 hover:shadow-elevated"
          >
            <Droplet className="h-5 w-5 text-blood" fill="currentColor" />
            <span className="text-base font-bold">{t}</span>
          </button>
        ))}
      </div>

      <EmptyState
        icon={Droplet}
        title="Aucune demande urgente pour l'instant"
        description="Les demandes de don seront publiées par les hôpitaux partenaires et vérifiées avant diffusion."
      />
    </div>
  );
}