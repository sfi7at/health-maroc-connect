import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Pill, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/common/PageHeader";
import { buildHead } from "@/lib/seo";
import {
  formatMedicationTitle,
  formatPrice,
  medicationsQuery,
  therapeuticClassesQuery,
  type Medication,
} from "@/lib/medications";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

export const Route = createFileRoute("/medicaments/")({
  head: () =>
    buildHead({
      title: "Médicaments au Maroc — Vytalma",
      description:
        "Recherchez un médicament au Maroc par nom commercial ou DCI. Classe thérapeutique, dosage, laboratoire et prix public.",
      path: "/medicaments",
    }),
  component: MedicationsPage,
});

function MedicationsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [therapeuticClass, setTherapeuticClass] = useState<string>("all");
  const search = useDebouncedValue(searchInput, 250);

  const classes = useQuery(therapeuticClassesQuery());
  const list = useQuery(
    medicationsQuery({
      search,
      therapeuticClass: therapeuticClass === "all" ? null : therapeuticClass,
      limit: 100,
    }),
  );

  const hasFilters = searchInput.length > 0 || therapeuticClass !== "all";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
      <PageHeader
        eyebrow="Base médicamenteuse"
        title="Médicaments"
        description="Recherchez un médicament par nom commercial, DCI ou classe thérapeutique."
        icon={<Pill className="h-5 w-5" />}
      />

      <Card className="mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Nom commercial ou DCI (ex. Doliprane, Paracétamol…)"
            className="pl-9 pr-9"
            aria-label="Recherche de médicaments"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
              aria-label="Effacer la recherche"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Select value={therapeuticClass} onValueChange={setTherapeuticClass}>
          <SelectTrigger className="sm:w-64" aria-label="Filtrer par classe thérapeutique">
            <SelectValue placeholder="Classe thérapeutique" />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            <SelectItem value="all">Toutes les classes</SelectItem>
            {(classes.data ?? []).map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchInput("");
              setTherapeuticClass("all");
            }}
          >
            Réinitialiser
          </Button>
        )}
      </Card>

      {list.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : list.data && list.data.length > 0 ? (
        <ul className="space-y-3">
          {list.data.map((m, i) => (
            <MedicationRow key={m.id} med={m} index={i} />
          ))}
        </ul>
      ) : (
        <Card className="p-8 text-center">
          <Pill className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="t-body-sm text-muted-foreground">
            Aucun médicament ne correspond à votre recherche.
          </p>
        </Card>
      )}
    </div>
  );
}

export function MedicationRow({ med, index = 0 }: { med: Medication; index?: number }) {
  const price = formatPrice(med.public_price);
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.15) }}
    >
      <Link
        to="/medicaments/$id"
        params={{ id: med.id }}
        className="block rounded-xl border bg-card p-4 transition hover:border-primary/50 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Pill className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="t-h4 truncate">{formatMedicationTitle(med)}</p>
            {med.dci && (
              <p className="t-body-sm mt-0.5 truncate text-muted-foreground">
                DCI : {med.dci}
                {med.laboratory ? ` • ${med.laboratory}` : ""}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {med.therapeutic_class && (
                <Badge variant="secondary" className="rounded-full">
                  {med.therapeutic_class}
                </Badge>
              )}
              {med.sub_class && (
                <Badge variant="outline" className="rounded-full">
                  {med.sub_class}
                </Badge>
              )}
            </div>
          </div>
          {price && (
            <div className="shrink-0 text-right">
              <p className="t-body-sm text-muted-foreground">Prix public</p>
              <p className="t-h4 text-primary">{price}</p>
            </div>
          )}
        </div>
      </Link>
    </motion.li>
  );
}