import { Link } from "@tanstack/react-router";
import { MapPin, Star, Calendar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface DoctorCardProps {
  id: string;
  name: string;
  specialty: string;
  city: string;
  rating?: number;
  reviews?: number;
  avatarUrl?: string;
  acceptsNew?: boolean;
}

export function DoctorCard({
  id,
  name,
  specialty,
  city,
  rating,
  reviews,
  avatarUrl,
  acceptsNew,
}: DoctorCardProps) {
  return (
    <article className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-elevated">
      <div className="flex items-start gap-4">
        <Avatar className="h-14 w-14 shrink-0 ring-2 ring-primary/15">
          <AvatarImage src={avatarUrl} alt={name} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {name
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold">{name}</h3>
          <p className="truncate text-sm text-primary">{specialty}</p>
          <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            {city}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {typeof rating === "number" && (
          <Badge variant="secondary" className="gap-1 bg-warning/15 text-foreground hover:bg-warning/20">
            <Star className="h-3 w-3 fill-current text-warning-foreground" />
            {rating.toFixed(1)}
            {reviews !== undefined && (
              <span className="text-muted-foreground">({reviews})</span>
            )}
          </Badge>
        )}
        {acceptsNew && (
          <Badge className="bg-success/15 text-foreground hover:bg-success/20">
            Nouveaux patients
          </Badge>
        )}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/doctors/$id" params={{ id }}>
            Profil
          </Link>
        </Button>
        <Button asChild size="sm">
          <Link to="/doctors/$id" params={{ id }}>
            <Calendar className="h-4 w-4" />
            Prendre RDV
          </Link>
        </Button>
      </div>
    </article>
  );
}