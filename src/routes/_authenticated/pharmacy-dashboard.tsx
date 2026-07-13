import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Bell,
  Building2,
  Clock,
  FileText,
  Image as ImageIcon,
  Loader2,
  Pill,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  PHARMACY_SERVICES,
  myOwnedPharmaciesQuery,
  pharmacyReviewsQuery,
  readPharmacyMeta,
  type PharmacyRow,
  type PharmacyService,
} from "@/lib/pharmacies";
import type { Database } from "@/integrations/supabase/types";

type ProviderUpdate = Database["public"]["Tables"]["providers"]["Update"];
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/pharmacy-dashboard")({
  head: () =>
    buildHead({
      title: "Espace pharmacie — Vytalma",
      description: "Gérez votre pharmacie : profil, horaires, services, photos, avis et vérification.",
      path: "/pharmacy-dashboard",
    }),
  component: PharmacyDashboard,
});

function PharmacyDashboard() {
  const { user } = useAuth();
  const { data: pharmacies = [], isLoading } = useQuery(myOwnedPharmaciesQuery(user?.id));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const current = pharmacies.find((p) => p.id === selectedId) ?? pharmacies[0] ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Espace professionnel"
        title="Tableau de bord pharmacie"
        description="Pilotez votre fiche, vos services, votre garde et vos avis."
        icon={<Pill className="h-5 w-5" />}
      />

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-3xl bg-muted/50" />
      ) : pharmacies.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aucune pharmacie associée à votre compte"
          description="Pour gérer une pharmacie, contactez notre équipe pour lier votre établissement à votre compte."
          action={
            <Button asChild>
              <Link to="/contact">Demander la création</Link>
            </Button>
          }
        />
      ) : current ? (
        <>
          {pharmacies.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {pharmacies.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    p.id === current.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:bg-muted"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          ) : null}
          <Stats pharmacy={current} />
          <PharmacyTabs pharmacy={current} />
        </>
      ) : null}
    </div>
  );
}

function Stats({ pharmacy }: { pharmacy: PharmacyRow }) {
  const tiles = [
    {
      label: "Note moyenne",
      value: pharmacy.average_rating > 0 ? pharmacy.average_rating.toFixed(1) : "—",
      hint: `${pharmacy.reviews_count} avis`,
      icon: Star,
    },
    {
      label: "Statut",
      value: pharmacy.is_active ? "Actif" : "Inactif",
      hint: pharmacy.is_premium ? "Compte Premium" : "Compte standard",
      icon: Sparkles,
    },
    {
      label: "Vérification",
      value: pharmacy.is_verified ? "Vérifiée" : "En attente",
      hint: pharmacy.is_verified ? "Badge actif" : "Soumettez vos documents",
      icon: ShieldCheck,
    },
    {
      label: "Notifications",
      value: "—",
      hint: "Mises à jour en temps réel",
      icon: Bell,
    },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((t) => {
        const Icon = t.icon;
        return (
          <div
            key={t.label}
            className="rounded-3xl border border-border bg-card p-4 shadow-soft"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t.label}</span>
              <Icon className="h-4 w-4" />
            </div>
            <p className="mt-1 text-2xl font-semibold">{t.value}</p>
            <p className="text-xs text-muted-foreground">{t.hint}</p>
          </div>
        );
      })}
    </div>
  );
}

function PharmacyTabs({ pharmacy }: { pharmacy: PharmacyRow }) {
  return (
    <Tabs defaultValue="profile">
      <TabsList className="flex flex-wrap">
        <TabsTrigger value="profile" className="gap-1">
          <SettingsIcon className="h-4 w-4" /> Profil
        </TabsTrigger>
        <TabsTrigger value="hours" className="gap-1">
          <Clock className="h-4 w-4" /> Horaires
        </TabsTrigger>
        <TabsTrigger value="services" className="gap-1">
          <Truck className="h-4 w-4" /> Services
        </TabsTrigger>
        <TabsTrigger value="photos" className="gap-1">
          <ImageIcon className="h-4 w-4" /> Photos
        </TabsTrigger>
        <TabsTrigger value="reviews" className="gap-1">
          <Star className="h-4 w-4" /> Avis
        </TabsTrigger>
        <TabsTrigger value="verification" className="gap-1">
          <BadgeCheck className="h-4 w-4" /> Vérification
        </TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="mt-6">
        <ProfileSection pharmacy={pharmacy} />
      </TabsContent>
      <TabsContent value="hours" className="mt-6">
        <HoursSection pharmacy={pharmacy} />
      </TabsContent>
      <TabsContent value="services" className="mt-6">
        <ServicesSection pharmacy={pharmacy} />
      </TabsContent>
      <TabsContent value="photos" className="mt-6">
        <PhotosSection pharmacy={pharmacy} />
      </TabsContent>
      <TabsContent value="reviews" className="mt-6">
        <ReviewsSection pharmacy={pharmacy} />
      </TabsContent>
      <TabsContent value="verification" className="mt-6">
        <VerificationSection pharmacy={pharmacy} />
      </TabsContent>
    </Tabs>
  );
}

function useUpdatePharmacy(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: ProviderUpdate) => {
      const { error } = await supabase.from("providers").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my_pharmacies"] });
      qc.invalidateQueries({ queryKey: ["pharmacies"] });
      toast.success("Mise à jour enregistrée");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

function ProfileSection({ pharmacy }: { pharmacy: PharmacyRow }) {
  const meta = readPharmacyMeta(pharmacy);
  const [name, setName] = useState(pharmacy.name);
  const [description, setDescription] = useState(pharmacy.description ?? "");
  const [phone, setPhone] = useState(pharmacy.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(meta.whatsapp ?? "");
  const [website, setWebsite] = useState(pharmacy.website ?? "");
  const [address, setAddress] = useState(pharmacy.address ?? "");
  const [neighborhood, setNeighborhood] = useState(meta.neighborhood ?? "");
  const update = useUpdatePharmacy(pharmacy.id);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        update.mutate({
          name,
          description,
          phone,
          website,
          address,
          metadata: { ...(pharmacy.metadata as object), whatsapp, neighborhood },
        });
      }}
      className="grid gap-4 rounded-3xl border border-border bg-card p-5 sm:grid-cols-2"
    >
      <Field label="Nom" value={name} onChange={setName} />
      <Field label="Téléphone" value={phone} onChange={setPhone} type="tel" />
      <Field label="WhatsApp" value={whatsapp} onChange={setWhatsapp} type="tel" />
      <Field label="Site web" value={website} onChange={setWebsite} type="url" />
      <Field label="Adresse" value={address} onChange={setAddress} className="sm:col-span-2" />
      <Field label="Quartier" value={neighborhood} onChange={setNeighborhood} />
      <div className="sm:col-span-2">
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="mt-1 rounded-2xl"
        />
      </div>
      <div className="sm:col-span-2 flex justify-end">
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Enregistrer
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-11 rounded-xl"
      />
    </div>
  );
}

const DAYS = [
  { key: "mon", label: "Lundi" },
  { key: "tue", label: "Mardi" },
  { key: "wed", label: "Mercredi" },
  { key: "thu", label: "Jeudi" },
  { key: "fri", label: "Vendredi" },
  { key: "sat", label: "Samedi" },
  { key: "sun", label: "Dimanche" },
] as const;

type DayHours = { open?: string; close?: string; closed?: boolean };

function HoursSection({ pharmacy }: { pharmacy: PharmacyRow }) {
  const meta = readPharmacyMeta(pharmacy);
  const initial = (pharmacy.working_hours ?? {}) as Record<string, DayHours>;
  const [hours, setHours] = useState<Record<string, DayHours>>(initial);
  const [open24h, setOpen24h] = useState(!!meta.open_24h);
  const update = useUpdatePharmacy(pharmacy.id);

  function setDay(day: string, patch: Partial<DayHours>) {
    setHours((h) => ({ ...h, [day]: { ...(h[day] ?? {}), ...patch } }));
  }

  return (
    <div className="space-y-4 rounded-3xl border border-border bg-card p-5">
      <div className="flex items-center justify-between rounded-2xl bg-muted/40 p-3">
        <div>
          <p className="font-medium">Ouverte 24h / 24</p>
          <p className="text-xs text-muted-foreground">Activez si votre pharmacie ne ferme jamais.</p>
        </div>
        <Switch checked={open24h} onCheckedChange={setOpen24h} />
      </div>
      <div className="space-y-2">
        {DAYS.map((d) => {
          const v = hours[d.key] ?? {};
          return (
            <div key={d.key} className="grid grid-cols-[100px_1fr_1fr_auto] items-center gap-2">
              <Label className="text-sm">{d.label}</Label>
              <Input
                type="time"
                value={v.open ?? ""}
                onChange={(e) => setDay(d.key, { open: e.target.value, closed: false })}
                className="h-10 rounded-xl"
                disabled={v.closed || open24h}
              />
              <Input
                type="time"
                value={v.close ?? ""}
                onChange={(e) => setDay(d.key, { close: e.target.value, closed: false })}
                className="h-10 rounded-xl"
                disabled={v.closed || open24h}
              />
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={!!v.closed}
                  onChange={(e) => setDay(d.key, { closed: e.target.checked })}
                />
                Fermé
              </label>
            </div>
          );
        })}
      </div>
      <div className="flex justify-end">
        <Button
          onClick={() =>
            update.mutate({
              working_hours: hours,
              metadata: { ...(pharmacy.metadata as object), open_24h: open24h },
            })
          }
          disabled={update.isPending}
        >
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

function ServicesSection({ pharmacy }: { pharmacy: PharmacyRow }) {
  const meta = readPharmacyMeta(pharmacy);
  const [services, setServices] = useState<PharmacyService[]>(meta.services ?? []);
  const [delivery, setDelivery] = useState(!!meta.delivery);
  const [parking, setParking] = useState(!!meta.parking);
  const [wheelchair, setWheelchair] = useState(!!meta.accessibility?.includes("wheelchair"));
  const update = useUpdatePharmacy(pharmacy.id);

  function toggleSrv(v: PharmacyService) {
    setServices((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));
  }

  return (
    <div className="space-y-5 rounded-3xl border border-border bg-card p-5">
      <div className="grid gap-2 sm:grid-cols-2">
        {PHARMACY_SERVICES.map((s) => {
          const Icon = s.icon;
          const active = services.includes(s.value);
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => toggleSrv(s.value)}
              className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-left text-sm transition ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card hover:bg-muted"
              }`}
            >
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4" /> {s.label}
              </span>
              <Switch checked={active} />
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <Toggle label="Livraison à domicile" checked={delivery} onChange={setDelivery} />
        <Toggle label="Parking" checked={parking} onChange={setParking} />
        <Toggle label="Accessible PMR" checked={wheelchair} onChange={setWheelchair} />
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() =>
            update.mutate({
              metadata: {
                ...(pharmacy.metadata as object),
                services,
                delivery,
                parking,
                accessibility: wheelchair ? ["wheelchair"] : [],
              },
            })
          }
          disabled={update.isPending}
        >
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card/50 px-3 py-2">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function PhotosSection({ pharmacy }: { pharmacy: PharmacyRow }) {
  const meta = readPharmacyMeta(pharmacy);
  const [gallery, setGallery] = useState<string[]>(meta.gallery ?? []);
  const [busy, setBusy] = useState(false);
  const update = useUpdatePharmacy(pharmacy.id);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const path = `${pharmacy.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("providers").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = await supabase.storage.from("providers").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (data?.signedUrl) setGallery((g) => [...g, data.signedUrl]);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-4 rounded-3xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Upload className="h-4 w-4" />
          {busy ? "Envoi…" : "Ajouter une photo"}
          <input type="file" accept="image/*" onChange={onUpload} className="hidden" />
        </label>
        <Button
          variant="outline"
          onClick={() =>
            update.mutate({
              metadata: { ...(pharmacy.metadata as object), gallery },
            })
          }
          disabled={update.isPending}
        >
          Enregistrer la galerie
        </Button>
      </div>
      {gallery.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune photo pour le moment.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {gallery.map((url, i) => (
            <div key={i} className="group relative overflow-hidden rounded-2xl border border-border">
              <img src={url} alt="" className="aspect-square w-full object-cover" loading="lazy" />
              <button
                type="button"
                onClick={() => setGallery((g) => g.filter((_, x) => x !== i))}
                className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white opacity-0 transition group-hover:opacity-100"
              >
                Retirer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewsSection({ pharmacy }: { pharmacy: PharmacyRow }) {
  const { data: reviews = [], isLoading } = useQuery(pharmacyReviewsQuery(pharmacy.id));
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Record<string, string>>({});

  const respond = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => {
      const { error } = await supabase
        .from("reviews")
        .update({ provider_response: text, provider_response_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pharmacy_reviews", pharmacy.id] });
      toast.success("Réponse publiée");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="h-32 animate-pulse rounded-3xl bg-muted/50" />;

  if (reviews.length === 0)
    return (
      <EmptyState
        icon={Star}
        title="Aucun avis pour le moment"
        description="Les avis des patients apparaîtront ici."
      />
    );

  return (
    <div className="space-y-3">
      {reviews.map((r) => (
        <article
          key={r.id}
          className="space-y-3 rounded-3xl border border-border bg-card p-4 shadow-soft"
        >
          <header className="flex items-center justify-between">
            <Badge className="border-0 bg-amber-500/15 text-amber-600">
              <Star className="mr-1 h-3 w-3 fill-amber-500 text-amber-500" /> {r.rating}/5
            </Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(r.created_at).toLocaleDateString("fr-FR")}
            </span>
          </header>
          {r.comment ? <p className="text-sm">{r.comment}</p> : null}
          {r.provider_response ? (
            <div className="rounded-2xl bg-primary/5 p-3 text-sm">
              <p className="text-xs font-semibold text-primary">Votre réponse</p>
              <p className="mt-1">{r.provider_response}</p>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={draft[r.id] ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                placeholder="Répondre publiquement…"
                className="h-10 rounded-xl"
              />
              <Button
                size="sm"
                onClick={() => {
                  const text = (draft[r.id] ?? "").trim();
                  if (text) respond.mutate({ id: r.id, text });
                }}
                disabled={respond.isPending}
              >
                Répondre
              </Button>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

function VerificationSection({ pharmacy }: { pharmacy: PharmacyRow }) {
  const [busy, setBusy] = useState(false);

  async function uploadDoc(e: React.ChangeEvent<HTMLInputElement>, kind: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const path = `${pharmacy.id}/verification/${kind}-${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("documents").upload(path, file, { upsert: true });
      if (error) throw error;
      toast.success("Document envoyé. Notre équipe va le vérifier.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  const status = pharmacy.is_verified
    ? { label: "Vérifiée", tint: "bg-emerald-500/15 text-emerald-600" }
    : { label: "En attente de vérification", tint: "bg-amber-500/15 text-amber-600" };

  const docs = [
    { key: "license", label: "Licence d'exploitation" },
    { key: "registration", label: "Inscription au Conseil de l'Ordre" },
    { key: "identity", label: "Pièce d'identité du pharmacien titulaire" },
  ];

  return (
    <div className="space-y-5 rounded-3xl border border-border bg-card p-5">
      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${status.tint}`}>
        <ShieldCheck className="h-3.5 w-3.5" /> {status.label}
      </div>
      <p className="text-sm text-muted-foreground">
        Téléversez les documents officiels pour obtenir le badge « Vérifié » et rassurer les patients.
      </p>
      <div className="space-y-2">
        {docs.map((d) => (
          <label
            key={d.key}
            className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-3 hover:bg-muted/60"
          >
            <span className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-primary" /> {d.label}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Upload className="h-3.5 w-3.5" /> {busy ? "Envoi…" : "Choisir un fichier"}
            </span>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => uploadDoc(e, d.key)}
              className="hidden"
            />
          </label>
        ))}
      </div>
    </div>
  );
}