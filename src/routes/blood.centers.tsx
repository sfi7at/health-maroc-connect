import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Building2, MapPin, Phone, Clock, Navigation } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { citiesQuery } from "@/lib/queries";
import { bloodCentersQuery } from "@/lib/blood-queries";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/blood/centers")({
  head: () =>
    buildHead({
      title: "Centres de don du sang — HealthLink Maroc",
      description: "Trouvez les centres de don du sang agréés au Maroc avec horaires et contacts.",
      path: "/blood/centers",
    }),
  component: CentersPage,
});

function CentersPage() {
  const [cityId, setCityId] = useState<string | "all">("all");
  const { data: cities = [] } = useQuery(citiesQuery());
  const { data: centers = [], isLoading } = useQuery(
    bloodCentersQuery(cityId === "all" ? null : cityId),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Réseau national"
        title="Centres de don"
        description="Centres de transfusion sanguine au Maroc."
        icon={<Building2 className="h-5 w-5" />}
      />

      <Select value={cityId} onValueChange={setCityId}>
        <SelectTrigger className="h-12 max-w-xs rounded-2xl">
          <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les villes</SelectItem>
          {cities.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name_fr}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-3xl" />
          ))}
        </div>
      ) : centers.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aucun centre listé"
          description="Aucun centre n'est encore référencé pour ce filtre."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {centers.map((c) => (
            <motion.article
              key={c.id}
              whileHover={{ y: -3 }}
              className="rounded-3xl border border-border bg-card p-5 shadow-soft"
            >
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-500/10 text-rose-600">
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">{c.name}</h3>
                  {c.address && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{c.address}</p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {c.phone && (
                  <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 text-foreground">
                    <Phone className="h-3.5 w-3.5" /> {c.phone}
                  </a>
                )}
                {c.cities?.name_fr && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {c.cities.name_fr}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Horaires sur la fiche
                </span>
              </div>
              <div className="mt-4 flex gap-2">
                <Button asChild variant="outline" size="sm" className="gap-1">
                  <Link to="/providers/$id" params={{ id: c.id }}>
                    Voir la fiche
                  </Link>
                </Button>
                {c.latitude && c.longitude && (
                  <Button asChild size="sm" variant="secondary" className="gap-1">
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      href={`https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}`}
                    >
                      <Navigation className="h-3.5 w-3.5" /> Itinéraire
                    </a>
                  </Button>
                )}
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </div>
  );
}