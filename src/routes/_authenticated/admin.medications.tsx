import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";
import { Pill, Upload, Download, AlertTriangle, CheckCircle2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/medications")({
  component: AdminMedications,
});

// French CSV header → column mapping
const HEADER_MAP: Record<string, string> = {
  "nom commercial": "brand_name",
  "dosage": "dosage",
  "forme": "form",
  "présentation": "presentation",
  "presentation": "presentation",
  "dci": "dci",
  "laboratoire": "laboratory",
  "classe thérapeutique": "therapeutic_class",
  "classe therapeutique": "therapeutic_class",
  "sous classe": "sub_class",
  "sous-classe": "sub_class",
  "conditionnement": "packaging",
  "spécification": "specification",
  "specification": "specification",
  "tableau": "schedule_table",
  "durée de conservation": "shelf_life",
  "duree de conservation": "shelf_life",
  "prix public": "public_price",
  "indication": "indication",
};

const REQUIRED = ["brand_name"];
const BATCH_SIZE = 200;

type Row = Record<string, string | number | null>;
type RowError = { line: number; brand?: string; message: string };
type Status = "idle" | "parsing" | "uploading" | "done" | "error";

function normalize(h: string) {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

function parsePrice(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).replace(/\s/g, "").replace(",", ".").replace(/[^\d.]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function AdminMedications() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [totalRows, setTotalRows] = useState(0);
  const [inserted, setInserted] = useState(0);
  const [errors, setErrors] = useState<RowError[]>([]);

  const stats = useQuery({
    queryKey: ["admin-medications-stats"],
    queryFn: async () => {
      const total = await supabase.from("medications" as never).select("id", { count: "exact", head: true });
      const active = await supabase.from("medications" as never).select("id", { count: "exact", head: true }).eq("is_active", true);
      const { data: recent } = await supabase
        .from("medications" as never)
        .select("id,brand_name,dci,therapeutic_class,updated_at")
        .order("updated_at", { ascending: false })
        .limit(10);
      const { data: classesRows } = await supabase
        .from("medications" as never)
        .select("therapeutic_class")
        .not("therapeutic_class", "is", null)
        .limit(2000);
      const classes = new Set<string>();
      (classesRows ?? []).forEach((r: { therapeutic_class: string | null }) => {
        if (r.therapeutic_class) classes.add(r.therapeutic_class);
      });
      return {
        total: total.count ?? 0,
        active: active.count ?? 0,
        classes: classes.size,
        recent: (recent ?? []) as Array<{ id: string; brand_name: string; dci: string | null; therapeutic_class: string | null; updated_at: string }>,
      };
    },
  });

  const errorCsv = useMemo(() => {
    if (!errors.length) return null;
    const csv = Papa.unparse(errors.map((e) => ({ line: e.line, brand_name: e.brand ?? "", error: e.message })));
    return URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  }, [errors]);

  async function handleFile(file: File) {
    setFileName(file.name);
    setStatus("parsing");
    setProgress(0);
    setErrors([]);
    setInserted(0);
    setTotalRows(0);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => HEADER_MAP[normalize(h)] ?? normalize(h).replace(/[^a-z0-9_]/g, "_"),
      complete: async (res) => {
        const raw = res.data;
        const rowErrors: RowError[] = [];
        const rows: Row[] = [];
        raw.forEach((r, i) => {
          const brand = (r.brand_name ?? "").toString().trim();
          if (!brand) {
            rowErrors.push({ line: i + 2, message: "Nom Commercial manquant" });
            return;
          }
          const row: Row = { brand_name: brand };
          for (const key of Object.values(HEADER_MAP)) {
            if (key === "brand_name") continue;
            const v = r[key];
            if (v === undefined || v === "") continue;
            row[key] = key === "public_price" ? parsePrice(v) : String(v).trim();
          }
          row.is_active = true as unknown as string;
          rows.push(row);
        });

        setTotalRows(rows.length);
        if (!rows.length) {
          setErrors(rowErrors);
          setStatus("error");
          toast.error("Aucune ligne valide trouvée dans le fichier.");
          return;
        }

        setStatus("uploading");
        let ok = 0;
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
          const batch = rows.slice(i, i + BATCH_SIZE);
          const { error, count } = await supabase
            .from("medications" as never)
            .upsert(batch as never, { onConflict: "brand_name,dci", count: "exact" });
          if (error) {
            batch.forEach((b, j) =>
              rowErrors.push({ line: i + j + 2, brand: String(b.brand_name ?? ""), message: error.message }),
            );
          } else {
            ok += count ?? batch.length;
          }
          setInserted(ok);
          setProgress(Math.round(((i + batch.length) / rows.length) * 100));
        }

        setErrors(rowErrors);
        setStatus(rowErrors.length && ok === 0 ? "error" : "done");
        if (ok > 0) toast.success(`${ok} médicament(s) importé(s).`);
        if (rowErrors.length) toast.warning(`${rowErrors.length} ligne(s) en erreur.`);
        qc.invalidateQueries({ queryKey: ["admin-medications-stats"] });
        qc.invalidateQueries({ queryKey: ["medications"] });
      },
      error: (err) => {
        setStatus("error");
        toast.error(`Erreur de lecture: ${err.message}`);
      },
    });
  }

  function downloadTemplate() {
    const headers = [
      "Nom Commercial", "Dosage", "Forme", "Présentation", "DCI", "Laboratoire",
      "Classe thérapeutique", "Sous classe", "Conditionnement", "Spécification",
      "Tableau", "Durée de conservation", "Prix public", "Indication",
    ];
    const sample = [{
      "Nom Commercial": "Doliprane", "Dosage": "500 mg", "Forme": "Comprimé",
      "Présentation": "Boîte de 16", "DCI": "Paracétamol", "Laboratoire": "Sanofi",
      "Classe thérapeutique": "Antalgique", "Sous classe": "Non opioïde",
      "Conditionnement": "Plaquette", "Spécification": "", "Tableau": "Liste II",
      "Durée de conservation": "36 mois", "Prix public": "12.50",
      "Indication": "Douleurs légères à modérées",
    }];
    const csv = Papa.unparse({ fields: headers, data: sample });
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "medicaments-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function purgeAll() {
    if (!confirm("Supprimer TOUS les médicaments ? Cette action est irréversible.")) return;
    const { error } = await supabase.from("medications" as never).delete().gte("created_at", "1900-01-01");
    if (error) toast.error(error.message);
    else {
      toast.success("Table médicaments purgée.");
      qc.invalidateQueries({ queryKey: ["admin-medications-stats"] });
      qc.invalidateQueries({ queryKey: ["medications"] });
    }
  }

  const busy = status === "parsing" || status === "uploading";

  return (
    <div className="space-y-6">
      <AdminHeader
        icon={Pill}
        title="Médicaments — Import CSV"
        description="Importez le référentiel des médicaments (upsert par Nom Commercial + DCI)."
        badge={stats.data ? `${stats.data.total} entrées` : undefined}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" /> Modèle CSV
            </Button>
            <Button variant="outline" onClick={purgeAll} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Purger
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.isLoading ? (
          <>
            <Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" />
          </>
        ) : (
          <>
            <StatCard label="Total" value={stats.data?.total ?? 0} />
            <StatCard label="Actifs" value={stats.data?.active ?? 0} />
            <StatCard label="Classes thérapeutiques" value={stats.data?.classes ?? 0} />
          </>
        )}
      </div>

      <Card className="p-6">
        <h3 className="t-h4 mb-2">Uploader un fichier CSV</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Colonnes attendues: Nom Commercial, Dosage, Forme, Présentation, DCI, Laboratoire,
          Classe thérapeutique, Sous classe, Conditionnement, Spécification, Tableau,
          Durée de conservation, Prix public, Indication. Les lignes existantes (même Nom + DCI) sont mises à jour.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <Button onClick={() => fileRef.current?.click()} disabled={busy}>
            <Upload className="mr-2 h-4 w-4" /> {busy ? "En cours…" : "Choisir un fichier"}
          </Button>
          {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
          {status === "done" && (
            <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> Terminé</Badge>
          )}
          {status === "error" && (
            <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Erreur</Badge>
          )}
        </div>

        {busy && (
          <div className="mt-4 space-y-2">
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground">
              {status === "parsing" ? "Analyse du fichier…" : `${inserted} / ${totalRows} ligne(s) importée(s) — ${progress}%`}
            </p>
          </div>
        )}

        {(status === "done" || status === "error") && (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <MiniStat label="Lignes lues" value={totalRows + errors.filter((e) => e.message === "Nom Commercial manquant").length} />
            <MiniStat label="Importées" value={inserted} tone="ok" />
            <MiniStat label="Erreurs" value={errors.length} tone={errors.length ? "bad" : "muted"} />
          </div>
        )}
      </Card>

      {errors.length > 0 && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="t-h4">Erreurs ({errors.length})</h3>
            {errorCsv && (
              <a href={errorCsv} download="medicaments-erreurs.csv">
                <Button size="sm" variant="outline"><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
              </a>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Ligne</th>
                  <th className="px-4 py-2 text-left">Nom Commercial</th>
                  <th className="px-4 py-2 text-left">Erreur</th>
                </tr>
              </thead>
              <tbody>
                {errors.slice(0, 500).map((e, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-4 py-2 text-xs">{e.line}</td>
                    <td className="px-4 py-2">{e.brand ?? "—"}</td>
                    <td className="px-4 py-2 text-destructive text-xs">{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <h3 className="t-h4">Derniers médicaments mis à jour</h3>
        </div>
        {stats.isLoading ? (
          <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Nom Commercial</th>
                <th className="px-4 py-2 text-left">DCI</th>
                <th className="px-4 py-2 text-left">Classe</th>
                <th className="px-4 py-2 text-left">Mise à jour</th>
              </tr>
            </thead>
            <tbody>
              {(stats.data?.recent ?? []).map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-2 font-medium">{r.brand_name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{r.dci ?? "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{r.therapeutic_class ?? "—"}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(r.updated_at).toLocaleString("fr-FR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-5">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="t-h2 mt-1">{value.toLocaleString("fr-FR")}</p>
    </Card>
  );
}

function MiniStat({ label, value, tone = "muted" }: { label: string; value: number; tone?: "ok" | "bad" | "muted" }) {
  const color = tone === "ok" ? "text-emerald-600" : tone === "bad" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className={`t-h3 mt-1 ${color}`}>{value.toLocaleString("fr-FR")}</p>
    </div>
  );
}