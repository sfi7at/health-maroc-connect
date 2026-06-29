import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

function favoriteIdsQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["favorite_ids", userId ?? "anon"],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("provider_id")
        .eq("user_id", userId!);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.provider_id as string));
    },
    staleTime: 30_000,
  });
}

export function useFavorites() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: ids } = useQuery(favoriteIdsQuery(user?.id));
  const set = ids ?? new Set<string>();

  const toggle = useMutation({
    mutationFn: async (providerId: string) => {
      if (!user) throw new Error("not_authenticated");
      if (set.has(providerId)) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("provider_id", providerId);
        if (error) throw error;
        return { providerId, removed: true };
      }
      const { error } = await supabase
        .from("favorites")
        .insert({ user_id: user.id, provider_id: providerId });
      if (error) throw error;
      return { providerId, removed: false };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["favorite_ids"] });
      qc.invalidateQueries({ queryKey: ["favorites"] });
      toast.success(res.removed ? "Retiré des favoris" : "Ajouté aux favoris");
    },
    onError: (e: Error) => {
      toast.error(e.message === "not_authenticated" ? "Connectez-vous pour ajouter aux favoris" : "Erreur");
    },
  });

  return {
    ids: set,
    isFavorite: (id: string) => set.has(id),
    toggle: (id: string) => toggle.mutate(id),
    isPending: toggle.isPending,
  };
}