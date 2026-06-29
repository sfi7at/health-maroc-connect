import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/flags")({
  component: AdminFlags,
});

function AdminFlags() {
  const qc = useQueryClient();
  const flags = useQuery({
    queryKey: ["admin-feature-flags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("key, enabled, rollout_percent, environment, description, updated_at")
        .order("key");
      if (error) throw error;
      return data ?? [];
    },
  });

  const update = useMutation({
    mutationFn: async (input: { key: string; enabled?: boolean; rollout_percent?: number }) => {
      const { error } = await supabase.from("feature_flags").update({
        enabled: input.enabled,
        rollout_percent: input.rollout_percent,
        updated_at: new Date().toISOString(),
      }).eq("key", input.key);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-feature-flags"] }),
  });

  return (
    <div className="space-y-6">
      <AdminHeader icon={Flag} title="Feature flags" description="Activer / désactiver des fonctionnalités et piloter le rollout progressif." />

      {flags.isLoading ? <Skeleton className="h-64 w-full" /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {(flags.data ?? []).map((f) => (
            <Card key={f.key} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2"><div className="text-base font-semibold">{f.key}</div><Badge variant="outline" className="text-[10px]">{f.environment}</Badge></div>
                  {f.description && <div className="mt-1 text-xs text-muted-foreground">{f.description}</div>}
                </div>
                <Switch checked={f.enabled} onCheckedChange={(v) => update.mutate({ key: f.key, enabled: v })} />
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Rollout</span><span className="font-mono">{f.rollout_percent}%</span></div>
                <Slider
                  value={[f.rollout_percent]}
                  min={0}
                  max={100}
                  step={5}
                  onValueCommit={(v) => update.mutate({ key: f.key, rollout_percent: v[0] })}
                  className="mt-2"
                  disabled={!f.enabled}
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}