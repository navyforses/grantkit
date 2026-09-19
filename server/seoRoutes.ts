/**
 * SEO Routes — sitemap.xml, robots.txt and legacy-path redirects.
 *
 * Single sitemap (no per-language index): the site has no /:lang URLs yet
 * (Phase 4). Language is `?lang=xx` on the same page, so each <url> carries
 * xhtml:link hreflang alternates instead of 5 near-duplicate sitemaps.
 * /grant/:id and /catalog are 301s (Phase 1.8) and are not listed.
 */

import type { Express } from "express";
import { getAllOrgIds, getGrantOrgId } from "./db";
import { LANGS } from "./seoHead";

// Static pages with their change frequency and priority
const STATIC_PAGES = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/organizations", changefreq: "daily", priority: "0.9" },
  { path: "/contact", changefreq: "monthly", priority: "0.5" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/refund", changefreq: "yearly", priority: "0.3" },
] as const;

function getBaseUrl(req: { protocol: string; get: (name: string) => string | undefined }): string {
  const host = req.get("host") || process.env.RAILWAY_PUBLIC_DOMAIN || "localhost:3000";
  const protocol = req.get("x-forwarded-proto") || req.protocol || "https";
  return `${protocol}://${host}`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function alternates(baseUrl: string, path: string): string {
  let xml = "";
  for (const lang of LANGS) {
    xml += `    <xhtml:link rel="alternate" hreflang="${lang}" href="${escapeXml(`${baseUrl}${path}?lang=${lang}`)}"/>\n`;
  }
  xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(baseUrl + path)}"/>\n`;
  return xml;
}

export function registerSeoRoutes(app: Express) {
  // ===== Legacy paths (Phase 1.8) =====
  app.get("/catalog", (req, res) => {
    const qs = req.originalUrl.includes("?") ? req.originalUrl.slice(req.originalUrl.indexOf("?")) : "";
    res.redirect(301, "/organizations" + qs);
  });
  app.get("/grant/:id", async (req, res) => {
    try {
      const row = await getGrantOrgId(req.params.id);
      // DB unavailable → temporary redirect so crawlers keep the old URL.
      if (row === undefined) return res.redirect(302, "/organizations");
      return res.redirect(301, row?.orgId ? `/organizations/${row.orgId}` : "/organizations");
    } catch (error) {
      console.error("[Redirect] /grant/:id lookup failed:", error);
      return res.redirect(302, "/organizations");
    }
  });

  // ===== robots.txt =====
  app.get("/robots.txt", (req, res) => {
    const baseUrl = getBaseUrl(req);
    const content = [
      "User-agent: *",
      "Allow: /",
      "",
      "# Disallow private/admin pages",
      "Disallow: /admin",
      "Disallow: /dashboard",
      "Disallow: /profile",
      "Disallow: /api/",
      "",
      `Sitemap: ${baseUrl}/sitemap.xml`,
    ].join("\n");

    res.set("Content-Type", "text/plain; charset=utf-8");
    res.set("Cache-Control", "public, max-age=86400"); // 24h cache
    res.send(content);
  });

  // ===== sitemap.xml =====
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const baseUrl = getBaseUrl(req);
      const orgItems = await getAllOrgIds();
      const now = formatDate(new Date());

      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
      xml += '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

      // Static pages
      for (const page of STATIC_PAGES) {
        xml += "  <url>\n";
        xml += `    <loc>${escapeXml(baseUrl + page.path)}</loc>\n`;
        xml += `    <lastmod>${now}</lastmod>\n`;
        xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
        xml += `    <priority>${page.priority}</priority>\n`;
        xml += alternates(baseUrl, page.path);
        xml += "  </url>\n";
      }

      // Organization detail pages
      for (const org of orgItems) {
        const path = "/organizations/" + org.orgId;
        xml += "  <url>\n";
        xml += `    <loc>${escapeXml(baseUrl + path)}</loc>\n`;
        xml += `    <lastmod>${formatDate(org.updatedAt)}</lastmod>\n`;
        xml += `    <changefreq>monthly</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        xml += alternates(baseUrl, path);
        xml += "  </url>\n";
      }

      xml += "</urlset>";

      res.set("Content-Type", "application/xml; charset=utf-8");
      res.set("Cache-Control", "public, max-age=3600"); // 1h cache
      res.send(xml);
    } catch (error) {
      console.error("[Sitemap] Error generating sitemap:", error);
      res.status(500).set("Content-Type", "text/plain").send("Error generating sitemap");
    }
  });
}
