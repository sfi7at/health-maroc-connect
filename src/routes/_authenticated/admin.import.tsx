import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileSpreadsheet, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { DATASETS, DATASET_LIST, type DatasetKey, type ParsedFile, parseImportFile, autoMap, validateRow, findInBatchDuplicates, applyMapping, runImport, exportRowsToCsv } from "@/lib/mdm";
import { logAdminAction } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/import")({
  component: AdminImport,
});

const STEPS = ["Dataset", "Aperçu", "Mapping", "Validation", "Doublons", "Erreurs", "Import", "Rapport"] as const;

function AdminImport() {
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [dataset, setDataset] = useState<DatasetKey | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [report, setReport] = useState<Awaited<ReturnType<typeof runImport>> | null>(null);

  const spec = dataset ? DATASETS[dataset] : null;

  const validationErrors = useMemo(() => {
    if (!parsed || !spec) return [];
    const mapped = parsed.rows.map((r) => applyMapping(r, mapping));
    return mapped.flatMap((row, i) => validateRow(row, i + 1, spec));
  }, [parsed, spec, mapping]);

  const duplicates = useMemo(() => {
    if (!parsed || !spec) return new Set<number>();
    const mapped = parsed.rows.map((r) => applyMapping(r, mapping));
    return findInBatchDuplicates(mapped, spec.duplicateKeys);
  }, [parsed, spec, mapping]);

  const parseMut = useMutation({
    mutationFn: async (f: File) => parseImportFile(f),
    onSuccess: (data) => {
      setParsed(data);
      if (spec) setMapping(autoMap(data.headers, spec));
      setStep(2);
    },
    onError: (e: Error) => toast.error(`Lecture impossible: ${e.message}`),
  });

  const importMut = useMutation({
    mutationFn: async () => {
      if (!parsed || !spec || !file) throw new Error("État incomplet");
      const { data: user } = await supabase.auth.getUser();
      const storagePath = `${user.user?.id}/${Date.now()}-${file.name}`;
      await supabase.storage.from("imports").upload(storagePath, file, { upsert: false }).catch(() => null);

      const { data: job, error: jobErr } = await supabase.from("import_jobs").insert({
        created_by: user.user?.id ?? null,
        dataset: spec.key,
        source_filename: file.name,
        source_storage_path: storagePath,
        source_format: parsed.format,
        status: "running",
        total_rows: parsed.rows.length,
        mapping,
        started_at: new Date().toISOString(),
      }).select("id").single();
      if (jobErr || !job) throw jobErr ?? new Error("Échec création du job");

      const res = await runImport(job.id, parsed.rows, mapping, spec);

      await supabase.from("import_jobs").update({
        status: res.rejected === parsed.rows.length ? "failed" : "succeeded",
        inserted_count: res.inserted,
        updated_count: res.updated,
        rejected_count: res.rejected,
        duplicate_count: res.duplicates,
        report: res as never,
        duration_ms: res.duration_ms,
        finished_at: new Date().toISOString(),
      }).eq("id", job.id);
      await logAdminAction("import.run", "import_jobs", job.id, { dataset: spec.key, ...res });
      return res;
    },
    onSuccess: (res) => {
      setReport(res);
      setStep(7);
      qc.invalidateQueries({ queryKey: ["import-jobs"] });
      toast.success(`Import terminé: ${res.inserted} insérés, ${res.rejected} rejetés`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canNext =
    (step === 0 && !!dataset) ||
    (step === 1 && !!parsed) ||
    (step === 2 && Object.values(mapping).length > 0) ||
    (step === 3) ||
    (step === 4) ||
    (step === 5) ||
    (step === 6);

  return (
    <div className="space-y-6">
      <AdminHeader icon={Upload} title="Centre d'import" description="Importer en masse des prestataires, articles, villes et autres référentiels." />

      {/* Stepper */}
      <Card className="p-4">
        <ol className="flex flex-wrap items-center gap-2 text-xs">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span className={`grid h-7 w-7 place-items-center rounded-full text-[11px] font-semibold ${i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-emerald-500/15 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                {i < step ? "✓" : i + 1}
              </span>
              <span className={i === step ? "font-semibold" : "text-muted-foreground"}>{s}</span>
              {i < STEPS.length - 1 && <span className="text-muted-foreground">→</span>}
            </li>
          ))}
        </ol>
      </Card>

      <Card className="p-6 min-h-[400px]">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">1 · Choisir le dataset</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {DATASET_LIST.map((d) => (
                <button
                  key={d.key}
                  onClick={() => setDataset(d.key)}
                  className={`text-left rounded-2xl border p-4 transition ${dataset === d.key ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary"><FileSpreadsheet className="h-4 w-4" /></div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{d.label}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{d.description}</p>
                      <Badge variant="outline" className="mt-2 text-[10px]">{d.fields.length} champs</Badge>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">2 · Téléverser le fichier (CSV, Excel, JSON)</h2>
            <label className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border p-10 hover:border-primary/50 cursor-pointer">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium">{file?.name ?? "Cliquer pour sélectionner un fichier"}</span>
              <span className="text-xs text-muted-foreground">.csv, .xlsx, .json (max 20 Mo)</span>
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { setFile(f); parseMut.mutate(f); }
                }}
              />
            </label>
            {parsed && (
              <Card className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Aperçu — {parsed.rows.length} ligne(s) · {parsed.headers.length} colonnes</h3>
                  <Badge>{parsed.format.toUpperCase()}</Badge>
                </div>
                <div className="max-h-72 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted/50">
                      <tr>{parsed.headers.map((h) => <th key={h} className="px-2 py-1 text-left font-medium">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {parsed.rows.slice(0, 10).map((r, i) => (
                        <tr key={i} className="border-t border-border">
                          {parsed.headers.map((h) => <td key={h} className="px-2 py-1 truncate max-w-[200px]">{String(r[h] ?? "")}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}

        {step === 2 && spec && parsed && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">3 · Mapper les colonnes</h2>
            <p className="text-sm text-muted-foreground">Associer chaque colonne du fichier à un champ de la base.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {parsed.headers.map((h) => (
                <div key={h} className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <span className="flex-1 truncate text-sm font-medium">{h}</span>
                  <Select value={mapping[h] ?? "__skip__"} onValueChange={(v) => setMapping((m) => ({ ...m, [h]: v === "__skip__" ? "" : v }))}>
                    <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__skip__">— Ignorer —</SelectItem>
                      {spec.fields.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}{f.required && " *"}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">4 · Validation des données</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatTile label="Lignes" value={parsed?.rows.length ?? 0} />
              <StatTile label="Erreurs" value={validationErrors.filter((e) => e.severity === "error").length} tone="destructive" />
              <StatTile label="Avertissements" value={validationErrors.filter((e) => e.severity === "warning").length} tone="warning" />
            </div>
            {validationErrors.length > 0 ? (
              <div className="max-h-72 overflow-auto rounded-xl border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/40"><tr><th className="px-3 py-2 text-left">Ligne</th><th className="px-3 py-2 text-left">Champ</th><th className="px-3 py-2 text-left">Message</th></tr></thead>
                  <tbody>
                    {validationErrors.slice(0, 200).map((e, i) => (
                      <tr key={i} className="border-t"><td className="px-3 py-1">{e.row}</td><td className="px-3 py-1">{e.field ?? "—"}</td><td className="px-3 py-1">{e.message}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-700">Aucune erreur de validation détectée.</p>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">5 · Détection de doublons</h2>
            <p className="text-sm text-muted-foreground">
              Clés de comparaison: <span className="font-mono">{spec?.duplicateKeys.join(", ")}</span>
            </p>
            <StatTile label="Doublons détectés dans le fichier" value={duplicates.size} tone="warning" />
            {duplicates.size > 0 && <p className="text-xs text-muted-foreground">Les lignes en doublon seront ignorées lors de l'import.</p>}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">6 · Aperçu des erreurs</h2>
            {validationErrors.length === 0 ? (
              <p className="rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-700">Prêt à importer.</p>
            ) : (
              <Button variant="outline" onClick={() => exportRowsToCsv("erreurs.csv", validationErrors as never)}>
                <Download className="mr-2 h-4 w-4" /> Exporter les erreurs ({validationErrors.length})
              </Button>
            )}
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4 text-center py-8">
            <h2 className="text-lg font-semibold">7 · Lancer l'import</h2>
            <p className="text-sm text-muted-foreground">
              {parsed?.rows.length} lignes · {duplicates.size} doublons · {validationErrors.filter((e) => e.severity === "error").length} erreurs bloquantes
            </p>
            <Button size="lg" onClick={() => importMut.mutate()} disabled={importMut.isPending}>
              {importMut.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Import en cours…</> : <>Démarrer l'import <ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>
            {importMut.isPending && <Progress value={50} className="mx-auto max-w-md" />}
          </div>
        )}

        {step === 7 && report && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <h2 className="text-xl font-bold">8 · Rapport d'import</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <StatTile label="Insérés" value={report.inserted} tone="success" />
              <StatTile label="Mis à jour" value={report.updated} />
              <StatTile label="Rejetés" value={report.rejected} tone="destructive" />
              <StatTile label="Doublons" value={report.duplicates} tone="warning" />
            </div>
            <p className="text-sm text-muted-foreground">Durée: {(report.duration_ms / 1000).toFixed(2)}s</p>
            <div className="flex gap-2">
              <Button onClick={() => { setStep(0); setDataset(""); setFile(null); setParsed(null); setMapping({}); setReport(null); }}>Nouvel import</Button>
              <Button variant="outline" onClick={() => exportRowsToCsv("rapport.csv", report.errors as never)} disabled={!report.errors.length}>
                <Download className="mr-2 h-4 w-4" /> Exporter les erreurs
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Footer nav */}
      {step < 7 && (
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Précédent
          </Button>
          <Button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} disabled={!canNext}>
            Suivant <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "success" | "warning" | "destructive" }) {
  const colors = {
    default: "bg-muted/40 text-foreground",
    success: "bg-emerald-500/10 text-emerald-700",
    warning: "bg-amber-500/10 text-amber-700",
    destructive: "bg-destructive/10 text-destructive",
  };
  return (
    <div className={`rounded-xl p-4 ${colors[tone]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs uppercase tracking-wide">{label}</div>
    </div>
  );
}