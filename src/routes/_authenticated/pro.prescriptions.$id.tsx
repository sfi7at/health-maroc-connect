import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Download, QrCode, Ban, FileText, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import {
  prescriptionByIdQuery, renderPrescriptionPdf, generateQrDataUrl, verificationUrl,
} from "@/lib/prescriptions";
import { useSelectedProvider } from "@/lib/provider-store";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/pro/prescriptions/$id")({
  head: () => buildHead({
    title: "Ordonnance — HealthLink Pro",
    description: "Détail d'une ordonnance numérique et vérification.",
    path: "/pro/prescriptions",
  }),
  component: PrescriptionDetail,
});

function PrescriptionDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { provider } = useSelectedProvider();
  const { data, isLoading } = useQuery(prescriptionByIdQuery(id));
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (data?.verification_token) generateQrDataUrl(data.verification_token).then(setQr).catch(() => setQr(null));
  }, [data?.verification_token]);

  const cancel = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("prescriptions").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ordonnance annulée");
      qc.invalidateQueries({ queryKey: ["prescription", id] });
      qc.invalidateQueries({ queryKey: ["prescriptions", "provider"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Échec"),
  });

  if (isLoading) return <Skeleton className="h-96 rounded-3xl" />;
  if (!data) {
    return (
      <div className="space-y-4">
        <p>Ordonnance introuvable.</p>
        <Button variant="outline" onClick={() => navigate({ to: "/pro/prescriptions" })}>Retour</Button>
      </div>
    );
  }

  const download = async () => {
    const blob = await renderPrescriptionPdf(data, provider?.name ?? "Praticien");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ordonnance-${data.id.slice(0, 8)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ordonnance"
        title={data.patient_name ?? "Patient"}
        description={`Émise le ${new Date(data.prescribed_at).toLocaleDateString("fr-FR")} · N° ${data.id.slice(0, 8).toUpperCase()}`}
        icon={<FileText className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="gap-2">
              <Link to="/pro/prescriptions"><ArrowLeft className="h-4 w-4" />Retour</Link>
            </Button>
            <Button onClick={download} className="gap-2 bg-[#0B2545] hover:bg-[#0B2545]/90">
              <Download className="h-4 w-4" />Télécharger PDF
            </Button>
            {data.status === "active" ? (
              <Button variant="destructive" onClick={() => cancel.mutate()} disabled={cancel.isPending} className="gap-2">
                {cancel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                Annuler
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={data.status === "active" ? "default" : "secondary"}>{data.status}</Badge>
        {data.expires_at ? (
          <Badge variant="outline">Valable jusqu'au {new Date(data.expires_at).toLocaleDateString("fr-FR")}</Badge>
        ) : null}
      </div>

      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6 rounded-3xl border border-border bg-card p-6 shadow-soft">
          {data.diagnosis ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Diagnostic</p>
              <p className="mt-1 text-sm">{data.diagnosis}</p>
            </div>
          ) : null}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prescription</p>
            <ol className="mt-2 space-y-3">
              {(data.items ?? []).map((it, i) => (
                <li key={i} className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                  <p className="font-semibold">{i + 1}. {it.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[it.dosage, it.frequency, it.duration].filter(Boolean).join(" • ")}
                  </p>
                  {it.instructions ? <p className="mt-1 text-xs">{it.instructions}</p> : null}
                </li>
              ))}
            </ol>
          </div>

          {data.notes ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{data.notes}</p>
            </div>
          ) : null}
        </div>

        <aside className="space-y-3 rounded-3xl border border-border bg-card p-5 text-center shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <QrCode className="mr-1 inline h-3.5 w-3.5" />QR de vérification
          </p>
          {qr ? <img src={qr} alt="QR code" className="mx-auto h-48 w-48 rounded-2xl border border-border bg-white p-2" />
              : <Skeleton className="mx-auto h-48 w-48 rounded-2xl" />}
          <a
            href={verificationUrl(data.verification_token)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 break-all text-xs text-primary hover:underline"
          >
            {verificationUrl(data.verification_token)}<ExternalLink className="h-3 w-3" />
          </a>
          <p className="text-[10px] text-muted-foreground">
            Toute pharmacie ou patient peut scanner ce QR code pour vérifier l'authenticité.
          </p>
        </aside>
      </section>
    </div>
  );
}