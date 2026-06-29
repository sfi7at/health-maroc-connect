import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Heart,
  Pill,
  FileText,
  Calendar,
  ShieldCheck,
  ChevronRight,
  Loader2,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () =>
    buildHead({
      title: "Profil médical",
      description:
        "Gérez votre dossier médical : antécédents, traitements, allergies, rendez-vous et ordonnances.",
      path: "/profile",
    }),
  component: ProfilePage,
});

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  city: string | null;
}

const sections = [
  { icon: FileText, title: "Antécédents médicaux", hint: "Historique, chirurgies, hospitalisations" },
  { icon: Pill, title: "Traitements en cours", hint: "Médicaments, posologies, rappels" },
  { icon: Heart, title: "Allergies & alertes", hint: "Réactions connues à signaler" },
  { icon: Calendar, title: "Mes rendez-vous", hint: "À venir et passés" },
  { icon: ShieldCheck, title: "Confidentialité", hint: "Qui peut accéder à vos données" },
];

function initials(name: string | null | undefined, fallback = "HL") {
  if (!name) return fallback;
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Not authenticated");
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, phone, city")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return { user, profile: (profile as Profile | null) };
    },
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.profile) {
      setFullName(data.profile.full_name ?? "");
      setPhone(data.profile.phone ?? "");
      setCity(data.profile.city ?? "");
    }
  }, [data?.profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone, city })
      .eq("id", data.user.id);
    setSaving(false);
    if (error) {
      toast.error("Échec de la mise à jour", { description: error.message });
      return;
    }
    toast.success("Profil mis à jour");
    queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
  };

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Déconnecté");
    navigate({ to: "/auth", replace: true });
  };

  if (isLoading || !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const displayName = data.profile?.full_name || data.user.email || "Utilisateur";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Votre santé"
        title="Profil médical"
        description="Vos informations de santé restent chiffrées et privées."
        icon={<User className="h-5 w-5" />}
      />

      <section className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <Avatar className="h-20 w-20 ring-2 ring-primary/15">
            {data.profile?.avatar_url ? (
              <AvatarImage src={data.profile.avatar_url} alt={displayName} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-xl text-primary">
              {initials(data.profile?.full_name, "HL")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold">{displayName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{data.user.email}</p>
          </div>
          <Button variant="outline" onClick={handleSignOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </Button>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
        <h3 className="text-base font-semibold">Informations personnelles</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Ces informations facilitent vos rendez-vous et ordonnances.
        </p>
        <form onSubmit={handleSave} className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="full-name">Nom complet</Label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Amine El Idrissi"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+212 6 12 34 56 78"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">Ville</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Casablanca"
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-border bg-card shadow-soft">
        <ul className="divide-y divide-border">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <li key={s.title}>
                <button className="flex w-full items-center gap-4 p-5 text-left transition hover:bg-accent/40">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{s.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.hint}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}