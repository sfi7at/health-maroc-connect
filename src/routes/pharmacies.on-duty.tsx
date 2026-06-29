import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Clock, Pill, MoonStar, Sun, Phone, MapPin, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { pharmaciesOnDutyQuery } from "@/lib/queries";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/pharmacies/on-duty")({
  head: () =>
    buildHead({
      title: "Pharmacies de garde — HealthLink Maroc",
      description: "Liste des pharmacies de garde ouvertes au Maroc, mises à jour quotidiennement.",
      path: "/pharmacies/on-duty",
    }),
  component: OnDutyPage,
});

function OnDutyPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [city, setCity] = useState("");
  const { data, isLoading } = useQuery(pharmaciesOnDutyQuery(date));

  const list = useMemo(() => {
    const arr = data ?? [];
    if (!city.trim()) return arr;
    const c = city.trim().toLowerCase();
    return arr.filter((p) => (p.cities?.name_fr ?? "").toLowerCase().includes(c));
  }, [data, city]);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="gap-2">
        <Link to="/pharmacies"><ArrowLeft className="h-4 w-4" /> Toutes les pharmacies</Link>
      </Button>
      <PageHeader
        eyebrow="24h / 24"
        title="Pharmacies de garde"
        description="Données mises à jour quotidiennement selon les arrêtés régionaux marocains."
        icon={<Clock className="h-5 w-5" />}
      />

      <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 rounded-2xl" />
        <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Filtrer par ville…" className="h-11 rounded-2xl" />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-3xl bg-muted/50" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
          <Pill className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Aucune pharmacie de garde répertoriée à cette date.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((row) => {
            const p = row.providers;
            return (
              <article key={row.id} className="rounded-3xl border border-border bg-card p-5 shadow-soft transition hover:shadow-elevated">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold">{p?.name ?? "Pharmacie"}</h3>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> {p?.address ?? row.cities?.name_fr ?? "—"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {row.night_shift ? (
                      <Badge className="border-0 bg-indigo-500/15 text-indigo-600 gap-1"><MoonStar className="h-3 w-3" /> Nuit</Badge>
                    ) : null}
                    {row.day_shift ? (
                      <Badge className="border-0 bg-amber-500/15 text-amber-600 gap-1"><Sun className="h-3 w-3" /> Jour</Badge>
                    ) : null}
                    {row.is_verified ? (
                      <Badge className="border-0 bg-primary/10 text-primary gap-1"><ShieldCheck className="h-3 w-3" /> Vérifié</Badge>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  {p?.phone ? (
                    <Button asChild size="sm" className="flex-1 gap-1">
                      <a href={`tel:${p.phone}`}><Phone className="h-4 w-4" /> Appeler</a>
                    </Button>
                  ) : null}
                  {p?.latitude && p?.longitude ? (
                    <Button asChild size="sm" variant="outline" className="flex-1 gap-1">
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`} target="_blank" rel="noreferrer">
                        <MapPin className="h-4 w-4" /> Itinéraire
                      </a>
                    </Button>
                  ) : null}
                  {p?.id ? (
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/providers/$id" params={{ id: p.id }}>Détails</Link>
                    </Button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
