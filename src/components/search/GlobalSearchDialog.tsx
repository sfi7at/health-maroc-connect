import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Clock,
  TrendingUp,
  Siren,
  CornerDownLeft,
  X,
  Sparkles,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { unifiedSuggestionsQuery } from "@/lib/search-queries";
import {
  categoryMeta,
  isEmergencyQuery,
  EMERGENCY_SHORTCUTS,
  DEFAULT_SHORTCUTS,
  POPULAR_SEARCHES,
  type SearchHit,
} from "@/lib/search-engine";
import { useSearchHistory } from "@/hooks/use-search-history";

export function GlobalSearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [debounced, setDebounced] = useState("");
  const { history, push, clear } = useSearchHistory();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), 180);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => { if (!open) setValue(""); }, [open]);

  const { data, isFetching } = useQuery(unifiedSuggestionsQuery(debounced));

  const emergency = useMemo(() => isEmergencyQuery(value), [value]);

  const go = (to: string, q?: string) => {
    if (q) push(q);
    onOpenChange(false);
    navigate({ to });
  };

  const submitFreeText = () => {
    const q = value.trim();
    if (q.length < 2) return;
    push(q);
    onOpenChange(false);
    navigate({ to: "/search", search: { q } });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        value={value}
        onValueChange={setValue}
        placeholder="Médecin, pharmacie, urgence, symptôme, ville…"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.defaultPrevented) {
            const has = (data?.hits?.length ?? 0) > 0;
            if (!has) {
              e.preventDefault();
              submitFreeText();
            }
          }
        }}
      />
      <CommandList>
        {emergency && value.length > 1 ? (
          <CommandGroup heading="🚨 Mode urgence">
            {EMERGENCY_SHORTCUTS.map((s) => (
              <CommandItem
                key={s.id}
                value={`emrg-${s.id}-${s.title}`}
                onSelect={() => go(s.to, value)}
                className="gap-3"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-red-500/10 text-red-600">
                  <Siren className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.subtitle}</p>
                </div>
                <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        {value.length < 2 ? (
          <>
            {history.length > 0 ? (
              <CommandGroup heading="Récentes">
                {history.slice(0, 6).map((h) => (
                  <CommandItem
                    key={`h-${h}`}
                    value={`history-${h}`}
                    onSelect={() => {
                      setValue(h);
                      navigate({ to: "/search", search: { q: h } });
                      onOpenChange(false);
                    }}
                    className="gap-3"
                  >
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{h}</span>
                  </CommandItem>
                ))}
                <CommandItem
                  value="history-clear"
                  onSelect={clear}
                  className="gap-3 text-xs text-muted-foreground"
                >
                  <X className="h-3.5 w-3.5" /> Effacer l'historique
                </CommandItem>
              </CommandGroup>
            ) : null}

            <CommandGroup heading="Recherches populaires">
              {POPULAR_SEARCHES.map((p) => {
                const Icon = p.icon;
                return (
                  <CommandItem
                    key={p.query}
                    value={`pop-${p.query}`}
                    onSelect={() => {
                      push(p.query);
                      navigate({ to: "/search", search: { q: p.query } });
                      onOpenChange(false);
                    }}
                    className="gap-3"
                  >
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{p.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>

            <CommandSeparator />
            <CommandGroup heading="Raccourcis">
              {DEFAULT_SHORTCUTS.map((s) => {
                const Icon = s.icon ?? Search;
                return (
                  <CommandItem
                    key={s.id}
                    value={`sc-${s.id}`}
                    onSelect={() => go(s.to)}
                    className="gap-3"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{s.title}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        ) : null}

        {value.length >= 2 ? (
          <>
            <CommandEmpty>
              {isFetching ? "Recherche…" : `Aucun résultat pour « ${value} »`}
            </CommandEmpty>

            <CommandItem
              value={`__free-${value}`}
              onSelect={submitFreeText}
              className="gap-3 border-b border-border/50 bg-primary/5"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="flex-1 truncate">
                Voir tous les résultats pour <span className="font-semibold">« {value} »</span>
              </span>
              <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />
            </CommandItem>

            {(data?.hits?.length ?? 0) > 0 ? (
              <CommandGroup heading="Suggestions">
                {data!.hits.map((h: SearchHit) => {
                  const meta = categoryMeta(h.kind);
                  const Icon = h.icon ?? meta.icon;
                  return (
                    <CommandItem
                      key={h.id}
                      value={`hit-${h.id}-${h.title}`}
                      onSelect={() => go(h.to, value)}
                      className="gap-3"
                    >
                      <span className={`grid h-9 w-9 place-items-center rounded-xl bg-muted ${meta.color}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium">{h.title}</p>
                          {h.verified ? (
                            <Badge variant="secondary" className="h-4 px-1 text-[10px]">Vérifié</Badge>
                          ) : null}
                        </div>
                        {h.subtitle ? (
                          <p className="truncate text-xs text-muted-foreground">{h.subtitle}</p>
                        ) : null}
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {meta.label}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ) : null}
          </>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}

/** Hook to wire ⌘K / Ctrl+K globally. */
export function useGlobalSearchHotkey(setOpen: (v: boolean) => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);
}