import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Gauge } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { computeQualityScore } from "@/lib/mdm";

export const Route = createFileRoute("/_authenticated/admin/quality")({
  component: AdminQuality,
});

function AdminQuality() {
  const providers = useQuery({
    queryKey: ["mdm-quality"],
    queryFn: async () => {
      const { data, error } = await supabase.from("providers")
        .select("id, name, category, phone, email, address, latitude, longitude, website, description, city_id, is_verified")
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });

  const stats = providers.data ?? [];
  const scores = stats.map((p) => {
    const obj = p as unknown as Record<string, unknown>;
    const q = computeQualityScore(obj);
    return { id: String(obj.id), name: String(obj.name), category: String(obj.category), score: q.score, signals: q.signals };
  });
  const avg = scores.length ? Math.round(scores.reduce((s, p) => s + p.score, 0) / scores.length) : 0;

  return (
    <div className="space-y-6">
      <AdminHeader icon={Gauge} title="Qualité des données" description="Score de qualité automatique sur chaque fiche prestataire." badge={`Moyenne ${avg}%`} />
      {providers.isLoading ? <Skeleton className="h-64 w-full" /> : (
        <>
          <Card className="p-6">
            <h2 className="mb-2 font-semibold">Score global</h2>
            <Progress value={avg} className="h-3" />
            <p className="mt-2 text-xs text-muted-foreground">{stats.length} prestataires évalués</p>
          </Card>
          <Card className="overflow-hidden">
            <div className="max-h-[600px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/40 text-xs uppercase">
                  <tr><th className="px-4 py-2 text-left">Nom</th><th className="px-4 py-2 text-left">Catégorie</th><th className="px-4 py-2 text-right">Score</th><th className="px-4 py-2 text-left">Signaux manquants</th></tr>
                </thead>
                <tbody>
                  {scores.sort((a, b) => a.score - b.score).slice(0, 100).map((p) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="px-4 py-2 font-medium">{p.name}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{p.category}</td>
                      <td className="px-4 py-2 text-right"><span className={`font-bold ${p.score < 50 ? "text-destructive" : p.score < 75 ? "text-amber-600" : "text-emerald-600"}`}>{p.score}%</span></td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{Object.entries(p.signals).filter(([, v]) => !v).map(([k]) => k.replace("has_", "")).join(", ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}