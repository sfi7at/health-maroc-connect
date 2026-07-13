import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => buildHead({
    title: "Console d'administration",
    description: "Console centralisée pour la gestion de la plateforme Vytalma.",
    path: "/admin",
  }),
  component: () => (
    <AdminShell>
      <Outlet />
    </AdminShell>
  ),
});