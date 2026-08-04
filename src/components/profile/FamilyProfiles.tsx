import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Baby, Loader2, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { BLOOD_GROUPS, type BloodGroup } from "@/lib/categories";

export function FamilyProfiles({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | "unknown">("unknown");
  const queryKey = ["family-members", userId];
  const members = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase.from("family_members").select("*").eq("owner_id", userId).order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("family_members").insert({ owner_id: userId, full_name: name.trim(), relation: relation.trim(), date_of_birth: birthDate || null, blood_group: bloodGroup === "unknown" ? null : bloodGroup });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Profil familial ajouté"); setOpen(false); setName(""); setRelation(""); setBirthDate(""); setBloodGroup("unknown"); qc.invalidateQueries({ queryKey }); },
    onError: (error: Error) => toast.error(error.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("family_members").delete().eq("id", id).eq("owner_id", userId); if (error) throw error; },
    onSuccess: () => { toast.success("Profil supprimé"); qc.invalidateQueries({ queryKey }); },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-7">
      <header className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Famille</p><h2 className="text-xl font-semibold">Profils de mes proches</h2><p className="text-sm text-muted-foreground">Centralisez les informations essentielles de vos enfants ou proches.</p></div><Button className="gap-1" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Ajouter</Button></header>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {members.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : members.data?.length ? members.data.map((member) => (
          <article key={member.id} className="flex items-center gap-3 rounded-2xl border border-border p-4"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">{member.relation.toLowerCase().includes("enfant") ? <Baby className="h-5 w-5" /> : <Users className="h-5 w-5" />}</div><div className="min-w-0 flex-1"><p className="truncate font-semibold">{member.full_name}</p><p className="text-xs text-muted-foreground">{member.relation}{member.blood_group ? ` · ${member.blood_group}` : ""}</p></div><Button size="icon" variant="ghost" aria-label="Supprimer" onClick={() => remove.mutate(member.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></article>
        )) : <p className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">Aucun proche ajouté pour le moment.</p>}
      </div>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Ajouter un proche</DialogTitle></DialogHeader><div className="grid gap-4"><div className="space-y-1"><Label htmlFor="family-name">Nom complet</Label><Input id="family-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} /></div><div className="space-y-1"><Label htmlFor="family-relation">Lien familial</Label><Input id="family-relation" value={relation} onChange={(event) => setRelation(event.target.value)} placeholder="Enfant, parent, conjoint…" maxLength={50} /></div><div className="space-y-1"><Label htmlFor="family-birth">Date de naissance</Label><Input id="family-birth" type="date" value={birthDate} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setBirthDate(event.target.value)} /></div><div className="space-y-1"><Label>Groupe sanguin</Label><Select value={bloodGroup} onValueChange={(value) => setBloodGroup(value as BloodGroup | "unknown")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unknown">Inconnu</SelectItem>{BLOOD_GROUPS.map((group) => <SelectItem key={group} value={group}>{group}</SelectItem>)}</SelectContent></Select></div></div><DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={() => add.mutate()} disabled={name.trim().length < 2 || relation.trim().length < 2 || add.isPending}>Ajouter</Button></DialogFooter></DialogContent></Dialog>
    </section>
  );
}
