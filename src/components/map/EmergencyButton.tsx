import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Phone, Siren, X } from "lucide-react";
import { EMERGENCY_NUMBERS } from "@/lib/map-utils";
import { cn } from "@/lib/utils";

export function EmergencyButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Numéros d'urgence"
        className={cn(
          "group fixed z-[1200] grid h-14 w-14 place-items-center rounded-full bg-rose-600 text-white shadow-elevated transition hover:scale-105 hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-300",
          className,
        )}
      >
        <Siren className="h-6 w-6" />
        <span className="absolute -inset-1 -z-10 animate-ping rounded-full bg-rose-500/40" aria-hidden />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1300] flex items-end justify-center bg-black/50 p-4 sm:items-center"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              className="w-full max-w-md overflow-hidden rounded-3xl bg-card shadow-elevated"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal
              aria-label="Numéros d'urgence Maroc"
            >
              <div className="flex items-center justify-between bg-rose-600 px-5 py-4 text-white">
                <div className="flex items-center gap-2">
                  <Siren className="h-5 w-5" />
                  <h2 className="text-base font-semibold">Numéros d'urgence — Maroc</h2>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Fermer"
                  className="rounded-full p-1 hover:bg-white/15"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ul className="divide-y divide-border">
                {EMERGENCY_NUMBERS.map((e) => (
                  <li key={e.key}>
                    <a
                      href={`tel:${e.number}`}
                      className="flex items-center gap-4 px-5 py-4 transition hover:bg-muted"
                    >
                      <span
                        className={cn(
                          "grid h-11 w-11 place-items-center rounded-2xl text-white shadow-soft",
                          e.color,
                        )}
                      >
                        <Phone className="h-5 w-5" />
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-medium">{e.label}</span>
                        <span className="block text-xs text-muted-foreground">Appel direct</span>
                      </span>
                      <span className="font-mono text-lg font-semibold tabular-nums">{e.number}</span>
                    </a>
                  </li>
                ))}
              </ul>
              <p className="border-t border-border bg-muted/40 px-5 py-3 text-[11px] text-muted-foreground">
                En cas de doute, composez le <strong>150</strong> (SAMU) ou le <strong>112</strong>.
              </p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}