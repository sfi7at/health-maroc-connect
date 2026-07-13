import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Heart,
  Loader2,
  Mail,
  Lock,
  ArrowLeft,
  Eye,
  EyeOff,
  Phone,
  User as UserIcon,
  Check,
  Droplet,
} from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { citiesQuery } from "@/lib/queries";
import { buildHead } from "@/lib/seo";
import { Logo } from "@/components/brand/Logo";

const searchSchema = z.object({
  redirect: z.string().optional(),
  mode: z.enum(["signin", "signup", "phone", "forgot"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () =>
    buildHead({
      title: "Connexion",
      description: "Connectez-vous à Vytalma pour accéder à votre profil médical.",
      path: "/auth",
    }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect, mode } = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: redirect ?? "/profile", replace: true });
    }
  }, [user, loading, redirect, navigate]);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      </div>
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-8">
        <Link
          to="/"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à l'accueil
        </Link>

        <div className="my-8 flex flex-col items-center text-center">
          <img
            src="/vytalma-logo.png"
            alt="Vytalma"
            className="h-14 w-14 rounded-2xl object-cover shadow-soft"
          />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Vytalma</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Votre santé, centralisée et sécurisée.
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
          {mode === "forgot" ? (
            <ForgotPasswordForm />
          ) : (
            <Tabs
              defaultValue={
                mode === "signup" ? "signup" : mode === "phone" ? "phone" : "signin"
              }
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="signin">Email</TabsTrigger>
                <TabsTrigger value="phone">Téléphone</TabsTrigger>
                <TabsTrigger value="signup">Inscription</TabsTrigger>
              </TabsList>
              <TabsContent value="signin" className="mt-5">
                <SignInForm redirect={redirect} />
              </TabsContent>
              <TabsContent value="phone" className="mt-5">
                <PhoneOtpForm redirect={redirect} />
              </TabsContent>
              <TabsContent value="signup" className="mt-5">
                <SignUpForm />
              </TabsContent>
            </Tabs>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          En continuant, vous acceptez nos{" "}
          <Link to="/terms" className="underline hover:text-foreground">
            Conditions
          </Link>{" "}
          et notre{" "}
          <Link to="/privacy" className="underline hover:text-foreground">
            Politique de confidentialité
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function GoogleButton({ label }: { label: string }) {
  const [busy, setBusy] = useState(false);
  const onClick = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Connexion Google échouée", { description: result.error.message });
        setBusy(false);
        return;
      }
      if (result.redirected) return;
      // session set, listener will navigate
    } catch (e) {
      toast.error("Connexion Google échouée", { description: String(e) });
      setBusy(false);
    }
  };
  return (
    <Button type="button" variant="outline" className="w-full" onClick={onClick} disabled={busy}>
      {busy ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <GoogleIcon className="mr-2 h-4 w-4" />
      )}
      {label}
    </Button>
  );
}

function Divider() {
  return (
    <div className="relative my-5">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
        <span className="bg-card px-2 text-muted-foreground">ou avec votre email</span>
      </div>
    </div>
  );
}

function SignInForm({ redirect }: { redirect?: string }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    // Best-effort: log every attempt for brute-force analytics + register device on success.
    void import("@/lib/security").then(async ({ recordLoginAttempt, registerCurrentDevice, logSecurityEvent }) => {
      const { data: u } = await supabase.auth.getUser();
      await recordLoginAttempt({
        email,
        success: !error,
        userId: u.user?.id ?? null,
        failureReason: error?.message ?? null,
      });
      if (error) {
        await logSecurityEvent("login_failed", "low", { email });
      } else {
        await registerCurrentDevice();
      }
    }).catch(() => undefined);
    if (error) {
      toast.error("Échec de la connexion", { description: error.message });
      return;
    }
    toast.success("Bienvenue !");
    navigate({ to: redirect ?? "/profile", replace: true });
  };

  return (
    <div className="space-y-4">
      <GoogleButton label="Continuer avec Google" />
      <Divider />
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="signin-email">Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="signin-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9"
              placeholder="vous@exemple.ma"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="signin-password">Mot de passe</Label>
            <Link
              to="/auth"
              search={{ mode: "forgot" }}
              className="text-xs font-medium text-primary hover:underline"
            >
              Oublié ?
            </Link>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="signin-password"
              type={showPwd ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-9 pr-10"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
              aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Se connecter
        </Button>
      </form>
    </div>
  );
}

function SignUpForm() {
  const navigate = useNavigate();
  const { data: cities = [] } = useQuery(citiesQuery());

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [cityId, setCityId] = useState<string>("");
  const [language, setLanguage] = useState<"fr" | "ar" | "en">("fr");
  const [terms, setTerms] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  // Optional blood donor block
  const [isDonor, setIsDonor] = useState(false);
  const [bloodGroup, setBloodGroup] = useState<string>("");
  const [weightKg, setWeightKg] = useState<string>("");
  const [lastDonation, setLastDonation] = useState<string>("");
  const [donorAvailable, setDonorAvailable] = useState(true);

  const [busy, setBusy] = useState(false);

  const pwdStrength = useMemo(() => scorePassword(password), [password]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Renseignez votre prénom et votre nom.");
      return;
    }
    if (phone && !/^\+?[0-9\s-]{8,16}$/.test(phone)) {
      toast.error("Numéro de téléphone invalide.");
      return;
    }
    if (password.length < 8) {
      toast.error("Mot de passe trop court", { description: "Au moins 8 caractères." });
      return;
    }
    if (password !== confirm) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    if (!terms) {
      toast.error("Veuillez accepter les Conditions d'utilisation.");
      return;
    }
    if (isDonor && !bloodGroup) {
      toast.error("Sélectionnez votre groupe sanguin.");
      return;
    }
    setBusy(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, " ");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      phone: phone ? normalizePhone(phone) : undefined,
      options: {
        data: {
          full_name: fullName,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone ? normalizePhone(phone) : null,
          city_id: cityId || null,
          language,
          terms_accepted: true,
        },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      setBusy(false);
      toast.error("Inscription impossible", { description: error.message });
      return;
    }

    // Create blood donor profile if opted in
    const userId = data.user?.id;
    if (isDonor && userId) {
      const { error: donorErr } = await supabase.from("blood_donors").insert({
        id: userId,
        blood_group: bloodGroup as never,
        weight_kg: weightKg ? Number(weightKg) : null,
        last_donation_at: lastDonation || null,
        is_available: donorAvailable,
        city_id: cityId || null,
        contact_phone: phone ? normalizePhone(phone) : null,
        contact_email: email,
      });
      if (donorErr) {
        toast.warning("Compte créé, mais profil donneur non enregistré", {
          description: donorErr.message,
        });
      }
    }
    setBusy(false);

    if (!data.session) {
      toast.success("Compte créé", {
        description: "Vérifiez votre boîte email pour confirmer votre adresse.",
      });
      navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
      return;
    }
    toast.success("Bienvenue sur Vytalma.");
    navigate({ to: "/profile", replace: true });
  };

  return (
    <div className="space-y-4">
      <GoogleButton label="S'inscrire avec Google" />
      <Divider />
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="signup-first">Prénom</Label>
            <div className="relative">
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="signup-first"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="pl-9"
                placeholder="Amine"
                autoComplete="given-name"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="signup-last">Nom</Label>
            <Input
              id="signup-last"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="El Idrissi"
              autoComplete="family-name"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="signup-email">Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="signup-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9"
              placeholder="vous@exemple.ma"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="signup-phone">Téléphone</Label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="signup-phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="pl-9"
              placeholder="+212 6XX XX XX XX"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Ville</Label>
            <Select value={cityId} onValueChange={setCityId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une ville" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {cities.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name_fr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Langue</Label>
            <Select value={language} onValueChange={(v) => setLanguage(v as typeof language)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="ar">العربية</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="signup-password">Mot de passe</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="signup-password"
              type={showPwd ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-9 pr-10"
              placeholder="Au moins 8 caractères"
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
              aria-label={showPwd ? "Masquer" : "Afficher"}
            >
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {password.length > 0 && <PasswordStrength score={pwdStrength} />}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="signup-confirm">Confirmer le mot de passe</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="signup-confirm"
              type={showPwd ? "text" : "password"}
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="pl-9"
              autoComplete="new-password"
            />
          </div>
        </div>

        {/* Optional blood donor block */}
        <div className="rounded-2xl border border-border bg-muted/30 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-medium">
                <Droplet className="h-4 w-4 text-red-500" />
                Devenir donneur de sang
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Sauvez des vies. Vos coordonnées restent privées jusqu'à ce que vous acceptiez
                une demande.
              </p>
            </div>
            <Switch checked={isDonor} onCheckedChange={setIsDonor} />
          </div>

          {isDonor && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Groupe sanguin</Label>
                  <Select value={bloodGroup} onValueChange={setBloodGroup}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                        <SelectItem key={bg} value={bg}>
                          {bg}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="weight">Poids (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    min={40}
                    max={250}
                    step={1}
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="70"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last-don">Dernier don (optionnel)</Label>
                <Input
                  id="last-don"
                  type="date"
                  value={lastDonation}
                  onChange={(e) => setLastDonation(e.target.value)}
                />
              </div>
              <label className="flex items-center justify-between gap-2 text-sm">
                <span>Je suis disponible pour donner</span>
                <Switch checked={donorAvailable} onCheckedChange={setDonorAvailable} />
              </label>
            </div>
          )}
        </div>

        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          <Checkbox
            checked={terms}
            onCheckedChange={(v) => setTerms(Boolean(v))}
            id="terms"
            className="mt-0.5"
          />
          <span>
            J'accepte les{" "}
            <Link to="/terms" className="underline hover:text-foreground">
              Conditions
            </Link>{" "}
            et la{" "}
            <Link to="/privacy" className="underline hover:text-foreground">
              Politique de confidentialité
            </Link>
            .
          </span>
        </label>

        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Créer mon compte
        </Button>
      </form>
    </div>
  );
}

function PhoneOtpForm({ redirect }: { redirect?: string }) {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [busy, setBusy] = useState(false);

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizePhone(phone);
    if (!/^\+\d{8,15}$/.test(normalized)) {
      toast.error("Numéro invalide", {
        description: "Format international ex: +212 6 12 34 56 78",
      });
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      phone: normalized,
    });
    setBusy(false);
    if (error) {
      toast.error("Envoi du code impossible", { description: error.message });
      return;
    }
    toast.success("Code envoyé par SMS.");
    setStep("code");
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: normalizePhone(phone),
      token: code.trim(),
      type: "sms",
    });
    setBusy(false);
    if (error) {
      toast.error("Code invalide", { description: error.message });
      return;
    }
    toast.success("Bienvenue !");
    navigate({ to: redirect ?? "/profile", replace: true });
  };

  return (
    <div className="space-y-4">
      <GoogleButton label="Continuer avec Google" />
      <Divider />
      {step === "phone" ? (
        <form onSubmit={sendCode} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="otp-phone">Numéro de téléphone</Label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="otp-phone"
                type="tel"
                autoComplete="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-9"
                placeholder="+212 6 12 34 56 78"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Vous recevrez un code à 6 chiffres par SMS.
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Envoyer le code
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="otp-code">Code de vérification</Label>
            <Input
              id="otp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="text-center text-lg tracking-[0.4em]"
            />
            <p className="text-xs text-muted-foreground">
              Code envoyé au {normalizePhone(phone)}
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={busy || code.length < 6}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Check className="mr-2 h-4 w-4" />
            Vérifier
          </Button>
          <button
            type="button"
            onClick={() => setStep("phone")}
            className="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Modifier le numéro
          </button>
        </form>
      )}
    </div>
  );
}

function PasswordStrength({ score }: { score: number }) {
  const labels = ["Très faible", "Faible", "Moyen", "Bon", "Excellent"];
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-lime-500",
    "bg-emerald-500",
  ];
  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${
              i < score ? colors[score - 1] : "bg-muted"
            }`}
          />
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Force : {labels[Math.max(0, score - 1)] ?? labels[0]}
      </p>
    </div>
  );
}

function scorePassword(pwd: string): number {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return Math.min(score, 5);
}

function normalizePhone(input: string): string {
  const trimmed = input.trim().replace(/[\s().-]/g, "");
  if (trimmed.startsWith("+")) return trimmed;
  if (trimmed.startsWith("00")) return "+" + trimmed.slice(2);
  // Default to Morocco (+212), strip leading 0
  if (trimmed.startsWith("0")) return "+212" + trimmed.slice(1);
  return "+" + trimmed;
}

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      toast.error("Envoi impossible", { description: error.message });
      return;
    }
    setSent(true);
    toast.success("Email envoyé", { description: "Vérifiez votre boîte de réception." });
  };

  return (
    <div>
      <h2 className="text-lg font-semibold">Mot de passe oublié</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Saisissez votre email pour recevoir un lien de réinitialisation.
      </p>
      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="forgot-email">Email</Label>
          <Input
            id="forgot-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@exemple.ma"
            disabled={sent}
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy || sent}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {sent ? "Email envoyé" : "Envoyer le lien"}
        </Button>
        <div className="text-center">
          <Link
            to="/auth"
            search={{ mode: "signin" }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Retour à la connexion
          </Link>
        </div>
      </form>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2c-.4.4 6.6-4.8 6.6-14.7 0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}