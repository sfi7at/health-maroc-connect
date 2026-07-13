import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  Droplet,
  Heart,
  AlertTriangle,
  Loader2,
  Send,
  Phone,
  ShieldCheck,
  MapPin,
  Hospital,
  User,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { citiesQuery } from "@/lib/queries";
import { BLOOD_GROUPS, type BloodGroup } from "@/lib/categories";
import { buildHead } from "@/lib/seo";

const searchSchema = z.object({ donor: z.string().optional() });

export const Route = createFileRoute("/blood/request")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () =>
    buildHead({
      title: "Publier une demande de sang — Vytalma",
      description: "Publiez une demande de don de sang. Les donneurs compatibles seront notifiés.",
      path: "/blood/request",
    }),
  component: RequestPage,
});

function RequestPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: cities = [] } = useQuery(citiesQuery());

  const [form, setForm] = useState({
    patient_name: "",
    contact_name: "",
    blood_group: "O+" as BloodGroup,
    units_needed: 1,
    hospital_name: "",
    city_id: "",
    address: "",
    contact_phone: "",
    notes: "",
    is_emergency: false,
    urgency: "high" as "low" | "normal" | "high" | "critical",
    needed_by: "",
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) {
        navigate({ to: "/auth" });
        throw new Error("Connectez-vous pour publier une demande.");
      }
      const phone = form.contact_phone.trim();
      if (!form.patient_name.trim() || phone.length < 8)
        throw new Error("Vérifiez le nom du patient et le téléphone.");
      const { data, error } = await supabase
        .from("blood_requests")
        .insert({
          requester_id: user.id,
          patient_name: form.patient_name.trim().slice(0, 80),
          contact_name: form.contact_name.trim().slice(0, 80) || null,
          blood_group: form.blood_group,
          units_needed: form.units_needed,
          hospital_name: form.hospital_name.trim().slice(0, 120) || null,
          city_id: form.city_id || null,
          address: form.address.trim().slice(0, 200) || null,
          contact_phone: phone.slice(0, 20),
          notes: form.notes.trim().slice(0, 500) || null,
          is_emergency: form.is_emergency,
          urgency: form.urgency,
          needed_by: form.needed_by ? new Date(form.needed_by).toISOString() : null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      toast.success("Demande publiée — les donneurs compatibles vont être notifiés.");
      navigate({ to: "/blood" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Don du sang"
        title="Publier une demande"
        description="Décrivez votre besoin. Vos coordonnées resteront privées jusqu'à l'accord d'un donneur."
        icon={<Droplet className="h-5 w-5" />}
      />

      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate();
        }}
        className="grid gap-5 rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-7"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom du patient" icon={User} required>
            <Input
              required
              value={form.patient_name}
              onChange={(e) => setForm({ ...form, patient_name: e.target.value })}
              placeholder="Ex. Amine B."
              maxLength={80}
            />
          </Field>
          <Field label="Personne à contacter" icon={User}>
            <Input
              value={form.contact_name}
              onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
              placeholder="Ex. Famille / proche"
              maxLength={80}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Groupe sanguin requis" icon={Droplet} required>
            <Select value={form.blood_group} onValueChange={(v) => setForm({ ...form, blood_group: v as BloodGroup })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BLOOD_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Poches requises" icon={Droplet}>
            <Input
              type="number"
              min={1}
              max={20}
              value={form.units_needed}
              onChange={(e) =>
                setForm({ ...form, units_needed: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })
              }
            />
          </Field>
          <Field label="Niveau d'urgence" icon={AlertTriangle}>
            <Select value={form.urgency} onValueChange={(v) => setForm({ ...form, urgency: v as typeof form.urgency })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Faible</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">Urgent</SelectItem>
                <SelectItem value="critical">Critique</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Hôpital / Établissement" icon={Hospital}>
            <Input
              value={form.hospital_name}
              onChange={(e) => setForm({ ...form, hospital_name: e.target.value })}
              placeholder="Ex. CHU Ibn Rochd"
              maxLength={120}
            />
          </Field>
          <Field label="Ville" icon={MapPin}>
            <Select value={form.city_id} onValueChange={(v) => setForm({ ...form, city_id: v })}>
              <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                {cities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name_fr}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="Adresse / Service" icon={MapPin}>
          <Input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Service, étage, point de repère"
            maxLength={200}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Requis avant" icon={Clock}>
            <Input
              type="datetime-local"
              value={form.needed_by}
              onChange={(e) => setForm({ ...form, needed_by: e.target.value })}
            />
          </Field>
          <Field label="Téléphone de contact (privé)" icon={Phone} required>
            <Input
              required
              value={form.contact_phone}
              onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
              placeholder="+212 6 ..."
              maxLength={20}
            />
          </Field>
        </div>

        <Field label="Notes médicales (optionnel)" icon={Heart}>
          <Textarea
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Diagnostic, urgence, précisions utiles aux donneurs"
            maxLength={500}
          />
        </Field>

        <label className="flex items-center justify-between rounded-2xl border border-border bg-muted/30 p-4">
          <div>
            <p className="text-sm font-medium">Marquer comme urgence vitale</p>
            <p className="text-xs text-muted-foreground">
              Les donneurs compatibles seront notifiés immédiatement.
            </p>
          </div>
          <Switch
            checked={form.is_emergency}
            onCheckedChange={(v) => setForm({ ...form, is_emergency: v })}
          />
        </label>

        <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" /> Vos coordonnées seront partagées uniquement avec les donneurs qui acceptent.
        </p>

        <div className="flex justify-end gap-3">
          <Button asChild type="button" variant="ghost">
            <Link to="/blood">Annuler</Link>
          </Button>
          <Button type="submit" disabled={submit.isPending} className="gap-2" size="lg">
            {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Publier la demande
          </Button>
        </div>
      </motion.form>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  required,
  children,
}: {
  label: string;
  icon: typeof Heart;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="inline-flex items-center gap-1.5 text-xs">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {label} {required && <span className="text-rose-500">*</span>}
      </Label>
      {children}
    </div>
  );
}