import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings as SettingsIcon, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { logAdminAction } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const qc = useQueryClient();
  const settings = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("*").order("category");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => {
    if (settings.data) {
      const v: Record<string, string> = {};
      settings.data.forEach((s) => {
        const raw = s.value;
        v[s.key] = typeof raw === "string" ? raw : JSON.stringify(raw);
      });
      setValues(v);
    }
  }, [settings.data]);

  const save = useMutation({
    mutationFn: async () => {
      for (const s of settings.data ?? []) {
        const raw = values[s.key];
        let value: unknown;
        try { value = JSON.parse(raw); } catch { value = raw; }
        const { error } = await supabase.from("app_settings").update({ value: value as never, updated_at: new Date().toISOString() } as never).eq("key", s.key);
        if (error) throw error;
      }
      await logAdminAction("settings.update", "settings");
    },
    onSuccess: () => { toast.success("Paramètres enregistrés"); qc.invalidateQueries({ queryKey: ["admin-settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  type SettingRow = NonNullable<typeof settings.data>[number];
  const grouped = (settings.data ?? []).reduce<Record<string, SettingRow[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <AdminHeader
        icon={SettingsIcon}
        title="Paramètres de la plateforme"
        description="Configurez le nom, les contacts, les réseaux sociaux et plus encore."
        actions={<Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-2"><Save className="h-4 w-4" /> Enregistrer</Button>}
      />

      {settings.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, items]) => (
            <Card key={cat} className="p-5">
              <h2 className="mb-3 font-semibold capitalize">{cat}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {items.map((s) => (
                  <div key={s.key}>
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">{s.key.replace(/_/g, " ")}</Label>
                    <Input value={values[s.key] ?? ""} onChange={(e) => setValues({ ...values, [s.key]: e.target.value })} />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}