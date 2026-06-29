import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Clock, FlaskConical, MapPin, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { labSuggestionsQuery } from "@/lib/laboratories";

const STORAGE_KEY = "healthlink:lab_recent_searches";
const POPULAR = [
  "Analyse de sang",
  "Test PCR",
  "Prélèvement à domicile",
  "Hormones thyroïde",
  "Test grossesse",
  "Casablanca Maarif",
  "Rabat Agdal",
  "Marrakech Gueliz",
];

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]).slice(0, 6) : [];
  } catch {
    return [];
  }
}
function pushRecent(q: string) {
  if (typeof window === "undefined" || !q.trim()) return;
  const list = loadRecent().filter((x) => x.toLowerCase() !== q.toLowerCase());
  list.unshift(q);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 6)));
}

interface LaboratorySearchBarProps {
  initial?: string;
  onSubmit?: (q: string) => void;
  autoNavigate?: boolean;
  placeholder?: string;
}

export function LaboratorySearchBar({
  initial = "",
  onSubmit,
  autoNavigate = true,
  placeholder,
}: LaboratorySearchBarProps) {
  const navigate = useNavigate();
  const [q, setQ] = useState(initial);
  const [focused, setFocused] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const { data: suggestions = [] } = useQuery(labSuggestionsQuery(q));

  useEffect(() => setRecent(loadRecent()), []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setFocused(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function submit(value: string) {
    const v = value.trim();
    if (v) pushRecent(v);
    setFocused(false);
    setQ(v);
    onSubmit?.(v);
    if (autoNavigate) navigate({ to: "/laboratories/search", search: { q: v || undefined } });
  }

  const showPanel = focused;
  const showSuggestions = useMemo(
    () => q.trim().length > 1 && suggestions.length > 0,
    [q, suggestions],
  );

  return (
    <div ref={wrapRef} className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(q);
        }}
        className="relative"
      >
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={placeholder ?? "Rechercher un laboratoire, ville, analyse…"}
          className="h-14 rounded-2xl pl-11 pr-12 text-base shadow-soft"
          aria-label="Rechercher un laboratoire"
        />
        {q ? (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="Effacer"
            className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </form>

      {showPanel ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-border bg-popover shadow-elevated">
          {showSuggestions ? (
            <ul className="max-h-72 overflow-y-auto py-1">
              {suggestions.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      pushRecent(s.name);
                      setFocused(false);
                      navigate({ to: "/providers/$id", params: { id: s.id } });
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted"
                  >
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
                      <FlaskConical className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{s.name}</p>
                      {s.address || s.cities?.name_fr ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {s.address ?? s.cities?.name_fr}
                        </p>
                      ) : null}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-4 p-4">
              {recent.length > 0 ? (
                <Section title="Recherches récentes" icon={Clock}>
                  <Chips items={recent} onPick={submit} />
                </Section>
              ) : null}
              <Section title="Recherches populaires" icon={MapPin}>
                <Chips items={POPULAR} onPick={submit} />
              </Section>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Clock;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {title}
      </p>
      {children}
    </div>
  );
}

function Chips({ items, onPick }: { items: string[]; onPick: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <button
          key={it}
          type="button"
          onClick={() => onPick(it)}
          className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          {it}
        </button>
      ))}
    </div>
  );
}