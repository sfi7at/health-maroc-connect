import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { CalendarCheck, Clock, MapPin, Stethoscope } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { appointmentsQuery } from "@/lib/queries";
import { formatDateTimeFr } from "@/lib/format";
import { buildHead } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/appointments/")({
  head: () =>
    buildHead({
      title: "Mes rendez-vous — HealthLink Maroc",
      description: "Gérez vos rendez-vous médicaux : à venir, passés, annulations et rappels.",
      path: "/appointments",
    }),
  component: AppointmentsPage,
});

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  pending: { label: "En attente", tone: "bg-warning/15 text-warning-foreground" },
  approved: { label: "Confirmé", tone: "bg-primary/15 text-primary" },
  rejected: { label: "Refusé", tone: "bg-destructive/15 text-destructive" },
  cancelled: { label: "Annulé", tone: "bg-muted text-muted-foreground" },
  completed: { label: "Terminé", tone: "bg-info/15 text-info" },
  no_show: { label: "Absence", tone: "bg-destructive/15 text-destructive" },
};

function AppointmentsPage() {
  const { user } = useAuth();
  const { data = [], isLoading } = useQuery(appointmentsQuery(user?.id));
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`patient-appts-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments", filter: `patient_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["appointments"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const upcoming = data.filter(
    (a) =>
      new Date(a.scheduled_for).getTime() > Date.now() &&
      !["cancelled", "rejected", "completed"].includes(a.status),
  );
  const past = data.filter((a) => !upcoming.includes(a));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Suivi médical"
        title="Mes rendez-vous"
        description="Visualisez vos consultations à venir et l'historique de vos rendez-vous."
        icon={<CalendarCheck className="h-5 w-5" />}
        actions={
          <Button asChild className="gap-2">
            <Link to="/doctors">Réserver</Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="Aucun rendez-vous pour l'instant"
          description="Réservez votre première consultation auprès d'un médecin vérifié."
          action={
            <Button asChild>
              <Link to="/doctors">Trouver un médecin</Link>
            </Button>
          }
        />
      ) : (
        <>
          <Section title="À venir" items={upcoming} emptyHint="Aucun rendez-vous à venir." />
          <Section title="Historique" items={past} emptyHint="Pas d'historique pour le moment." />
        </>
      )}
    </div>
  );
}

type AppointmentItem = NonNullable<Awaited<ReturnType<NonNullable<ReturnType<typeof appointmentsQuery>["queryFn"]>>>>[number];

function Section({
  title,
  items,
  emptyHint,
}: {
  title: string;
  items: AppointmentItem[];
  emptyHint: string;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
          {emptyHint}
        </p>
      ) : (
        <ul className="grid gap-3">
          {items.map((a) => {
            const status = STATUS_LABEL[a.status] ?? { label: a.status, tone: "" };
            return (
              <li
                key={a.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <Stethoscope className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {a.providers?.name ?? "Prestataire"}
                    </p>
                    <p className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {formatDateTimeFr(a.scheduled_for)}
                      </span>
                      {a.reason ? (
                        <span className="truncate">
                          <MapPin className="mr-1 inline h-3.5 w-3.5" />
                          {a.reason}
                        </span>
                      ) : null}
                    </p>
                  </div>
                </div>
                <Badge className={`border-0 ${status.tone}`}>{status.label}</Badge>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}