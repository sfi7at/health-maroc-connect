import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Stethoscope } from "lucide-react";
import { SPECIALTY_ICONS, gradientForSlug } from "@/lib/doctors";

interface Props {
  slug: string;
  name: string;
  icon?: string | null;
  count?: number | null;
}

export function SpecialtyCard({ slug, name, icon, count }: Props) {
  const Icon = (icon && SPECIALTY_ICONS[icon]) || Stethoscope;
  const gradient = gradientForSlug(slug);
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ type: "spring", stiffness: 280, damping: 22 }}>
      <Link
        to="/doctors/specialty/$slug"
        params={{ slug }}
        className="group block overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-elevated"
      >
        <div className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-soft`}>
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-sm font-semibold leading-tight">{name}</h3>
        {count != null ? (
          <p className="mt-1 text-xs text-muted-foreground">{count} praticien{count > 1 ? "s" : ""}</p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">Voir les médecins</p>
        )}
      </Link>
    </motion.div>
  );
}