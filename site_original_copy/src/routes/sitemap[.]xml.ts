import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        // Try to include public product slugs
        const { createClient } = await import("@supabase/supabase-js");
        const url = process.env.SUPABASE_URL!;
        const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const supa = createClient(url, key, { auth: { persistSession: false } });
        const { data } = await supa
          .from("products")
          .select("slug, updated_at")
          .eq("is_visible", true);

        const staticPaths = [
          { path: "/", priority: "1.0", freq: "weekly" },
          { path: "/shop", priority: "0.9", freq: "weekly" },
          { path: "/about", priority: "0.7", freq: "monthly" },
          { path: "/contact", priority: "0.7", freq: "monthly" },
        ];
        const productPaths = (data ?? []).map((p) => ({
          path: `/shop/${p.slug}`,
          priority: "0.8",
          freq: "weekly",
          lastmod: p.updated_at,
        }));

        type Entry = { path: string; priority: string; freq: string; lastmod?: string };
        const all: Entry[] = [...staticPaths, ...productPaths];
        const urls = all.map((e) => `  <url>
    <loc>${BASE_URL}${e.path}</loc>
    ${e.lastmod ? `<lastmod>${new Date(e.lastmod).toISOString()}</lastmod>` : ""}
    <changefreq>${e.freq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`).join("\n");


        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
