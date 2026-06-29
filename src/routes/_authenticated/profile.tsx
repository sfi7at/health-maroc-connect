import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User, Heart, Pill, Calendar, ShieldCheck, Loader2, LogOut, Droplet, Activity,
  AlertTriangle, Phone, Plus, Trash2, Syringe, FileText, Stethoscope, Settings, Bell, Star,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/common/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { medicalProfileQuery } from "@/lib/queries";
import { useAuth } from "@/hooks/use-auth";
import { initialsOf } from "@/lib/format";
import { BLOOD_GROUPS, type BloodGroup } from "@/lib/categories";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () =>
    buildHead({
      title: "Profil médical — HealthLink Maroc",
      description: "Vos informations de santé, allergies, vaccinations, contacts d'urgence — chiffrées et privées.",
      path: "/profile",
    }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: meta } = useQuery({
    queryKey: ["profile", "me", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, phone, city")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: med, isLoading } = useQuery(medicalProfileQuery(user?.id));

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Déconnecté");
    navigate({ to: "/auth", replace: true });
  };

  if (!user || isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const displayName = meta?.full_name || user.email || "Utilisateur";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Votre dossier"
        title="Profil médical"
        description="Centralisez vos données santé. Tout est chiffré et privé — vous seul y accédez."
        icon={<User className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" className="gap-2">
              <Link to="/_authenticated/settings"><Settings className="h-4 w-4" /> Paramètres</Link>
            </Button>
            <Button variant="outline" onClick={handleSignOut} className="gap-2">
              <LogOut className="h-4 w-4" /> Déconnexion
            </Button>
          </div>
        }
      />

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-6 rounded-3xl border border-border bg-card p-6 shadow-soft sm:grid-cols-[auto_1fr_auto] sm:p-8"
      >
        <Avatar className="h-20 w-20 ring-2 ring-primary/20">
          {meta?.avatar_url ? <AvatarImage src={meta.avatar_url} alt={displayName} /> : null}
          <AvatarFallback className="bg-primary/10 text-xl text-primary">
            {initialsOf(meta?.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold">{displayName}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{user.email}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1">
              <Droplet className="h-3.5 w-3.5" /> {med?.profile?.blood_group ?? "Groupe inconnu"}
            </Badge>
            {meta?.city ? <Badge variant="secondary">{meta.city}</Badge> : null}
            <Badge className="border-0 bg-primary/10 text-primary gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Données chiffrées
            </Badge>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center sm:flex sm:flex-col sm:items-end sm:gap-1">
          <ProfileStat icon={<Heart className="h-4 w-4" />} label="Dons" to="/blood" />
          <ProfileStat icon={<Calendar className="h-4 w-4" />} label="RDV" to="/_authenticated/appointments" />
          <ProfileStat icon={<Star className="h-4 w-4" />} label="Favoris" to="/_authenticated/favorites" />
        </div>
      </motion.section>

      <PersonalInfoSection profile={meta} userId={user.id} />
      <VitalsSection profile={med?.profile} userId={user.id} />

      <ListSection
        title="Allergies"
        icon={<AlertTriangle className="h-5 w-5" />}
        table="allergies"
        userId={user.id}
        items={med?.allergies ?? []}
        getLabel={(a) => `${a.name}${a.severity ? ` · ${a.severity}` : ""}`}
        emptyHint="Aucune allergie déclarée"
        addLabel="Ajouter une allergie"
      />
      <ListSection
        title="Vaccinations"
        icon={<Syringe className="h-5 w-5" />}
        table="vaccinations"
        userId={user.id}
        items={med?.vaccinations ?? []}
        getLabel={(v) => `${v.name}${v.vaccinated_at ? ` · ${v.vaccinated_at}` : ""}`}
        emptyHint="Aucun vaccin enregistré"
        addLabel="Ajouter un vaccin"
      />
      <ListSection
        title="Antécédents médicaux"
        icon={<Activity className="h-5 w-5" />}
        table="medical_conditions"
        userId={user.id}
        items={med?.conditions ?? []}
        getLabel={(c) => c.name}
        emptyHint="Aucun antécédent renseigné"
        addLabel="Ajouter un antécédent"
      />
      <ListSection
        title="Contacts d'urgence"
        icon={<Phone className="h-5 w-5" />}
        table="emergency_contacts"
        userId={user.id}
        items={med?.emergencyContacts ?? []}
        getLabel={(c) => `${c.full_name} · ${c.phone}${c.relation ? ` (${c.relation})` : ""}`}
        emptyHint="Aucun contact d'urgence"
        addLabel="Ajouter un contact"
        extraField={{ key: "phone", label: "Téléphone", placeholder: "+212 …" }}
      />

      <section className="rounded-3xl border border-border bg-card shadow-soft">
        <Link to="/_authenticated/notifications" className="flex items-center gap-4 p-5 transition hover:bg-accent/40">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Bell className="h-5 w-5" /></div>
          <div className="flex-1"><p className="text-sm font-semibold">Notifications</p><p className="text-xs text-muted-foreground">Voir vos alertes et rappels</p></div>
        </Link>
        <Separator />
        <Link to="/doctors" className="flex items-center gap-4 p-5 transition hover:bg-accent/40">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Stethoscope className="h-5 w-5" /></div>
          <div className="flex-1"><p className="text-sm font-semibold">Trouver un médecin</p><p className="text-xs text-muted-foreground">Annuaire vérifié au Maroc</p></div>
        </Link>
      </section>
    </div>
  );
}

function ProfileStat({ icon, label, to }: { icon: React.ReactNode; label: string; to: string }) {
  return (
    <Link to={to} className="rounded-2xl border border-border bg-background p-3 text-xs font-medium transition hover:border-primary/30 hover:bg-accent/40">
      <span className="grid h-8 w-8 mx-auto place-items-center rounded-xl bg-primary/10 text-primary">{icon}</span>
      <span className="mt-1 block text-muted-foreground">{label}</span>
    </Link>
  );
}

function PersonalInfoSection({
  profile, userId,
}: {
  profile: { full_name: string | null; phone: string | null; city: string | null } | null | undefined;
  userId: string;
}) {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [city, setCity] = useState(profile?.city ?? "");
  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
    setCity(profile?.city ?? "");
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: userId, full_name: fullName, phone, city }, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profil mis à jour");
      queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
      <h3 className="text-base font-semibold">Informations personnelles</h3>
      <form
        onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
        className="mt-5 grid gap-4 sm:grid-cols-2"
      >
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="full-name">Nom complet</Label>
          <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Amine El Idrissi" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Téléphone</Label>
          <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+212 6 12 34 56 78" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city">Ville</Label>
          <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Casablanca" />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enregistrer
          </Button>
        </div>
      </form>
    </section>
  );
}

function VitalsSection({
  profile, userId,
}: {
  profile: { blood_group: BloodGroup | null; height_cm: number | null; weight_kg: number | null } | null | undefined;
  userId: string;
}) {
  const queryClient = useQueryClient();
  const [bg, setBg] = useState<BloodGroup | "">((profile?.blood_group as BloodGroup) ?? "");
  const [h, setH] = useState(profile?.height_cm?.toString() ?? "");
  const [w, setW] = useState(profile?.weight_kg?.toString() ?? "");
  useEffect(() => {
    setBg((profile?.blood_group as BloodGroup) ?? "");
    setH(profile?.height_cm?.toString() ?? "");
    setW(profile?.weight_kg?.toString() ?? "");
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("medical_profiles")
        .upsert(
          {
            user_id: userId,
            blood_group: bg || null,
            height_cm: h ? Number(h) : null,
            weight_kg: w ? Number(w) : null,
          },
          { onConflict: "user_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Données mises à jour");
      queryClient.invalidateQueries({ queryKey: ["medical_profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
      <h3 className="text-base font-semibold">Données vitales</h3>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Groupe sanguin</Label>
          <Select value={bg} onValueChange={(v) => setBg(v as BloodGroup)}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {BLOOD_GROUPS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Taille (cm)</Label>
          <Input type="number" value={h} onChange={(e) => setH(e.target.value)} placeholder="175" />
        </div>
        <div className="space-y-1.5">
          <Label>Poids (kg)</Label>
          <Input type="number" value={w} onChange={(e) => setW(e.target.value)} placeholder="70" />
        </div>
      </div>
      <Button onClick={() => save.mutate()} disabled={save.isPending} className="mt-4">
        {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enregistrer
      </Button>
    </section>
  );
}

interface ListItem {
  id: string;
  name?: string | null;
  full_name?: string | null;
  phone?: string | null;
  relation?: string | null;
  severity?: string | null;
  vaccinated_at?: string | null;
}

function ListSection<T extends ListItem>({
  title, icon, table, userId, items, getLabel, emptyHint, addLabel, extraField,
}: {
  title: string;
  icon: React.ReactNode;
  table: "allergies" | "vaccinations" | "medical_conditions" | "emergency_contacts";
  userId: string;
  items: T[];
  getLabel: (item: T) => string;
  emptyHint: string;
  addLabel: string;
  extraField?: { key: string; label: string; placeholder: string };
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [extra, setExtra] = useState("");

  const add = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Le nom est requis");
      if (table === "emergency_contacts") {
        const { error } = await supabase
          .from("emergency_contacts")
          .insert({ user_id: userId, full_name: name.trim(), phone: extra.trim() });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(table)
          .insert({ user_id: userId, name: name.trim() });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setName(""); setExtra(""); setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["medical_profile"] });
      toast.success("Ajouté");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medical_profile"] });
      toast.success("Supprimé");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</div>
          <h3 className="text-base font-semibold">{title}</h3>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)} className="gap-1">
          <Plus className="h-4 w-4" /> {open ? "Annuler" : "Ajouter"}
        </Button>
      </div>

      {open ? (
        <div className="mt-4 grid gap-3 rounded-2xl border border-dashed border-border p-4 sm:grid-cols-[1fr_1fr_auto]">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={addLabel} />
          {extraField ? (
            <Input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder={extraField.placeholder} />
          ) : <div />}
          <Button onClick={() => add.mutate()} disabled={add.isPending}>
            {add.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enregistrer
          </Button>
        </div>
      ) : null}

      <ul className="mt-4 space-y-2">
        {items.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-border bg-background p-4 text-center text-sm text-muted-foreground">
            {emptyHint}
          </li>
        ) : (
          items.map((it) => (
            <li key={it.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3">
              <span className="truncate text-sm">{getLabel(it)}</span>
              <Button size="icon" variant="ghost" onClick={() => remove.mutate(it.id)} aria-label="Supprimer">
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
