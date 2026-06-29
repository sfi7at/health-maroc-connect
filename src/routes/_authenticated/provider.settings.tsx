import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Settings, Globe, Bell, Lock, ShieldAlert, KeyRound, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/provider/settings")({
  head: () => buildHead({ title: "Paramètres — Espace prestataire", description: "Langue, sécurité, confidentialité.", path: "/provider/settings" }),
  component: ProviderSettings,
});

function ProviderSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const stored = typeof window !== "undefined" ? window.localStorage : null;
  const [language, setLanguage] = useState(stored?.getItem("hl_lang") ?? "fr");
  const [notif, setNotif] = useState({
    appointments: stored?.getItem("hl_n_appts") !== "0",
    reviews: stored?.getItem("hl_n_reviews") !== "0",
    marketing: stored?.getItem("hl_n_mkt") === "1",
  });
  const [privacy, setPrivacy] = useState({
    showPhone: stored?.getItem("hl_p_phone") !== "0",
    showEmail: stored?.getItem("hl_p_email") === "1",
  });
  const [newPwd, setNewPwd] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const [pwdBusy, setPwdBusy] = useState(false);

  function persist() {
    if (!stored) return;
    stored.setItem("hl_lang", language);
    stored.setItem("hl_n_appts", notif.appointments ? "1" : "0");
    stored.setItem("hl_n_reviews", notif.reviews ? "1" : "0");
    stored.setItem("hl_n_mkt", notif.marketing ? "1" : "0");
    stored.setItem("hl_p_phone", privacy.showPhone ? "1" : "0");
    stored.setItem("hl_p_email", privacy.showEmail ? "1" : "0");
    toast.success("Préférences enregistrées");
  }

  async function changePassword() {
    if (newPwd.length < 8) return toast.error("Minimum 8 caractères");
    setPwdBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setPwdBusy(false);
    if (error) return toast.error(error.message);
    setNewPwd(""); toast.success("Mot de passe mis à jour");
  }

  async function requestDeletion() {
    if (!user) return;
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id, target_type: "account", target_id: user.id,
      category: "account_deletion", reason: "Demande de suppression de compte prestataire",
    });
    if (error) return toast.error(error.message);
    toast.success("Demande envoyée. Notre équipe vous contactera.");
    setConfirmDel(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Paramètres" title="Préférences & sécurité" description="Personnalisez votre expérience." icon={<Settings className="h-5 w-5" />} />

      <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground"><Globe className="h-4 w-4" /> Langue</h2>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="max-w-xs rounded-2xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="fr">Français</SelectItem>
            <SelectItem value="ar">العربية</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground"><Bell className="h-4 w-4" /> Notifications</h2>
        <Row label="Nouveaux rendez-vous" checked={notif.appointments} onChange={(v) => setNotif((n) => ({ ...n, appointments: v }))} />
        <Row label="Nouveaux avis" checked={notif.reviews} onChange={(v) => setNotif((n) => ({ ...n, reviews: v }))} />
        <Row label="Actualités & promotions HealthLink" checked={notif.marketing} onChange={(v) => setNotif((n) => ({ ...n, marketing: v }))} />
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground"><Lock className="h-4 w-4" /> Confidentialité</h2>
        <Row label="Afficher mon téléphone sur le profil public" checked={privacy.showPhone} onChange={(v) => setPrivacy((p) => ({ ...p, showPhone: v }))} />
        <Row label="Afficher mon email sur le profil public" checked={privacy.showEmail} onChange={(v) => setPrivacy((p) => ({ ...p, showEmail: v }))} />
      </section>

      <div className="flex justify-end"><Button onClick={persist}>Enregistrer mes préférences</Button></div>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground"><KeyRound className="h-4 w-4" /> Sécurité</h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <Label className="text-xs">Nouveau mot de passe</Label>
            <Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="••••••••" className="rounded-2xl" />
          </div>
          <Button onClick={changePassword} disabled={pwdBusy}>Mettre à jour</Button>
        </div>
      </section>

      <section className="rounded-3xl border border-destructive/30 bg-destructive/5 p-5">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-destructive"><ShieldAlert className="h-4 w-4" /> Zone sensible</h2>
        <p className="text-sm text-muted-foreground">La suppression de votre compte est définitive et irréversible.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}>Se déconnecter</Button>
          <Button variant="destructive" className="gap-2" onClick={() => setConfirmDel(true)}><Trash2 className="h-4 w-4" /> Demander la suppression</Button>
        </div>
      </section>

      <Dialog open={confirmDel} onOpenChange={setConfirmDel}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmer la demande</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Votre demande sera traitée par notre équipe sous 7 jours ouvrés. Vous pouvez l'annuler en nous contactant.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDel(false)}>Annuler</Button>
            <Button variant="destructive" onClick={requestDeletion}>Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between border-t border-border py-3 first:border-t-0">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}