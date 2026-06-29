import { MapPin, Phone, Clock, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PlaceCardProps {
  icon: LucideIcon;
  name: string;
  category?: string;
  address: string;
  phone?: string;
  hours?: string;
  open?: boolean;
  distanceKm?: number;
  accent?: "primary" | "secondary" | "blood" | "warning" | "info";
}

const accentMap = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/10 text-secondary",
  blood: "bg-blood/10 text-blood",
  warning: "bg-warning/15 text-warning-foreground",
  info: "bg-info/15 text-info",
} as const;

export function PlaceCard({
  icon: Icon,
  name,
  category,
  address,
  phone,
  hours,
  open,
  distanceKm,
  accent = "primary",
}: PlaceCardProps) {
  return (
    <article className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-elevated">
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "grid h-12 w-12 shrink-0 place-items-center rounded-2xl",
            accentMap[accent],
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-base font-semibold">{name}</h3>
            {typeof open === "boolean" && (
              <Badge
                className={cn(
                  "shrink-0",
                  open
                    ? "bg-success/15 text-foreground hover:bg-success/20"
                    : "bg-muted text-muted-foreground hover:bg-muted",
                )}
              >
                {open ? "Ouvert" : "Fermé"}
              </Badge>
            )}
          </div>
          {category && <p className="text-sm text-muted-foreground">{category}</p>}
        </div>
      </div>

      <dl className="mt-4 space-y-1.5 text-sm text-muted-foreground">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="line-clamp-2">{address}</span>
          {typeof distanceKm === "number" && (
            <span className="ml-auto shrink-0 text-xs font-medium text-foreground">
              {distanceKm.toFixed(1)} km
            </span>
          )}
        </div>
        {hours && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0" />
            <span>{hours}</span>
          </div>
        )}
        {phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 shrink-0" />
            <a href={`tel:${phone}`} className="hover:text-foreground">
              {phone}
            </a>
          </div>
        )}
      </dl>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm">Itinéraire</Button>
        <Button size="sm">Détails</Button>
      </div>
    </article>
  );
}