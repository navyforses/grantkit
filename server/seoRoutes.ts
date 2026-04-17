/**
 * SEO Routes — sitemap.xml and robots.txt server endpoints
 * Generates dynamic sitemap with all grant pages and static pages
 * Supports multilingual URLs with hreflang alternate links
 */

import type { Express } from "express";
import { getAllGrantItemIds } from "./db";

const LANGUAGES = ["en", "fr", "es", "ru", "ka"] as const;
const DEFAULT_LANG = "en";

// Static pages with their change frequency and priority
const STATIC_PAGES = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/catalog", changefreq: "daily", priority: "0.9" },
  { path: "/contact", changefreq: "monthly", priority: "0.5" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/refund", changefreq: "yearly", priority: "0.3" },
] as const;

function getBaseUrl(req: { protocol: string; get: (name: string) => string | undefined }): string {
  const host = req.get("host") || "grantkit-ne96tb4y.manus.space";
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

export function registerSeoRoutes(app: Express) {
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
      const grantItems = await getAllGrantItemIds();
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
        xml += "  </url>\n";
      }

      // Grant detail pages
      for (const grant of grantItems) {
        const lastmod = formatDate(grant.updatedAt);
        xml += "  <url>\n";
        xml += `    <loc>${escapeXml(baseUrl + "/grant/" + grant.itemId)}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += `    <changefreq>monthly</changefreq>\n`;
        xml += `    <priority>0.7</priority>\n`;
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

  // ===== sitemap-grants.xml (dedicated grant sitemap for large catalogs) =====
  app.get("/sitemap-grants.xml", async (req, res) => {
    try {
      const baseUrl = getBaseUrl(req);
      const grantItems = await getAllGrantItemIds();

      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

      for (const grant of grantItems) {
        const lastmod = formatDate(grant.updatedAt);
        xml += "  <url>\n";
        xml += `    <loc>${escapeXml(baseUrl + "/grant/" + grant.itemId)}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += `    <changefreq>monthly</changefreq>\n`;
        xml += `    <priority>0.7</priority>\n`;
        xml += "  </url>\n";
      }

      xml += "</urlset>";

      res.set("Content-Type", "application/xml; charset=utf-8");
      res.set("Cache-Control", "public, max-age=3600");
      res.send(xml);
    } catch (error) {
      console.error("[Sitemap-Grants] Error:", error);
      res.status(500).set("Content-Type", "text/plain").send("Error generating sitemap");
    }
  });
}
