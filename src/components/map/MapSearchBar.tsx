import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Clock, TrendingUp, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES } from "@/lib/categories";
import {
  getRecentSearches,
  POPULAR_SEARCHES,
  pushRecentSearch,
  CATEGORY_COLORS,
} from "@/lib/map-utils";
import { cn } from "@/lib/utils";
import type { ProviderCategory } from "@/lib/format";

interface Suggestion {
  id: string;
  name: string;
  category: ProviderCategory;
  cityName?: string | null;
  lat: number | null;
  lng: number | null;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  onPick: (s: Suggestion) => void;
  onSubmit?: (q: string) => void;
}

export function MapSearchBar({ value, onChange, onPick, onSubmit }: Props) {
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const debounced = useDebounced(value, 220);

  useEffect(() => setRecent(getRecentSearches()), [open]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: ["map_suggest", debounced],
    enabled: debounced.trim().length >= 2,
    staleTime: 30_000,
    queryFn: async () => {
      const q = debounced.trim();
      const { data, error } = await supabase
        .from("providers")
        .select("id,name,category,latitude,longitude,cities(name_fr)")
        .ilike("name", `%${q}%`)
        .eq("is_active", true)
        .limit(8);
      if (error) throw error;
      return (data ?? []).map(
        (r): Suggestion => ({
          id: r.id as string,
          name: r.name as string,
          category: r.category as ProviderCategory,
          cityName: (r.cities as { name_fr?: string } | null)?.name_fr ?? null,
          lat: r.latitude as number | null,
          lng: r.longitude as number | null,
        }),
      );
    },
  });

  const suggestions = useMemo(() => data ?? [], [data]);

  function submit(q: string) {
    pushRecentSearch(q);
    setRecent(getRecentSearches());
    onSubmit?.(q);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card/95 px-3 py-2.5 shadow-elevated backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit(value);
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Dentiste Rabat, Pharmacie de garde, O+…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          aria-label="Rechercher un prestataire de santé"
        />
        {isFetching ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Effacer la recherche"
            className="rounded-full p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 top-full z-[1100] mt-2 max-h-[60vh] overflow-y-auto rounded-2xl border border-border bg-popover p-2 shadow-elevated"
          >
            {suggestions.length > 0 ? (
              <Section title="Résultats">
                {suggestions.map((s) => {
                  const meta = CATEGORIES[s.category];
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        pushRecentSearch(s.name);
                        onPick(s);
                        setOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-muted"
                    >
                      <span
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white"
                        style={{ background: CATEGORY_COLORS[s.category] }}
                      >
                        <meta.icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{s.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {meta.label}
                          {s.cityName ? ` · ${s.cityName}` : ""}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </Section>
            ) : null}

            {value.trim().length < 2 && recent.length > 0 ? (
              <Section title="Recherches récentes" icon={<Clock className="h-3.5 w-3.5" />}>
                {recent.map((r) => (
                  <Pill key={r} onClick={() => { onChange(r); submit(r); }}>
                    {r}
                  </Pill>
                ))}
              </Section>
            ) : null}

            {value.trim().length < 2 ? (
              <Section title="Tendances" icon={<TrendingUp className="h-3.5 w-3.5" />}>
                {POPULAR_SEARCHES.map((r) => (
                  <Pill key={r} onClick={() => { onChange(r); submit(r); }}>
                    {r}
                  </Pill>
                ))}
              </Section>
            ) : null}

            {value.trim().length >= 2 && suggestions.length === 0 && !isFetching ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                Aucun prestataire ne correspond à « {value} ».
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="py-1">
      <div className="flex items-center gap-1.5 px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </div>
      <div className={cn("flex flex-col", title === "Recherches récentes" || title === "Tendances" ? "flex-row flex-wrap gap-1.5 px-2 pb-2" : "")}>
        {children}
      </div>
    </div>
  );
}

function Pill({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-border bg-card px-3 py-1 text-xs hover:bg-muted"
    >
      {children}
    </button>
  );
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}