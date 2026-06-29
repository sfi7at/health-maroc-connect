import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2, Stethoscope, MapPin, X, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { specialtiesQuery } from "@/lib/doctors";

const RECENT_KEY = "hl_doctor_recent";

function getRecent(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); } catch { return []; }
}
function pushRecent(q: string) {
  if (!q.trim() || typeof window === "undefined") return;
  const cur = getRecent().filter((x) => x !== q);
  cur.unshift(q);
  localStorage.setItem(RECENT_KEY, JSON.stringify(cur.slice(0, 6)));
}

interface Props {
  initial?: string;
  className?: string;
  autoFocus?: boolean;
}

export function DoctorSearchBar({ initial = "", className, autoFocus }: Props) {
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: specs = [] } = useQuery(specialtiesQuery());
  const debounced = useDebounced(q, 200);

  const { data: suggestions, isFetching } = useQuery({
    queryKey: ["doctor_search_sugg", debounced],
    enabled: debounced.trim().length > 1,
    queryFn: async () => {
      const term = debounced.trim();
      const [doctorsRes, citiesRes] = await Promise.all([
        supabase
          .from("providers")
          .select("id, name, category, cities ( name_fr )")
          .in("category", ["doctor", "dentist"])
          .eq("is_active", true)
          .ilike("name", `%${term}%`)
          .limit(6),
        supabase.from("cities").select("id, name_fr").ilike("name_fr", `%${term}%`).limit(4),
      ]);
      return {
        doctors: doctorsRes.data ?? [],
        cities: citiesRes.data ?? [],
      };
    },
    staleTime: 30_000,
  });

  const filteredSpecs = useMemo(() => {
    if (!debounced.trim()) return [];
    return specs.filter((s) => s.name_fr.toLowerCase().includes(debounced.trim().toLowerCase())).slice(0, 4);
  }, [specs, debounced]);

  const recent = getRecent();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function submit(value?: string) {
    const v = (value ?? q).trim();
    if (!v) return;
    pushRecent(v);
    setOpen(false);
    navigate({ to: "/doctors/search", search: { q: v } });
  }

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <form
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        className="relative"
      >
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Médecin, spécialité, ville…"
          className="h-14 rounded-2xl border-border bg-card pl-11 pr-12 text-base shadow-soft"
          aria-label="Rechercher un médecin"
        />
        {q ? (
          <button
            type="button"
            aria-label="Effacer"
            onClick={() => { setQ(""); inputRef.current?.focus(); }}
            className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        ) : isFetching ? (
          <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </form>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-[420px] overflow-auto rounded-2xl border border-border bg-popover p-2 shadow-elevated">
          {!debounced.trim() ? (
            <>
              {recent.length ? (
                <Group title="Récents">
                  {recent.map((r) => (
                    <Row key={r} icon={<Clock className="h-4 w-4 text-muted-foreground" />} onClick={() => submit(r)}>
                      {r}
                    </Row>
                  ))}
                </Group>
              ) : null}
              <Group title="Recherches populaires">
                {["Cardiologue Casablanca", "Dentiste Rabat", "Gynécologue Marrakech", "Pédiatre Tanger"].map((p) => (
                  <Row key={p} icon={<Search className="h-4 w-4 text-muted-foreground" />} onClick={() => submit(p)}>
                    {p}
                  </Row>
                ))}
              </Group>
            </>
          ) : (
            <>
              {filteredSpecs.length ? (
                <Group title="Spécialités">
                  {filteredSpecs.map((s) => (
                    <Row
                      key={s.id}
                      icon={<Stethoscope className="h-4 w-4 text-primary" />}
                      onClick={() => { setOpen(false); navigate({ to: "/doctors/specialty/$slug", params: { slug: s.slug } }); }}
                    >
                      {s.name_fr}
                    </Row>
                  ))}
                </Group>
              ) : null}
              {suggestions.doctors?.length ? (
                <Group title="Médecins">
                  {suggestions.doctors.map((d) => (
                    <Row
                      key={d.id}
                      icon={<Stethoscope className="h-4 w-4 text-muted-foreground" />}
                      hint={(d.cities as { name_fr?: string } | null)?.name_fr ?? null}
                      onClick={() => { setOpen(false); navigate({ to: "/doctors/$id", params: { id: d.id } }); }}
                    >
                      Dr. {d.name}
                    </Row>
                  ))}
                </Group>
              ) : null}
              {suggestions.cities?.length ? (
                <Group title="Villes">
                  {suggestions.cities.map((c) => (
                    <Row
                      key={c.id}
                      icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
                      onClick={() => { setOpen(false); navigate({ to: "/doctors/search", search: { cityId: c.id } }); }}
                    >
                      {c.name_fr}
                    </Row>
                  ))}
                </Group>
              ) : null}
              {!filteredSpecs.length && !suggestions.doctors?.length && !suggestions.cities?.length && !isFetching ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">Aucun résultat</p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-1">
      <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function Row({
  icon, children, hint, onClick,
}: { icon: React.ReactNode; children: React.ReactNode; hint?: string | null; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-muted"
    >
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-muted">{icon}</span>
      <span className="flex-1 truncate">{children}</span>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </button>
  );
}

function useDebounced<T>(value: T, ms = 200): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}