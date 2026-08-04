import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, Plus, Trash2, Edit3, Save, X, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedProvider } from "@/lib/provider-store";
import { providerServicesQuery, type ProviderService } from "@/lib/appointments";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/provider/services")({
  head: () => buildHead({ title: "Services — Espace prestataire", description: "Gérez vos services et tarifs.", path: "/provider/services" }),
  component: ProviderServices,
});

type Draft = { name: string; description: string; duration: number; price: string; preparation: string; category: string; isOnlineEligible: boolean };
const empty: Draft = { name: "", description: "", duration: 30, price: "", preparation: "", category: "", isOnlineEligible: false };

function ProviderServices() {
  const { provider } = useSelectedProvider();
  const id = provider?.id;
  const qc = useQueryClient();
  const { data: services = [], isLoading } = useQuery(providerServicesQuery(id, { activeOnly: false }));
  const [draft, setDraft] = useState<Draft>(empty);
  const [editing, setEditing] = useState<string | null>(null);

  const upsert = useMutation({
    mutationFn: async () => {
      if (!id) return;
      if (!draft.name.trim()) throw new Error("Nom requis");
      const payload = {
        provider_id: id,
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        duration_minutes: Number(draft.duration) || 30,
        price_mad: draft.price ? Number(draft.price) : null,
        preparation: draft.preparation.trim() || null,
        category: draft.category.trim() || null,
        is_online_eligible: draft.isOnlineEligible,
      };
      if (editing) {
        const { error } = await supabase.from("provider_services").update(payload).eq("id", editing);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("provider_services").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Service modifié" : "Service ajouté");
      setDraft(empty); setEditing(null);
      qc.invalidateQueries({ queryKey: ["provider_services", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id: sid, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("provider_services").update({ is_active }).eq("id", sid);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["provider_services", id] }),
  });

  const remove = useMutation({
    mutationFn: async (sid: string) => {
      const { error } = await supabase.from("provider_services").delete().eq("id", sid);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Supprimé"); qc.invalidateQueries({ queryKey: ["provider_services", id] }); },
  });

  function startEdit(s: ProviderService) {
    setEditing(s.id);
    setDraft({
      name: s.name, description: s.description ?? "",
      duration: s.duration_minutes, price: s.price_mad?.toString() ?? "",
      preparation: s.preparation ?? "", category: s.category ?? "", isOnlineEligible: s.is_online_eligible,
    });
  }

  if (!provider) return null;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Services" title="Catalogue & tarifs" description="Vos services apparaissent dans la prise de RDV." icon={<Briefcase className="h-5 w-5" />} />
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-2">
          {isLoading ? <Skeleton className="h-40 rounded-2xl" /> : services.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">Aucun service. Créez-en un pour ouvrir les réservations.</div>
          ) : (
            <AnimatePresence>
              {services.map((s) => (
                <motion.div key={s.id} layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-4">
                  <div className="min-w-0">
                    <p className="font-semibold">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.duration_minutes} min{s.price_mad != null ? ` · ${s.price_mad} MAD` : ""}{s.category ? ` · ${s.category}` : ""}</p>
                    {s.is_online_eligible ? <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-info"><Video className="h-3 w-3" /> Vidéo et téléphone disponibles</p> : null}
                    {s.description ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.description}</p> : null}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Switch checked={s.is_active} onCheckedChange={(v) => toggle.mutate({ id: s.id, is_active: v })} />
                    <Button size="icon" variant="ghost" onClick={() => startEdit(s)}><Edit3 className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove.mutate(s.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">{editing ? "Modifier le service" : "Nouveau service"}</p>
            {editing ? <Button size="icon" variant="ghost" onClick={() => { setEditing(null); setDraft(empty); }}><X className="h-4 w-4" /></Button> : null}
          </div>
          <div><Label>Nom</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Durée (min)</Label><Input type="number" min={5} value={draft.duration} onChange={(e) => setDraft({ ...draft, duration: Number(e.target.value) })} /></div>
            <div><Label>Prix (MAD)</Label><Input type="number" min={0} value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} /></div>
          </div>
          <div><Label>Catégorie</Label><Input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="Consultation, Analyse…" /></div>
          <div><Label>Description</Label><Textarea rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
          <div><Label>Préparation</Label><Textarea rows={2} value={draft.preparation} onChange={(e) => setDraft({ ...draft, preparation: e.target.value })} placeholder="À jeun depuis 8h…" /></div>
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-border p-3">
            <div><Label htmlFor="online-service">Téléconsultation</Label><p className="text-xs text-muted-foreground">Autoriser la vidéo et le téléphone</p></div>
            <Switch id="online-service" checked={draft.isOnlineEligible} onCheckedChange={(value) => setDraft({ ...draft, isOnlineEligible: value })} />
          </div>
          <Button className="w-full gap-2" onClick={() => upsert.mutate()} disabled={upsert.isPending}>
            {editing ? <><Save className="h-4 w-4" /> Enregistrer</> : <><Plus className="h-4 w-4" /> Ajouter</>}
          </Button>
        </Card>
      </div>
    </div>
  );
}
