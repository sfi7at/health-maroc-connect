import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarPlus, Clock, Loader2, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { doctorByIdQuery, readDoctorMeta, priceLabel } from "@/lib/doctors";
import { initialsOf } from "@/lib/format";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/appointments/book/$providerId")({
  head: () => buildHead({
    title: "Réserver un rendez-vous — HealthLink Maroc",
    description: "Confirmez votre rendez-vous médical.",
    path: "/appointments/book",
  }),
  component: BookPage,
});

const HOURS = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"];

function BookPage() {
  const { providerId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: doctor, isLoading } = useQuery(doctorByIdQuery(providerId));

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const min = today.toISOString().slice(0, 10);
  const [date, setDate] = useState<string>(min);
  const [time, setTime] = useState<string>("");
  const [reason, setReason] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Connectez-vous");
      if (!time) throw new Error("Sélectionnez un horaire");
      const scheduled = new Date(`${date}T${time}:00`);
      const { error } = await supabase.from("appointments").insert({
        patient_id: user.id,
        provider_id: providerId,
        scheduled_for: scheduled.toISOString(),
        reason: reason.trim() || null,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Demande de rendez-vous envoyée");
      qc.invalidateQueries({ queryKey: ["appointments"] });
      navigate({ to: "/appointments" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const meta = doctor ? readDoctorMeta(doctor) : null;
  const price = meta ? priceLabel(meta) : null;
  const dayKey = useMemo(() => {
    const d = new Date(`${date}T12:00:00`);
    return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][d.getDay()];
  }, [date]);
  const dayLabel = useMemo(() => {
    const d = new Date(`${date}T12:00:00`);
    return d.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" });
  }, [date]);
  const open = doctor ? (doctor.working_hours as Record<string, { open?: string; close?: string }>)?.[dayKey] : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="gap-2 self-start">
        <Link to="/doctors/$id" params={{ id: providerId }}><ArrowLeft className="h-4 w-4" /> Retour</Link>
      </Button>

      {isLoading || !doctor ? (
        <Skeleton className="h-32 rounded-3xl" />
      ) : (
        <motion.section
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-border bg-card p-5 shadow-soft"
        >
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-muted">
              {doctor.profile_image ? (
                <img src={doctor.profile_image} alt="" className="h-full w-full object-cover" />
              ) : <span className="text-sm font-semibold">{initialsOf(doctor.name)}</span>}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Rendez-vous avec</p>
              <h1 className="truncate text-lg font-semibold">Dr. {doctor.name}</h1>
              <p className="truncate text-xs text-muted-foreground">{doctor.cities?.name_fr ?? ""}</p>
            </div>
            {price ? <Badge variant="secondary" className="ml-auto shrink-0">{price}</Badge> : null}
          </div>
        </motion.section>
      )}

      <section className="space-y-4 rounded-3xl border border-border bg-card p-5 shadow-soft">
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" min={min} value={date} onChange={(e) => setDate(e.target.value)} />
          <p className="text-xs text-muted-foreground">{dayLabel}</p>
          {open?.open && open?.close ? (
            <p className="text-xs text-primary">Cabinet ouvert {open.open} – {open.close}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Horaire</Label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {HOURS.map((h) => (
              <Button
                key={h}
                type="button"
                variant={time === h ? "default" : "outline"}
                size="sm"
                onClick={() => setTime(h)}
                className="gap-1"
              >
                <Clock className="h-3 w-3" /> {h}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason">Motif (optionnel)</Label>
          <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={3} placeholder="Symptômes, suivi, contrôle…" />
        </div>

        <Button size="lg" className="w-full gap-2" onClick={() => create.mutate()} disabled={create.isPending}>
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
          Confirmer le rendez-vous
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Votre demande est envoyée au cabinet. Vous recevrez une confirmation.
        </p>
      </section>
    </div>
  );
}