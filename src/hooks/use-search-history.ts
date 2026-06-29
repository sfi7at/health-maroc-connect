import { useCallback, useEffect, useState } from "react";

const KEY = "hl_search_history_v1";
const MAX = 12;

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => { setHistory(read()); }, []);

  const push = useCallback((raw: string) => {
    const q = raw.trim();
    if (q.length < 2) return;
    setHistory((prev) => {
      const next = [q, ...prev.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, MAX);
      try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  }, []);

  const remove = useCallback((q: string) => {
    setHistory((prev) => {
      const next = prev.filter((x) => x !== q);
      try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setHistory([]);
    try { window.localStorage.removeItem(KEY); } catch { /* noop */ }
  }, []);

  return { history, push, remove, clear };
}