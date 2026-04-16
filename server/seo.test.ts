import { describe, expect, it, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

// Mock the db module before importing seoRoutes
vi.mock("./db", () => ({
  getAllGrantItemIds: vi.fn().mockResolvedValue([
    { itemId: "item_0001", updatedAt: new Date("2026-03-15") },
    { itemId: "item_0002", updatedAt: new Date("2026-03-20") },
    { itemId: "item_0003", updatedAt: new Date("2026-03-25") },
  ]),
}));

import { registerSeoRoutes } from "./seoRoutes";

function createTestApp() {
  const app = express();
  registerSeoRoutes(app);
  return app;
}

describe("SEO Routes", () => {
  describe("robots.txt", () => {
    it("returns valid robots.txt with correct content type", async () => {
      const app = createTestApp();
      const res = await request(app).get("/robots.txt");

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("text/plain");
      expect(res.text).toContain("User-agent: *");
      expect(res.text).toContain("Allow: /");
    });

    it("disallows private pages", async () => {
      const app = createTestApp();
      const res = await request(app).get("/robots.txt");

      expect(res.text).toContain("Disallow: /admin");
      expect(res.text).toContain("Disallow: /dashboard");
      expect(res.text).toContain("Disallow: /profile");
      expect(res.text).toContain("Disallow: /api/");
    });

    it("includes sitemap URL", async () => {
      const app = createTestApp();
      const res = await request(app).get("/robots.txt");

      expect(res.text).toContain("Sitemap:");
      expect(res.text).toContain("/sitemap.xml");
    });

    it("sets cache control header", async () => {
      const app = createTestApp();
      const res = await request(app).get("/robots.txt");

      expect(res.headers["cache-control"]).toContain("public");
      expect(res.headers["cache-control"]).toContain("max-age=86400");
    });
  });

  describe("sitemap.xml", () => {
    it("returns valid XML with correct content type", async () => {
      const app = createTestApp();
      const res = await request(app).get("/sitemap.xml");

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("application/xml");
      expect(res.text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(res.text).toContain("<urlset");
    });

    it("includes static pages", async () => {
      const app = createTestApp();
      const res = await request(app).get("/sitemap.xml");

      // Check for static page paths
      expect(res.text).toContain("/catalog");
      expect(res.text).toContain("/contact");
      expect(res.text).toContain("/privacy");
      expect(res.text).toContain("/terms");
      expect(res.text).toContain("/refund");
    });

    it("includes grant detail pages from database", async () => {
      const app = createTestApp();
      const res = await request(app).get("/sitemap.xml");

      expect(res.text).toContain("/grant/item_0001");
      expect(res.text).toContain("/grant/item_0002");
      expect(res.text).toContain("/grant/item_0003");
    });

    it("includes lastmod dates for grants", async () => {
      const app = createTestApp();
      const res = await request(app).get("/sitemap.xml");

      expect(res.text).toContain("2026-03-15");
      expect(res.text).toContain("2026-03-20");
      expect(res.text).toContain("2026-03-25");
    });

    it("includes changefreq and priority for all URLs", async () => {
      const app = createTestApp();
      const res = await request(app).get("/sitemap.xml");

      expect(res.text).toContain("<changefreq>");
      expect(res.text).toContain("<priority>");
    });

    it("homepage has highest priority", async () => {
      const app = createTestApp();
      const res = await request(app).get("/sitemap.xml");

      // The homepage should have priority 1.0
      const homeUrlMatch = res.text.match(/<url>\s*<loc>[^<]*\/<\/loc>\s*<lastmod>[^<]*<\/lastmod>\s*<changefreq>weekly<\/changefreq>\s*<priority>1\.0<\/priority>/);
      expect(homeUrlMatch).toBeTruthy();
    });

    it("does not include admin or dashboard pages", async () => {
      const app = createTestApp();
      const res = await request(app).get("/sitemap.xml");

      expect(res.text).not.toContain("/admin");
      expect(res.text).not.toContain("/dashboard");
      expect(res.text).not.toContain("/profile");
    });

    it("sets cache control header", async () => {
      const app = createTestApp();
      const res = await request(app).get("/sitemap.xml");

      expect(res.headers["cache-control"]).toContain("public");
      expect(res.headers["cache-control"]).toContain("max-age=3600");
    });
  });

  describe("sitemap-grants.xml", () => {
    it("returns valid XML with only grant URLs", async () => {
      const app = createTestApp();
      const res = await request(app).get("/sitemap-grants.xml");

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("application/xml");
      expect(res.text).toContain("/grant/item_0001");
      expect(res.text).toContain("/grant/item_0002");
      expect(res.text).toContain("/grant/item_0003");
    });

    it("does not include static pages in grants sitemap", async () => {
      const app = createTestApp();
      const res = await request(app).get("/sitemap-grants.xml");

      // Should not contain static pages (only grant URLs)
      expect(res.text).not.toContain("<loc>http://127.0.0.1/</loc>");
      expect(res.text).not.toContain("/catalog</loc>");
      expect(res.text).not.toContain("/contact</loc>");
    });
  });
});

describe("SEO - getAllGrantItemIds", () => {
  it("returns array of grant items with itemId and updatedAt", async () => {
    const { getAllGrantItemIds } = await import("./db");
    const items = await getAllGrantItemIds();

    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(3);
    expect(items[0]).toHaveProperty("itemId");
    expect(items[0]).toHaveProperty("updatedAt");
    expect(items[0]!.itemId).toBe("item_0001");
  });
});
