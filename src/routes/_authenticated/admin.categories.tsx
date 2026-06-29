import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Tags } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  component: AdminCategories,
});

function AdminCategories() {
  const specialties = useQuery({
    queryKey: ["admin-specialties"],
    queryFn: async () => {
      const { data, error } = await supabase.from("specialties").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <AdminHeader icon={Tags} title="Spécialités & Catégories" description="Référentiel des spécialités médicales." badge={`${specialties.data?.length ?? 0} spécialités`} />

      {specialties.isLoading ? <Skeleton className="h-64 w-full" /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(specialties.data ?? []).map((s: any) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{s.name_fr ?? s.name ?? s.slug}</h3>
                <Badge variant="outline" className="text-[10px]">{s.slug}</Badge>
              </div>
              {s.description && <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}