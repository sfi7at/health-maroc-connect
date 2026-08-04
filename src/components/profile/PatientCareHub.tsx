import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Download, FileHeart, FileText, Loader2, Plus, ShieldCheck, Stethoscope, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTimeFr } from "@/lib/format";

const ACCEPTED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function PatientCareHub({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const documents = useQuery({
    queryKey: ["medical-documents", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("medical_documents").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const prescriptions = useQuery({
    queryKey: ["patient-prescriptions", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("prescriptions").select("id, medication, diagnosis, prescribed_at, status, expires_at, provider_id").eq("user_id", userId).order("prescribed_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function uploadDocument(file: File) {
    if (!ACCEPTED_TYPES.has(file.type)) return toast.error("Format accepté : PDF, JPG, PNG ou WebP");
    if (file.size > MAX_FILE_SIZE) return toast.error("Le fichier ne doit pas dépasser 10 Mo");
    setUploading(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-100);
    const path = `${userId}/${crypto.randomUUID()}-${safeName}`;
    try {
      const { error: uploadError } = await supabase.storage.from("documents").upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const { error: rowError } = await supabase.from("medical_documents").insert({ user_id: userId, title: file.name, storage_path: path, mime_type: file.type, size_bytes: file.size, category: "preconsultation" });
      if (rowError) {
        await supabase.storage.from("documents").remove([path]);
        throw rowError;
      }
      toast.success("Document ajouté à votre dossier");
      qc.invalidateQueries({ queryKey: ["medical-documents", userId] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ajout impossible");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function openDocument(path: string) {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 300);
    if (error || !data?.signedUrl) return toast.error("Document inaccessible");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  const removeDocument = useMutation({
    mutationFn: async ({ id, path }: { id: string; path: string }) => {
      const { error: storageError } = await supabase.storage.from("documents").remove([path]);
      if (storageError) throw storageError;
      const { error } = await supabase.from("medical_documents").delete().eq("id", id).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Document supprimé"); qc.invalidateQueries({ queryKey: ["medical-documents", userId] }); },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <section className="space-y-5 rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-7">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Espace de soins</p><h2 className="text-xl font-semibold">Documents et ordonnances</h2><p className="text-sm text-muted-foreground">Préparez vos consultations et retrouvez vos informations médicales.</p></div>
        <Badge variant="secondary" className="w-fit gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Accès privé</Badge>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between gap-3"><div><h3 className="flex items-center gap-2 font-semibold"><FileHeart className="h-4 w-4 text-primary" /> Documents médicaux</h3><p className="text-xs text-muted-foreground">Résultats, radios, comptes rendus…</p></div><Button size="sm" className="gap-1" onClick={() => inputRef.current?.click()} disabled={uploading}>{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Ajouter</Button></div>
          <input ref={inputRef} type="file" accept=".pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadDocument(file); }} />
          <div className="mt-4 space-y-2">
            {documents.isLoading ? <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /> : documents.data?.length ? documents.data.slice(0, 6).map((document) => (
              <div key={document.id} className="flex items-center gap-3 rounded-xl bg-muted/40 p-3"><FileText className="h-4 w-4 shrink-0 text-primary" /><button className="min-w-0 flex-1 text-left" onClick={() => void openDocument(document.storage_path)}><span className="block truncate text-sm font-medium">{document.title}</span><span className="text-xs text-muted-foreground">{formatDateTimeFr(document.created_at)}</span></button><Button size="icon" variant="ghost" aria-label="Télécharger" onClick={() => void openDocument(document.storage_path)}><Download className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label="Supprimer" onClick={() => removeDocument.mutate({ id: document.id, path: document.storage_path })}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
            )) : <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">Aucun document. Ajoutez ceux utiles avant votre prochain rendez-vous.</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-border p-4">
          <h3 className="flex items-center gap-2 font-semibold"><FileText className="h-4 w-4 text-primary" /> Mes ordonnances</h3><p className="text-xs text-muted-foreground">Ordonnances associées à votre compte.</p>
          <div className="mt-4 space-y-2">
            {prescriptions.isLoading ? <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /> : prescriptions.data?.length ? prescriptions.data.slice(0, 6).map((rx) => (
              <div key={rx.id} className="rounded-xl bg-muted/40 p-3"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-semibold">{rx.medication}</p><Badge variant="outline">{rx.status}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{rx.diagnosis || "Ordonnance médicale"} · {formatDateTimeFr(rx.prescribed_at)}</p></div>
            )) : <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">Aucune ordonnance associée à votre compte.</p>}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl bg-primary/5 p-4 sm:flex-row sm:items-center"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Stethoscope className="h-5 w-5" /></div><div className="flex-1"><p className="font-semibold">Besoin d'un second avis ?</p><p className="text-xs text-muted-foreground">Choisissez un autre médecin vérifié et partagez vos documents pendant la préparation du rendez-vous.</p></div><Button asChild variant="outline"><Link to="/doctors/search" search={{ verified: true }}>Trouver un médecin</Link></Button></div>
    </section>
  );
}
