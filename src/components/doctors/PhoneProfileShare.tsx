import { useState } from "react";
import { Check, Copy, MessageCircle, Share2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function PhoneProfileShare({ doctorName }: { doctorName: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const profileUrl = () => window.location.href.split("#")[0];

  async function shareFromPhone() {
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({
        title: `Dr. ${doctorName} — Vytalma`,
        text: `Découvrez le profil du Dr. ${doctorName} sur Vytalma`,
        url: profileUrl(),
      });
      setOpen(false);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) toast.error("Partage impossible");
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(profileUrl());
      setCopied(true);
      toast.success("Lien du profil copié");
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      toast.error("Impossible de copier le lien");
    }
  }

  function shareOnWhatsApp() {
    const text = encodeURIComponent(`Découvrez le profil du Dr. ${doctorName} sur Vytalma : ${profileUrl()}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <Button size="lg" variant="outline" className="min-h-11 gap-2 px-3" onClick={() => setOpen(true)}>
        <Share2 className="h-4 w-4" /> <span>Partager</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5 text-primary" /> Partager depuis votre téléphone</DialogTitle>
            <DialogDescription>Envoyez le profil du Dr. {doctorName} à un autre téléphone avec l'application de votre choix.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button size="lg" className="h-auto justify-start gap-3 p-4" onClick={shareFromPhone}>
              <Share2 className="h-5 w-5" /><span className="text-left"><span className="block font-semibold">Partager avec le téléphone</span><span className="block text-xs font-normal opacity-80">Messages, AirDrop, Nearby…</span></span>
            </Button>
            <Button size="lg" variant="outline" className="h-auto justify-start gap-3 p-4" onClick={shareOnWhatsApp}>
              <MessageCircle className="h-5 w-5 text-emerald-600" /><span className="text-left"><span className="block font-semibold">WhatsApp</span><span className="block text-xs font-normal text-muted-foreground">Envoyer à un contact</span></span>
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="gap-2" onClick={copyLink}>{copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />} {copied ? "Lien copié" : "Copier le lien"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
