import { useRef, useState } from "react";
import { Copy, Loader2, Nfc, Share2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type NdefWriter = {
  write: (message: { records: Array<{ recordType: "url"; data: string }> }, options?: { signal?: AbortSignal }) => Promise<void>;
};

type NdefWriterConstructor = new () => NdefWriter;

function getNdefWriter(): NdefWriterConstructor | null {
  if (typeof window === "undefined" || !("NDEFReader" in window)) return null;
  return (window as typeof window & { NDEFReader: NdefWriterConstructor }).NDEFReader;
}

export function NfcProfileShare({ doctorName }: { doctorName: string }) {
  const [open, setOpen] = useState(false);
  const [writing, setWriting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const supported = typeof window !== "undefined" && !!getNdefWriter() && window.isSecureContext;

  const profileUrl = () => window.location.href.split("#")[0];

  async function writeTag() {
    const Writer = getNdefWriter();
    if (!Writer) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setWriting(true);
    try {
      await new Writer().write(
        { records: [{ recordType: "url", data: profileUrl() }] },
        { signal: controller.signal },
      );
      toast.success("Profil enregistré sur le tag NFC");
      setOpen(false);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Écriture NFC impossible. Vérifiez que le tag est déverrouillé et rapprochez-le du téléphone.");
    } finally {
      abortRef.current = null;
      setWriting(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(profileUrl());
      toast.success("Lien du profil copié");
    } catch {
      toast.error("Impossible de copier le lien. Autorisez l'accès au presse-papiers.");
    }
  }

  async function systemShare() {
    if (!navigator.share) return copyLink();
    try {
      await navigator.share({ title: `Dr. ${doctorName} — Vytalma`, url: profileUrl() });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) toast.error("Partage impossible");
    }
  }

  function closeDialog() {
    abortRef.current?.abort();
    setOpen(false);
  }

  return (
    <>
      <Button size="lg" variant="outline" className="min-h-11 gap-2 px-3" aria-label="Partager le profil par NFC" onClick={() => setOpen(true)}>
        <Nfc className="h-4 w-4" />
        <span className="hidden sm:inline">NFC</span>
      </Button>
      <Dialog open={open} onOpenChange={(next) => next ? setOpen(true) : closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Nfc className="h-5 w-5 text-primary" /> Partager le profil par NFC</DialogTitle>
            <DialogDescription>
              Enregistrez le lien public du Dr. {doctorName} sur une carte, un bracelet ou un autocollant NFC.
            </DialogDescription>
          </DialogHeader>

          {supported ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm">
              <p className="flex items-center gap-2 font-semibold"><Smartphone className="h-4 w-4" /> Approchez le tag du téléphone</p>
              <p className="mt-2 text-muted-foreground">Activez le NFC, appuyez sur « Écrire le tag », puis maintenez le tag près de l’appareil jusqu’à la confirmation.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm">
              <p className="font-semibold">Écriture NFC non disponible sur cet appareil</p>
              <p className="mt-1 text-muted-foreground">Cette fonction nécessite un navigateur Android compatible et une connexion HTTPS. Vous pouvez tout de même partager ou copier le lien.</p>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="gap-2" onClick={copyLink}><Copy className="h-4 w-4" /> Copier le lien</Button>
            <Button variant="outline" className="gap-2" onClick={systemShare}><Share2 className="h-4 w-4" /> Partager</Button>
            {supported ? <Button className="gap-2" onClick={writeTag} disabled={writing}>{writing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Nfc className="h-4 w-4" />} Écrire le tag</Button> : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
