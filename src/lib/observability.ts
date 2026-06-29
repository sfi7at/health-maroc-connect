/**
 * Production observability layer for HealthLink Maroc.
 * - Client-side error capture (deduped via fingerprint)
 * - API latency tracking
 * - Web Vitals reporting
 * - Feature flag evaluation
 */
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

function fingerprint(message: string, stack?: string): string {
  const top = (stack ?? "").split("\n").slice(0, 3).join("|");
  const raw = `${message}::${top}`;
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = ((h << 5) - h + raw.charCodeAt(i)) | 0;
  return `e_${(h >>> 0).toString(36)}`;
}

export async function reportError(
  error: unknown,
  ctx: { source?: "client" | "server" | "edge" | "worker"; severity?: "warning" | "error" | "fatal"; context?: Record<string, unknown> } = {},
) {
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    const fp = fingerprint(err.message, err.stack);
    const { data: existing } = await supabase
      .from("error_reports")
      .select("id,occurrences")
      .eq("fingerprint", fp)
      .maybeSingle();
    const payload = {
      fingerprint: fp,
      message: err.message.slice(0, 500),
      stack: err.stack?.slice(0, 4000) ?? null,
      severity: ctx.severity ?? "error",
      source: ctx.source ?? "client",
      url: typeof window !== "undefined" ? window.location.href : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      context: (ctx.context ?? {}) as Json,
      last_seen: new Date().toISOString(),
    };
    if (existing) {
      await supabase
        .from("error_reports")
        .update({ ...payload, occurrences: (existing.occurrences ?? 1) + 1 })
        .eq("id", existing.id);
    } else {
      await supabase.from("error_reports").insert(payload);
    }
  } catch {
    /* swallow: telemetry must never break the app */
  }
}

export async function recordApiMetric(input: {
  route: string;
  method?: string;
  status: number;
  durationMs: number;
}) {
  try {
    await supabase.from("api_metrics").insert({
      route: input.route,
      method: input.method ?? "GET",
      status_code: input.status,
      duration_ms: Math.round(input.durationMs),
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch {
    /* ignore */
  }
}

/** Wrap a fetch-like async call and record its latency. */
export async function tracked<T>(route: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    const out = await fn();
    void recordApiMetric({ route, status: 200, durationMs: performance.now() - start });
    return out;
  } catch (err) {
    void recordApiMetric({ route, status: 500, durationMs: performance.now() - start });
    void reportError(err, { context: { route } });
    throw err;
  }
}

/** Hash userId+flagKey to a deterministic 0..99 bucket for rollout %. */
function bucket(userId: string | null | undefined, key: string): number {
  const s = `${userId ?? "anon"}:${key}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 100;
}

let flagCache: { at: number; map: Map<string, { enabled: boolean; rollout: number }> } | null = null;

export async function isFeatureEnabled(key: string, userId?: string | null): Promise<boolean> {
  const now = Date.now();
  if (!flagCache || now - flagCache.at > 60_000) {
    const { data } = await supabase.from("feature_flags").select("key, enabled, rollout_percent");
    const map = new Map<string, { enabled: boolean; rollout: number }>();
    (data ?? []).forEach((f) => map.set(f.key, { enabled: f.enabled, rollout: f.rollout_percent }));
    flagCache = { at: now, map };
  }
  const flag = flagCache.map.get(key);
  if (!flag || !flag.enabled) return false;
  if (flag.rollout >= 100) return true;
  if (flag.rollout <= 0) return false;
  return bucket(userId, key) < flag.rollout;
}

/** Register global error + unhandled rejection + web vitals listeners. */
export function installObservability() {
  if (typeof window === "undefined") return;
  if ((window as unknown as { __healthlinkObs?: boolean }).__healthlinkObs) return;
  (window as unknown as { __healthlinkObs?: boolean }).__healthlinkObs = true;

  window.addEventListener("error", (e) => {
    void reportError(e.error ?? new Error(e.message), { context: { type: "window.error" } });
  });
  window.addEventListener("unhandledrejection", (e) => {
    void reportError(e.reason ?? new Error("unhandledrejection"), { context: { type: "promise" } });
  });

  // Web Vitals via native PerformanceObserver
  try {
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const name = entry.entryType === "navigation" ? "navigation" : entry.name;
        void recordApiMetric({
          route: `vitals:${name}`,
          status: 200,
          durationMs: entry.duration || (entry as PerformanceEntry & { startTime: number }).startTime,
        });
      }
    });
    po.observe({ type: "largest-contentful-paint", buffered: true });
    po.observe({ type: "first-input", buffered: true });
  } catch {
    /* PerformanceObserver unsupported */
  }
}