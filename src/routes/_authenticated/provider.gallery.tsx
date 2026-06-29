import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Images, Upload, Trash2, Save, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedProvider } from "@/lib/provider-store";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/provider/gallery")({
  head: () => buildHead({ title: "Galerie — Espace prestataire", description: "Photos, certificats, équipements.", path: "/provider/gallery" }),
  component: ProviderGallery,
});

const CATEGORIES = [
  { key: "photos", label: "Photos" },
  { key: "certificates", label: "Certificats" },
  { key: "clinic", label: "Cabinet" },
  { key: "equipment", label: "Équipements" },
  { key: "facility", label: "Locaux" },
] as const;

type Gallery = Partial<Record<(typeof CATEGORIES)[number]["key"], string[]>>;

function ProviderGallery() {
  const { provider } = useSelectedProvider();
  const id = provider?.id;
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["provider_gallery", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("providers").select("metadata").eq("id", id!).maybeSingle();
      if (error) throw error;
      const meta = (data?.metadata ?? {}) as { gallery?: Gallery };
      return meta.gallery ?? {};
    },
  });

  const [draft, setDraft] = useState<Gallery>({});
  const [preview, setPreview] = useState<string | null>(null);
  const current: Gallery = { ...(data ?? {}), ...draft };

  const save = useMutation({
    mutationFn: async () => {
      if (!id) return;
      const { data: row } = await supabase.from("providers").select("metadata").eq("id", id).maybeSingle();
      const meta = (row?.metadata ?? {}) as Record<string, unknown>;
      const { error } = await supabase.from("providers").update({ metadata: { ...meta, gallery: current } }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Galerie publiée");
      setDraft({});
      qc.invalidateQueries({ queryKey: ["provider_gallery", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function onUpload(category: string, file: File) {
    if (!id) return;
    const path = `${id}/gallery/${category}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("providers").upload(path, file);
    if (error) { toast.error(error.message); return; }
    const { data: signed } = await supabase.storage.from("providers").createSignedUrl(path, 60 * 60 * 24 * 365);
    if (!signed?.signedUrl) return;
    setDraft((d) => ({ ...d, [category]: [...((current as Record<string, string[]>)[category] ?? []), signed.signedUrl] }));
  }

  function removeAt(category: string, index: number) {
    const list = [...((current as Record<string, string[]>)[category] ?? [])];
    list.splice(index, 1);
    setDraft((d) => ({ ...d, [category]: list }));
  }

  if (!provider) return null;
  if (isLoading) return <Skeleton className="h-96 rounded-3xl" />;

  const hasDraft = Object.keys(draft).length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Galerie"
        title="Photos & visuels"
        description="Mettez en valeur votre cabinet, vos équipements et vos certifications."
        icon={<Images className="h-5 w-5" />}
        actions={
          <Button onClick={() => save.mutate()} disabled={!hasDraft || save.isPending} className="gap-2">
            <Save className="h-4 w-4" /> {save.isPending ? "Publication…" : "Publier"}
          </Button>
        }
      />

      <Tabs defaultValue={CATEGORIES[0].key}>
        <TabsList className="flex-wrap">
          {CATEGORIES.map((c) => (
            <TabsTrigger key={c.key} value={c.key}>{c.label}</TabsTrigger>
          ))}
        </TabsList>
        {CATEGORIES.map((c) => {
          const list = (current as Record<string, string[]>)[c.key] ?? [];
          return (
            <TabsContent key={c.key} value={c.key} className="mt-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                <label className="grid aspect-square cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-border bg-card text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary">
                  <div className="flex flex-col items-center gap-1">
                    <Upload className="h-5 w-5" />
                    Ajouter
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(c.key, e.target.files[0])} />
                </label>
                <AnimatePresence>
                  {list.map((url, i) => (
                    <motion.div key={url + i} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="group relative aspect-square overflow-hidden rounded-2xl border border-border bg-muted">
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button size="icon" variant="secondary" onClick={() => setPreview(url)}><Eye className="h-4 w-4" /></Button>
                        <Button size="icon" variant="destructive" onClick={() => removeAt(c.key, i)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl p-0">
          {preview ? <img src={preview} alt="" className="w-full" /> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}