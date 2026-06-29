import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import type { Slot } from "@/lib/appointments";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SlotGrid({
  slots,
  selected,
  onSelect,
  emptyHint,
}: {
  slots: Slot[];
  selected: string | null;
  onSelect: (iso: string) => void;
  emptyHint?: string;
}) {
  if (slots.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        {emptyHint ?? "Aucun horaire disponible pour cette date."}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
      {slots.map((s) => {
        const isSel = selected === s.iso;
        return (
          <motion.div key={s.iso} whileHover={s.available ? { y: -1 } : undefined}>
            <Button
              type="button"
              variant={isSel ? "default" : "outline"}
              size="sm"
              disabled={!s.available}
              onClick={() => onSelect(s.iso)}
              aria-label={`Créneau ${s.time}${s.available ? "" : " indisponible"}`}
              className={cn(
                "w-full gap-1 font-medium",
                !s.available && "opacity-50 line-through",
                isSel && "ring-2 ring-primary/40",
              )}
            >
              <Clock className="h-3 w-3" /> {s.time}
            </Button>
          </motion.div>
        );
      })}
    </div>
  );
}