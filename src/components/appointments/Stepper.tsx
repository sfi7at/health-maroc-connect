import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2 overflow-x-auto pb-1">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-2 whitespace-nowrap">
            <motion.span
              initial={false}
              animate={{ scale: active ? 1.05 : 1 }}
              className={cn(
                "grid h-7 w-7 place-items-center rounded-full border text-xs font-semibold",
                done && "border-primary bg-primary text-primary-foreground",
                active && "border-primary bg-primary/10 text-primary",
                !done && !active && "border-border bg-card text-muted-foreground",
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </motion.span>
            <span className={cn("text-xs", active ? "font-semibold text-foreground" : "text-muted-foreground")}>{label}</span>
            {i < steps.length - 1 ? <span className="mx-1 hidden h-px w-6 bg-border sm:inline-block" /> : null}
          </li>
        );
      })}
    </ol>
  );
}