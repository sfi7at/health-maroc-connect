import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Download, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { buildHead } from "@/lib/seo";
import { formatDateTimeFr } from "@/lib/format";
import { StatusBadge } from "@/components/appointments/StatusBadge";
import type { AppointmentRow } from "@/lib/appointments";

export const Route = createFileRoute("/_authenticated/admin/appointments")({
  head: () => buildHead({ title: "Administration RDV — Vytalma", description: "Vue d'ensemble et gestion globale des rendez-vous.", path: "/admin/appointments" }),
  component: AdminAppointments,
});

function AdminAppointments() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: isAdmin, isLoading: checkingRole } = useQuery({
    queryKey: ["is_admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" });
      if (error) throw error;
      return !!data;
    },
  });

  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin_appointments", status],
    enabled: !!isAdmin,
    queryFn: async () => {
      let q = supabase
        .from("appointments")
        .select("*, providers ( id, name, category ), profiles:patient_id ( id, full_name )")
        .order("scheduled_for", { ascending: false })
        .limit(500);
      if (status !== "all") q = q.eq("status", status as "pending");
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as AppointmentRow[];
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const s = search.trim().toLowerCase();
    return data.filter((a) => (a.providers?.name ?? "").toLowerCase().includes(s) || (a.profiles?.full_name ?? "").toLowerCase().includes(s));
  }, [data, search]);

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").update({ status: "cancelled", cancelled_reason: "Annulé par administrateur" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Annulé"); qc.invalidateQueries({ queryKey: ["admin_appointments"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (checkingRole) return <Skeleton className="h-40 rounded-2xl" />;
  if (!isAdmin) {
    return <EmptyState icon={ShieldCheck} title="Accès réservé" description="Cette section est réservée aux administrateurs Vytalma." />;
  }

  const exportCsv = () => {
    const headers = ["id", "patient", "provider", "scheduled_for", "duration", "status"];
    const rows = filtered.map((a) => [a.id, a.profiles?.full_name ?? "", a.providers?.name ?? "", a.scheduled_for, a.duration_minutes, a.status]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `appointments-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const total = filtered.length;
  const completed = filtered.filter((a) => a.status === "completed").length;
  const cancelled = filtered.filter((a) => a.status === "cancelled").length;
  const rate = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Rendez-vous"
        description="Vue globale, modération et exports."
        icon={<ShieldCheck className="h-5 w-5" />}
        actions={<Button onClick={exportCsv} variant="outline" className="gap-2"><Download className="h-4 w-4" /> Exporter CSV</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="p-4"><p className="text-xs uppercase text-muted-foreground">Total</p><p className="text-2xl font-bold">{total}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase text-muted-foreground">Terminés</p><p className="text-2xl font-bold text-info">{completed}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase text-muted-foreground">Annulés</p><p className="text-2xl font-bold text-destructive">{cancelled}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase text-muted-foreground">Taux complétion</p><p className="text-2xl font-bold text-primary">{rate(completed)}%</p></Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Rechercher patient ou prestataire" value={search} onChange={(e) => setSearch(e.target.value)} className="w-72" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="approved">Confirmés</SelectItem>
            <SelectItem value="completed">Terminés</SelectItem>
            <SelectItem value="cancelled">Annulés</SelectItem>
            <SelectItem value="no_show">Absences</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <Skeleton className="h-80 rounded-2xl" /> : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Patient</th>
                <th className="px-4 py-2 text-left">Prestataire</th>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Statut</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="px-4 py-2 font-medium">{a.profiles?.full_name ?? "—"}</td>
                  <td className="px-4 py-2">{a.providers?.name ?? "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{formatDateTimeFr(a.scheduled_for)}</td>
                  <td className="px-4 py-2"><StatusBadge status={a.status} /></td>
                  <td className="px-4 py-2 text-right">
                    {!["cancelled", "completed", "rejected"].includes(a.status) ? (
                      <Button size="sm" variant="ghost" onClick={() => cancel.mutate(a.id)} disabled={cancel.isPending}>
                        {cancel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Aucun résultat.</td></tr> : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}