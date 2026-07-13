import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bell, Globe, Lock, MapPin, Moon, ShieldCheck, Stethoscope, UserCog } from "lucide-react";
import { useState } from "react";
import { useLanguage, useTheme, type AppLang } from "@/hooks/use-preferences";
import { PageHeader } from "@/components/common/PageHeader";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { buildHead } from "@/lib/seo";
import { useIsAdmin } from "@/lib/admin";
import { useIsDoctor } from "@/hooks/use-active-role";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () =>
    buildHead({
      title: "Paramètres — Vytalma",
      description: "Langue, mode sombre, notifications, confidentialité, compte.",
      path: "/settings",
    }),
  component: SettingsPage,
});

function SettingsPage() {
  const [lang, setLang] = useLanguage();
  const [theme, setTheme] = useTheme();
  const dark = theme === "dark";
  const [pushAlerts, setPushAlerts] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [bloodAlerts, setBloodAlerts] = useState(true);
  const [locShare, setLocShare] = useState(true);
  const { isStaff } = useIsAdmin();
  const { data: isDoctor } = useIsDoctor();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Préférences"
        title="Paramètres"
        description="Personnalisez votre expérience Vytalma — langue, apparence et confidentialité."
        icon={<UserCog className="h-5 w-5" />}
      />

      {isStaff || isDoctor ? (
        <section className="rounded-3xl border border-border bg-card shadow-soft">
          {isStaff ? (
            <SettingRow
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Console Admin"
              description="Accéder au tableau de bord d'administration"
            >
              <Button asChild size="sm" className="gap-2">
                <Link to="/admin">Ouvrir <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </SettingRow>
          ) : null}
          {isStaff && isDoctor ? <Separator /> : null}
          {isDoctor ? (
            <SettingRow
              icon={<Stethoscope className="h-5 w-5" />}
              title="Espace prestataire"
              description="Accéder à votre panneau de gestion médicale"
            >
              <Button asChild size="sm" className="gap-2">
                <Link to="/provider">Ouvrir <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </SettingRow>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-3xl border border-border bg-card shadow-soft">
        <SettingRow
          icon={<Globe className="h-5 w-5" />}
          title="Langue"
          description="Choisissez la langue de l'interface"
        >
          <Select value={lang} onValueChange={(v) => setLang(v as AppLang)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="ar">العربية</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <Separator />
        <SettingRow
          icon={<Moon className="h-5 w-5" />}
          title="Mode sombre"
          description="Réduisez la fatigue oculaire le soir"
        >
          <Switch
            checked={dark}
            onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
            aria-label="Mode sombre"
          />
        </SettingRow>
      </section>

      <section className="rounded-3xl border border-border bg-card shadow-soft">
        <SettingRow
          icon={<Bell className="h-5 w-5" />}
          title="Notifications push"
          description="Recevez les alertes en temps réel"
        >
          <Switch checked={pushAlerts} onCheckedChange={setPushAlerts} aria-label="Notifications push" />
        </SettingRow>
        <Separator />
        <SettingRow
          icon={<Bell className="h-5 w-5" />}
          title="Notifications email"
          description="Résumé hebdomadaire et alertes critiques"
        >
          <Switch checked={emailAlerts} onCheckedChange={setEmailAlerts} aria-label="Notifications email" />
        </SettingRow>
        <Separator />
        <SettingRow
          icon={<Bell className="h-5 w-5" />}
          title="Alertes don du sang"
          description="Soyez prévenu lors d'une demande compatible près de vous"
        >
          <Switch checked={bloodAlerts} onCheckedChange={setBloodAlerts} aria-label="Alertes don du sang" />
        </SettingRow>
      </section>

      <section className="rounded-3xl border border-border bg-card shadow-soft">
        <SettingRow
          icon={<MapPin className="h-5 w-5" />}
          title="Localisation"
          description="Améliore les résultats près de chez vous"
        >
          <Switch checked={locShare} onCheckedChange={setLocShare} aria-label="Partager ma position" />
        </SettingRow>
        <Separator />
        <SettingRow
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Confidentialité"
          description="Vos données médicales sont chiffrées et privées"
        />
        <Separator />
        <SettingRow
          icon={<Lock className="h-5 w-5" />}
          title="Sécurité du compte"
          description="Mot de passe, double authentification"
        />
      </section>
    </div>
  );
}

function SettingRow({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 p-5">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <Label className="text-sm font-semibold">{title}</Label>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}