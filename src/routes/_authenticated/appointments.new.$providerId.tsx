import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Building2, CalendarPlus, CheckCircle2, Loader2, Stethoscope, MapPin, ListPlus, Navigation, PhoneCall, ShieldCheck, Video } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { providerByIdQuery } from "@/lib/queries";
import { isBookable, directionsUrl, type DoctorRow } from "@/lib/doctors";
import { buildHead } from "@/lib/seo";
import { initialsOf, formatDateTimeFr } from "@/lib/format";
import {
  blockedDatesQuery,
  bookedSlotsQuery,
  dateToIsoDate,
  generateSlots,
  providerSchedulesQuery,
  providerServicesQuery,
} from "@/lib/appointments";
import { Stepper } from "@/components/appointments/Stepper";
import { ServicePicker } from "@/components/appointments/ServicePicker";
import { DateScroller } from "@/components/appointments/DateScroller";
import { SlotGrid } from "@/components/appointments/SlotGrid";

export const Route = createFileRoute("/_authenticated/appointments/new/$providerId")({
  head: () =>
    buildHead({
      title: "Réserver un rendez-vous — Vytalma",
      description: "Choisissez votre service, votre date et votre créneau auprès d'un professionnel vérifié.",
      path: "/appointments/new",
    }),
  component: BookFlow,
});

const STEPS = ["Service", "Date", "Horaire", "Confirmation"];

function BookFlow() {
  const { providerId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: provider, isLoading: loadingProvider } = useQuery(providerByIdQuery(providerId));
  const bookable = isBookable(provider as DoctorRow | null | undefined);
  const { data: services = [], isLoading: loadingServices } = useQuery(providerServicesQuery(providerId));
  const { data: schedulesRaw = [] } = useQuery(providerSchedulesQuery(providerId));
  // Never invent availability: only slots explicitly configured by the provider are bookable.
  const schedules = schedulesRaw;
  const { data: blocked = [] } = useQuery(blockedDatesQuery(providerId, new Date().toISOString()));

  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [dateIso, setDateIso] = useState(dateToIsoDate(new Date()));
  const [slotIso, setSlotIso] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [consultationType, setConsultationType] = useState<"in_person" | "video" | "phone">("in_person");

  const { data: booked = [], isFetching: loadingBookedSlots } = useQuery(bookedSlotsQuery(providerId, dateIso));
  const selectedService = useMemo(() => services.find((s) => s.id === serviceId) ?? null, [services, serviceId]);
  const slotMinutes = selectedService?.duration_minutes;
  const slots = useMemo(
    () => generateSlots({ dateIso, schedules, blocked, bookedAt: booked, slotMinutes }),
    [dateIso, schedules, blocked, booked, slotMinutes],
  );

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Connectez-vous pour réserver.");
      if (!bookable) throw new Error("Ce praticien n'accepte pas encore les rendez-vous en ligne.");
      if (!slotIso) throw new Error("Sélectionnez un créneau.");
      if (!slots.some((slot) => slot.iso === slotIso && slot.available)) {
        throw new Error("Ce créneau n'est plus disponible. Choisissez-en un autre.");
      }
      const duration = selectedService?.duration_minutes ?? 30;
      const { data, error } = await supabase
        .from("appointments")
        .insert({
          patient_id: user.id,
          provider_id: providerId,
          scheduled_for: slotIso,
          duration_minutes: duration,
          service_id: serviceId,
          reason: selectedService?.name ?? null,
          notes: notes.trim() || null,
          consultation_type: consultationType,
          location_text: consultationType === "in_person" ? provider?.address ?? null : null,
          status: "pending",
        })
        .select("id")
        .single();
      if (error) {
        if (error.code === "23505") throw new Error("Ce créneau vient d'être réservé. Choisissez-en un autre.");
        throw error;
      }
      return data;
    },
    onSuccess: (row) => {
      toast.success("Rendez-vous envoyé");
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["booked_slots"] });
      qc.invalidateQueries({ queryKey: ["provider_appointments", providerId] });
      qc.invalidateQueries({ queryKey: ["doctor_dashboard_stats", providerId] });
      navigate({ to: "/appointments/$id", params: { id: row!.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const waitlist = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Connectez-vous.");
      const { error } = await supabase.from("appointment_waitlist").insert({
        patient_id: user.id,
        provider_id: providerId,
        service_id: serviceId,
        preferred_date: dateIso,
        preferred_period: "any",
        notes: notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Vous êtes sur la liste d'attente"),
    onError: (e: Error) => toast.error(e.message),
  });

  const canNext =
    (step === 0) ||
    (step === 1 && !!dateIso) ||
    (step === 2 && !!slotIso) ||
    step === 3;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="gap-2 self-start">
        <Link to="/doctors/$id" params={{ id: providerId }}><ArrowLeft className="h-4 w-4" /> Retour</Link>
      </Button>

      {loadingProvider || !provider ? (
        <Skeleton className="h-32 rounded-3xl" />
      ) : !bookable ? (
        <section className="rounded-3xl border border-border bg-card p-6 text-center shadow-soft">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <Stethoscope className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-lg font-semibold">La prise de rendez-vous en ligne n'est pas disponible</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {provider.name} n'est pas encore intégré à notre système de réservation. Vous pouvez consulter l'adresse
            ou contacter le cabinet directement.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Button asChild className="gap-2">
              <a href={directionsUrl(provider as DoctorRow)} target="_blank" rel="noreferrer">
                <Navigation className="h-4 w-4" /> Itinéraire
              </a>
            </Button>
            <Button asChild variant="outline">
              <Link to="/doctors/$id" params={{ id: providerId }}>Retour au profil</Link>
            </Button>
          </div>
        </section>
      ) : (
        <motion.section
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-border bg-gradient-to-br from-primary/5 to-card p-5 shadow-soft"
        >
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-primary/10 text-primary">
              {provider.profile_image ? (
                <img src={provider.profile_image} alt="" className="h-full w-full object-cover" />
              ) : <span className="text-sm font-semibold">{initialsOf(provider.name)}</span>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Rendez-vous avec</p>
              <h1 className="truncate text-lg font-semibold">{provider.name}</h1>
              {provider.address ? (
                <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" /> {provider.address}
                </p>
              ) : null}
            </div>
            {provider.is_verified ? <Badge variant="secondary" className="shrink-0">Vérifié</Badge> : null}
          </div>
        </motion.section>
      )}

      {bookable ? <Stepper steps={STEPS} current={step} /> : null}

      {bookable ? (
      <>
      <AnimatePresence mode="wait">
        <motion.section
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="rounded-3xl border border-border bg-card p-5 shadow-soft"
        >
          {step === 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold">Choisissez votre service</h2>
              {loadingServices ? <Skeleton className="h-32 rounded-2xl" /> : (
                <ServicePicker services={services} value={serviceId} onChange={(id) => {
                  setServiceId(id);
                  if (!services.find((item) => item.id === id)?.is_online_eligible) setConsultationType("in_person");
                }} />
              )}
              <div className="space-y-2 pt-2">
                <Label>Mode de consultation</Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  <ConsultationModeButton icon={Building2} label="Au cabinet" description="Consultation sur place" active={consultationType === "in_person"} onClick={() => setConsultationType("in_person")} />
                  <ConsultationModeButton icon={Video} label="En vidéo" description="Depuis votre appareil" active={consultationType === "video"} disabled={!selectedService?.is_online_eligible} onClick={() => setConsultationType("video")} />
                  <ConsultationModeButton icon={PhoneCall} label="Par téléphone" description="Le médecin vous appelle" active={consultationType === "phone"} disabled={!selectedService?.is_online_eligible} onClick={() => setConsultationType("phone")} />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold">Choisissez une date</h2>
              <DateScroller value={dateIso} onChange={setDateIso} days={28} />
              <p className="text-xs text-muted-foreground capitalize">
                {new Date(`${dateIso}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" })}
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold">Choisissez un créneau</h2>
              {loadingBookedSlots ? <Skeleton className="h-32 rounded-2xl" /> : <SlotGrid slots={slots} selected={slotIso} onSelect={setSlotIso} />}
              {!loadingBookedSlots && (slots.length === 0 || slots.every((s) => !s.available)) ? (
                <div className="flex flex-col items-start gap-2 rounded-2xl border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground">
                  <p>{slots.length === 0 ? "Aucun créneau n'est disponible à cette date." : "Tous les créneaux sont occupés."} Rejoignez la liste d'attente pour être prévenu en cas de disponibilité.</p>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => waitlist.mutate()} disabled={waitlist.isPending}>
                    <ListPlus className="h-3.5 w-3.5" /> Rejoindre la liste
                  </Button>
                </div>
              ) : null}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold">Confirmation</h2>
              <dl className="grid gap-2 rounded-2xl border border-border bg-muted/20 p-4 text-sm">
                <Row label="Prestataire" value={provider?.name ?? "—"} />
                <Row label="Service" value={selectedService?.name ?? "Consultation standard"} />
                <Row label="Date" value={slotIso ? formatDateTimeFr(slotIso) : "—"} />
                <Row label="Durée" value={`${selectedService?.duration_minutes ?? 30} min`} />
                <Row label="Mode" value={consultationType === "video" ? "Téléconsultation vidéo" : consultationType === "phone" ? "Consultation téléphonique" : "Au cabinet"} />
                {selectedService?.price_mad != null ? <Row label="Prix" value={`${selectedService.price_mad} MAD`} /> : null}
                {consultationType === "in_person" && provider?.address ? <Row label="Lieu" value={provider.address} /> : null}
              </dl>
              {consultationType !== "in_person" ? (
                <div className="flex gap-3 rounded-2xl border border-info/30 bg-info/10 p-3 text-sm">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-info" />
                  <p>Les instructions de connexion seront communiquées après confirmation du médecin. Ne partagez jamais de données médicales via un lien non vérifié.</p>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optionnel)</Label>
                <Textarea id="notes" rows={3} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Symptômes, antécédents, demande particulière…" />
              </div>
            </div>
          )}
        </motion.section>
      </AnimatePresence>

      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Précédent
        </Button>
        {step < STEPS.length - 1 ? (
          <Button size="sm" disabled={!canNext || loadingBookedSlots} onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} className="gap-1">
            Suivant <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="lg" className="gap-2" onClick={() => create.mutate()} disabled={create.isPending || !slotIso}>
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Confirmer le rendez-vous
          </Button>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        <CalendarPlus className="mr-1 inline h-3 w-3" /> Votre demande est envoyée au cabinet. Vous recevrez une confirmation et un rappel automatique.
      </p>
      </>
      ) : null}
    </div>
  );
}

function ConsultationModeButton({ icon: Icon, label, description, active, disabled, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; description: string; active: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled} aria-pressed={active} onClick={onClick} className={`rounded-2xl border p-3 text-left transition ${active ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:border-primary/30"} disabled:cursor-not-allowed disabled:opacity-45`}>
      <Icon className="mb-2 h-4 w-4 text-primary" />
      <span className="block text-sm font-semibold">{label}</span>
      <span className="block text-xs text-muted-foreground">{description}</span>
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] items-baseline gap-2">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-medium">{value}</dd>
    </div>
  );
}
