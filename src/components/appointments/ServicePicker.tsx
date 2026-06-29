import { motion } from "framer-motion";
import { Clock, Tag, Info } from "lucide-react";
import type { ProviderService } from "@/lib/appointments";
import { cn } from "@/lib/utils";

export function ServicePicker({
  services,
  value,
  onChange,
}: {
  services: ProviderService[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  if (services.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        Ce prestataire n'a pas encore défini de services. Continuez pour réserver une consultation standard.
      </div>
    );
  }
  return (
    <ul className="grid gap-2">
      {services.map((s) => {
        const active = value === s.id;
        return (
          <motion.li key={s.id} whileHover={{ y: -1 }}>
            <button
              type="button"
              onClick={() => onChange(s.id)}
              aria-pressed={active}
              className={cn(
                "group w-full rounded-2xl border p-4 text-left transition",
                active ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-border bg-card hover:border-primary/30",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{s.name}</p>
                  {s.description ? (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {s.duration_minutes} min</span>
                    {s.price_mad != null ? (
                      <span className="inline-flex items-center gap-1"><Tag className="h-3 w-3" /> {s.price_mad} MAD</span>
                    ) : null}
                    {s.is_online_eligible ? <span className="rounded-full bg-info/15 px-2 py-0.5 text-info">Téléconsultation</span> : null}
                  </div>
                  {s.preparation ? (
                    <p className="mt-2 flex items-start gap-1.5 text-xs text-warning-foreground">
                      <Info className="mt-0.5 h-3 w-3 shrink-0" /> {s.preparation}
                    </p>
                  ) : null}
                </div>
              </div>
            </button>
          </motion.li>
        );
      })}
    </ul>
  );
}