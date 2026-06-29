import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Database, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { downloadCsv } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/master-data")({
  component: AdminMasterData,
});

const TABLES = [
  "countries", "languages", "regions", "provinces", "prefectures", "cities", "districts",
  "specialties", "sub_specialties", "medical_services_catalog", "medical_equipment",
  "hospital_departments_catalog", "pharmacy_categories", "laboratory_categories", "facility_categories",
  "consultation_types", "emergency_categories", "campaign_categories", "article_categories", "notification_categories",
  "insurance_companies", "subscription_plans", "permissions", "blood_compatibility",
] as const;

function AdminMasterData() {
  const [active, setActive] = useState<(typeof TABLES)[number]>("regions");

  const data = useQuery({
    queryKey: ["mdm-table", active],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).from(active).select("*").limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const cols = data.data && data.data.length ? Object.keys(data.data[0]) : [];

  return (
    <div className="space-y-6">
      <AdminHeader icon={Database} title="Données maîtres (MDM)" description="Consulter et exporter les référentiels du Moteur de Données Santé." badge={`${TABLES.length} référentiels`} />
      <Card className="p-3">
        <div className="flex flex-wrap gap-1.5">
          {TABLES.map((t) => (
            <button key={t} onClick={() => setActive(t)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${active === t ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"}`}>
              {t}
            </button>
          ))}
        </div>
      </Card>
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
          <h2 className="font-semibold text-sm">{active} <span className="text-muted-foreground font-normal">— {data.data?.length ?? 0} lignes</span></h2>
          <Button size="sm" variant="outline" onClick={() => downloadCsv(`${active}.csv`, data.data ?? [])}><Download className="mr-1 h-3 w-3" /> Export CSV</Button>
        </div>
        {data.isLoading ? <div className="p-6"><Skeleton className="h-64 w-full" /></div> : (
          <div className="max-h-[600px] overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/40">
                <tr>{cols.map((c) => <th key={c} className="px-3 py-2 text-left font-medium">{c}</th>)}</tr>
              </thead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(data.data ?? []).map((r: any, i: number) => (
                  <tr key={i} className="border-t border-border hover:bg-muted/20">
                    {cols.map((c) => <td key={c} className="px-3 py-1.5 truncate max-w-[260px]">{typeof r[c] === "object" ? JSON.stringify(r[c]) : String(r[c] ?? "")}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {(data.data?.length ?? 0) === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Aucune donnée.</p>}
          </div>
        )}
      </Card>
    </div>
  );
}