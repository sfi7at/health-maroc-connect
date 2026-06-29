import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/admin/cities")({
  component: AdminCities,
});

function AdminCities() {
  const data = useQuery({
    queryKey: ["admin-cities"],
    queryFn: async () => {
      const [regions, cities] = await Promise.all([
        supabase.from("regions").select("*").order("name"),
        supabase.from("cities").select("*, regions(name), provinces(name)").order("name").limit(500),
      ]);
      if (regions.error) throw regions.error;
      if (cities.error) throw cities.error;
      return { regions: regions.data ?? [], cities: cities.data ?? [] };
    },
  });

  return (
    <div className="space-y-6">
      <AdminHeader icon={MapPin} title="Villes & Régions" description="Hiérarchie géographique du Maroc." badge={`${data.data?.cities.length ?? 0} villes`} />

      {data.isLoading ? <Skeleton className="h-96 w-full" /> : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-4">
            <h2 className="mb-2 font-semibold">Régions</h2>
            <ul className="space-y-1 text-sm">
              {(data.data?.regions ?? []).map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-lg px-2 py-1 hover:bg-muted/40">
                  <span>{r.name}</span>
                  <Badge variant="outline" className="text-[10px]">{r.code ?? "—"}</Badge>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-4 lg:col-span-2">
            <h2 className="mb-2 font-semibold">Villes</h2>
            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card text-xs uppercase text-muted-foreground"><tr>
                  <th className="px-3 py-2 text-left">Ville</th><th className="px-3 py-2 text-left">Province</th><th className="px-3 py-2 text-left">Région</th>
                </tr></thead>
                <tbody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(data.data?.cities ?? []).map((c: any) => (
                    <tr key={c.id} className="border-t border-border">
                      <td className="px-3 py-2">{c.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{c.provinces?.name ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{c.regions?.name ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}