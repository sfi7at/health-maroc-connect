import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Building2,
  FlaskConical,
  Image as ImageIcon,
  Loader2,
  Microscope,
  ShieldCheck,
  Siren,
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
  LAB_ANALYSES,
  labReviewsQuery,
  myOwnedLaboratoriesQuery,
  readLabMeta,
  type LabAnalysisKey,
  type LabRow,
} from "@/lib/laboratories";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/laboratory-dashboard")({
  head: () =>
    buildHead({
      title: "Espace laboratoire — Vytalma",
      description: "Gérez votre laboratoire : profil, analyses, photos, avis et vérification.",
      path: "/laboratory-dashboard",
    }),
  component: LaboratoryDashboard,
});

function LaboratoryDashboard() {
  const { user } = useAuth();
  const { data: labs = [], isLoading } = useQuery(myOwnedLaboratoriesQuery(user?.id));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const current = labs.find((l) => l.id === selectedId) ?? labs[0] ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Espace professionnel"
        title="Tableau de bord laboratoire"
        description="Pilotez votre fiche, vos analyses, vos photos et vos avis."
        icon={<FlaskConical className="h-5 w-5" />}
      />

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-3xl bg-muted/50" />
      ) : labs.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aucun laboratoire associé à votre compte"
          description="Pour gérer un laboratoire, contactez notre équipe pour lier votre établissement à votre compte."
          action={
            <Button asChild>
              <Link to="/contact">Demander la création</Link>
            </Button>
          }
        />
      ) : current ? (
        <>
          {labs.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {labs.map((l) => (
                <Button
                  key={l.id}
                  variant={current.id === l.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedId(l.id)}
                >
                  {l.name}
                </Button>
              ))}
            </div>
          ) : null}
          <DashboardTabs lab={current} />
        </>
      ) : null}
    </div>
  );
}

function DashboardTabs({ lab }: { lab: LabRow }) {
  return (
    <Tabs defaultValue="profile" className="space-y-6">
      <TabsList className="flex w-full flex-wrap justify-start">
        <TabsTrigger value="profile">Profil</TabsTrigger>
        <TabsTrigger value="analyses">Analyses</TabsTrigger>
        <TabsTrigger value="photos">Photos</TabsTrigger>
        <TabsTrigger value="reviews">Avis</TabsTrigger>
        <TabsTrigger value="verification">Vérification</TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <ProfileTab lab={lab} />
      </TabsContent>
      <TabsContent value="analyses">
        <AnalysesTab lab={lab} />
      </TabsContent>
      <TabsContent value="photos">
        <PhotosTab lab={lab} />
      </TabsContent>
      <TabsContent value="reviews">
        <ReviewsTab lab={lab} />
      </TabsContent>
      <TabsContent value="verification">
        <VerificationTab lab={lab} />
      </TabsContent>
    </Tabs>
  );
}

function ProfileTab({ lab }: { lab: LabRow }) {
  const qc = useQueryClient();
  const meta = readLabMeta(lab);
  const [name, setName] = useState(lab.name);
  const [description, setDescription] = useState(lab.description ?? "");
  const [phone, setPhone] = useState(lab.phone ?? "");
  const [website, setWebsite] = useState(lab.website ?? "");
  const [address, setAddress] = useState(lab.address ?? "");
  const [whatsapp, setWhatsapp] = useState(meta.whatsapp ?? "");
  const [homeSampling, setHomeSampling] = useState(!!meta.home_sampling);
  const [emergency, setEmergency] = useState(!!meta.emergency);
  const [parking, setParking] = useState(!!meta.parking);

  const save = useMutation({
    mutationFn: async () => {
      const nextMeta = { ...meta, whatsapp, home_sampling: homeSampling, emergency, parking };
      const { error } = await supabase
        .from("providers")
        .update({
          name,
          description,
          phone,
          website,
          address,
          metadata: nextMeta,
        })
        .eq("id", lab.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profil enregistré");
      qc.invalidateQueries({ queryKey: ["my_laboratories"] });
      qc.invalidateQueries({ queryKey: ["laboratories"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4 rounded-3xl border border-border bg-card p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Téléphone">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="WhatsApp">
          <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
        </Field>
        <Field label="Site web">
          <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
        </Field>
        <Field label="Adresse" className="sm:col-span-2">
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <ToggleRow icon={Truck} label="Prélèvement à domicile" checked={homeSampling} onChange={setHomeSampling} />
        <ToggleRow icon={Siren} label="Tests d'urgence" checked={emergency} onChange={setEmergency} />
        <ToggleRow icon={Building2} label="Parking disponible" checked={parking} onChange={setParking} />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

function AnalysesTab({ lab }: { lab: LabRow }) {
  const qc = useQueryClient();
  const meta = readLabMeta(lab);
  const [selected, setSelected] = useState<Set<LabAnalysisKey>>(new Set(meta.analyses ?? []));

  const save = useMutation({
    mutationFn: async () => {
      const nextMeta = { ...meta, analyses: Array.from(selected) };
      const { error } = await supabase.from("providers").update({ metadata: nextMeta }).eq("id", lab.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Analyses mises à jour");
      qc.invalidateQueries({ queryKey: ["my_laboratories"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function toggle(key: LabAnalysisKey) {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  }

  return (
    <div className="space-y-4 rounded-3xl border border-border bg-card p-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {LAB_ANALYSES.map((a) => {
          const Icon = a.icon;
          const active = selected.has(a.value);
          return (
            <button
              key={a.value}
              type="button"
              onClick={() => toggle(a.value)}
              className={`flex items-center gap-3 rounded-2xl border p-3 text-left text-sm transition ${
                active ? "border-primary bg-primary/5" : "border-border bg-card/50 hover:bg-muted/40"
              }`}
            >
              <span className={`grid h-9 w-9 place-items-center rounded-xl ${a.tint}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex-1 font-medium">{a.label}</span>
              {active ? <BadgeCheck className="h-4 w-4 text-primary" /> : null}
            </button>
          );
        })}
      </div>
      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

function PhotosTab({ lab }: { lab: LabRow }) {
  const qc = useQueryClient();
  const meta = readLabMeta(lab);
  const [uploading, setUploading] = useState(false);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `${lab.owner_id}/${lab.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("laboratories").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("laboratories").getPublicUrl(path);
      const gallery = [...(meta.gallery ?? []), data.publicUrl];
      const { error: upErr } = await supabase
        .from("providers")
        .update({ metadata: { ...meta, gallery } })
        .eq("id", lab.id);
      if (upErr) throw upErr;
      toast.success("Photo ajoutée");
      qc.invalidateQueries({ queryKey: ["my_laboratories"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-3xl border border-border bg-card p-6">
      <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-dashed border-border bg-muted/30 p-4 hover:bg-muted/60">
        <span className="inline-flex items-center gap-2 text-sm">
          <Upload className="h-4 w-4" /> Ajouter une photo
        </span>
        <span className="text-xs text-muted-foreground">JPG, PNG, max 5 Mo</span>
        <input type="file" accept="image/*" className="hidden" onChange={onUpload} disabled={uploading} />
      </label>

      {(meta.gallery ?? []).length === 0 ? (
        <EmptyState icon={ImageIcon} title="Aucune photo" description="Ajoutez des photos pour valoriser votre laboratoire." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {(meta.gallery ?? []).map((url) => (
            <img key={url} src={url} alt="" className="aspect-square w-full rounded-2xl object-cover" />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewsTab({ lab }: { lab: LabRow }) {
  const { data: reviews = [], isLoading } = useQuery(labReviewsQuery(lab.id));
  const stats = useMemo(() => ({ avg: lab.average_rating, count: lab.reviews_count }), [lab]);

  return (
    <div className="space-y-4 rounded-3xl border border-border bg-card p-6">
      <div className="flex items-center gap-4">
        <div className="inline-flex items-center gap-2 rounded-2xl bg-amber-500/10 px-4 py-2 text-amber-700">
          <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
          <span className="text-2xl font-bold">{stats.avg.toFixed(1)}</span>
          <span className="text-xs text-muted-foreground">({stats.count} avis)</span>
        </div>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : reviews.length === 0 ? (
        <EmptyState icon={Star} title="Aucun avis" description="Les avis des patients apparaîtront ici." />
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-2xl border border-border bg-card/50 p-4">
              <div className="flex items-center gap-1 text-amber-500">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-amber-400" : "opacity-30"}`} />
                ))}
                <span className="ml-2 text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("fr-FR")}
                </span>
              </div>
              {r.comment ? <p className="mt-2 text-sm">{r.comment}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function VerificationTab({ lab }: { lab: LabRow }) {
  const [uploading, setUploading] = useState(false);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `${lab.owner_id}/${lab.id}/verification/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("documents").upload(path, file);
      if (error) throw error;
      toast.success("Document envoyé — vérification en cours sous 48h");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-3xl border border-border bg-card p-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <div>
          <p className="font-semibold">Statut de vérification</p>
          <Badge variant={lab.is_verified ? "default" : "secondary"}>
            {lab.is_verified ? "Vérifié" : "En attente"}
          </Badge>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Téléchargez votre autorisation d'ouverture, licence professionnelle ou pièce d'identité du
        responsable pour faire vérifier votre laboratoire.
      </p>
      <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-dashed border-border bg-muted/30 p-4 hover:bg-muted/60">
        <span className="inline-flex items-center gap-2 text-sm">
          <Upload className="h-4 w-4" /> Téléverser un document
        </span>
        <span className="text-xs text-muted-foreground">PDF, JPG, PNG</span>
        <input
          type="file"
          accept="application/pdf,image/*"
          className="hidden"
          onChange={onUpload}
          disabled={uploading}
        />
      </label>
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  checked,
  onChange,
}: {
  icon: typeof Microscope;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-card/50 px-4 py-3">
      <span className="inline-flex items-center gap-2 text-sm">
        <Icon className="h-4 w-4 text-primary" /> {label}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}