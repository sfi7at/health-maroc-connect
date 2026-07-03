import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Download, FileText, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/common/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedProvider } from "@/lib/provider-store";
import { buildHead } from "@/lib/seo";
import {
  generatePrescriptionPdf,
  type PrescriptionItem,
  type PrescriptionPayload,
} from "@/lib/prescription-pdf";

export const Route = createFileRoute("/_authenticated/provider/prescriptions/new")({
  head: () => buildHead({
    title: "Nouvelle ordonnance — Espace prestataire",
    description: "Composez une ordonnance et exportez-la en PDF.",
    path: "/provider/prescriptions/new",
  }),
  component: NewPrescription,
});

type ProviderRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  clinic_logo_url: string | null;
  prescription_header: Record<string, string> | null;
  metadata: Record<string, unknown> | null;
};

function NewPrescription() {
  const { provider } = useSelectedProvider();
  const navigate = useNavigate();

  const { data: providerFull } = useQuery({
    queryKey: ["provider-header", provider?.id],
    enabled: !!provider?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("id, name, phone, email, address, website, clinic_logo_url, prescription_header, metadata")
        .eq("id", provider!.id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ProviderRow;
    },
  });

  const [patient, setPatient] = useState({ name: "", age: "", gender: "", weight_kg: "", phone: "", allergies: "" });
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PrescriptionItem[]>([
    { medication: "", dosage: "", form: "", frequency: "", duration: "", notes: "" },
  ]);

  const header = useMemo(() => {
    const h = (providerFull?.prescription_header ?? {}) as Record<string, string>;
    const meta = (providerFull?.metadata ?? {}) as { specialties?: string[] };
    return {
      clinic_name: h.clinic_name || providerFull?.name || "",
      doctor_name: h.doctor_name || providerFull?.name || "",
      title: h.title || "Docteur",
      specialty: h.specialty || (meta.specialties?.[0] ?? ""),
      address: h.address || providerFull?.address || "",
      phone: h.phone || providerFull?.phone || "",
      email: h.email || providerFull?.email || "",
      website: h.website || providerFull?.website || "",
      inpe: h.inpe || "",
      logo_url: providerFull?.clinic_logo_url || "",
    };
  }, [providerFull]);

  const buildPayload = (verificationToken?: string | null): PrescriptionPayload => ({
    header,
    patient: {
      name: patient.name || "—",
      age: patient.age ? Number(patient.age) : null,
      gender: patient.gender || null,
      weight_kg: patient.weight_kg ? Number(patient.weight_kg) : null,
      allergies: patient.allergies || null,
    },
    diagnosis: diagnosis || null,
    items: items.filter((x) => x.medication.trim()),
    notes: notes || null,
    prescribed_at: new Date().toISOString().slice(0, 10),
    verification_url: verificationToken
      ? `${typeof window !== "undefined" ? window.location.origin : "https://healthlink.ma"}/prescription/${verificationToken}`
      : null,
  });

  const save = useMutation({
    mutationFn: async (opts: { download: boolean }) => {
      if (!provider?.id) throw new Error("Provider manquant");
      if (!patient.name.trim()) throw new Error("Nom du patient requis");
      const valid = items.filter((x) => x.medication.trim());
      if (!valid.length) throw new Error("Ajoutez au moins un médicament");

      const first = valid[0];
      const { data: inserted, error } = await supabase
        .from("prescriptions")
        .insert({
          provider_id: provider.id,
          prescribed_by: provider.id,
          patient_name: patient.name.trim(),
          patient_age: patient.age ? Number(patient.age) : null,
          patient_gender: patient.gender || null,
          patient_phone: patient.phone || null,
          diagnosis: diagnosis || null,
          medication: first.medication,
          dosage: first.dosage || null,
          frequency: first.frequency || null,
          duration: first.duration || null,
          notes: notes || null,
          items: valid as unknown as never,
          status: "active",
        })
        .select("id, verification_token")
        .single();
      if (error) throw error;

      if (opts.download) {
        const blob = await generatePrescriptionPdf(buildPayload(inserted.verification_token));
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ordonnance-${patient.name.trim().replace(/\s+/g, "_")}-${inserted.id.slice(0, 6)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
      return inserted.id;
    },
    onSuccess: (id, vars) => {
      toast.success(vars.download ? "Ordonnance générée et téléchargée" : "Ordonnance enregistrée");
      navigate({ to: "/provider/prescriptions/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const previewPdf = useMutation({
    mutationFn: async () => {
      const blob = await generatePrescriptionPdf(buildPayload());
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    },
  });

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="gap-2">
        <Link to="/provider/prescriptions"><ArrowLeft className="h-4 w-4" /> Retour</Link>
      </Button>
      <PageHeader
        eyebrow="Nouvelle ordonnance"
        title="Générateur d'ordonnances"
        description="Composez, prévisualisez, puis téléchargez au format PDF."
        icon={<FileText className="h-5 w-5" />}
      />

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Patient</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Nom complet *"><Input value={patient.name} onChange={(e) => setPatient({ ...patient, name: e.target.value })} /></Field>
          <Field label="Âge"><Input type="number" min={0} value={patient.age} onChange={(e) => setPatient({ ...patient, age: e.target.value })} /></Field>
          <Field label="Sexe">
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={patient.gender} onChange={(e) => setPatient({ ...patient, gender: e.target.value })}>
              <option value="">—</option>
              <option value="M">Homme</option>
              <option value="F">Femme</option>
            </select>
          </Field>
          <Field label="Poids (kg)"><Input type="number" min={0} step="0.1" value={patient.weight_kg} onChange={(e) => setPatient({ ...patient, weight_kg: e.target.value })} /></Field>
          <Field label="Téléphone"><Input value={patient.phone} onChange={(e) => setPatient({ ...patient, phone: e.target.value })} /></Field>
          <Field label="Allergies connues"><Input value={patient.allergies} onChange={(e) => setPatient({ ...patient, allergies: e.target.value })} placeholder="Pénicilline, arachide…" /></Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Diagnostic</h2>
        <Textarea rows={3} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Contexte clinique, diagnostic principal…" />
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Prescription</h2>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setItems([...items, { medication: "", dosage: "", form: "", frequency: "", duration: "", notes: "" }])}>
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
        </div>
        <div className="space-y-4">
          {items.map((it, i) => (
            <div key={i} className="rounded-2xl border border-border bg-muted/30 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-primary">#{i + 1}</span>
                {items.length > 1 && (
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setItems(items.filter((_, x) => x !== i))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Médicament *"><Input value={it.medication} onChange={(e) => update(i, { medication: e.target.value })} placeholder="Amoxicilline" /></Field>
                <Field label="Forme"><Input value={it.form} onChange={(e) => update(i, { form: e.target.value })} placeholder="Comprimé 500mg" /></Field>
                <Field label="Posologie"><Input value={it.dosage} onChange={(e) => update(i, { dosage: e.target.value })} placeholder="1 comprimé" /></Field>
                <Field label="Fréquence"><Input value={it.frequency} onChange={(e) => update(i, { frequency: e.target.value })} placeholder="3× par jour" /></Field>
                <Field label="Durée"><Input value={it.duration} onChange={(e) => update(i, { duration: e.target.value })} placeholder="7 jours" /></Field>
                <Field label="Note"><Input value={it.notes} onChange={(e) => update(i, { notes: e.target.value })} placeholder="À prendre avec un repas" /></Field>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recommandations</h2>
        <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Conseils, contrôle, hygiène de vie…" />
      </Card>

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" onClick={() => previewPdf.mutate()} disabled={previewPdf.isPending} className="gap-2">
          <FileText className="h-4 w-4" /> Prévisualiser
        </Button>
        <Button variant="outline" onClick={() => save.mutate({ download: false })} disabled={save.isPending} className="gap-2">
          <Save className="h-4 w-4" /> Enregistrer
        </Button>
        <Button onClick={() => save.mutate({ download: true })} disabled={save.isPending} className="gap-2 shadow-lg">
          <Download className="h-4 w-4" /> {save.isPending ? "Génération…" : "Enregistrer + PDF"}
        </Button>
      </div>
    </div>
  );

  function update(i: number, patch: Partial<PrescriptionItem>) {
    setItems((prev) => prev.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}