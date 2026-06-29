import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Droplet, Users, Megaphone, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader, StatCard } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTimeFr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/blood")({
  component: AdminBlood,
});

function AdminBlood() {
  const donors = useQuery({
    queryKey: ["admin-blood-donors"],
    queryFn: async () => {
      const { data, error, count } = await supabase.from("blood_donors").select("id, first_name, last_name, blood_group, city_id, is_available, created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });
  const requests = useQuery({
    queryKey: ["admin-blood-requests"],
    queryFn: async () => {
      const { data, error, count } = await supabase.from("blood_requests").select("id, blood_group, urgency, hospital_name, city_id, units_needed, status, created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });
  const campaigns = useQuery({
    queryKey: ["admin-blood-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase.from("blood_campaigns").select("id, title, organizer, starts_at, ends_at, is_published").order("starts_at", { ascending: false }).limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  const emergency = (requests.data?.rows ?? []).filter((r) => r.urgency === "high").length;

  return (
    <div className="space-y-6">
      <AdminHeader icon={Droplet} title="Don du sang" description="Donneurs, demandes, campagnes et urgences." />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard icon={Users} label="Donneurs inscrits" value={donors.data?.count ?? 0} accent="destructive" />
        <StatCard icon={Droplet} label="Demandes" value={requests.data?.count ?? 0} accent="primary" />
        <StatCard icon={AlertCircle} label="Urgences actives" value={emergency} accent="warning" />
        <StatCard icon={Megaphone} label="Campagnes" value={campaigns.data?.length ?? 0} accent="info" />
      </div>

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">Demandes</TabsTrigger>
          <TabsTrigger value="donors">Donneurs</TabsTrigger>
          <TabsTrigger value="campaigns">Campagnes</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-4">
          <Card className="overflow-x-auto">
            {requests.isLoading ? <div className="p-6 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr>
                  <th className="px-4 py-3 text-left">Groupe</th><th className="px-4 py-3 text-left">Urgence</th><th className="px-4 py-3 text-left">Hôpital</th><th className="px-4 py-3 text-left">Ville</th><th className="px-4 py-3 text-left">Unités</th><th className="px-4 py-3 text-left">Statut</th><th className="px-4 py-3 text-left">Créée</th>
                </tr></thead>
                <tbody>
                  {(requests.data?.rows ?? []).map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-4 py-3 font-semibold">{r.blood_group}</td>
                      <td className="px-4 py-3"><Badge variant={r.urgency === "high" ? "destructive" : "outline"}>{r.urgency}</Badge></td>
                      <td className="px-4 py-3">{r.hospital_name ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{r.city_id?.slice(0, 8) ?? "—"}</td>
                      <td className="px-4 py-3">{r.units_needed}</td>
                      <td className="px-4 py-3"><Badge variant="outline">{r.status}</Badge></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTimeFr(r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="donors" className="mt-4">
          <Card className="overflow-x-auto">
            {donors.isLoading ? <div className="p-6 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr>
                  <th className="px-4 py-3 text-left">Nom</th><th className="px-4 py-3 text-left">Groupe</th><th className="px-4 py-3 text-left">Ville</th><th className="px-4 py-3 text-left">Disponible</th><th className="px-4 py-3 text-left">Inscrit</th>
                </tr></thead>
                <tbody>
                  {(donors.data?.rows ?? []).map((d) => (
                    <tr key={d.id} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">{[d.first_name, d.last_name].filter(Boolean).join(" ") || "—"}</td>
                      <td className="px-4 py-3 font-bold text-destructive">{d.blood_group}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{d.city_id?.slice(0, 8) ?? "—"}</td>
                      <td className="px-4 py-3">{d.is_available ? <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200">Oui</Badge> : <Badge variant="outline">Non</Badge>}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTimeFr(d.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="mt-4">
          <div className="grid gap-3 md:grid-cols-2">
            {(campaigns.data ?? []).map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{c.title}</h3>
                  {c.is_published ? <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200">Publié</Badge> : <Badge variant="outline">Brouillon</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{c.organizer ?? "—"} · {formatDateTimeFr(c.starts_at)}</p>
              </Card>
            ))}
            {(campaigns.data?.length ?? 0) === 0 && <Card className="md:col-span-2 p-8 text-center text-muted-foreground">Aucune campagne.</Card>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}