import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Droplet, Heart, MapPin, Clock, Plus, AlertTriangle, Phone, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/common/EmptyState";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { bloodRequestsQuery, citiesQuery } from "@/lib/queries";
import { BLOOD_GROUPS, URGENCY_META, type BloodGroup } from "@/lib/categories";
import { formatRelativeFr } from "@/lib/format";
import { buildHead } from "@/lib/seo";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/blood")({
  head: () =>
    buildHead({
      title: "Don du sang au Maroc — HealthLink",
      description:
        "Sauvez des vies. Trouvez des demandes urgentes de don du sang et rejoignez la communauté HealthLink Maroc.",
      path: "/blood",
    }),
  component: BloodPage,
});

function BloodPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | "all">("all");
  const [cityId, setCityId] = useState<string | "all">("all");
  const [requestOpen, setRequestOpen] = useState(false);

  const { data: cities = [] } = useQuery(citiesQuery());
  const { data: requests = [], isLoading } = useQuery(
    bloodRequestsQuery({
      bloodGroup: bloodGroup === "all" ? undefined : bloodGroup,
      cityId: cityId === "all" ? null : cityId,
    }),
  );

  const respond = useMutation({
    mutationFn: async (requestId: string) => {
      if (!user) throw new Error("Connectez-vous pour répondre à une demande.");
      const { error } = await supabase.from("blood_request_responses").upsert(
        { request_id: requestId, donor_id: user.id, status: "accepted" },
        { onConflict: "request_id,donor_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Merci ! Le demandeur va recevoir vos coordonnées.");
      queryClient.invalidateQueries({ queryKey: ["blood_requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <BloodHero onRequest={() => setRequestOpen(true)} />

      <PageHeader
        eyebrow="Communauté"
        title="Demandes en cours"
        description="Réagissez aux demandes vérifiées près de chez vous. Vos coordonnées restent privées jusqu'à votre accord."
        icon={<Droplet className="h-5 w-5" />}
        actions={
          <NewRequestDialog open={requestOpen} onOpenChange={setRequestOpen} />
        }
      />

      <div className="grid gap-3 sm:grid-cols-[200px_240px_1fr]">
        <Select value={bloodGroup} onValueChange={(v) => setBloodGroup(v as BloodGroup | "all")}>
          <SelectTrigger className="h-12 rounded-2xl">
            <Droplet className="mr-2 h-4 w-4 text-blood" />
            <SelectValue placeholder="Groupe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les groupes</SelectItem>
            {BLOOD_GROUPS.map((b) => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={cityId} onValueChange={setCityId}>
          <SelectTrigger className="h-12 rounded-2xl">
            <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Toutes les villes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les villes</SelectItem>
            {cities.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name_fr}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-3xl" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={Droplet}
          title="Aucune demande en cours"
          description="Aucune demande ne correspond à vos filtres. Élargissez la recherche ou créez votre propre demande."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {requests.map((r) => (
            <BloodRequestCard
              key={r.id}
              req={r}
              onAccept={() => respond.mutate(r.id)}
              loading={respond.isPending && respond.variables === r.id}
              canRespond={!!user}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BloodHero({ onRequest }: { onRequest: () => void }) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-500 to-red-600 p-6 text-white shadow-elevated sm:p-10">
      <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end"
      >
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <Heart className="h-3.5 w-3.5" fill="currentColor" /> Communauté Maroc
          </span>
          <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
            Donnez votre sang. Sauvez des vies.
          </h1>
          <p className="mt-3 text-sm opacity-90 sm:text-base">
            Rejoignez des milliers de donneurs au Maroc. Réagissez aux demandes urgentes en quelques secondes — vos coordonnées restent strictement privées.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onRequest} size="lg" className="gap-2 bg-white text-rose-700 hover:bg-white/90">
            <AlertTriangle className="h-4 w-4" /> J'ai besoin de sang
          </Button>
          <Button asChild size="lg" variant="outline" className="gap-2 border-white/40 bg-white/10 text-white hover:bg-white/20">
            <Link to="/_authenticated/profile" hash="donor">
              <Heart className="h-4 w-4" /> Je veux donner
            </Link>
          </Button>
        </div>
      </motion.div>
    </section>
  );
}

type BloodRequest = Database["public"]["Tables"]["blood_requests"]["Row"] & {
  cities?: { id: string; name_fr: string } | null;
};

function BloodRequestCard({
  req,
  onAccept,
  loading,
  canRespond,
}: {
  req: BloodRequest;
  onAccept: () => void;
  loading: boolean;
  canRespond: boolean;
}) {
  const urgency = URGENCY_META[req.urgency as keyof typeof URGENCY_META];
  return (
    <motion.article
      whileHover={{ y: -2 }}
      className="relative flex flex-col gap-4 overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-soft"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-blood/10 text-blood">
            <span className="text-base font-bold">{req.blood_group}</span>
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold">{req.patient_name}</h3>
            <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> {formatRelativeFr(req.created_at)}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge className={`border-0 ${urgency.tint}`}>{urgency.label}</Badge>
          {req.is_emergency ? (
            <Badge className="border-0 bg-blood text-blood-foreground">URGENCE</Badge>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5 text-sm">
        {req.hospital_name ? (
          <p className="text-foreground">
            <span className="text-muted-foreground">Hôpital : </span>
            {req.hospital_name}
          </p>
        ) : null}
        {req.cities?.name_fr ? (
          <p className="inline-flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {req.cities.name_fr}
          </p>
        ) : null}
        <p className="text-muted-foreground">
          {req.units_needed} poche{req.units_needed > 1 ? "s" : ""} requise{req.units_needed > 1 ? "s" : ""}
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3">
        <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Contact dévoilé après accord
        </p>
        <Button onClick={onAccept} disabled={loading || !canRespond} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className="h-4 w-4" />}
          {canRespond ? "Je peux aider" : "Connexion requise"}
        </Button>
      </div>
    </motion.article>
  );
}

function NewRequestDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: cities = [] } = useQuery(citiesQuery());
  const [form, setForm] = useState({
    patient_name: "",
    blood_group: "O+" as BloodGroup,
    units_needed: 1,
    hospital_name: "",
    city_id: "",
    contact_phone: "",
    notes: "",
    is_emergency: false,
    urgency: "high" as "low" | "normal" | "high" | "critical",
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Vous devez être connecté.");
      if (!form.patient_name.trim() || !form.contact_phone.trim())
        throw new Error("Renseignez le nom et un téléphone de contact.");
      const { error } = await supabase.from("blood_requests").insert({
        requester_id: user.id,
        patient_name: form.patient_name.trim(),
        blood_group: form.blood_group,
        units_needed: form.units_needed,
        hospital_name: form.hospital_name.trim() || null,
        city_id: form.city_id || null,
        contact_phone: form.contact_phone.trim(),
        notes: form.notes.trim() || null,
        is_emergency: form.is_emergency,
        urgency: form.urgency,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Demande publiée. Les donneurs compatibles vont être notifiés.");
      queryClient.invalidateQueries({ queryKey: ["blood_requests"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Nouvelle demande</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Publier une demande de sang</DialogTitle>
          <DialogDescription>
            Votre demande sera visible par tous les donneurs compatibles à proximité.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Nom du patient</Label>
            <Input value={form.patient_name} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} placeholder="Ex. Amine B." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Groupe sanguin</Label>
              <Select value={form.blood_group} onValueChange={(v) => setForm({ ...form, blood_group: v as BloodGroup })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BLOOD_GROUPS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Poches requises</Label>
              <Input type="number" min={1} value={form.units_needed} onChange={(e) => setForm({ ...form, units_needed: Math.max(1, Number(e.target.value) || 1) })} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Hôpital</Label>
            <Input value={form.hospital_name} onChange={(e) => setForm({ ...form, hospital_name: e.target.value })} placeholder="Ex. CHU Ibn Rochd" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Ville</Label>
              <Select value={form.city_id} onValueChange={(v) => setForm({ ...form, city_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>
                  {cities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name_fr}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Urgence</Label>
              <Select value={form.urgency} onValueChange={(v) => setForm({ ...form, urgency: v as typeof form.urgency })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Faible</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">Urgent</SelectItem>
                  <SelectItem value="critical">Critique</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Téléphone (visible après accord du donneur)</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} placeholder="+212 6 ..." />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Note (optionnel)</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Détails utiles aux donneurs" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => submit.mutate()} disabled={submit.isPending} className="gap-2">
            {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Publier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
