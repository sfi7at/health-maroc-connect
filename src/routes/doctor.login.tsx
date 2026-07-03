import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Lock, Loader2, Mail, Stethoscope, BadgeCheck } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildHead } from "@/lib/seo";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/doctor/login")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () =>
    buildHead({
      title: "Portail praticien — Connexion",
      description: "Espace de connexion réservé aux professionnels de santé au Maroc.",
      path: "/doctor/login",
    }),
  component: DoctorLoginPage,
});

function DoctorLoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/doctor-dashboard", replace: true });
  }, [user, loading, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error("Échec de la connexion", { description: error.message });
      return;
    }
    toast.success("Bienvenue Docteur !");
    navigate({ to: "/doctor-dashboard", replace: true });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-sky-500/25 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[500px] rounded-full bg-indigo-600/20 blur-3xl" />
      </div>
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-5 py-8">
        <Link to="/auth" className="inline-flex w-fit items-center gap-1.5 text-sm text-slate-400 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Portail citoyen
        </Link>

        <div className="my-8 flex flex-col items-center text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/30">
            <Stethoscope className="h-7 w-7" />
          </div>
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-sky-300">
            <BadgeCheck className="h-3.5 w-3.5" /> Portail Praticien
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">Espace Professionnel de Santé</h1>
          <p className="mt-1 text-sm text-slate-400">Accédez à votre tableau de bord, agenda et ordonnances.</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-2xl backdrop-blur">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="dlogin-email" className="text-slate-200">Email professionnel</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input id="dlogin-email" type="email" autoComplete="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-slate-700 bg-slate-950/60 pl-9 text-slate-100 placeholder:text-slate-500"
                  placeholder="dr.nom@clinique.ma" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="dlogin-pwd" className="text-slate-200">Mot de passe</Label>
                <Link to="/auth" search={{ mode: "forgot" }} className="text-xs font-medium text-sky-400 hover:underline">
                  Oublié ?
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input id="dlogin-pwd" type={showPwd ? "text" : "password"} autoComplete="current-password"
                  required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="border-slate-700 bg-slate-950/60 pl-9 pr-10 text-slate-100"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 hover:text-slate-200"
                  aria-label={showPwd ? "Masquer" : "Afficher"}>
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 text-white hover:opacity-95" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Accéder à mon espace praticien
            </Button>
          </form>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-center text-sm">
            <p className="text-slate-400">Vous n'avez pas encore de compte praticien ?</p>
            <Link to="/doctor/register" className="mt-2 inline-flex items-center gap-1 font-semibold text-sky-400 hover:text-sky-300">
              Créer un compte professionnel →
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Vous êtes un patient ?{" "}
          <Link to="/auth" className="underline hover:text-slate-300">Accéder au portail citoyen</Link>
        </p>
      </div>
    </div>
  );
}