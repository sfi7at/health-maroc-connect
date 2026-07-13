import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type ActiveRole = "citizen" | "pro";

export function useIsDoctor() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user_is_doctor", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [roles, owned] = await Promise.all([
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user!.id)
          .in("role", ["doctor", "dentist", "pharmacist"]),
        supabase
          .from("providers")
          .select("id")
          .eq("owner_id", user!.id)
          .limit(1),
      ]);
      return (roles.data ?? []).length > 0 || (owned.data ?? []).length > 0;
    },
  });
}

export function useActiveRole() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["active_role", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("active_role")
        .eq("id", user!.id)
        .maybeSingle();
      return ((data?.active_role as ActiveRole) ?? "citizen") as ActiveRole;
    },
  });

  const set = useMutation({
    mutationFn: async (role: ActiveRole) => {
      if (!user) return;
      const { error } = await supabase
        .from("profiles")
        .update({ active_role: role })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["active_role", user?.id] }),
  });

  return { role: q.data ?? "citizen", isLoading: q.isLoading, setRole: set.mutateAsync };
}