import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarClock, MapPin, Navigation, Phone, RotateCcw, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { appointmentByIdQuery } from "@/lib/appointments";
import { formatDateTimeFr } from "@/lib/format";
import { buildHead } from "@/lib/seo";
import { StatusBadge } from "@/components/appointments/StatusBadge";
import { CalendarExportMenu } from "@/components/appointments/CalendarExportMenu";

export const Route = createFileRoute("/_authenticated/appointments/$id")({
  head: () => buildHead({ title: "Détails du rendez-vous — HealthLink Maroc", description: "Détails de votre rendez-vous médical.", path: "/appointments" }),
  component: AppointmentDetail,
});

function AppointmentDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: a, isLoading } = useQuery(appointmentByIdQuery(id));

  useEffect(() => {
    const ch = supabase.channel(`appt-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `id=eq.${id}` }, () => {
        qc.invalidateQueries({ queryKey: ["appointment", id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, qc]);

  const cancel = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled", cancelled_reason: "Annulé par le patient" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rendez-vous annulé");
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["appointment", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-64 rounded-3xl" />;
  if (!a) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
        Rendez-vous introuvable.
      </div>
    );
  }

  const lat = a.providers?.latitude;
  const lng = a.providers?.longitude;
  const mapsUrl = lat && lng ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` : null;
  const past = new Date(a.scheduled_for).getTime() < Date.now();
  const canModify = !past && !["cancelled", "completed", "rejected"].includes(a.status);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="gap-2 self-start">
        <Link to="/appointments"><ArrowLeft className="h-4 w-4" /> Mes rendez-vous</Link>
      </Button>

      <motion.section initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-border bg-gradient-to-br from-primary/5 to-card p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Rendez-vous</p>
            <h1 className="mt-1 truncate text-2xl font-bold">{a.providers?.name ?? "Prestataire"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{a.provider_services?.name ?? a.reason ?? "Consultation"}</p>
          </div>
          <StatusBadge status={a.status} />
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <Field icon={CalendarClock} label="Date & heure" value={formatDateTimeFr(a.scheduled_for)} />
          <Field icon={CalendarClock} label="Durée" value={`${a.duration_minutes} min`} />
          {a.providers?.address || a.location_text ? (
            <Field icon={MapPin} label="Lieu" value={a.location_text ?? a.providers?.address ?? "—"} />
          ) : null}
          {a.providers?.phone ? <Field icon={Phone} label="Téléphone" value={a.providers.phone} /> : null}
        </dl>

        {a.notes ? (
          <div className="mt-4 rounded-2xl border border-border bg-muted/20 p-3 text-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
            <p className="mt-1 whitespace-pre-wrap">{a.notes}</p>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <CalendarExportMenu
            appointmentId={a.id}
            title={`RDV ${a.providers?.name ?? "prestataire"}`}
            description={a.provider_services?.name ?? a.reason ?? undefined}
            location={a.location_text ?? a.providers?.address ?? undefined}
            startIso={a.scheduled_for}
            durationMinutes={a.duration_minutes}
          />
          {mapsUrl ? (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <a href={mapsUrl} target="_blank" rel="noreferrer"><Navigation className="h-4 w-4" /> Itinéraire</a>
            </Button>
          ) : null}
          {canModify ? (
            <>
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link to="/appointments/new/$providerId" params={{ providerId: a.provider_id }}>
                  <RotateCcw className="h-4 w-4" /> Reprogrammer
                </Link>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-2">
                    <Trash2 className="h-4 w-4" /> Annuler
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Annuler ce rendez-vous ?</AlertDialogTitle>
                    <AlertDialogDescription>Cette action est irréversible. Le créneau redeviendra disponible.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Garder</AlertDialogCancel>
                    <AlertDialogAction onClick={() => cancel.mutate()} disabled={cancel.isPending}>
                      {cancel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmer l'annulation"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : null}
        </div>
      </motion.section>

      {lat && lng ? (
        <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
          <iframe
            title="Carte du rendez-vous"
            className="h-72 w-full"
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01}%2C${lat - 0.01}%2C${lng + 0.01}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lng}`}
          />
        </section>
      ) : null}

      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/appointments" })} className="gap-2 self-start">
        <ArrowLeft className="h-4 w-4" /> Retour à la liste
      </Button>
    </div>
  );
}

function Field({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}