import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const start = Date.now();
        const checks: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {};

        try {
          const { createClient } = await import("@supabase/supabase-js");
          const sb = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false } },
          );
          const t0 = Date.now();
          const { error } = await sb.from("feature_flags").select("key").limit(1);
          checks.database = error
            ? { ok: false, error: error.message }
            : { ok: true, latencyMs: Date.now() - t0 };
        } catch (e) {
          checks.database = { ok: false, error: (e as Error).message };
        }

        const ok = Object.values(checks).every((c) => c.ok);
        const body = {
          status: ok ? "healthy" : "degraded",
          totalLatencyMs: Date.now() - start,
          checks,
          version: process.env.APP_VERSION ?? "1.0.0",
          timestamp: new Date().toISOString(),
        };

        return new Response(JSON.stringify(body), {
          status: ok ? 200 : 503,
          headers: {
            "content-type": "application/json",
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});