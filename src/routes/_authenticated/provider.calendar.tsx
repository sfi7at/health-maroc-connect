import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { CalendarRange, Download, Link as LinkIcon, Copy, ExternalLink, RefreshCw, Info } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useSelectedProvider } from "@/lib/provider-store";
import { supabase } from "@/integrations/supabase/client";
import { providerAppointmentsQuery, buildIcs, downloadIcs } from "@/lib/appointments";
import { CalendarView, type CalendarMode } from "@/components/appointments/CalendarView";
import { CalendarControls } from "@/components/appointments/CalendarControls";
import { getProviderCalendarFeed } from "@/lib/provider-calendar.functions";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/provider/calendar")({
  head: () =>
    buildHead({
      title: "Calendrier — Espace prestataire",
      description: "Visualisez tous vos rendez-vous et synchronisez-les avec Google Calendar.",
      path: "/provider/calendar",
    }),
  component: ProviderCalendarView,
});

function ProviderCalendarView() {
  const { provider } = useSelectedProvider();
  const providerId = provider?.id;
  const qc = useQueryClient();

  const fromIso = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 2);
    return d.toISOString();
  }, []);
  const toIso = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString();
  }, []);

  useEffect(() => {
    if (!providerId) return;
    const ch = supabase
      .channel(`prov-calendar-${providerId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments", filter: `provider_id=eq.${providerId}` },
        () => qc.invalidateQueries({ queryKey: ["provider_appointments", providerId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [providerId, qc]);

  const { data: appts = [], isLoading } = useQuery(
    providerAppointmentsQuery(providerId, { fromIso, toIso }),
  );

  const [mode, setMode] = useState<CalendarMode>("week");
  const [cursor, setCursor] = useState(new Date());

  const patientView = useMemo(
    () =>
      appts.map((a) => ({
        ...a,
        providers: {
          id: provider?.id ?? "",
          name: a.profiles?.full_name ?? "Patient",
          category: provider?.category ?? "doctor",
          profile_image: null,
          address: null,
          phone: null,
          latitude: null,
          longitude: null,
        },
      })),
    [appts, provider],
  );

  const feedMutation = useMutation({
    mutationFn: async () => {
      if (!providerId) throw new Error("Aucun cabinet sélectionné");
      return await getProviderCalendarFeed({ data: { providerId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const feedUrl = feedMutation.data
    ? `${typeof window !== "undefined" ? window.location.origin : ""}${feedMutation.data.path}`
    : "";
  const gcalSubscribe = feedUrl
    ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl.replace(/^https?:/, "webcal:"))}`
    : "";

  const handleBulkIcs = () => {
    if (!provider) return;
    const events = appts
      .filter((a) => ["pending", "approved", "rescheduled", "completed"].includes(a.status))
      .map((a) =>
        buildIcs({
          id: a.id,
          title: `${a.provider_services?.name ?? a.reason ?? "Consultation"} — ${a.profiles?.full_name ?? "Patient"}`,
          description: `Statut: ${a.status}`,
          startIso: a.scheduled_for,
          durationMinutes: a.duration_minutes ?? 30,
        }),
      );
    if (events.length === 0) {
      toast.info("Aucun rendez-vous à exporter.");
      return;
    }
    // buildIcs already wraps in VCALENDAR; concatenate VEVENTs into a single calendar
    const veventBlocks = events.map((ics) => ics.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/)?.[0] ?? "").filter(Boolean);
    const combined = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Vytalma//Provider Calendar//FR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:Vytalma — ${provider.name}`,
      ...veventBlocks,
      "END:VCALENDAR",
    ].join("\r\n");
    downloadIcs(`vytalma-${provider.name.toLowerCase().replace(/\s+/g, "-")}.ics`, combined);
  };

  const copyFeed = async () => {
    if (!feedUrl) return;
    await navigator.clipboard.writeText(feedUrl);
    toast.success("Lien copié");
  };

  if (!provider) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agenda"
        title="Calendrier"
        description="Vue Google Calendar-like de vos rendez-vous, avec synchronisation."
        icon={<CalendarRange className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleBulkIcs}>
              <Download className="h-4 w-4" /> Exporter .ics
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => feedMutation.mutate()}
              disabled={feedMutation.isPending}
            >
              <RefreshCw className={`h-4 w-4 ${feedMutation.isPending ? "animate-spin" : ""}`} />
              {feedMutation.data ? "Régénérer le lien" : "Synchroniser Google Calendar"}
            </Button>
          </div>
        }
      />

      {feedMutation.data ? (
        <Card className="space-y-3 border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start gap-2">
            <LinkIcon className="mt-0.5 h-4 w-4 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Lien d'abonnement (privé)</p>
              <p className="text-xs text-muted-foreground">
                Ajoutez ce lien dans Google Calendar → « Autres agendas » → « À partir de l'URL ». Google se
                synchronise automatiquement — chaque nouveau rendez-vous apparaît sans action de votre part.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input readOnly value={feedUrl} className="h-9 w-full flex-1 min-w-0 font-mono text-xs sm:w-auto" />
            <Button size="sm" variant="outline" className="gap-1.5" onClick={copyFeed}>
              <Copy className="h-3.5 w-3.5" /> Copier
            </Button>
            <Button asChild size="sm" className="gap-1.5">
              <a href={gcalSubscribe} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> Ajouter à Google Calendar
              </a>
            </Button>
          </div>
          <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            Gardez ce lien confidentiel — toute personne y ayant accès peut voir votre agenda. Régénérez-le si besoin.
          </p>
        </Card>
      ) : (
        <Card className="flex flex-wrap items-center gap-3 p-4">
          <Badge variant="secondary" className="gap-1">
            <Info className="h-3 w-3" /> Non synchronisé
          </Badge>
          <p className="text-sm text-muted-foreground">
            Générez un lien privé pour recevoir vos rendez-vous directement dans Google Calendar, Apple Calendar
            ou Outlook.
          </p>
        </Card>
      )}

      <div className="space-y-3 rounded-2xl border border-border bg-card p-3 shadow-soft">
        <CalendarControls mode={mode} setMode={setMode} cursor={cursor} setCursor={setCursor} />
        {isLoading ? (
          <Skeleton className="h-96 rounded-2xl" />
        ) : (
          <CalendarView
            mode={mode}
            cursor={cursor}
            appointments={patientView}
            onPickDay={(d) => {
              setCursor(d);
              setMode("day");
            }}
          />
        )}
      </div>
    </div>
  );
}