import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Droplet, Building2, MapPin, Layers } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { MapView, type MapMarker } from "@/components/common/MapView";
import { bloodRequestsQuery } from "@/lib/queries";
import { bloodCentersQuery } from "@/lib/blood-queries";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/blood/map")({
  head: () =>
    buildHead({
      title: "Carte du don du sang — Vytalma",
      description: "Visualisez les demandes urgentes et les centres de don du sang sur la carte.",
      path: "/blood/map",
    }),
  component: BloodMapPage,
});

function BloodMapPage() {
  const [showRequests, setShowRequests] = useState(true);
  const [showCenters, setShowCenters] = useState(true);

  const { data: requests = [] } = useQuery(bloodRequestsQuery({}));
  const { data: centers = [] } = useQuery(bloodCentersQuery(null));

  const markers = useMemo<MapMarker[]>(() => {
    const ms: MapMarker[] = [];
    if (showRequests) {
      requests.forEach((r) => {
        const row = r as typeof r & { latitude?: number | null; longitude?: number | null };
        if (row.latitude && row.longitude) {
          ms.push({
            id: `req-${r.id}`,
            lat: Number(row.latitude),
            lng: Number(row.longitude),
            title: `Demande ${r.blood_group}`,
            subtitle: r.hospital_name ?? r.patient_name,
          });
        }
      });
    }
    if (showCenters) {
      centers.forEach((c) => {
        if (c.latitude && c.longitude) {
          ms.push({
            id: `ctr-${c.id}`,
            lat: Number(c.latitude),
            lng: Number(c.longitude),
            title: c.name,
            subtitle: c.address ?? "Centre de don",
          });
        }
      });
    }
    return ms;
  }, [requests, centers, showRequests, showCenters]);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Vue géographique"
        title="Carte du don"
        description="Demandes urgentes et centres de don sur une seule carte."
        icon={<MapPin className="h-5 w-5" />}
      />

      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-3 shadow-soft">
        <div className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Layers className="h-4 w-4" /> Couches
        </div>
        <Label className="inline-flex items-center gap-2 text-sm">
          <Switch checked={showRequests} onCheckedChange={setShowRequests} />
          <Droplet className="h-4 w-4 text-rose-500" /> Demandes
        </Label>
        <Label className="inline-flex items-center gap-2 text-sm">
          <Switch checked={showCenters} onCheckedChange={setShowCenters} />
          <Building2 className="h-4 w-4 text-sky-600" /> Centres
        </Label>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border shadow-soft">
        <MapView markers={markers} height="600px" />
      </div>
    </div>
  );
}