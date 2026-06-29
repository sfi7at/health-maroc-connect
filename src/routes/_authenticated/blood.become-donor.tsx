import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Heart, Loader2, MapPin, Phone, ShieldCheck, Droplet, Mail, User, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { citiesQuery, myBloodDonorQuery } from "@/lib/queries";
import { BLOOD_GROUPS, type BloodGroup } from "@/lib/categories";
import { DONOR_STATUS_META, type DonorStatus } from "@/lib/blood";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/blood/become-donor")({
  head: () =>
    buildHead({
      title: "Devenir donneur de sang — HealthLink Maroc",
      description: "Inscrivez-vous comme donneur de sang au Maroc et sauvez des vies.",
    }),
  component: BecomeDonorPage,
});

function BecomeDonorPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: cities = [] } = useQuery(citiesQuery());
  const { data: existing } = useQuery(myBloodDonorQuery(user?.id));

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    blood_group: "O+" as BloodGroup,
    gender: "",
    city_id: "",
    contact_phone: "",
    contact_email: "",
    weight_kg: 65,
    last_donation_at: "",
    status: "available" as DonorStatus,
    is_available: true,
    notes: "",
    latitude: null as number | null,
    longitude: null as number | null,
    eligibility: false,
    terms: false,
  });

  useEffect(() => {
    if (existing) {
      setForm((f) => ({
        ...f,
        first_name: existing.first_name ?? f.first_name,
        last_name: existing.last_name ?? f.last_name,
        blood_group: existing.blood_group as BloodGroup,
        gender: existing.gender ?? "",
        city_id: existing.city_id ?? "",
        contact_phone: existing.contact_phone ?? "",
        contact_email: existing.contact_email ?? "",
        weight_kg: Number(existing.weight_kg ?? 65),
        last_donation_at: existing.last_donation_at ?? "",
        status: existing.status as DonorStatus,
        is_available: existing.is_available,
        notes: existing.notes ?? "",
        latitude: existing.latitude ? Number(existing.latitude) : null,
        longitude: existing.longitude ? Number(existing.longitude) : null,
        eligibility: true,
        terms: true,
      }));
    }
  }, [existing]);

  const capturePosition = () => {
    if (!navigator.geolocation) return toast.error("Géolocalisation non disponible");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
        toast.success("Position enregistrée");
      },
      () => toast.error("Impossible de récupérer votre position"),
    );
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Connectez-vous");
      if (!form.eligibility || !form.terms)
        throw new Error("Confirmez votre éligibilité et acceptez les conditions.");
      if (form.weight_kg < 50) throw new Error("Le poids minimum requis est de 50 kg.");
      const { error } = await supabase.from("blood_donors").upsert({
        id: user.id,
        first_name: form.first_name.trim() || null,
        last_name: form.last_name.trim() || null,
        blood_group: form.blood_group,
        gender: form.gender || null,
        city_id: form.city_id || null,
        contact_phone: form.contact_phone.trim(),
        contact_email: form.contact_email.trim() || null,
        weight_kg: form.weight_kg,
        last_donation_at: form.last_donation_at || null,
        status: form.status,
        is_available: form.is_available,
        notes: form.notes.trim() || null,
        latitude: form.latitude,
        longitude: form.longitude,
        last_active_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profil donneur enregistré. Merci !");
      qc.invalidateQueries({ queryKey: ["blood_donor"] });
      navigate({ to: "/blood" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Communauté"
        title={existing ? "Mon profil donneur" : "Devenir donneur"}
        description="Vos informations restent privées. Seul votre statut public sera visible des demandeurs."
        icon={<Heart className="h-5 w-5" />}
      />

      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="grid gap-5 rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-7"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prénom" icon={User}>
            <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} maxLength={60} />
          </Field>
          <Field label="Nom" icon={User}>
            <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} maxLength={60} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Groupe sanguin" icon={Droplet} required>
            <Select value={form.blood_group} onValueChange={(v) => setForm({ ...form, blood_group: v as BloodGroup })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BLOOD_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Genre">
            <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
              <SelectTrigger><SelectValue placeholder="Non précisé" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Homme</SelectItem>
                <SelectItem value="female">Femme</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Poids (kg)" required>
            <Input
              type="number"
              min={45}
              max={200}
              value={form.weight_kg}
              onChange={(e) => setForm({ ...form, weight_kg: Number(e.target.value) || 0 })}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ville" icon={MapPin}>
            <Select value={form.city_id} onValueChange={(v) => setForm({ ...form, city_id: v })}>
              <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                {cities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name_fr}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Dernier don" icon={Heart}>
            <Input
              type="date"
              value={form.last_donation_at}
              onChange={(e) => setForm({ ...form, last_donation_at: e.target.value })}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Téléphone (privé)" icon={Phone} required>
            <Input
              required
              value={form.contact_phone}
              onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
              placeholder="+212 6 ..."
              maxLength={20}
            />
          </Field>
          <Field label="Email (privé)" icon={Mail}>
            <Input
              type="email"
              value={form.contact_email}
              onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
              maxLength={120}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Statut">
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as DonorStatus })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(DONOR_STATUS_META) as DonorStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{DONOR_STATUS_META[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <label className="flex items-center justify-between rounded-2xl border border-border bg-muted/30 p-4">
            <div>
              <p className="text-sm font-medium">Visible et disponible</p>
              <p className="text-xs text-muted-foreground">
                Vous pouvez désactiver à tout moment.
              </p>
            </div>
            <Switch
              checked={form.is_available}
              onCheckedChange={(v) => setForm({ ...form, is_available: v })}
            />
          </label>
        </div>

        <div className="grid gap-3 rounded-2xl border border-dashed border-border p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Position approximative (optionnel)</p>
              <p className="text-xs text-muted-foreground">
                Utilisée seulement pour calculer la distance — jamais exposée précisément.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={capturePosition} className="gap-2">
              <MapPin className="h-4 w-4" />
              {form.latitude ? "Mise à jour" : "Capturer"}
            </Button>
          </div>
          {form.latitude && (
            <p className="text-xs text-emerald-600 inline-flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Position approximative enregistrée
            </p>
          )}
        </div>

        <Field label="Notes (optionnel)">
          <Textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            maxLength={300}
          />
        </Field>

        <label className="flex items-start gap-3 rounded-2xl border border-border p-4 text-sm">
          <Checkbox
            checked={form.eligibility}
            onCheckedChange={(v) => setForm({ ...form, eligibility: v === true })}
          />
          <span>
            Je confirme être <strong>en bonne santé</strong>, peser au moins 50 kg, être âgé entre 18 et 65 ans,
            et ne pas avoir donné dans les 56 derniers jours.
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-2xl border border-border p-4 text-sm">
          <Checkbox
            checked={form.terms}
            onCheckedChange={(v) => setForm({ ...form, terms: v === true })}
          />
          <span>
            J'accepte les <a className="underline" href="/terms">conditions</a> et la{" "}
            <a className="underline" href="/privacy">politique de confidentialité</a> de HealthLink Maroc.
          </span>
        </label>

        <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" /> Téléphone, email et position exacte ne sont
          jamais affichés publiquement.
        </p>

        <Button type="submit" disabled={save.isPending} size="lg" className="gap-2">
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className="h-4 w-4" />}
          {existing ? "Mettre à jour" : "Devenir donneur"}
        </Button>
      </motion.form>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  required,
  children,
}: {
  label: string;
  icon?: typeof Heart;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="inline-flex items-center gap-1.5 text-xs">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        {label} {required && <span className="text-rose-500">*</span>}
      </Label>
      {children}
    </div>
  );
}