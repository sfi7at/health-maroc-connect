import { useState, type ReactNode } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { reportEntity } from "@/lib/security";

const CATEGORIES = [
  { value: "fake_profile", label: "Faux profil" },
  { value: "wrong_info", label: "Information incorrecte" },
  { value: "fraud", label: "Fraude / arnaque" },
  { value: "spam", label: "Spam" },
  { value: "abuse", label: "Abus / contenu inapproprié" },
  { value: "other", label: "Autre" },
] as const;

type Category = (typeof CATEGORIES)[number]["value"];

const schema = z.object({
  category: z.enum(["fake_profile", "wrong_info", "fraud", "spam", "abuse", "other"]),
  reason: z.string().trim().min(10, "Décrivez le problème (≥ 10 caractères)").max(1000),
});

export function ReportDialog({
  targetType,
  targetId,
  trigger,
}: {
  targetType: "provider" | "user" | "review" | "article" | "blood_request" | "other";
  targetId?: string | null;
  trigger?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("fake_profile");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const parsed = schema.safeParse({ category, reason });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Formulaire invalide");
      return;
    }
    setBusy(true);
    try {
      await reportEntity({ targetType, targetId, category, reason });
      toast.success("Signalement envoyé. Notre équipe va l'examiner.");
      setOpen(false);
      setReason("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
            <Flag className="h-4 w-4 mr-1.5" /> Signaler
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Signaler ce contenu</DialogTitle>
          <DialogDescription>
            Aidez-nous à maintenir la qualité de HealthLink Maroc. Votre signalement reste confidentiel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Motif</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reason">Description détaillée</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Expliquez clairement le problème observé…"
            />
            <div className="text-right text-[10px] text-muted-foreground">{reason.length}/1000</div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Annuler</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Envoi…" : "Envoyer le signalement"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
