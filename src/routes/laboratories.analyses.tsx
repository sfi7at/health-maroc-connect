import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Microscope } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { LAB_ANALYSES } from "@/lib/laboratories";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/laboratories/analyses")({
  head: () =>
    buildHead({
      title: "Analyses médicales — Vytalma",
      description: "Toutes les catégories d'analyses médicales disponibles au Maroc.",
      path: "/laboratories/analyses",
    }),
  component: AnalysesPage,
});

function AnalysesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catégories"
        title="Analyses médicales"
        description="Explorez les types d'analyses et trouvez les laboratoires qui les réalisent."
        icon={<Microscope className="h-5 w-5" />}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {LAB_ANALYSES.map((a, i) => {
          const Icon = a.icon;
          return (
            <motion.div
              key={a.value}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.02 }}
            >
              <Link
                to="/laboratories/search"
                search={{ analysis: a.value }}
                className="group block rounded-3xl border border-border bg-card p-5 shadow-soft transition hover:shadow-elevated"
              >
                <span className={`grid h-12 w-12 place-items-center rounded-2xl ${a.tint}`}>
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-3 text-sm font-semibold">{a.label}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Voir les laboratoires qui réalisent cette analyse.
                </p>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}