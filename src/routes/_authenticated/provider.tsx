import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { PortalShell } from "@/components/portal/PortalShell";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/provider")({
  head: () =>
    buildHead({
      title: "Espace pro — Vytalma",
      description:
        "Pilotez votre cabinet : agenda, patients, ordonnances, profil public, avis et statistiques.",
      path: "/provider",
    }),
  component: ProviderLayout,
});

function ProviderLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <PortalShell>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="min-w-0"
      >
        <Outlet />
      </motion.div>
    </PortalShell>
  );
}