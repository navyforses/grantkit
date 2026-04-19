import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const BASE_URL = "https://grantkit-production-06f7.up.railway.app";

async function generateSitemap() {
  // Static pages
  const staticUrls = [
    { loc: `${BASE_URL}/`, changefreq: "daily", priority: 1.0 },
    { loc: `${BASE_URL}/catalog`, changefreq: "daily", priority: 0.9 },
    { loc: `${BASE_URL}/contact`, changefreq: "monthly", priority: 0.4 },
    { loc: `${BASE_URL}/privacy`, changefreq: "monthly", priority: 0.3 },
    { loc: `${BASE_URL}/terms`, changefreq: "monthly", priority: 0.3 },
  ];

  // Grant pages — read from the bundled catalog data if DB is unavailable.
  let grantUrls: { loc: string; changefreq: string; priority: number }[] = [];
  try {
    const { getDb } = await import("../server/db.js");
    const { grants } = await import("../drizzle/schema.js");
    const { eq } = await import("drizzle-orm");

    const db = await getDb();
    const allGrants = await db
      .select({ itemId: grants.itemId })
      .from(grants)
      .where(eq(grants.isActive, 1));

    grantUrls = allGrants
      .filter((g) => g.itemId)
      .map((g) => ({
        loc: `${BASE_URL}/grant/${g.itemId}`,
        changefreq: "weekly",
        priority: 0.7,
      }));

    console.log(`Loaded ${grantUrls.length} grants from DB`);
  } catch (e) {
    // Fallback: use bundled catalog JSON so the build still works without DB.
    try {
      const catalogPath = path.join(ROOT, "client", "src", "data", "catalogData.ts");
      if (fs.existsSync(catalogPath)) {
        const raw = fs.readFileSync(catalogPath, "utf-8");
        const matches = [...raw.matchAll(/itemId:\s*["']([^"']+)["']/g)];
        grantUrls = matches.map((m) => ({
          loc: `${BASE_URL}/grant/${m[1]}`,
          changefreq: "weekly",
          priority: 0.7,
        }));
        console.log(`Loaded ${grantUrls.length} grants from bundled catalog`);
      }
    } catch {
      console.warn("Could not load catalog data; sitemap will have static pages only");
    }
  }

  const allUrls = [...staticUrls, ...grantUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  const outPath = path.join(ROOT, "client", "public", "sitemap.xml");
  fs.writeFileSync(outPath, xml, "utf-8");
  console.log(`✓ sitemap.xml written to ${outPath} (${allUrls.length} URLs)`);
}

generateSitemap().catch((e) => {
  console.error("Sitemap generation failed:", e);
  process.exit(0); // Non-fatal — don't break the build
});
