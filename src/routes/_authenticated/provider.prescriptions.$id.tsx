import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Download, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedProvider } from "@/lib/provider-store";
import { buildHead } from "@/lib/seo";
import { generatePrescriptionPdf, type PrescriptionItem } from "@/lib/prescription-pdf";

export const Route = createFileRoute("/_authenticated/provider/prescriptions/$id")({
  head: () => buildHead({
    title: "Ordonnance — Espace prestataire",
    description: "Détail d'une ordonnance.",
    path: "/provider/prescriptions",
  }),
  component: PrescriptionDetail,
});

function PrescriptionDetail() {
  const { id } = Route.useParams();
  const { provider } = useSelectedProvider();

  const rx = useQuery({
    queryKey: ["prescription-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("prescriptions").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const providerFull = useQuery({
    queryKey: ["provider-header", provider?.id],
    enabled: !!provider?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("providers")
        .select("name, phone, email, address, website, clinic_logo_url, prescription_header, metadata")
        .eq("id", provider!.id)
        .maybeSingle();
      return data;
    },
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("prescriptions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Ordonnance supprimée"); window.history.back(); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function download() {
    if (!rx.data) return;
    const p = providerFull.data;
    const h = ((p?.prescription_header ?? {}) as Record<string, string>);
    const meta = ((p?.metadata ?? {}) as { specialties?: string[] });
    const items = (Array.isArray(rx.data.items) ? rx.data.items : []) as PrescriptionItem[];
    const blob = await generatePrescriptionPdf({
      header: {
        clinic_name: h.clinic_name || p?.name || "",
        doctor_name: h.doctor_name || p?.name || "",
        title: h.title || "Docteur",
        specialty: h.specialty || (meta.specialties?.[0] ?? ""),
        address: h.address || p?.address || "",
        phone: h.phone || p?.phone || "",
        email: h.email || p?.email || "",
        website: h.website || p?.website || "",
        inpe: h.inpe || "",
        logo_url: p?.clinic_logo_url || "",
      },
      patient: {
        name: rx.data.patient_name ?? "—",
        age: rx.data.patient_age,
        gender: rx.data.patient_gender,
        weight_kg: null,
        allergies: null,
      },
      diagnosis: rx.data.diagnosis,
      items,
      notes: rx.data.notes,
      prescribed_at: (rx.data.prescribed_at ?? new Date().toISOString()).slice(0, 10),
      verification_url: rx.data.verification_token
        ? `${window.location.origin}/prescription/${rx.data.verification_token}`
        : null,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ordonnance-${(rx.data.patient_name || "patient").replace(/\s+/g, "_")}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (rx.isLoading) return <Skeleton className="h-96 rounded-3xl" />;
  if (!rx.data) return null;

  const items = (Array.isArray(rx.data.items) ? rx.data.items : []) as PrescriptionItem[];

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="gap-2">
        <Link to="/provider/prescriptions"><ArrowLeft className="h-4 w-4" /> Retour</Link>
      </Button>
      <PageHeader
        eyebrow="Ordonnance"
        title={rx.data.patient_name ?? "Patient"}
        description={`Établie le ${new Date(rx.data.prescribed_at).toLocaleDateString("fr-FR")}`}
        icon={<FileText className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button size="icon" variant="outline" onClick={() => del.mutate()} className="text-destructive sm:hidden" aria-label="Supprimer"><Trash2 className="h-4 w-4" /></Button>
            <Button variant="outline" onClick={() => del.mutate()} className="hidden gap-2 text-destructive sm:inline-flex"><Trash2 className="h-4 w-4" />Supprimer</Button>
            <Button size="icon" onClick={download} className="sm:hidden" aria-label="Télécharger PDF"><Download className="h-4 w-4" /></Button>
            <Button onClick={download} className="hidden gap-2 sm:inline-flex"><Download className="h-4 w-4" /> Télécharger PDF</Button>
          </div>
        }
      />

      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Badge>{rx.data.status}</Badge>
          {rx.data.verification_token && (
            <Badge variant="secondary">Code : {String(rx.data.verification_token).slice(0, 8)}</Badge>
          )}
        </div>
        {rx.data.diagnosis && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Diagnostic</p>
            <p className="mt-1 text-sm">{rx.data.diagnosis}</p>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Prescription</p>
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="rounded-2xl border border-border bg-muted/30 p-3">
              <p className="font-semibold">{i + 1}. {it.medication} {it.form ? <span className="text-xs text-muted-foreground">— {it.form}</span> : null}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {[it.dosage && `Posologie : ${it.dosage}`, it.frequency && `Fréquence : ${it.frequency}`, it.duration && `Durée : ${it.duration}`].filter(Boolean).join(" · ")}
              </p>
              {it.notes && <p className="mt-1 text-xs italic text-muted-foreground">Note : {it.notes}</p>}
            </div>
          ))}
        </div>
      </Card>

      {rx.data.notes && (
        <Card className="p-5">
          <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Recommandations</p>
          <p className="text-sm whitespace-pre-wrap">{rx.data.notes}</p>
        </Card>
      )}
    </div>
  );
}