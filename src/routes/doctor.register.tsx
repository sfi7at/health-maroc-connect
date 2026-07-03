import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, ArrowRight, BadgeCheck, Building2, Check, Eye, EyeOff, FileText,
  IdCard, Loader2, Lock, Mail, MapPin, Phone, Stethoscope, Upload, User as UserIcon,
  ShieldCheck, X,
} from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { citiesQuery } from "@/lib/queries";
import { specialtiesQuery } from "@/lib/doctors";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/doctor/register")({
  head: () =>
    buildHead({
      title: "Portail praticien — Inscription",
      description: "Créez votre compte professionnel de santé sur HealthLink Maroc.",
      path: "/doctor/register",
    }),
  component: DoctorRegisterPage,
});

const schema = z
  .object({
    firstName: z.string().trim().min(2, "Prénom requis"),
    lastName: z.string().trim().min(2, "Nom requis"),
    email: z.string().trim().email("Email invalide"),
    password: z.string().min(8, "8 caractères minimum"),
    confirm: z.string(),
    phone: z.string().trim().regex(/^\+?[0-9\s-]{8,16}$/, "Téléphone invalide"),
    licenseNumber: z.string().trim().min(3, "Numéro INPE requis"),
    specialtyId: z.string().min(1, "Spécialité requise"),
    cityId: z.string().min(1, "Ville requise"),
    address: z.string().trim().min(5, "Adresse du cabinet requise"),
    title: z.enum(["Dr.", "Pr."]),
    terms: z.literal(true, { errorMap: () => ({ message: "Acceptez les conditions" }) }),
  })
  .refine((d) => d.password === d.confirm, { message: "Mots de passe différents", path: ["confirm"] });

type PendingDoc = { key: string; label: string; file: File | null };

const REQUIRED_DOCS: Array<{ key: string; label: string }> = [
  { key: "license", label: "Licence / autorisation d'exercer (INPE)" },
  { key: "id_card", label: "Pièce d'identité (CNI)" },
  { key: "diploma", label: "Diplôme de médecine" },
  { key: "registry", label: "Inscription à l'Ordre des médecins" },
];

function normalizePhone(input: string): string {
  const t = input.trim().replace(/[\s().-]/g, "");
  if (t.startsWith("+")) return t;
  if (t.startsWith("00")) return "+" + t.slice(2);
  if (t.startsWith("0")) return "+212" + t.slice(1);
  return "+" + t;
}

function DoctorRegisterPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { data: cities = [] } = useQuery(citiesQuery());
  const { data: specialties = [] } = useQuery(specialtiesQuery());

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [busy, setBusy] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const [form, setForm] = useState({
    title: "Dr." as "Dr." | "Pr.",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
    licenseNumber: "",
    specialtyId: "",
    cityId: "",
    address: "",
    bio: "",
    terms: false,
  });

  const [docs, setDocs] = useState<PendingDoc[]>(
    REQUIRED_DOCS.map((d) => ({ ...d, file: null })),
  );

  useEffect(() => {
    if (!loading && user) {
      // If already logged in and clicked "register", route to their dashboard.
      navigate({ to: "/doctor-dashboard", replace: true });
    }
  }, [user, loading, navigate]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const canGoStep2 = useMemo(() => {
    return (
      form.firstName.trim().length >= 2 &&
      form.lastName.trim().length >= 2 &&
      /.+@.+\..+/.test(form.email) &&
      form.password.length >= 8 &&
      form.password === form.confirm
    );
  }, [form]);

  const canGoStep3 = useMemo(() => {
    return (
      form.licenseNumber.trim().length >= 3 &&
      !!form.specialtyId &&
      !!form.cityId &&
      form.address.trim().length >= 5 &&
      /^\+?[0-9\s-]{8,16}$/.test(form.phone)
    );
  }, [form]);

  const handleDoc = (key: string, file: File | null) => {
    setDocs((prev) => prev.map((d) => (d.key === key ? { ...d, file } : d)));
  };

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Formulaire invalide");
      return;
    }
    setBusy(true);
    try {
      const fullName = `${form.title} ${form.firstName.trim()} ${form.lastName.trim()}`.replace(/\s+/g, " ");
      const phone = normalizePhone(form.phone);

      const { data: sign, error: signErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        phone,
        options: {
          data: {
            full_name: fullName,
            first_name: form.firstName.trim(),
            last_name: form.lastName.trim(),
            phone,
            city_id: form.cityId,
            language: "fr",
            terms_accepted: true,
            role_intent: "doctor",
          },
          emailRedirectTo: window.location.origin + "/doctor/login",
        },
      });
      if (signErr) throw signErr;

      const userId = sign.user?.id;
      const hasSession = !!sign.session;

      if (!userId || !hasSession) {
        toast.success("Compte créé", {
          description: "Vérifiez votre email pour confirmer, puis connectez-vous pour finaliser votre inscription praticien.",
        });
        navigate({ to: "/doctor/login", replace: true });
        return;
      }

      // Create the doctor provider record.
      const { data: prov, error: provErr } = await supabase
        .from("providers")
        .insert({
          owner_id: userId,
          category: "doctor",
          name: fullName,
          phone,
          email: form.email,
          address: form.address.trim(),
          city_id: form.cityId,
          description: form.bio.trim() || null,
          is_active: false,
          metadata: {
            license_number: form.licenseNumber.trim(),
            title: form.title,
            bio: form.bio.trim() || undefined,
          },
        })
        .select("id")
        .single();
      if (provErr) throw provErr;

      // Link specialty
      await supabase
        .from("provider_specialties")
        .insert({ provider_id: prov.id, specialty_id: form.specialtyId });

      // Upload documents
      const uploads = docs.filter((d) => d.file);
      for (const d of uploads) {
        const path = `${userId}/providers/${prov.id}/${d.key}-${Date.now()}-${d.file!.name}`;
        const { error: upErr } = await supabase.storage
          .from("documents")
          .upload(path, d.file!, { upsert: true });
        if (upErr) {
          toast.warning(`Document non envoyé: ${d.label}`, { description: upErr.message });
        }
      }

      toast.success("Bienvenue Docteur !", {
        description: "Votre profil est en cours de vérification par notre équipe.",
      });
      navigate({ to: "/doctor-dashboard", replace: true });
    } catch (e) {
      toast.error("Inscription impossible", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-sky-500/25 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[500px] rounded-full bg-indigo-600/20 blur-3xl" />
      </div>
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-5 py-8">
        <Link to="/doctor/login" className="inline-flex w-fit items-center gap-1.5 text-sm text-slate-400 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Connexion praticien
        </Link>

        <div className="my-8 flex flex-col items-center text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/30">
            <Stethoscope className="h-7 w-7" />
          </div>
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-sky-300">
            <BadgeCheck className="h-3.5 w-3.5" /> Inscription Praticien
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">Créer votre compte professionnel</h1>
          <p className="mt-1 text-sm text-slate-400">Rejoignez le premier réseau de santé marocain.</p>
        </div>

        {/* Stepper */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-2">
              <div className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold transition ${
                step === n ? "bg-sky-500 text-white shadow-lg shadow-sky-500/40"
                : step > n ? "bg-emerald-500 text-white"
                : "bg-slate-800 text-slate-500"
              }`}>
                {step > n ? <Check className="h-4 w-4" /> : n}
              </div>
              {n < 3 && <div className={`h-0.5 w-10 ${step > n ? "bg-emerald-500" : "bg-slate-800"}`} />}
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-2xl backdrop-blur">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Identité & accès</h2>
              <div className="grid grid-cols-[100px_1fr_1fr] gap-3">
                <div className="space-y-1.5">
                  <Label className="text-slate-200">Titre</Label>
                  <Select value={form.title} onValueChange={(v) => set("title", v as "Dr." | "Pr.")}>
                    <SelectTrigger className="border-slate-700 bg-slate-950/60 text-slate-100"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dr.">Dr.</SelectItem>
                      <SelectItem value="Pr.">Pr.</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <FieldDark label="Prénom" icon={UserIcon}>
                  <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} className="border-slate-700 bg-slate-950/60 pl-9 text-slate-100" placeholder="Amine" />
                </FieldDark>
                <FieldDark label="Nom">
                  <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} className="border-slate-700 bg-slate-950/60 text-slate-100" placeholder="El Idrissi" />
                </FieldDark>
              </div>

              <FieldDark label="Email professionnel" icon={Mail}>
                <Input type="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)}
                  className="border-slate-700 bg-slate-950/60 pl-9 text-slate-100" placeholder="dr.nom@clinique.ma" />
              </FieldDark>

              <div className="grid gap-3 sm:grid-cols-2">
                <FieldDark label="Mot de passe" icon={Lock}>
                  <Input type={showPwd ? "text" : "password"} autoComplete="new-password" minLength={8}
                    value={form.password} onChange={(e) => set("password", e.target.value)}
                    className="border-slate-700 bg-slate-950/60 pl-9 pr-10 text-slate-100" placeholder="Au moins 8 caractères" />
                  <button type="button" onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-2 top-8 rounded-md p-1.5 text-slate-500 hover:text-slate-200">
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </FieldDark>
                <FieldDark label="Confirmer" icon={Lock}>
                  <Input type={showPwd ? "text" : "password"} minLength={8} value={form.confirm}
                    onChange={(e) => set("confirm", e.target.value)}
                    className="border-slate-700 bg-slate-950/60 pl-9 text-slate-100" placeholder="Répéter" />
                </FieldDark>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={() => setStep(2)} disabled={!canGoStep2}
                  className="bg-gradient-to-r from-sky-500 to-indigo-600 text-white">
                  Suivant <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Informations professionnelles</h2>
              <FieldDark label="Numéro INPE / Licence d'exercer" icon={IdCard}>
                <Input value={form.licenseNumber} onChange={(e) => set("licenseNumber", e.target.value)}
                  className="border-slate-700 bg-slate-950/60 pl-9 text-slate-100" placeholder="INPE-XXXXXX" />
              </FieldDark>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-slate-200">Spécialité</Label>
                  <Select value={form.specialtyId} onValueChange={(v) => set("specialtyId", v)}>
                    <SelectTrigger className="border-slate-700 bg-slate-950/60 text-slate-100"><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent className="max-h-64">
                      {specialties.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name_fr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-200">Ville d'exercice</Label>
                  <Select value={form.cityId} onValueChange={(v) => set("cityId", v)}>
                    <SelectTrigger className="border-slate-700 bg-slate-950/60 text-slate-100"><SelectValue placeholder="Ville" /></SelectTrigger>
                    <SelectContent className="max-h-64">
                      {cities.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name_fr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <FieldDark label="Adresse du cabinet" icon={MapPin}>
                <Input value={form.address} onChange={(e) => set("address", e.target.value)}
                  className="border-slate-700 bg-slate-950/60 pl-9 text-slate-100" placeholder="12 rue de la Résistance, Casablanca" />
              </FieldDark>

              <FieldDark label="Téléphone professionnel" icon={Phone}>
                <Input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)}
                  className="border-slate-700 bg-slate-950/60 pl-9 text-slate-100" placeholder="+212 6 XX XX XX XX" />
              </FieldDark>

              <div className="space-y-1.5">
                <Label className="text-slate-200">Présentation (optionnel)</Label>
                <Textarea value={form.bio} onChange={(e) => set("bio", e.target.value)} rows={3}
                  className="border-slate-700 bg-slate-950/60 text-slate-100"
                  placeholder="Expérience, langues parlées, spécialités secondaires…" />
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(1)}
                  className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-white">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Retour
                </Button>
                <Button onClick={() => setStep(3)} disabled={!canGoStep3}
                  className="bg-gradient-to-r from-sky-500 to-indigo-600 text-white">
                  Suivant <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Documents de vérification</h2>
                <p className="mt-1 flex items-start gap-2 text-xs text-slate-400">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-sky-400 shrink-0" />
                  Vos documents sont stockés de manière sécurisée et examinés par notre équipe pour l'obtention du badge « Vérifié ». Vous pourrez aussi les ajouter plus tard depuis votre espace praticien.
                </p>
              </div>

              <div className="space-y-2">
                {docs.map((d) => (
                  <div key={d.key} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-800 text-slate-300">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-100">{d.label}</p>
                        <p className="truncate text-xs text-slate-500">{d.file ? d.file.name : "PDF, JPG ou PNG · max 10 MB"}</p>
                      </div>
                    </div>
                    {d.file ? (
                      <Button type="button" size="icon" variant="ghost" onClick={() => handleDoc(d.key, null)}
                        className="text-slate-400 hover:text-white">
                        <X className="h-4 w-4" />
                      </Button>
                    ) : (
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-sky-500/15 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/25">
                        <Upload className="h-3.5 w-3.5" /> Choisir
                        <input type="file" className="hidden" accept="application/pdf,image/*"
                          onChange={(e) => handleDoc(d.key, e.target.files?.[0] ?? null)} />
                      </label>
                    )}
                  </div>
                ))}
              </div>

              <label className="flex items-start gap-2 pt-2 text-sm text-slate-400">
                <Checkbox checked={form.terms} onCheckedChange={(v) => set("terms", Boolean(v) as true)} className="mt-0.5 border-slate-600 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500" />
                <span>
                  Je certifie être un professionnel de santé et j'accepte les{" "}
                  <Link to="/terms" className="text-sky-400 underline hover:text-sky-300">Conditions</Link>{" "}et la{" "}
                  <Link to="/privacy" className="text-sky-400 underline hover:text-sky-300">Politique de confidentialité</Link>.
                </span>
              </label>

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(2)}
                  className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-white">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Retour
                </Button>
                <Button onClick={submit} disabled={busy || !form.terms}
                  className="bg-gradient-to-r from-sky-500 to-indigo-600 text-white">
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Building2 className="mr-2 h-4 w-4" /> Créer mon espace praticien
                </Button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Déjà inscrit ?{" "}
          <Link to="/doctor/login" className="text-sky-400 underline hover:text-sky-300">Se connecter</Link>
          {" · "}
          Vous êtes un patient ?{" "}
          <Link to="/auth" className="underline hover:text-slate-300">Portail citoyen</Link>
        </p>
      </div>
    </div>
  );
}

function FieldDark({
  label, icon: Icon, children,
}: { label: string; icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="relative space-y-1.5">
      <Label className="text-slate-200">{label}</Label>
      <div className="relative">
        {Icon ? <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /> : null}
        {children}
      </div>
    </div>
  );
}