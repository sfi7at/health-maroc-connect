import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Download, Search as SearchIcon, MoreHorizontal, Shield, Trash2 } from "lucide-react";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatDateTimeFr } from "@/lib/format";
import { downloadCsv, logAdminAction, STAFF_ROLES, STAFF_ROLE_LABELS } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsers,
});

const PAGE_SIZE = 25;

function AdminUsers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<"created_at" | "full_name">("created_at");

  const profiles = useQuery({
    queryKey: ["admin-users", search, page, sort],
    queryFn: async () => {
      let q = supabase
        .from("profiles")
        .select("id, full_name, first_name, last_name, phone, city, language, created_at", { count: "exact" })
        .order(sort, { ascending: sort === "full_name" });
      if (search.trim()) q = q.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
      q = q.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      const { data, count, error } = await q;
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });

  const roles = useQuery({
    queryKey: ["admin-users-roles", profiles.data?.rows.map((r) => r.id).join(",")],
    enabled: !!profiles.data?.rows.length,
    queryFn: async () => {
      const ids = profiles.data!.rows.map((r) => r.id);
      const { data, error } = await supabase.from("user_roles").select("user_id, role").in("user_id", ids);
      if (error) throw error;
      const map: Record<string, string[]> = {};
      (data ?? []).forEach((r) => { map[r.user_id] = [...(map[r.user_id] ?? []), r.role]; });
      return map;
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as never });
      if (error && !error.message.includes("duplicate")) throw error;
      await logAdminAction("user.role.assign", "user", userId, { role });
    },
    onSuccess: () => {
      toast.success("Rôle attribué");
      qc.invalidateQueries({ queryKey: ["admin-users-roles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as never);
      if (error) throw error;
      await logAdminAction("user.role.remove", "user", userId, { role });
    },
    onSuccess: () => {
      toast.success("Rôle retiré");
      qc.invalidateQueries({ queryKey: ["admin-users-roles"] });
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("profiles").delete().eq("id", id);
      if (error) throw error;
      await logAdminAction("user.delete", "user", id);
    },
    onSuccess: () => {
      toast.success("Utilisateur supprimé");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = profiles.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const exportCsv = () => {
    const rows = (profiles.data?.rows ?? []).map((r) => ({
      id: r.id, name: r.full_name, phone: r.phone, city: r.city, language: r.language, created_at: r.created_at,
    }));
    downloadCsv(`users-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        icon={Users}
        title="Utilisateurs"
        description={`${total.toLocaleString("fr-FR")} comptes enregistrés sur la plateforme.`}
        actions={<Button onClick={exportCsv} variant="outline" className="gap-2"><Download className="h-4 w-4" /> Export CSV</Button>}
      />

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-64">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Rechercher par nom ou téléphone…" className="pl-9" />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as never)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Plus récents</SelectItem>
              <SelectItem value="full_name">Nom (A–Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {profiles.isLoading ? (
          <div className="p-6 space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Utilisateur</th>
                  <th className="px-4 py-3 text-left">Téléphone</th>
                  <th className="px-4 py-3 text-left">Ville</th>
                  <th className="px-4 py-3 text-left">Rôles</th>
                  <th className="px-4 py-3 text-left">Inscrit</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(profiles.data?.rows ?? []).map((u) => (
                  <tr key={u.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{u.full_name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.city ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(roles.data?.[u.id] ?? ["user"]).map((r) => (
                          <Badge key={r} variant={r === "admin" ? "default" : "outline"} className="text-[10px]">{r}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTimeFr(u.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <div className="px-2 py-1 text-[10px] uppercase text-muted-foreground">Attribuer rôle</div>
                          {STAFF_ROLES.map((r) => (
                            <DropdownMenuItem key={r} onClick={() => setRole.mutate({ userId: u.id, role: r })}>
                              <Shield className="mr-2 h-4 w-4" /> {STAFF_ROLE_LABELS[r]}
                            </DropdownMenuItem>
                          ))}
                          {(roles.data?.[u.id]?.length ?? 0) > 0 && (
                            <>
                              <DropdownMenuSeparator />
                              <div className="px-2 py-1 text-[10px] uppercase text-muted-foreground">Retirer rôle</div>
                              {(roles.data?.[u.id] ?? []).filter((r) => r !== "user").map((r) => (
                                <DropdownMenuItem key={`rm-${r}`} onClick={() => removeRole.mutate({ userId: u.id, role: r })}>
                                  Retirer {r}
                                </DropdownMenuItem>
                              ))}
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
                                <Trash2 className="mr-2 h-4 w-4" /> Supprimer le compte
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer cet utilisateur ?</AlertDialogTitle>
                                <AlertDialogDescription>Le profil sera supprimé définitivement. Cette action est irréversible.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteUser.mutate(u.id)} className="bg-destructive">Supprimer</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {(profiles.data?.rows.length ?? 0) === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Aucun utilisateur trouvé.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">Page {page + 1} / {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Précédent</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Suivant</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}