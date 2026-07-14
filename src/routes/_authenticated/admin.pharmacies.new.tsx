import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, Copy, KeyRound, Pill, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AdminHeader } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { adminCreatePharmacy } from "@/lib/pharmacy-admin.functions";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/pharmacies/new")({
  head: () => buildHead({
    title: "Ajouter une pharmacie — Admin",
    description: "Créer un compte pharmacie certifié.",
    path: "/admin/pharmacies/new",
  }),
  component: AdminNewPharmacy,
});

function AdminNewPharmacy() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    email: "", name: "", owner_full_name: "", phone: "",
    city_id: "", address: "", google_maps_url: "",
    description: "", languages: "Français, Arabe",
    is_verified: true, is_active: true, is_on_duty: false,
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

  const create = useMutation({
    mutationFn: () => adminCreatePharmacy({
      data: {
        email: form.email.trim(),
        name: form.name.trim(),
        owner_full_name: form.owner_full_name.trim(),
        phone: form.phone.trim() || null,
        city_id: form.city_id || null,
        address: form.address.trim() || null,
        google_maps_url: form.google_maps_url.trim() || null,
        description: form.description.trim() || null,
        languages: form.languages.split(",").map((s) => s.trim()).filter(Boolean),
        is_verified: form.is_verified,
        is_active: form.is_active,
        is_on_duty: form.is_on_duty,
      },
    }),
    onSuccess: (data) => {
      toast.success("Pharmacie créée et indexée dans l'annuaire public");
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
        <AdminHeader title="Compte pharmacie créé" description="Transmettez ces identifiants de manière sécurisée au pharmacien." icon={Check} />
        <Card className="space-y-4 border-primary/40 p-6">
          <Row label="Email" value={result.email} onCopy={() => copy(result.email, "Email")} />
          <Row label="Mot de passe temporaire" value={result.temporary_password} onCopy={() => copy(result.temporary_password, "Mot de passe")} icon={KeyRound} />
          {result.recovery_link && (
            <Row label="Lien d'activation (mot de passe)" value={result.recovery_link} onCopy={() => copy(result.recovery_link!, "Lien")} />
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" onClick={() => { setResult(null); setForm({ ...form, email: "", name: "", owner_full_name: "", phone: "" }); }}>Ajouter une autre</Button>
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
      <AdminHeader title="Ajouter une pharmacie certifiée" description="Créer un compte fermé — la pharmacie sera automatiquement indexée dans l'annuaire public." icon={Pill} />

      <Card className="p-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Identité</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nom de la pharmacie *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Pharmacie Al Andalous" /></Field>
          <Field label="Nom du pharmacien titulaire *"><Input value={form.owner_full_name} onChange={(e) => setForm({ ...form, owner_full_name: e.target.value })} placeholder="Dr. Karim Bennani" /></Field>
          <Field label="Email professionnel *"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contact@pharmacie.ma" /></Field>
          <Field label="Téléphone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+212 5 …" /></Field>
          <Field label="Langues (séparées par virgule)"><Input value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} /></Field>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Localisation</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Ville">
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.city_id} onChange={(e) => setForm({ ...form, city_id: e.target.value })}>
              <option value="">—</option>
              {(cities.data ?? []).map((c) => (<option key={c.id} value={c.id}>{c.name_fr}</option>))}
            </select>
          </Field>
          <Field label="Lien Google Maps"><Input value={form.google_maps_url} onChange={(e) => setForm({ ...form, google_maps_url: e.target.value })} placeholder="https://maps.google.com/…" /></Field>
          <div className="sm:col-span-2"><Field label="Adresse"><Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field></div>
          <div className="sm:col-span-2"><Field label="Description publique"><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Services, gardes, spécialités…" /></Field></div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Publication</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle label="Vérifié" description="Affiche le badge vérifié dans l'annuaire." checked={form.is_verified} onChange={(v) => setForm({ ...form, is_verified: v })} />
          <Toggle label="Actif" description="Visible dans les résultats de recherche." checked={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} />
          <Toggle label="Pharmacie de garde" description="Signalée comme pharmacie de garde." checked={form.is_on_duty} onChange={(v) => setForm({ ...form, is_on_duty: v })} />
        </div>
      </Card>

      <div className="sticky bottom-24 z-20 -mx-4 px-4 sm:mx-0 sm:px-0 lg:bottom-4">
        <div className="rounded-2xl border border-border bg-background/95 p-2 shadow-lg backdrop-blur sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:flex sm:justify-end">
          <Button onClick={() => create.mutate()} disabled={create.isPending || !form.email || !form.name || !form.owner_full_name} className="w-full gap-2 sm:w-auto">
            <UserPlus className="h-4 w-4" /> {create.isPending ? "Création…" : "Créer le compte pharmacie"}
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