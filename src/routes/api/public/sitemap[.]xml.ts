import { createFileRoute } from "@tanstack/react-router";

const BASE = "https://health-maroc-connect.lovable.app";
const STATIC_ROUTES: { path: string; priority: number; changefreq: string }[] = [
  { path: "/", priority: 1.0, changefreq: "daily" },
  { path: "/doctors", priority: 0.9, changefreq: "daily" },
  { path: "/pharmacies", priority: 0.9, changefreq: "daily" },
  { path: "/pharmacies/on-duty", priority: 0.9, changefreq: "hourly" },
  { path: "/hospitals", priority: 0.9, changefreq: "weekly" },
  { path: "/laboratories", priority: 0.8, changefreq: "weekly" },
  { path: "/blood", priority: 0.9, changefreq: "hourly" },
  { path: "/ai-assistant", priority: 0.7, changefreq: "weekly" },
  { path: "/search", priority: 0.8, changefreq: "daily" },
  { path: "/content", priority: 0.8, changefreq: "daily" },
  { path: "/faq", priority: 0.6, changefreq: "monthly" },
  { path: "/auth", priority: 0.5, changefreq: "yearly" },
];

export const Route = createFileRoute("/api/public/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls: { loc: string; lastmod: string; priority: number; changefreq: string }[] = [];
        const now = new Date().toISOString();
        STATIC_ROUTES.forEach((r) =>
          urls.push({ loc: `${BASE}${r.path}`, lastmod: now, priority: r.priority, changefreq: r.changefreq }),
        );

        try {
          const { createClient } = await import("@supabase/supabase-js");
          const sb = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false } },
          );
          const { data: providers } = await sb
            .from("providers")
            .select("id, updated_at")
            .eq("verification_status", "verified")
            .order("updated_at", { ascending: false })
            .limit(1000);
          providers?.forEach((p) => {
            urls.push({
              loc: `${BASE}/providers/${p.id}`,
              lastmod: p.updated_at ?? now,
              priority: 0.6,
              changefreq: "weekly",
            });
          });
        } catch {
          /* fall back to static-only sitemap */
        }

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`,
  )
  .join("\n")}
</urlset>`;

        return new Response(xml, {
          status: 200,
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});