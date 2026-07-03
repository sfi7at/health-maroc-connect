import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { FileText, Plus, Trash2, Save, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/common/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedProvider } from "@/lib/provider-store";
import { buildHead } from "@/lib/seo";
import type { RxItem } from "@/lib/prescriptions";

export const Route = createFileRoute("/_authenticated/pro/prescriptions/new")({
  head: () => buildHead({
    title: "Nouvelle ordonnance — HealthLink Pro",
    description: "Rédigez une ordonnance numérique sécurisée.",
    path: "/pro/prescriptions/new",
  }),
  component: NewPrescription,
});

const itemSchema = z.object({
  name: z.string().trim().min(1, "Médicament requis").max(160),
  dosage: z.string().trim().max(80),
  frequency: z.string().trim().max(80),
  duration: z.string().trim().max(80),
  instructions: z.string().trim().max(400),
});
const schema = z.object({
  patient_name: z.string().trim().min(2, "Nom du patient requis").max(120),
  patient_phone: z.string().trim().max(30).optional(),
  patient_age: z.number().int().min(0).max(130).nullable().optional(),
  patient_gender: z.enum(["male", "female"]).nullable().optional(),
  diagnosis: z.string().trim().max(400).optional(),
  notes: z.string().trim().max(1000).optional(),
  expires_at: z.string().optional(),
  items: z.array(itemSchema).min(1, "Au moins un médicament"),
});

function emptyItem(): RxItem {
  return { name: "", dosage: "", frequency: "", duration: "", instructions: "" };
}

function NewPrescription() {
  const { provider } = useSelectedProvider();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientAge, setPatientAge] = useState<string>("");
  const [patientGender, setPatientGender] = useState<"male" | "female" | "">("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [items, setItems] = useState<RxItem[]>([emptyItem()]);

  const canIssue = !!provider?.is_verified;

  const create = useMutation({
    mutationFn: async () => {
      if (!provider) throw new Error("Aucun profil praticien sélectionné");
      const parsed = schema.safeParse({
        patient_name: patientName,
        patient_phone: patientPhone || undefined,
        patient_age: patientAge ? Number(patientAge) : null,
        patient_gender: patientGender || null,
        diagnosis: diagnosis || undefined,
        notes: notes || undefined,
        expires_at: expiresAt || undefined,
        items,
      });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Formulaire invalide");
      }

      const primary = parsed.data.items[0];
      const payload = {
        provider_id: provider.id,
        user_id: null,
        patient_name: parsed.data.patient_name,
        patient_phone: parsed.data.patient_phone ?? null,
        patient_age: parsed.data.patient_age ?? null,
        patient_gender: parsed.data.patient_gender ?? null,
        diagnosis: parsed.data.diagnosis ?? null,
        items: parsed.data.items,
        // Backwards compat: keep the legacy single-med columns populated with the first item.
        medication: primary.name,
        dosage: primary.dosage || null,
        frequency: primary.frequency || null,
        duration: primary.duration || null,
        notes: parsed.data.notes ?? null,
        prescribed_at: new Date().toISOString().slice(0, 10),
        expires_at: parsed.data.expires_at || null,
        status: "active" as const,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase.from("prescriptions").insert(payload as any).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Ordonnance créée");
      qc.invalidateQueries({ queryKey: ["prescriptions", "provider", provider?.id] });
      navigate({ to: "/pro/prescriptions/$id", params: { id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Échec"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Nouvelle ordonnance"
        title="Rédiger une ordonnance"
        description="Chaque ordonnance reçoit un QR code de vérification unique et vérifiable publiquement."
        icon={<FileText className="h-5 w-5" />}
        actions={
          <Button asChild variant="outline" className="gap-2">
            <Link to="/pro/prescriptions"><ArrowLeft className="h-4 w-4" />Retour</Link>
          </Button>
        }
      />

      {!canIssue ? (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200">
          Votre compte n'est pas encore vérifié. Vous pouvez enregistrer un brouillon mais l'ordonnance
          ne sera considérée officielle qu'après validation par l'équipe HealthLink Maroc.
        </div>
      ) : null}

      <section className="space-y-4 rounded-3xl border border-border bg-card p-5 shadow-soft">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Patient</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Nom complet *</Label>
            <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} maxLength={120} />
          </div>
          <div className="space-y-1.5">
            <Label>Téléphone</Label>
            <Input value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} placeholder="+212…" maxLength={30} />
          </div>
          <div className="space-y-1.5">
            <Label>Âge</Label>
            <Input type="number" min={0} max={130} value={patientAge} onChange={(e) => setPatientAge(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Sexe</Label>
            <Select value={patientGender} onValueChange={(v) => setPatientGender(v as "male" | "female")}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="female">Femme</SelectItem>
                <SelectItem value="male">Homme</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Diagnostic</Label>
          <Textarea rows={2} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} maxLength={400} />
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Médicaments</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, emptyItem()])} className="gap-1">
            <Plus className="h-3.5 w-3.5" />Ajouter
          </Button>
        </div>
        {items.map((it, idx) => (
          <div key={idx} className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Médicament {idx + 1}
              </p>
              {items.length > 1 ? (
                <Button variant="ghost" size="icon" className="ml-auto h-7 w-7 text-destructive"
                        onClick={() => setItems(items.filter((_, i) => i !== idx))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs">Nom (DCI ou marque) *</Label>
                <Input value={it.name} maxLength={160}
                       onChange={(e) => updateItem(idx, { name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Dosage</Label>
                <Input value={it.dosage} placeholder="500 mg" maxLength={80}
                       onChange={(e) => updateItem(idx, { dosage: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fréquence</Label>
                <Input value={it.frequency} placeholder="3x/jour" maxLength={80}
                       onChange={(e) => updateItem(idx, { frequency: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Durée</Label>
                <Input value={it.duration} placeholder="7 jours" maxLength={80}
                       onChange={(e) => updateItem(idx, { duration: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Expiration ordonnance</Label>
                <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} disabled={idx > 0}
                       className={idx > 0 ? "opacity-0 pointer-events-none" : ""} />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs">Instructions</Label>
                <Textarea rows={2} value={it.instructions} maxLength={400}
                          onChange={(e) => updateItem(idx, { instructions: e.target.value })} />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-2 rounded-3xl border border-border bg-card p-5 shadow-soft">
        <Label>Notes complémentaires</Label>
        <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
      </section>

      <div className="flex justify-end">
        <Button onClick={() => create.mutate()} disabled={create.isPending} className="gap-2 bg-[#0B2545] hover:bg-[#0B2545]/90">
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Émettre l'ordonnance
        </Button>
      </div>
    </div>
  );

  function updateItem(idx: number, patch: Partial<RxItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
}