import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, Copy, KeyRound, Stethoscope, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AdminHeader } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { adminCreateDoctor } from "@/lib/doctor-admin.functions";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/doctors/new")({
  head: () => buildHead({
    title: "Ajouter un médecin — Admin",
    description: "Créer un compte médecin certifié.",
    path: "/admin/doctors/new",
  }),
  component: AdminNewDoctor,
});

function AdminNewDoctor() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    email: "", full_name: "", phone: "",
    specialty_slug: "", specialty_label: "",
    city_id: "", address: "", google_maps_url: "",
    description: "", languages: "Français, Arabe",
    is_verified: true, is_active: true,
  });
  const [result, setResult] = useState<null | {
    email: string; temporary_password: string; recovery_link: string | null; provider_id: string;
  }>(null);

  const cities = useQuery({
    queryKey: ["admin-cities-lite"],
    queryFn: async () => {
      const { data } = await supabase.from("cities").select("id, name_fr").order("name_fr").limit(500);
      return data ?? [];
    },
  });
  const specialties = useQuery({
    queryKey: ["admin-specialties-lite"],
    queryFn: async () => {
      const { data } = await supabase.from("specialties").select("id, slug, name_fr").order("name_fr").limit(500);
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: () => adminCreateDoctor({
      data: {
        email: form.email.trim(),
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        specialty_slug: form.specialty_slug || null,
        specialty_label: form.specialty_label.trim() || null,
        city_id: form.city_id || null,
        address: form.address.trim() || null,
        google_maps_url: form.google_maps_url.trim() || null,
        description: form.description.trim() || null,
        languages: form.languages.split(",").map((s) => s.trim()).filter(Boolean),
        insurances: [],
        is_verified: form.is_verified,
        is_active: form.is_active,
      },
    }),
    onSuccess: (data) => {
      toast.success("Médecin créé et indexé dans l'annuaire public");
      setResult({
        email: data.email,
        temporary_password: data.temporary_password,
        recovery_link: data.recovery_link,
        provider_id: data.provider_id,
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copié`);
  }

  if (result) {
    return (
      <div className="space-y-6">
        <AdminHeader title="Compte médecin créé" description="Transmettez ces identifiants de manière sécurisée au médecin." icon={Check} />
        <Card className="space-y-4 border-primary/40 p-6">
          <Row label="Email" value={result.email} onCopy={() => copy(result.email, "Email")} />
          <Row label="Mot de passe temporaire" value={result.temporary_password} onCopy={() => copy(result.temporary_password, "Mot de passe")} icon={KeyRound} />
          {result.recovery_link && (
            <Row label="Lien d'activation (mot de passe)" value={result.recovery_link} onCopy={() => copy(result.recovery_link!, "Lien")} />
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" onClick={() => { setResult(null); setForm({ ...form, email: "", full_name: "", phone: "" }); }}>Ajouter un autre</Button>
            <Button onClick={() => nav({ to: "/admin/providers" })}>Voir les prestataires</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="gap-2">
        <Link to="/admin/providers"><ArrowLeft className="h-4 w-4" /> Prestataires</Link>
      </Button>
      <AdminHeader title="Ajouter un médecin certifié" description="Créer un compte fermé — le médecin sera automatiquement indexé dans l'annuaire public." icon={Stethoscope} />

      <Card className="p-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Identité</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nom complet *"><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Dr. Sara El Amrani" /></Field>
          <Field label="Email professionnel *"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="sara@cabinet.ma" /></Field>
          <Field label="Téléphone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+212 6 …" /></Field>
          <Field label="Langues (séparées par virgule)"><Input value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} /></Field>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Spécialité & localisation</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Spécialité (annuaire)">
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.specialty_slug} onChange={(e) => {
              const sp = specialties.data?.find((x) => x.slug === e.target.value);
              setForm({ ...form, specialty_slug: e.target.value, specialty_label: sp?.name_fr ?? "" });
            }}>
              <option value="">—</option>
              {(specialties.data ?? []).map((s) => (<option key={s.id} value={s.slug}>{s.name_fr}</option>))}
            </select>
          </Field>
          <Field label="Libellé affiché"><Input value={form.specialty_label} onChange={(e) => setForm({ ...form, specialty_label: e.target.value })} placeholder="Cardiologue" /></Field>
          <Field label="Ville">
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.city_id} onChange={(e) => setForm({ ...form, city_id: e.target.value })}>
              <option value="">—</option>
              {(cities.data ?? []).map((c) => (<option key={c.id} value={c.id}>{c.name_fr}</option>))}
            </select>
          </Field>
          <Field label="Lien Google Maps"><Input value={form.google_maps_url} onChange={(e) => setForm({ ...form, google_maps_url: e.target.value })} placeholder="https://maps.google.com/…" /></Field>
          <div className="sm:col-span-2"><Field label="Adresse"><Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field></div>
          <div className="sm:col-span-2"><Field label="Description publique"><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Parcours, expertise, langues, approche…" /></Field></div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Publication</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle label="Vérifié" description="Affiche le badge vérifié dans l'annuaire." checked={form.is_verified} onChange={(v) => setForm({ ...form, is_verified: v })} />
          <Toggle label="Actif" description="Visible dans les résultats de recherche." checked={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} />
        </div>
      </Card>

      <div className="sticky bottom-24 z-20 -mx-4 px-4 sm:mx-0 sm:px-0 lg:bottom-4">
        <div className="rounded-2xl border border-border bg-background/95 p-2 shadow-lg backdrop-blur sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:flex sm:justify-end">
          <Button onClick={() => create.mutate()} disabled={create.isPending || !form.email || !form.full_name} className="w-full gap-2 sm:w-auto">
            <UserPlus className="h-4 w-4" /> {create.isPending ? "Création…" : "Créer le compte médecin"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div className="space-y-1"><Label className="text-xs font-semibold text-muted-foreground">{label}</Label>{children}</div>);
}
function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between rounded-2xl border border-border p-4">
      <div><p className="text-sm font-semibold">{label}</p><p className="text-xs text-muted-foreground">{description}</p></div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
function Row({ label, value, onCopy, icon: Icon }: { label: string; value: string; onCopy: () => void; icon?: React.ElementType }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/40 p-3">
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}{label}
      </div>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md bg-background px-2 py-1.5 text-xs">{value}</code>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onCopy}><Copy className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}