import { type ReactNode } from "react";
import { motion } from "framer-motion";

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  icon?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions, icon }: PageHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="mb-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between"
    >
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <p className="t-eyebrow mb-2">{eyebrow}</p>
        )}
        <div className="flex min-w-0 items-center gap-3">
          {icon && (
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              {icon}
            </div>
          )}
          <h1 className="t-h1 min-w-0 text-balance sm:t-display sm:truncate">{title}</h1>
        </div>
        {description && (
          <p className="t-body-sm sm:t-body mt-2 max-w-2xl">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 [&>*]:flex-1 sm:[&>*]:flex-none">
          {actions}
        </div>
      )}
    </motion.header>
  );
}