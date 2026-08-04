import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, ShieldCheck, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSecureVideoAccess } from "@/lib/video-access.functions";
import { buildHead } from "@/lib/seo";

type JitsiApi = { dispose: () => void };
type JitsiConstructor = new (domain: string, options: { roomName: string; parentNode: HTMLElement; jwt: string; width: string; height: string; configOverwrite: Record<string, unknown>; interfaceConfigOverwrite: Record<string, unknown> }) => JitsiApi;

export const Route = createFileRoute("/_authenticated/teleconsultation/$id")({
  head: () => buildHead({ title: "Téléconsultation sécurisée — Vytalma", description: "Salle privée de téléconsultation.", path: "/teleconsultation" }),
  component: SecureTeleconsultation,
});

function SecureTeleconsultation() {
  const { id } = Route.useParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const access = useQuery({ queryKey: ["secure-video-access", id], queryFn: () => getSecureVideoAccess({ data: { appointmentId: id } }), retry: false, staleTime: 45_000 });

  useEffect(() => {
    if (!access.data || !containerRef.current) return;
    let api: JitsiApi | undefined;
    let cancelled = false;
    const scriptId = "jaas-external-api";
    const mount = () => {
      if (cancelled || !containerRef.current) return;
      const Constructor = (window as typeof window & { JitsiMeetExternalAPI?: JitsiConstructor }).JitsiMeetExternalAPI;
      if (!Constructor) return;
      api = new Constructor(access.data.domain, {
        roomName: `${access.data.appId}/${access.data.roomName}`,
        parentNode: containerRef.current,
        jwt: access.data.token,
        width: "100%",
        height: "100%",
        configOverwrite: { prejoinPageEnabled: true, disableInviteFunctions: true, enableWelcomePage: false },
        interfaceConfigOverwrite: { MOBILE_APP_PROMO: false, DISABLE_JOIN_LEAVE_NOTIFICATIONS: true },
      });
    };
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existing) mount();
    else {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://${access.data.domain}/external_api.js`;
      script.async = true;
      script.onload = mount;
      document.head.appendChild(script);
    }
    return () => { cancelled = true; api?.dispose(); };
  }, [access.data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><Button asChild variant="ghost" size="sm"><Link to="/appointments/$id" params={{ id }}><ArrowLeft className="h-4 w-4" /> Rendez-vous</Link></Button><p className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" /> Accès authentifié et temporaire</p></div>
      {access.isLoading ? <div className="grid min-h-[65vh] place-items-center rounded-3xl border bg-card"><div className="text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" /><p className="mt-3 text-sm text-muted-foreground">Préparation de la salle sécurisée…</p></div></div> : access.error ? <div className="grid min-h-[40vh] place-items-center rounded-3xl border border-warning/30 bg-warning/5 p-6 text-center"><div><Video className="mx-auto h-8 w-8 text-warning" /><h1 className="mt-3 font-semibold">Salle indisponible</h1><p className="mt-1 max-w-md text-sm text-muted-foreground">{access.error.message}</p></div></div> : <div ref={containerRef} className="h-[72vh] min-h-[520px] overflow-hidden rounded-3xl border border-border bg-slate-950 shadow-elevated" />}
      <p className="text-center text-xs text-muted-foreground">Ne partagez jamais l'accès à cette salle. Quittez l'appel lorsque la consultation est terminée.</p>
    </div>
  );
}
