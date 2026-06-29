import { Link } from "@tanstack/react-router";
import { type LucideIcon, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface ServiceCardProps {
  to: string;
  icon: LucideIcon;
  title: string;
  description: string;
  accent?: "primary" | "secondary" | "blood" | "warning" | "info";
}

const accentMap = {
  primary: { bg: "bg-primary/10", text: "text-primary" },
  secondary: { bg: "bg-secondary/10", text: "text-secondary" },
  blood: { bg: "bg-blood/10", text: "text-blood" },
  warning: { bg: "bg-warning/15", text: "text-warning-foreground" },
  info: { bg: "bg-info/15", text: "text-info" },
} as const;

export function ServiceCard({ to, icon: Icon, title, description, accent = "primary" }: ServiceCardProps) {
  const a = accentMap[accent];
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      className="h-full"
    >
      <Link
        to={to}
        className="group flex h-full flex-col rounded-3xl border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-elevated"
      >
        <div className={cn("grid h-12 w-12 place-items-center rounded-2xl", a.bg, a.text)}>
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-base font-semibold tracking-tight">{title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
          Découvrir <ArrowUpRight className="h-4 w-4" />
        </div>
      </Link>
    </motion.div>
  );
}