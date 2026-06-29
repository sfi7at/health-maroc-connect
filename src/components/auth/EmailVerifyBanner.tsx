import { useState } from "react";
import { MailWarning, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export function EmailVerifyBanner() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!user || user.email_confirmed_at || dismissed || !user.email) return null;

  const resend = async () => {
    setBusy(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: user.email!,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) {
      toast.error("Impossible d'envoyer", { description: error.message });
      return;
    }
    toast.success("Email de vérification envoyé.");
  };

  return (
    <div className="border-b border-amber-200/60 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
        <MailWarning className="h-4 w-4 shrink-0" />
        <p className="flex-1 min-w-[200px]">
          Vérifiez votre adresse email <span className="font-medium">{user.email}</span> pour
          débloquer toutes les fonctionnalités.
        </p>
        <Button size="sm" variant="outline" onClick={resend} disabled={busy} className="h-8">
          {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Renvoyer l'email
        </Button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-xs underline opacity-80 hover:opacity-100"
        >
          Plus tard
        </button>
      </div>
    </div>
  );
}