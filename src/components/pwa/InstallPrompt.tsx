import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "hl_install_dismissed_at";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (Date.now() - dismissed < 1000 * 60 * 60 * 24 * 7) return;

    function onBIP(e: Event) {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setShow(true);
    }
    window.addEventListener("beforeinstallprompt", onBIP);
    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  if (!show || !deferred) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  };

  return (
    <div className="fixed inset-x-3 bottom-20 z-50 md:inset-x-auto md:right-6 md:bottom-6 md:max-w-sm">
      <div className="flex items-start gap-3 rounded-2xl border bg-card p-4 shadow-2xl">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Installer Vytalma</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Accès rapide, notifications et mode hors-ligne — comme une vraie app.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              onClick={async () => {
                await deferred.prompt();
                await deferred.userChoice;
                setShow(false);
                setDeferred(null);
              }}
            >
              Installer
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>
              Plus tard
            </Button>
          </div>
        </div>
        <button onClick={dismiss} className="text-muted-foreground hover:text-foreground" aria-label="Fermer">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}