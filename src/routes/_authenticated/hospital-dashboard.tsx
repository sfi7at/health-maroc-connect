import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Building2,
  Hospital,
  Image as ImageIcon,
  Loader2,
  ShieldCheck,
  Siren,
  Star,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  HOSPITAL_DEPARTMENTS,
  HOSPITAL_SERVICES,
  hospitalReviewsQuery,
  myOwnedHospitalsQuery,
  readHospitalMeta,
  type HospitalDepartmentKey,
  type HospitalMeta,
  type HospitalRow,
  type HospitalServiceKey,
} from "@/lib/hospitals";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/hospital-dashboard")({
  head: () =>
    buildHead({
      title: "Espace hôpital — HealthLink Maroc",
      description: "Gérez votre hôpital ou clinique : profil, départements, services, photos, avis et vérification.",
      path: "/hospital-dashboard",
    }),
  component: HospitalDashboard,
});

function HospitalDashboard() {
  const { user } = useAuth();
  const { data: items = [], isLoading } = useQuery(myOwnedHospitalsQuery(user?.id));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const current = items.find((l) => l.id === selectedId) ?? items[0] ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Espace professionnel"
        title="Tableau de bord établissement"
        description="Pilotez votre fiche, vos départements, vos services et vos avis."
        icon={<Hospital className="h-5 w-5" />}
      />

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-3xl bg-muted/50" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aucun établissement associé à votre compte"
          description="Pour gérer un hôpital ou une clinique, contactez notre équipe pour lier votre établissement à votre compte."
          action={
            <Button asChild>
              <Link to="/contact">Demander la création</Link>
            </Button>
          }
        />
      ) : current ? (
        <>
          {items.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {items.map((l) => (
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
          <DashboardTabs hospital={current} />
        </>
      ) : null}
    </div>
  );
}

function DashboardTabs({ hospital }: { hospital: HospitalRow }) {
  return (
    <Tabs defaultValue="profile" className="space-y-6">
      <TabsList className="flex w-full flex-wrap justify-start">
        <TabsTrigger value="profile">Profil</TabsTrigger>
        <TabsTrigger value="departments">Départements</TabsTrigger>
        <TabsTrigger value="services">Services</TabsTrigger>
        <TabsTrigger value="photos">Photos</TabsTrigger>
        <TabsTrigger value="reviews">Avis</TabsTrigger>
        <TabsTrigger value="verification">Vérification</TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <ProfileTab hospital={hospital} />
      </TabsContent>
      <TabsContent value="departments">
        <DepartmentsTab hospital={hospital} />
      </TabsContent>
      <TabsContent value="services">
        <ServicesTab hospital={hospital} />
      </TabsContent>
      <TabsContent value="photos">
        <PhotosTab hospital={hospital} />
      </TabsContent>
      <TabsContent value="reviews">
        <ReviewsTab hospital={hospital} />
      </TabsContent>
      <TabsContent value="verification">
        <VerificationTab hospital={hospital} />
      </TabsContent>
    </Tabs>
  );
}

function ProfileTab({ hospital }: { hospital: HospitalRow }) {
  const qc = useQueryClient();
  const meta = readHospitalMeta(hospital);
  const [name, setName] = useState(hospital.name);
  const [description, setDescription] = useState(hospital.description ?? "");
  const [phone, setPhone] = useState(hospital.phone ?? "");
  const [website, setWebsite] = useState(hospital.website ?? "");
  const [address, setAddress] = useState(hospital.address ?? "");
  const [whatsapp, setWhatsapp] = useState(meta.whatsapp ?? "");
  const [emergencyPhone, setEmergencyPhone] = useState(meta.emergency_phone ?? "");
  const [emergency, setEmergency] = useState(!!meta.emergency);
  const [open24h, setOpen24h] = useState(!!meta.open_24h);
  const [parking, setParking] = useState(!!meta.parking);
  const [wheelchair, setWheelchair] = useState(!!meta.wheelchair);
  const [type, setType] = useState<NonNullable<HospitalMeta["type"]> | "none">(
    (meta.type ?? "none") as NonNullable<HospitalMeta["type"]> | "none",
  );

  const save = useMutation({
    mutationFn: async () => {
      const nextMeta: HospitalMeta = {
        ...meta,
        whatsapp,
        emergency_phone: emergencyPhone || undefined,
        emergency,
        open_24h: open24h,
        parking,
        wheelchair,
        type: type === "none" ? undefined : type,
      };
      const { error } = await supabase
        .from("providers")
        .update({
          name,
          description,
          phone,
          website,
          address,
          metadata: nextMeta as unknown as Database["public"]["Tables"]["providers"]["Update"]["metadata"],
        })
        .eq("id", hospital.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profil enregistré");
      qc.invalidateQueries({ queryKey: ["my_hospitals"] });
      qc.invalidateQueries({ queryKey: ["hospitals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4 rounded-3xl border border-border bg-card p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Statut">
          <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Non défini</SelectItem>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="private">Privé</SelectItem>
              <SelectItem value="university">CHU / Universitaire</SelectItem>
              <SelectItem value="military">Militaire</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Téléphone">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Numéro urgences">
          <Input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} />
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ToggleRow icon={Siren} label="Urgences" checked={emergency} onChange={setEmergency} />
        <ToggleRow icon={Hospital} label="Ouvert 24/7" checked={open24h} onChange={setOpen24h} />
        <ToggleRow icon={Building2} label="Parking" checked={parking} onChange={setParking} />
        <ToggleRow
          icon={Building2}
          label="Accès fauteuil"
          checked={wheelchair}
          onChange={setWheelchair}
        />
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

function DepartmentsTab({ hospital }: { hospital: HospitalRow }) {
  const qc = useQueryClient();
  const meta = readHospitalMeta(hospital);
  const [selected, setSelected] = useState<Set<HospitalDepartmentKey>>(
    new Set(meta.departments ?? []),
  );

  const save = useMutation({
    mutationFn: async () => {
      const next: HospitalMeta = { ...meta, departments: Array.from(selected) };
      const { error } = await supabase
        .from("providers")
        .update({
          metadata: next as unknown as Database["public"]["Tables"]["providers"]["Update"]["metadata"],
        })
        .eq("id", hospital.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Départements mis à jour");
      qc.invalidateQueries({ queryKey: ["my_hospitals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function toggle(key: HospitalDepartmentKey) {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  }

  return (
    <div className="space-y-4 rounded-3xl border border-border bg-card p-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {HOSPITAL_DEPARTMENTS.map((d) => {
          const Icon = d.icon;
          const active = selected.has(d.value);
          return (
            <button
              key={d.value}
              type="button"
              onClick={() => toggle(d.value)}
              className={`flex items-center gap-3 rounded-2xl border p-3 text-left text-sm transition ${
                active ? "border-primary bg-primary/5" : "border-border bg-card/50 hover:bg-muted/40"
              }`}
            >
              <span className={`grid h-9 w-9 place-items-center rounded-xl ${d.tint}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex-1 font-medium">{d.label}</span>
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

function ServicesTab({ hospital }: { hospital: HospitalRow }) {
  const qc = useQueryClient();
  const meta = readHospitalMeta(hospital);
  const [selected, setSelected] = useState<Set<HospitalServiceKey>>(
    new Set(meta.services ?? []),
  );

  const save = useMutation({
    mutationFn: async () => {
      const next: HospitalMeta = { ...meta, services: Array.from(selected) };
      const { error } = await supabase
        .from("providers")
        .update({
          metadata: next as unknown as Database["public"]["Tables"]["providers"]["Update"]["metadata"],
        })
        .eq("id", hospital.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Services mis à jour");
      qc.invalidateQueries({ queryKey: ["my_hospitals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function toggle(key: HospitalServiceKey) {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  }

  return (
    <div className="space-y-4 rounded-3xl border border-border bg-card p-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {HOSPITAL_SERVICES.map((s) => {
          const Icon = s.icon;
          const active = selected.has(s.value);
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => toggle(s.value)}
              className={`flex items-center gap-3 rounded-2xl border p-3 text-left text-sm transition ${
                active ? "border-primary bg-primary/5" : "border-border bg-card/50 hover:bg-muted/40"
              }`}
            >
              <span className={`grid h-9 w-9 place-items-center rounded-xl ${s.tint}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex-1 font-medium">{s.label}</span>
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

function PhotosTab({ hospital }: { hospital: HospitalRow }) {
  const qc = useQueryClient();
  const meta = readHospitalMeta(hospital);
  const [uploading, setUploading] = useState(false);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `${hospital.owner_id}/${hospital.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("providers").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("providers").getPublicUrl(path);
      const gallery = [...(meta.gallery ?? []), data.publicUrl];
      const { error: upErr } = await supabase
        .from("providers")
        .update({ metadata: { ...meta, gallery } })
        .eq("id", hospital.id);
      if (upErr) throw upErr;
      toast.success("Photo ajoutée");
      qc.invalidateQueries({ queryKey: ["my_hospitals"] });
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
        <EmptyState icon={ImageIcon} title="Aucune photo" description="Ajoutez des photos pour valoriser votre établissement." />
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

function ReviewsTab({ hospital }: { hospital: HospitalRow }) {
  const { data: reviews = [], isLoading } = useQuery(hospitalReviewsQuery(hospital.id));
  const stats = useMemo(
    () => ({ avg: hospital.average_rating, count: hospital.reviews_count }),
    [hospital],
  );

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
                  <Star
                    key={i}
                    className={`h-3.5 w-3.5 ${i < r.rating ? "fill-amber-400" : "opacity-30"}`}
                  />
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

function VerificationTab({ hospital }: { hospital: HospitalRow }) {
  const [uploading, setUploading] = useState(false);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `${hospital.owner_id}/${hospital.id}/verification/${Date.now()}-${file.name}`;
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
          <Badge variant={hospital.is_verified ? "default" : "secondary"}>
            {hospital.is_verified ? "Vérifié" : "En attente"}
          </Badge>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Téléchargez votre autorisation d'ouverture (Ministère de la Santé), la licence
        professionnelle du directeur et la pièce d'identité du responsable.
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
  icon: typeof Hospital;
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