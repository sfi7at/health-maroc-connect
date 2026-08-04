import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Loader2, Pill, Store } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { setSelectedProviderId } from "@/lib/provider-store";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/pharmacy-onboarding")({
  head: () =>
    buildHead({
      title: "Créer ma pharmacie — Vytalma",
      description: "Créez votre espace pharmacie et préparez votre boutique médicale.",
      path: "/pharmacy-onboarding",
    }),
  component: PharmacyOnboarding,
});

function PharmacyOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    cityId: "",
    description: "",
  });

  const cities = useQuery({
    queryKey: ["pharmacy-onboarding-cities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cities")
        .select("id, name_fr")
        .order("name_fr")
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const createPharmacy = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Votre session a expiré. Reconnectez-vous.");
      const name = form.name.trim();
      const phone = form.phone.trim();
      const address = form.address.trim();
      if (name.length < 3) throw new Error("Indiquez le nom complet de la pharmacie.");
      if (!phone) throw new Error("Le numéro de téléphone est obligatoire.");
      if (!address) throw new Error("L'adresse est obligatoire.");
      if (!form.cityId) throw new Error("Sélectionnez une ville.");

      const { data, error } = await supabase
        .from("providers")
        .insert({
          owner_id: user.id,
          category: "pharmacy",
          name,
          phone,
          email: user.email ?? null,
          address,
          city_id: form.cityId,
          description: form.description.trim() || null,
          is_active: false,
          is_verified: false,
          metadata: {
            onboarding_status: "pending_verification",
            store_enabled: true,
          },
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: async (providerId) => {
      setSelectedProviderId(providerId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["owned_providers"] }),
        queryClient.invalidateQueries({ queryKey: ["my_pharmacies"] }),
      ]);
      toast.success("Votre espace pharmacie est créé");
      navigate({ to: "/provider/products" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="gap-2">
        <Link to="/pharmacies">
          <ArrowLeft className="h-4 w-4" /> Retour aux pharmacies
        </Link>
      </Button>

      <PageHeader
        eyebrow="Espace pharmacie"
        title="Créer ma boutique médicale"
        description="Renseignez votre officine. Vous pourrez ensuite ajouter vos produits et préparer votre profil public."
        icon={<Store className="h-5 w-5" />}
      />

      <Card className="space-y-5 p-5 sm:p-7">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4 text-primary" /> Ouverture sans paiement bancaire
          </p>
          <p className="mt-1 text-muted-foreground">
            La boutique reste en attente de vérification avant sa publication publique. Vous pouvez préparer le catalogue immédiatement.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom de la pharmacie *">
            <Input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Pharmacie Al Amal"
            />
          </Field>
          <Field label="Téléphone professionnel *">
            <Input
              type="tel"
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              placeholder="+212 5…"
            />
          </Field>
          <Field label="Ville *">
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.cityId}
              onChange={(event) => setForm((current) => ({ ...current, cityId: event.target.value }))}
            >
              <option value="">Sélectionner une ville</option>
              {(cities.data ?? []).map((city) => (
                <option key={city.id} value={city.id}>{city.name_fr}</option>
              ))}
            </select>
          </Field>
          <Field label="Adresse complète *">
            <Input
              value={form.address}
              onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
              placeholder="Rue, quartier…"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Présentation de la pharmacie">
              <Textarea
                rows={4}
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Services, horaires particuliers, livraison…"
              />
            </Field>
          </div>
        </div>

        <Button
          className="w-full gap-2 sm:w-auto"
          onClick={() => createPharmacy.mutate()}
          disabled={createPharmacy.isPending || cities.isLoading}
        >
          {createPharmacy.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pill className="h-4 w-4" />}
          Créer ma pharmacie et continuer
        </Button>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
