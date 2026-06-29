import { useQuery } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Database } from "@/integrations/supabase/types";

export type ProviderCategory = Database["public"]["Enums"]["provider_category"];

export type OwnedProvider = {
  id: string;
  name: string;
  category: ProviderCategory;
  is_verified: boolean;
  is_premium: boolean;
  profile_image: string | null;
  cover_image: string | null;
};

const STORAGE_KEY = "hl_selected_provider";
const listeners = new Set<() => void>();

function getSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
export function setSelectedProviderId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) window.localStorage.setItem(STORAGE_KEY, id);
  else window.localStorage.removeItem(STORAGE_KEY);
  listeners.forEach((cb) => cb());
}

export function useOwnedProviders() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["owned_providers", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("id, name, category, is_verified, is_premium, profile_image, cover_image")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OwnedProvider[];
    },
    staleTime: 60_000,
  });
}

export function useSelectedProvider() {
  const { data: providers = [], isLoading } = useOwnedProviders();
  const stored = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const provider =
    providers.find((p) => p.id === stored) ?? providers[0] ?? null;
  return { provider, providers, isLoading };
}