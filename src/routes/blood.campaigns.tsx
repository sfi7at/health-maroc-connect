import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CalendarHeart, MapPin, Clock, Users, Phone, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { bloodCampaignsQuery } from "@/lib/blood-queries";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/blood/campaigns")({
  head: () =>
    buildHead({
      title: "Campagnes de don du sang — Vytalma",
      description: "Découvrez les prochaines collectes et campagnes de don du sang au Maroc.",
      path: "/blood/campaigns",
    }),
  component: CampaignsPage,
});

function CampaignsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: campaigns = [], isLoading } = useQuery(bloodCampaignsQuery({ upcoming: true }));

  const register = useMutation({
    mutationFn: async (campaignId: string) => {
      if (!user) throw new Error("Connectez-vous pour vous inscrire.");
      const { error } = await supabase
        .from("blood_campaign_registrations")
        .insert({ campaign_id: campaignId, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inscription confirmée. À bientôt !");
      queryClient.invalidateQueries({ queryKey: ["blood_campaigns"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Événements"
        title="Campagnes de don"
        description="Rejoignez les prochaines collectes près de chez vous."
        icon={<CalendarHeart className="h-5 w-5" />}
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-3xl" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={CalendarHeart}
          title="Aucune campagne à venir"
          description="Revenez bientôt — les associations partenaires publieront leurs prochaines collectes."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {campaigns.map((c) => (
            <motion.article
              key={c.id}
              whileHover={{ y: -3 }}
              className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft"
            >
              <div
                className="h-32 bg-gradient-to-br from-rose-500 to-red-700"
                style={
                  c.cover_image
                    ? { backgroundImage: `url(${c.cover_image})`, backgroundSize: "cover" }
                    : undefined
                }
              />
              <div className="space-y-3 p-5">
                <div>
                  <p className="text-xs uppercase tracking-wider text-rose-600">{c.organizer}</p>
                  <h3 className="mt-1 text-lg font-semibold">{c.title}</h3>
                </div>
                {c.description && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(c.starts_at).toLocaleString("fr-FR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                  {c.cities?.name_fr && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {c.cities.name_fr}
                    </span>
                  )}
                  {c.contact_phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" /> {c.contact_phone}
                    </span>
                  )}
                </div>
                <Button
                  onClick={() => register.mutate(c.id)}
                  disabled={register.isPending || !user}
                  className="w-full gap-2"
                >
                  {register.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                  {user ? "S'inscrire" : "Connexion requise"}
                </Button>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </div>
  );
}