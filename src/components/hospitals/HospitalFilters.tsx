import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { citiesQuery } from "@/lib/queries";
import {
  HOSPITAL_DEPARTMENTS,
  HOSPITAL_SERVICES,
  type HospitalDepartmentKey,
  type HospitalFiltersValue,
  type HospitalServiceKey,
} from "@/lib/hospitals";

interface HospitalFiltersProps {
  value: HospitalFiltersValue;
  onChange: (next: HospitalFiltersValue) => void;
}

export function HospitalFilters({ value, onChange }: HospitalFiltersProps) {
  const { data: cities = [] } = useQuery(citiesQuery());
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<HospitalFiltersValue>(value);

  function reset() {
    const next: HospitalFiltersValue = { sort: value.sort };
    setDraft(next);
    onChange(next);
  }
  function apply() {
    onChange(draft);
    setOpen(false);
  }

  const activeCount = countActive(value);

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setDraft(value);
      }}
    >
      <SheetTrigger asChild>
        <Button variant="outline" className="h-12 gap-2 rounded-2xl">
          <SlidersHorizontal className="h-4 w-4" /> Filtres
          {activeCount > 0 ? (
            <Badge className="ml-1 h-5 min-w-5 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
              {activeCount}
            </Badge>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            Filtres avancés
            {activeCount > 0 ? (
              <Button variant="ghost" size="sm" onClick={reset} className="gap-1">
                <X className="h-3.5 w-3.5" /> Réinitialiser
              </Button>
            ) : null}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="space-y-2">
            <Label>Type d'établissement</Label>
            <Select
              value={draft.kind ?? "all"}
              onValueChange={(v) =>
                setDraft({ ...draft, kind: v as HospitalFiltersValue["kind"] })
              }
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Hôpitaux & cliniques</SelectItem>
                <SelectItem value="hospital">Hôpitaux</SelectItem>
                <SelectItem value="clinic">Cliniques</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Statut</Label>
            <Select
              value={draft.type ?? "any"}
              onValueChange={(v) =>
                setDraft({
                  ...draft,
                  type:
                    v === "any"
                      ? null
                      : (v as NonNullable<HospitalFiltersValue["type"]>),
                })
              }
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Indifférent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Indifférent</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Privé</SelectItem>
                <SelectItem value="university">CHU / Universitaire</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Ville</Label>
            <Select
              value={draft.cityId ?? "all"}
              onValueChange={(v) => setDraft({ ...draft, cityId: v === "all" ? null : v })}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Toutes les villes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les villes</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name_fr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Quartier</Label>
            <Input
              value={draft.neighborhood ?? ""}
              onChange={(e) => setDraft({ ...draft, neighborhood: e.target.value || null })}
              placeholder="Ex. Maarif, Agdal, Gueliz…"
              className="h-11 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Note minimum</Label>
              <span className="text-xs text-muted-foreground">
                {(draft.minRating ?? 0).toFixed(1)} ★
              </span>
            </div>
            <Slider
              value={[draft.minRating ?? 0]}
              min={0}
              max={5}
              step={0.5}
              onValueChange={([v]) => setDraft({ ...draft, minRating: v })}
            />
          </div>

          <div className="space-y-3">
            <Label>Disponibilité & accès</Label>
            <ToggleRow
              label="Ouvert maintenant"
              checked={!!draft.openNow}
              onChange={(v) => setDraft({ ...draft, openNow: v })}
            />
            <ToggleRow
              label="Urgences"
              checked={!!draft.emergency}
              onChange={(v) => setDraft({ ...draft, emergency: v })}
            />
            <ToggleRow
              label="Parking"
              checked={!!draft.parking}
              onChange={(v) => setDraft({ ...draft, parking: v })}
            />
            <ToggleRow
              label="Accès fauteuil roulant"
              checked={!!draft.wheelchair}
              onChange={(v) => setDraft({ ...draft, wheelchair: v })}
            />
          </div>

          <div className="space-y-2">
            <Label>Département</Label>
            <Select
              value={draft.department ?? "any"}
              onValueChange={(v) =>
                setDraft({
                  ...draft,
                  department: v === "any" ? undefined : (v as HospitalDepartmentKey),
                })
              }
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Tous les départements" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Tous les départements</SelectItem>
                {HOSPITAL_DEPARTMENTS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Service / équipement</Label>
            <Select
              value={draft.service ?? "any"}
              onValueChange={(v) =>
                setDraft({
                  ...draft,
                  service: v === "any" ? undefined : (v as HospitalServiceKey),
                })
              }
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Tous les services" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Tous les services</SelectItem>
                {HOSPITAL_SERVICES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Garanties</Label>
            <ToggleRow
              label="Vérifié"
              checked={!!draft.verified}
              onChange={(v) => setDraft({ ...draft, verified: v })}
            />
            <ToggleRow
              label="Premium"
              checked={!!draft.premium}
              onChange={(v) => setDraft({ ...draft, premium: v })}
            />
          </div>
        </div>

        <SheetFooter className="mt-8 gap-2 sm:flex-row">
          <Button variant="outline" onClick={reset} className="flex-1">
            Réinitialiser
          </Button>
          <Button onClick={apply} className="flex-1">
            Appliquer
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card/50 px-3 py-2">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function countActive(v: HospitalFiltersValue): number {
  let n = 0;
  if (v.kind && v.kind !== "all") n++;
  if (v.type) n++;
  if (v.cityId) n++;
  if (v.neighborhood) n++;
  if (v.minRating && v.minRating > 0) n++;
  for (const key of ["openNow", "emergency", "parking", "wheelchair", "verified", "premium"] as const) {
    if (v[key]) n++;
  }
  if (v.department) n++;
  if (v.service) n++;
  return n;
}