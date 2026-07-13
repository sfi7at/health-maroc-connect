import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { HOSPITAL_DEPARTMENTS, HOSPITAL_SERVICES } from "@/lib/hospitals";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/hospitals/departments")({
  head: () =>
    buildHead({
      title: "Départements & services hospitaliers — Vytalma",
      description: "Explorez tous les départements et services médicaux des hôpitaux et cliniques au Maroc.",
      path: "/hospitals/departments",
    }),
  component: DepartmentsPage,
});

function DepartmentsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Hôpitaux"
        title="Départements & services"
        description="Choisissez un département ou un service pour trouver les établissements qui le proposent."
        icon={<Sparkles className="h-5 w-5" />}
      />

      <section>
        <h2 className="mb-4 text-lg font-semibold">Départements médicaux</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {HOSPITAL_DEPARTMENTS.map((d) => {
            const Icon = d.icon;
            return (
              <Link
                key={d.value}
                to="/hospitals/search"
                search={{ department: d.value }}
                className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft transition hover:shadow-elevated"
              >
                <span className={`grid h-10 w-10 place-items-center rounded-xl ${d.tint}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium">{d.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Services & équipements</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {HOSPITAL_SERVICES.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.value}
                to="/hospitals/search"
                search={{ service: s.value }}
                className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft transition hover:shadow-elevated"
              >
                <span className={`grid h-10 w-10 place-items-center rounded-xl ${s.tint}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium">{s.label}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}