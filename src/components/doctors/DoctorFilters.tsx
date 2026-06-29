import { useQuery } from "@tanstack/react-query";
import { Filter, RotateCcw } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { citiesQuery } from "@/lib/queries";
import {
  specialtiesQuery, INSURANCES, LANGUAGES, type DoctorFiltersValue, type SortBy,
} from "@/lib/doctors";

interface Props {
  value: DoctorFiltersValue;
  onChange: (next: DoctorFiltersValue) => void;
  trigger?: React.ReactNode;
}

export function DoctorFilters({ value, onChange, trigger }: Props) {
  const { data: cities = [] } = useQuery(citiesQuery());
  const { data: specs = [] } = useQuery(specialtiesQuery());

  function patch(p: Partial<DoctorFiltersValue>) {
    onChange({ ...value, ...p });
  }
  function reset() {
    onChange({ sort: value.sort });
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-2 rounded-2xl">
            <Filter className="h-4 w-4" /> Filtres
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Filtres avancés</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <Field label="Spécialité">
            <Select value={value.specialty ?? "all"} onValueChange={(v) => patch({ specialty: v === "all" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="Toutes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les spécialités</SelectItem>
                {specs.map((s) => (
                  <SelectItem key={s.id} value={s.slug}>{s.name_fr}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Ville">
            <Select value={value.cityId ?? "all"} onValueChange={(v) => patch({ cityId: v === "all" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="Toutes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les villes</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name_fr}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Tri">
            <Select value={value.sort ?? "relevance"} onValueChange={(v) => patch({ sort: v as SortBy })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Pertinence</SelectItem>
                <SelectItem value="rating">Meilleures notes</SelectItem>
                <SelectItem value="price_asc">Prix croissant</SelectItem>
                <SelectItem value="price_desc">Prix décroissant</SelectItem>
                <SelectItem value="experience">Expérience</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Langue parlée">
            <Select value={value.language ?? "any"} onValueChange={(v) => patch({ language: v === "any" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="Toutes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Toutes</SelectItem>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Genre">
            <div className="flex gap-2">
              {[
                { v: null, label: "Tous" },
                { v: "female" as const, label: "Femme" },
                { v: "male" as const, label: "Homme" },
              ].map((g) => (
                <Button
                  key={g.label}
                  type="button"
                  variant={value.gender === g.v ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => patch({ gender: g.v })}
                >{g.label}</Button>
              ))}
            </div>
          </Field>

          <Field label="Assurance">
            <Select value={value.insurance ?? "any"} onValueChange={(v) => patch({ insurance: v === "any" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="Toutes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Toutes</SelectItem>
                {INSURANCES.map((i) => (<SelectItem key={i} value={i}>{i}</SelectItem>))}
              </SelectContent>
            </Select>
          </Field>

          <Field label={`Note minimale: ${value.minRating ?? 0} ★`}>
            <Slider
              value={[value.minRating ?? 0]}
              min={0} max={5} step={0.5}
              onValueChange={([v]) => patch({ minRating: v })}
            />
          </Field>

          <Field label={`Prix max: ${value.maxPrice ?? "—"} MAD`}>
            <Slider
              value={[value.maxPrice ?? 1500]}
              min={50} max={2000} step={50}
              onValueChange={([v]) => patch({ maxPrice: v })}
            />
          </Field>

          <div className="space-y-3 rounded-2xl border border-border p-4">
            <Toggle label="Disponible maintenant" checked={!!value.openNow} onCheckedChange={(v) => patch({ openNow: v })} />
            <Toggle label="Téléconsultation" checked={!!value.online} onCheckedChange={(v) => patch({ online: v })} />
            <Toggle label="Visite à domicile" checked={!!value.homeVisit} onCheckedChange={(v) => patch({ homeVisit: v })} />
            <Toggle label="Vérifié uniquement" checked={!!value.verified} onCheckedChange={(v) => patch({ verified: v })} />
            <Toggle label="Premium uniquement" checked={!!value.premium} onCheckedChange={(v) => patch({ premium: v })} />
          </div>
        </div>

        <SheetFooter className="mt-6 flex flex-row gap-2">
          <Button variant="outline" onClick={reset} className="flex-1 gap-2">
            <RotateCcw className="h-4 w-4" /> Réinitialiser
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onCheckedChange }: { label: string; checked: boolean; onCheckedChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm">{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}