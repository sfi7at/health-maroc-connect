import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Heart,
  Droplet,
  MapPin,
  Phone,
  Mail,
  User,
  ShieldCheck,
  Pencil,
  Save,
  X,
  CalendarCheck,
  Loader2,
  Sparkles,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { citiesQuery, myBloodDonorQuery } from "@/lib/queries";
import { BLOOD_GROUPS, type BloodGroup } from "@/lib/categories";
import {
  DONOR_STATUS_META,
  canDonateAgain,
  daysUntilEligible,
  type DonorStatus,
} from "@/lib/blood";
import { formatRelativeFr } from "@/lib/format";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/blood/me")({
  head: () =>
    buildHead({
      title: "Mon profil donneur — HealthLink Maroc",
      description:
        "Consultez et modifiez vos informations de donneur de sang en toute sécurité.",
    }),
  component: MyDonorProfilePage,
});

const editSchema = z.object({
  first_name: z.string().trim().max(60).optional().nullable(),
  last_name: z.string().trim().max(60).optional().nullable(),
  blood_group: z.enum(["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"] as const),
  gender: z.string().max(20).optional().nullable(),
  city_id: z.string().uuid().optional().nullable(),
  contact_phone: z
    .string()
    .trim()
    .min(6, "Numéro trop court")
    .max(20, "Numéro trop long"),
  contact_email: z
    .string()
    .trim()
    .email("Email invalide")
    .max(120)
    .optional()
    .nullable()
    .or(z.literal("")),
  weight_kg: z
    .number({ invalid_type_error: "Poids requis" })
    .min(50, "Minimum 50 kg")
    .max(250, "Poids invalide"),
  last_donation_at: z.string().optional().nullable(),
  status: z.enum(["available", "unavailable", "busy", "traveling", "inactive"] as const),
  is_available: z.boolean(),
  notes: z.string().max(500).optional().nullable(),
});

type EditState = {
  first_name: string;
  last_name: string;
  blood_group: BloodGroup;
  gender: string;
  city_id: string;
  contact_phone: string;
  contact_email: string;
  weight_kg: number;
  last_donation_at: string;
  status: DonorStatus;
  is_available: boolean;
  notes: string;
};

function MyDonorProfilePage() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const { data: donor, isLoading } = useQuery(myBloodDonorQuery(user?.id));
  const { data: cities = [] } = useQuery(citiesQuery());

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditState | null>(null);

  useEffect(() => {
    if (donor) {
      setForm({
        first_name: donor.first_name ?? "",
        last_name: donor.last_name ?? "",
        blood_group: donor.blood_group as BloodGroup,
        gender: donor.gender ?? "",
        city_id: donor.city_id ?? "",
        contact_phone: donor.contact_phone ?? "",
        contact_email: donor.contact_email ?? "",
        weight_kg: Number(donor.weight_kg ?? 65),
        last_donation_at: donor.last_donation_at
          ? String(donor.last_donation_at).slice(0, 10)
          : "",
        status: donor.status as DonorStatus,
        is_available: !!donor.is_available,
        notes: donor.notes ?? "",
      });
    }
  }, [donor]);

  const cityName = useMemo(
    () => cities.find((c) => c.id === donor?.city_id)?.name_fr ?? "—",
    [cities, donor?.city_id],
  );

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Session expirée");
      if (!form) throw new Error("Formulaire invalide");
      const parsed = editSchema.safeParse({
        ...form,
        contact_email: form.contact_email || null,
        last_donation_at: form.last_donation_at || null,
        first_name: form.first_name || null,
        last_name: form.last_name || null,
        gender: form.gender || null,
        city_id: form.city_id || null,
        notes: form.notes || null,
      });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Champs invalides");
      }
      const { error } = await supabase
        .from("blood_donors")
        .update({
          ...parsed.data,
          last_active_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profil mis à jour");
      qc.invalidateQueries({ queryKey: ["blood_donor"] });
      setEditing(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading || isLoading) {
    return <Skeleton className="h-[520px] rounded-3xl" />;
  }

  if (!donor) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Communauté"
          title="Mon profil donneur"
          description="Complétez votre inscription pour sauver des vies."
          icon={<Heart className="h-5 w-5" />}
        />
        <EmptyState
          icon={Heart}
          title="Vous n'êtes pas encore inscrit"
          description="Créez votre profil donneur pour être contacté lors des urgences."
          action={
            <Button asChild>
              <Link to="/blood/become-donor">Devenir donneur</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const status = DONOR_STATUS_META[donor.status as DonorStatus];
  const eligible = canDonateAgain(donor.last_donation_at);
  const waitDays = daysUntilEligible(donor.last_donation_at);
  const initials =
    `${donor.first_name?.[0] ?? ""}${donor.last_name?.[0] ?? ""}`.toUpperCase() || "?";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Communauté"
        title="Mon profil donneur"
        description="Consultez et mettez à jour vos informations en toute sécurité."
        icon={<Heart className="h-5 w-5" />}
        actions={
          !editing ? (
            <Button onClick={() => setEditing(true)} className="gap-2">
              <Pencil className="h-4 w-4" /> Modifier
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  qc.invalidateQueries({ queryKey: ["blood_donor"] });
                }}
                className="gap-2"
              >
                <X className="h-4 w-4" /> Annuler
              </Button>
              <Button
                onClick={() => save.mutate()}
                disabled={save.isPending}
                className="gap-2"
              >
                {save.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Enregistrer
              </Button>
            </div>
          )
        }
      />

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-rose-50 to-white p-6 shadow-soft dark:from-rose-950/30 dark:to-card sm:p-8"
      >
        <div className="grid gap-6 sm:grid-cols-[auto_1fr_auto] sm:items-center">
          <div className="relative">
            <div className="grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-br from-rose-500 to-red-600 text-2xl font-bold text-white shadow-elevated">
              {initials}
            </div>
            <span
              className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-4 border-card ${status.dot}`}
            />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {donor.first_name ?? "Donneur"} {donor.last_name ?? ""}
              </h1>
              {donor.is_verified && (
                <Badge className="border-0 bg-emerald-500/15 text-emerald-600">
                  <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Vérifié
                </Badge>
              )}
              <Badge className={`border-0 ${status.tint}`}>{status.label}</Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {cityName}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-4 w-4" /> Actif {formatRelativeFr(donor.last_active_at)}
              </span>
              {eligible ? (
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <ShieldCheck className="h-4 w-4" /> Éligible
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-600">
                  <Clock className="h-4 w-4" /> Éligible dans {waitDays} j
                </span>
              )}
            </div>
          </div>
          <div className="grid place-items-center rounded-3xl bg-rose-500/10 px-6 py-4 text-rose-600">
            <Droplet className="h-6 w-6" fill="currentColor" />
            <p className="mt-1 text-2xl font-bold">{donor.blood_group}</p>
          </div>
        </div>
      </motion.section>

      <section className="grid gap-3 sm:grid-cols-3">
        <StatTile
          icon={Heart}
          label="Dons effectués"
          value={donor.total_donations ?? 0}
          tint="text-rose-600"
        />
        <StatTile
          icon={Sparkles}
          label="Vies aidées"
          value={(donor.total_donations ?? 0) * 3}
          tint="text-fuchsia-600"
        />
        <StatTile
          icon={CalendarCheck}
          label="Dernier don"
          value={
            donor.last_donation_at
              ? formatRelativeFr(donor.last_donation_at)
              : "Aucun"
          }
          tint="text-emerald-600"
        />
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-7">
        <h2 className="mb-4 text-lg font-semibold">Informations personnelles</h2>
        {editing && form ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
            className="grid gap-5"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldEdit label="Prénom" icon={User}>
                <Input
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  maxLength={60}
                />
              </FieldEdit>
              <FieldEdit label="Nom" icon={User}>
                <Input
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  maxLength={60}
                />
              </FieldEdit>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <FieldEdit label="Groupe sanguin" icon={Droplet} required>
                <Select
                  value={form.blood_group}
                  onValueChange={(v) =>
                    setForm({ ...form, blood_group: v as BloodGroup })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_GROUPS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldEdit>
              <FieldEdit label="Genre">
                <Select
                  value={form.gender}
                  onValueChange={(v) => setForm({ ...form, gender: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Non précisé" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Homme</SelectItem>
                    <SelectItem value="female">Femme</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </FieldEdit>
              <FieldEdit label="Poids (kg)" required>
                <Input
                  type="number"
                  min={50}
                  max={250}
                  value={form.weight_kg}
                  onChange={(e) =>
                    setForm({ ...form, weight_kg: Number(e.target.value) || 0 })
                  }
                />
              </FieldEdit>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldEdit label="Ville" icon={MapPin}>
                <Select
                  value={form.city_id}
                  onValueChange={(v) => setForm({ ...form, city_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name_fr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldEdit>
              <FieldEdit label="Dernier don" icon={Heart}>
                <Input
                  type="date"
                  value={form.last_donation_at}
                  onChange={(e) =>
                    setForm({ ...form, last_donation_at: e.target.value })
                  }
                />
              </FieldEdit>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldEdit label="Téléphone (privé)" icon={Phone} required>
                <Input
                  required
                  value={form.contact_phone}
                  onChange={(e) =>
                    setForm({ ...form, contact_phone: e.target.value })
                  }
                  placeholder="+212 6 ..."
                  maxLength={20}
                />
              </FieldEdit>
              <FieldEdit label="Email (privé)" icon={Mail}>
                <Input
                  type="email"
                  value={form.contact_email}
                  onChange={(e) =>
                    setForm({ ...form, contact_email: e.target.value })
                  }
                  maxLength={120}
                />
              </FieldEdit>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldEdit label="Statut">
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm({ ...form, status: v as DonorStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(DONOR_STATUS_META) as DonorStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {DONOR_STATUS_META[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldEdit>
              <label className="flex items-center justify-between rounded-2xl border border-border bg-muted/30 p-4">
                <div>
                  <p className="text-sm font-medium">Visible et disponible</p>
                  <p className="text-xs text-muted-foreground">
                    Désactivable à tout moment.
                  </p>
                </div>
                <Switch
                  checked={form.is_available}
                  onCheckedChange={(v) => setForm({ ...form, is_available: v })}
                />
              </label>
            </div>

            <FieldEdit label="Notes (privé)">
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                maxLength={500}
                rows={3}
                placeholder="Antécédents, préférences, disponibilités..."
              />
            </FieldEdit>

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditing(false)}
                className="gap-2"
              >
                <X className="h-4 w-4" /> Annuler
              </Button>
              <Button type="submit" disabled={save.isPending} className="gap-2">
                {save.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Enregistrer
              </Button>
            </div>
          </form>
        ) : (
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <ReadItem icon={User} label="Nom complet">
              {[donor.first_name, donor.last_name].filter(Boolean).join(" ") || "—"}
            </ReadItem>
            <ReadItem icon={Droplet} label="Groupe sanguin">
              {donor.blood_group}
            </ReadItem>
            <ReadItem icon={User} label="Genre">
              {donor.gender === "male"
                ? "Homme"
                : donor.gender === "female"
                  ? "Femme"
                  : donor.gender === "other"
                    ? "Autre"
                    : "—"}
            </ReadItem>
            <ReadItem icon={Heart} label="Poids">
              {donor.weight_kg ? `${donor.weight_kg} kg` : "—"}
            </ReadItem>
            <ReadItem icon={MapPin} label="Ville">
              {cityName}
            </ReadItem>
            <ReadItem icon={CalendarCheck} label="Dernier don">
              {donor.last_donation_at
                ? new Date(donor.last_donation_at).toLocaleDateString("fr-FR")
                : "—"}
            </ReadItem>
            <ReadItem icon={Phone} label="Téléphone (privé)">
              {donor.contact_phone || "—"}
            </ReadItem>
            <ReadItem icon={Mail} label="Email (privé)">
              {donor.contact_email || "—"}
            </ReadItem>
            {donor.notes && (
              <div className="sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Notes
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{donor.notes}</p>
              </div>
            )}
          </dl>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-muted/30 p-5 text-sm text-muted-foreground">
        Vos coordonnées privées (téléphone, email, notes) ne sont jamais publiques.
        Elles ne sont partagées qu'avec les demandeurs de sang que vous acceptez
        d'aider.
      </section>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: typeof Heart;
  label: string;
  value: string | number;
  tint: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
      <Icon className={`mb-2 h-5 w-5 ${tint}`} />
      <p className="text-xl font-bold tabular-nums tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ReadItem({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Heart;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="mt-1 text-sm font-medium">{children}</p>
    </div>
  );
}

function FieldEdit({
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
    <div className="space-y-1.5">
      <Label className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />} {label}
        {required && <span className="text-rose-500">*</span>}
      </Label>
      {children}
    </div>
  );
}