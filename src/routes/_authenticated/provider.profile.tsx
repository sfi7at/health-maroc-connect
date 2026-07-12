import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, UserCog, Upload, Globe, Phone, Mail, MapPin, Languages, Siren, Map as MapIcon, FileText, Link2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedProvider } from "@/lib/provider-store";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/provider/profile")({
  head: () => buildHead({ title: "Profil — Espace prestataire", description: "Gérez vos informations publiques.", path: "/provider/profile" }),
  component: ProviderProfile,
});

type Meta = {
  languages?: string[];
  consultation_price_mad?: number;
  emergency_available?: boolean;
  services?: string[];
  specialties?: string[];
};

function ProviderProfile() {
  const { provider } = useSelectedProvider();
  const id = provider?.id;
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["provider_full", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("providers").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState({
    name: "", description: "", phone: "", email: "", website: "", address: "",
    languages: "", services: "", specialties: "",
    consultation_price_mad: "", emergency_available: false,
    profile_image: "", cover_image: "",
    google_maps_url: "", clinic_logo_url: "",
    rx_title: "", rx_clinic_name: "", rx_specialty: "", rx_inpe: "",
    slug: "",
  });
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugStatus, setSlugStatus] = useState<null | "available" | "taken" | "invalid" | "current">(null);

  useEffect(() => {
    if (!data) return;
    const meta = (data.metadata ?? {}) as Meta;
    const rx = ((data as unknown as { prescription_header?: Record<string, string> }).prescription_header ?? {}) as Record<string, string>;
    setForm({
      name: data.name ?? "",
      description: data.description ?? "",
      phone: data.phone ?? "",
      email: data.email ?? "",
      website: data.website ?? "",
      address: data.address ?? "",
      languages: (meta.languages ?? []).join(", "),
      services: (meta.services ?? []).join(", "),
      specialties: (meta.specialties ?? []).join(", "),
      consultation_price_mad: meta.consultation_price_mad?.toString() ?? "",
      emergency_available: !!meta.emergency_available,
      profile_image: data.profile_image ?? "",
      cover_image: data.cover_image ?? "",
      google_maps_url: (data as unknown as { google_maps_url?: string }).google_maps_url ?? "",
      clinic_logo_url: (data as unknown as { clinic_logo_url?: string }).clinic_logo_url ?? "",
      rx_title: rx.title ?? "",
      rx_clinic_name: rx.clinic_name ?? "",
      rx_specialty: rx.specialty ?? "",
      rx_inpe: rx.inpe ?? "",
      slug: (data as unknown as { slug?: string }).slug ?? "",
    });
  }, [data]);

  const currentSlug = (data as unknown as { slug?: string } | null | undefined)?.slug ?? "";

  useEffect(() => {
    setSlugStatus(null);
    const s = form.slug.trim().toLowerCase();
    if (!s || s === currentSlug) { setSlugStatus(s === currentSlug ? "current" : null); return; }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s) || s.length < 3 || s.length > 60) { setSlugStatus("invalid"); return; }
    setSlugChecking(true);
    const t = setTimeout(async () => {
      const { data: hit } = await supabase.from("providers").select("id").eq("slug", s).maybeSingle();
      setSlugChecking(false);
      setSlugStatus(hit && hit.id !== id ? "taken" : "available");
    }, 300);
    return () => clearTimeout(t);
  }, [form.slug, currentSlug, id]);

  const save = useMutation({
    mutationFn: async () => {
      if (!id) return;
      const meta: Meta = {
        ...((data?.metadata ?? {}) as Meta),
        languages: form.languages.split(",").map((s) => s.trim()).filter(Boolean),
        services: form.services.split(",").map((s) => s.trim()).filter(Boolean),
        specialties: form.specialties.split(",").map((s) => s.trim()).filter(Boolean),
        consultation_price_mad: form.consultation_price_mad ? Number(form.consultation_price_mad) : undefined,
        emergency_available: form.emergency_available,
      };
      const { error } = await supabase.from("providers").update({
        name: form.name.trim(),
        description: form.description.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        website: form.website.trim() || null,
        address: form.address.trim() || null,
        profile_image: form.profile_image || null,
        cover_image: form.cover_image || null,
        google_maps_url: form.google_maps_url.trim() || null,
        clinic_logo_url: form.clinic_logo_url || null,
        ...(form.slug.trim() && form.slug.trim().toLowerCase() !== currentSlug
          ? { slug: form.slug.trim().toLowerCase() }
          : {}),
        prescription_header: {
          title: form.rx_title.trim() || null,
          clinic_name: form.rx_clinic_name.trim() || null,
          specialty: form.rx_specialty.trim() || null,
          inpe: form.rx_inpe.trim() || null,
        } as never,
        metadata: meta,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profil mis à jour");
      qc.invalidateQueries({ queryKey: ["provider_full", id] });
      qc.invalidateQueries({ queryKey: ["owned_providers"] });
      qc.invalidateQueries({ queryKey: ["provider_home", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function uploadTo(field: "profile_image" | "cover_image" | "clinic_logo_url", file: File) {
    if (!id) return;
    const path = `${id}/${field}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("providers").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data: signed } = await supabase.storage.from("providers").createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signed?.signedUrl) setForm((f) => ({ ...f, [field]: signed.signedUrl }));
  }

  if (!provider) return null;
  if (isLoading) return <Skeleton className="h-96 rounded-3xl" />;

  const publicUrl = typeof window !== "undefined"
    ? `${window.location.origin}/doctors/${form.slug || currentSlug || provider?.id}`
    : "";

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Profil" title="Informations publiques" description="Ces informations sont visibles par les patients." icon={<UserCog className="h-5 w-5" />} />

      {/* Cover & avatar */}
      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
        <div className="relative h-40 w-full bg-gradient-to-br from-primary/20 via-primary/10 to-accent">
          {form.cover_image ? <img src={form.cover_image} alt="" className="h-full w-full object-cover" /> : null}
          <label className="absolute right-3 top-3 inline-flex cursor-pointer items-center gap-2 rounded-full bg-background/90 px-3 py-1.5 text-xs font-semibold shadow-soft">
            <Upload className="h-3.5 w-3.5" /> Photo de couverture
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadTo("cover_image", e.target.files[0])} />
          </label>
        </div>
        <div className="-mt-10 flex items-end gap-4 px-5 pb-5">
          <div className="relative h-20 w-20 overflow-hidden rounded-2xl border-4 border-background bg-card shadow-soft">
            {form.profile_image ? <img src={form.profile_image} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center bg-primary/10 text-primary text-2xl font-bold">{provider.name[0]}</div>}
            <label className="absolute inset-0 grid cursor-pointer place-items-center bg-black/40 text-white opacity-0 transition-opacity hover:opacity-100">
              <Upload className="h-5 w-5" />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadTo("profile_image", e.target.files[0])} />
            </label>
          </div>
          <div className="flex-1 pb-2">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="text-lg font-bold" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2 space-y-2 rounded-2xl border border-border bg-card p-4">
          <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Link2 className="h-3.5 w-3.5" /> Lien public partageable
          </Label>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">/doctors/</span>
            <Input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
              placeholder="dr-ahmed-benali"
              className="max-w-xs"
            />
            {slugChecking ? (
              <span className="text-xs text-muted-foreground">Vérification…</span>
            ) : slugStatus === "available" ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><Check className="h-3.5 w-3.5" /> Disponible</span>
            ) : slugStatus === "taken" ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive"><X className="h-3.5 w-3.5" /> Déjà pris</span>
            ) : slugStatus === "invalid" ? (
              <span className="text-xs font-semibold text-destructive">3–60 caractères, minuscules, chiffres et tirets uniquement.</span>
            ) : slugStatus === "current" ? (
              <span className="text-xs text-muted-foreground">Lien actuel</span>
            ) : null}
          </div>
          {publicUrl && (
            <a href={publicUrl} target="_blank" rel="noreferrer" className="block truncate text-xs text-primary hover:underline">
              {publicUrl}
            </a>
          )}
        </div>
        <Field label="Description" icon={UserCog}>
          <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Présentez votre cabinet, vos approches, votre expérience…" />
        </Field>
        <Field label="Adresse" icon={MapPin}>
          <Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </Field>
        <Field label="Téléphone" icon={Phone}>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+212 ..." />
        </Field>
        <Field label="Email" icon={Mail}>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Site web" icon={Globe}>
          <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" />
        </Field>
        <Field label="Langues parlées (séparées par virgule)" icon={Languages}>
          <Input value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} placeholder="Arabe, Français, Anglais" />
        </Field>
        <Field label="Services (séparés par virgule)">
          <Input value={form.services} onChange={(e) => setForm({ ...form, services: e.target.value })} placeholder="Consultation, Téléconsultation…" />
        </Field>
        <Field label="Spécialités (séparées par virgule)">
          <Input value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} placeholder="Cardiologie, Pédiatrie…" />
        </Field>
        <Field label="Tarif consultation (MAD)">
          <Input type="number" min={0} value={form.consultation_price_mad} onChange={(e) => setForm({ ...form, consultation_price_mad: e.target.value })} />
        </Field>
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <Siren className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-sm font-semibold">Disponibilité urgences</p>
              <p className="text-xs text-muted-foreground">Activez si vous prenez des urgences.</p>
            </div>
          </div>
          <Switch checked={form.emergency_available} onCheckedChange={(v) => setForm({ ...form, emergency_available: v })} />
        </div>
        <Field label="Lien Google Maps du cabinet" icon={MapIcon}>
          <Input value={form.google_maps_url} onChange={(e) => setForm({ ...form, google_maps_url: e.target.value })} placeholder="https://maps.google.com/…" />
        </Field>
      </section>

      {/* Prescription header settings */}
      <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">En-tête d'ordonnance</h3>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Ces informations apparaissent en tête de vos ordonnances PDF générées automatiquement.
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="lg:col-span-2 flex items-center gap-4 rounded-2xl border border-border bg-muted/30 p-4">
            <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-xl border border-border bg-background">
              {form.clinic_logo_url ? <img src={form.clinic_logo_url} alt="" className="h-full w-full object-contain" /> : <FileText className="h-6 w-6 text-muted-foreground" />}
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              <Upload className="h-3.5 w-3.5" /> Logo du cabinet
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadTo("clinic_logo_url", e.target.files[0])} />
            </label>
            {form.clinic_logo_url && (
              <Button type="button" size="sm" variant="ghost" onClick={() => setForm({ ...form, clinic_logo_url: "" })}>Retirer</Button>
            )}
          </div>
          <Field label="Titre professionnel"><Input value={form.rx_title} onChange={(e) => setForm({ ...form, rx_title: e.target.value })} placeholder="Docteur en médecine" /></Field>
          <Field label="Nom du cabinet"><Input value={form.rx_clinic_name} onChange={(e) => setForm({ ...form, rx_clinic_name: e.target.value })} placeholder="Cabinet Médical Al Amal" /></Field>
          <Field label="Spécialité affichée"><Input value={form.rx_specialty} onChange={(e) => setForm({ ...form, rx_specialty: e.target.value })} placeholder="Cardiologue" /></Field>
          <Field label="Numéro INPE / Ordre"><Input value={form.rx_inpe} onChange={(e) => setForm({ ...form, rx_inpe: e.target.value })} placeholder="INPE-1234" /></Field>
        </div>
      </section>

      <div className="sticky bottom-24 z-20 -mx-4 flex justify-end px-4 sm:mx-0 sm:px-0 lg:bottom-4">
        <div className="w-full rounded-2xl border border-border bg-background/95 p-2 shadow-lg backdrop-blur sm:w-auto sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full gap-2 sm:w-auto">
            <Save className="h-4 w-4" /> {save.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </div>

      {!provider.is_verified ? (
        <Badge variant="secondary" className="gap-1">Profil non vérifié — Téléversez vos documents pour obtenir le badge.</Badge>
      ) : null}
    </div>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 rounded-2xl border border-border bg-card p-4">
      <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}{label}
      </Label>
      {children}
    </div>
  );
}