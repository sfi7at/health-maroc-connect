import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, BadgeCheck, AlertCircle, Upload, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSelectedProvider } from "@/lib/provider-store";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/provider/verification")({
  head: () => buildHead({ title: "Vérification — Espace prestataire", description: "Téléversez vos documents officiels.", path: "/provider/verification" }),
  component: ProviderVerification,
});

const REQUIRED_DOCS = [
  { key: "license", label: "Licence / autorisation d'exercer" },
  { key: "id_card", label: "Pièce d'identité (CNI)" },
  { key: "registry", label: "Inscription au registre professionnel" },
  { key: "diploma", label: "Diplôme" },
] as const;

function ProviderVerification() {
  const { provider } = useSelectedProvider();
  const { user } = useAuth();
  const id = provider?.id;
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["provider_docs", id, user?.id],
    enabled: !!id && !!user,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("documents").list(`${user!.id}/providers/${id}`, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
      if (error) return [];
      return data ?? [];
    },
  });

  async function upload(key: string, file: File) {
    if (!id || !user) return;
    setBusy(key);
    try {
      const path = `${user.id}/providers/${id}/${key}-${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("documents").upload(path, file, { upsert: true });
      if (error) throw error;
      toast.success("Document envoyé");
      qc.invalidateQueries({ queryKey: ["provider_docs", id, user.id] });
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  }

  const remove = useMutation({
    mutationFn: async (name: string) => {
      if (!id || !user) return;
      const { error } = await supabase.storage.from("documents").remove([`${user.id}/providers/${id}/${name}`]);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Supprimé"); qc.invalidateQueries({ queryKey: ["provider_docs", id, user?.id] }); },
  });

  if (!provider) return null;

  const hasDoc = (key: string) => files.some((f) => f.name.startsWith(`${key}-`));
  const missing = REQUIRED_DOCS.filter((d) => !hasDoc(d.key));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Vérification" title="Vos documents" description="Documents conservés en sécurité et examinés par notre équipe." icon={<ShieldCheck className="h-5 w-5" />} />

      <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center gap-3">
          {provider.is_verified ? (
            <Badge className="gap-1 border-0 bg-emerald-500/15 text-emerald-700"><BadgeCheck className="h-3.5 w-3.5" /> Vérifié</Badge>
          ) : (
            <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3.5 w-3.5" /> En attente</Badge>
          )}
          <p className="text-sm text-muted-foreground">{missing.length === 0 ? "Tous les documents sont fournis." : `${missing.length} document(s) manquant(s).`}</p>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        {REQUIRED_DOCS.map((d) => {
          const provided = hasDoc(d.key);
          return (
            <div key={d.key} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{d.label}</p>
                  <p className="text-xs text-muted-foreground">{provided ? "Document fourni" : "Document manquant"}</p>
                </div>
                {provided ? <Badge className="gap-1 border-0 bg-emerald-500/15 text-emerald-700"><BadgeCheck className="h-3 w-3" />OK</Badge> : <Badge variant="secondary">À fournir</Badge>}
              </div>
              <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                <Upload className="h-3.5 w-3.5" /> {busy === d.key ? "Envoi…" : provided ? "Remplacer" : "Téléverser"}
                <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && upload(d.key, e.target.files[0])} />
              </label>
            </div>
          );
        })}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">Documents téléversés</h3>
        {isLoading ? <Skeleton className="h-32 rounded-2xl" /> : files.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">Aucun document.</p>
        ) : (
          <ul className="space-y-1.5">
            {files.map((f) => (
              <li key={f.name} className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
                <span className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4 text-muted-foreground" /> {f.name}</span>
                <Button size="icon" variant="ghost" onClick={() => remove.mutate(f.name)}><Trash2 className="h-4 w-4" /></Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}