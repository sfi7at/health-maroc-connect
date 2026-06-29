import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stethoscope, Download, Search as SearchIcon, MoreHorizontal, Check, X, Trash2, ShieldCheck, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { formatDateTimeFr } from "@/lib/format";
import { downloadCsv, logAdminAction } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/providers")({
  component: AdminProviders,
});

const CATEGORIES = [
  { value: "all", label: "Toutes catégories" },
  { value: "doctor", label: "Médecins" },
  { value: "dentist", label: "Dentistes" },
  { value: "pharmacy", label: "Pharmacies" },
  { value: "hospital", label: "Hôpitaux" },
  { value: "clinic", label: "Cliniques" },
  { value: "laboratory", label: "Laboratoires" },
  { value: "blood_center", label: "Centres de don" },
];

function AdminProviders() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<"all" | "verified" | "pending" | "inactive">("all");

  const providers = useQuery({
    queryKey: ["admin-providers", search, category, status],
    queryFn: async () => {
      let q = supabase
        .from("providers")
        .select("id, name, category, city_id, phone, email, is_verified, is_active, is_premium, average_rating, reviews_count, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (search.trim()) q = q.ilike("name", `%${search}%`);
      if (category !== "all") q = q.eq("category", category as never);
      if (status === "verified") q = q.eq("is_verified", true);
      if (status === "pending") q = q.eq("is_verified", false);
      if (status === "inactive") q = q.eq("is_active", false);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, patch, action }: { id: string; patch: Record<string, unknown>; action: string }) => {
      const { error } = await supabase.from("providers").update(patch as never).eq("id", id);
      if (error) throw error;
      await logAdminAction(action, "provider", id, patch);
    },
    onSuccess: () => {
      toast.success("Mis à jour");
      qc.invalidateQueries({ queryKey: ["admin-providers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("providers").delete().eq("id", id);
      if (error) throw error;
      await logAdminAction("provider.delete", "provider", id);
    },
    onSuccess: () => {
      toast.success("Prestataire supprimé");
      qc.invalidateQueries({ queryKey: ["admin-providers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportCsv = () => {
    downloadCsv(`providers-${new Date().toISOString().slice(0, 10)}.csv`, providers.data ?? []);
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        icon={Stethoscope}
        title="Prestataires de santé"
        description="Médecins, pharmacies, hôpitaux, laboratoires et centres de don."
        actions={<Button onClick={exportCsv} variant="outline" className="gap-2"><Download className="h-4 w-4" /> Export CSV</Button>}
      />

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-64">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher par nom…" className="pl-9" />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as never)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="verified">Vérifiés</SelectItem>
              <SelectItem value="pending">À vérifier</SelectItem>
              <SelectItem value="inactive">Suspendus</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {providers.isLoading ? (
          <div className="p-6 space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Nom</th>
                  <th className="px-4 py-3 text-left">Catégorie</th>
                  <th className="px-4 py-3 text-left">Contact</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3 text-left">Note</th>
                  <th className="px-4 py-3 text-left">Créé</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(providers.data ?? []).map((p) => (
                  <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3"><Link to="/providers/$id" params={{ id: p.id }} className="font-medium hover:text-primary">{p.name}</Link></td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-[10px]">{p.category}</Badge></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.phone ?? "—"}<br />{p.email ?? ""}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {p.is_verified ? <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200">Vérifié</Badge> : <Badge variant="outline">À vérifier</Badge>}
                        {!p.is_active && <Badge variant="destructive">Suspendu</Badge>}
                        {p.is_premium && <Badge className="bg-amber-500/15 text-amber-700 border-amber-200">Premium</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{Number(p.average_rating).toFixed(1)} <span className="text-xs text-muted-foreground">({p.reviews_count})</span></span></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDateTimeFr(p.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!p.is_verified ? (
                            <DropdownMenuItem onClick={() => update.mutate({ id: p.id, patch: { is_verified: true }, action: "provider.verify" })}>
                              <ShieldCheck className="mr-2 h-4 w-4" /> Vérifier
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => update.mutate({ id: p.id, patch: { is_verified: false }, action: "provider.unverify" })}>
                              <X className="mr-2 h-4 w-4" /> Retirer vérification
                            </DropdownMenuItem>
                          )}
                          {p.is_active ? (
                            <DropdownMenuItem onClick={() => update.mutate({ id: p.id, patch: { is_active: false }, action: "provider.suspend" })}>
                              <X className="mr-2 h-4 w-4" /> Suspendre
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => update.mutate({ id: p.id, patch: { is_active: true }, action: "provider.activate" })}>
                              <Check className="mr-2 h-4 w-4" /> Réactiver
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => update.mutate({ id: p.id, patch: { is_premium: !p.is_premium }, action: "provider.premium" })}>
                            <Star className="mr-2 h-4 w-4" /> {p.is_premium ? "Retirer premium" : "Marquer premium"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm("Supprimer ce prestataire ?")) remove.mutate(p.id); }}>
                            <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {(providers.data?.length ?? 0) === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Aucun prestataire.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}