import { describe, expect, it, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

// Mock the db module before importing seoRoutes
const getGrantOrgId = vi.fn();
vi.mock("./db", () => ({
  getGrantOrgId: (id: string) => getGrantOrgId(id),
  getAllOrgIds: vi.fn().mockResolvedValue([
    { orgId: "org_001", updatedAt: new Date("2026-04-01") },
    { orgId: "org_002", updatedAt: new Date("2026-04-10") },
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
      expect(res.text).toContain("/organizations</loc>");
      expect(res.text).toContain("/contact");
      expect(res.text).toContain("/privacy");
      expect(res.text).toContain("/terms");
      expect(res.text).toContain("/refund");
    });

    it("lists organization pages with lastmod and hreflang alternates, not legacy paths", async () => {
      const app = createTestApp();
      const res = await request(app).get("/sitemap.xml");

      expect(res.text).toContain("/organizations/org_001</loc>");
      expect(res.text).toContain("2026-04-01");
      expect(res.text).toMatch(/hreflang="ka" href="http:\/\/127\.0\.0\.1:\d+\/organizations\/org_001\?lang=ka"/);
      expect(res.text).toMatch(/hreflang="x-default" href="http:\/\/127\.0\.0\.1:\d+\/organizations\/org_001"/);
      expect(res.text).not.toContain("/grant/");
      expect(res.text).not.toContain("/catalog");
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

  describe("legacy redirects (Phase 1.8)", () => {
    beforeEach(() => getGrantOrgId.mockReset());

    it("301s /catalog to /organizations, keeping the query string", async () => {
      const res = await request(createTestApp()).get("/catalog?country=FR");
      expect(res.status).toBe(301);
      expect(res.headers.location).toBe("/organizations?country=FR");
    });

    it("301s /grant/:id to the linked organization", async () => {
      getGrantOrgId.mockResolvedValue({ orgId: "ORG-0061" });
      const res = await request(createTestApp()).get("/grant/item_0001");
      expect(res.status).toBe(301);
      expect(res.headers.location).toBe("/organizations/ORG-0061");
    });

    it("301s /grant/:id without an orgId (or unknown) to /organizations", async () => {
      getGrantOrgId.mockResolvedValueOnce({ orgId: null }).mockResolvedValueOnce(null);
      for (const id of ["item_0002", "nope"]) {
        const res = await request(createTestApp()).get(`/grant/${id}`);
        expect(res.status).toBe(301);
        expect(res.headers.location).toBe("/organizations");
      }
    });

    it("302s /grant/:id when the DB is unavailable or the lookup throws", async () => {
      getGrantOrgId.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("boom"));
      for (let i = 0; i < 2; i++) {
        const res = await request(createTestApp()).get("/grant/item_0001");
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe("/organizations");
      }
    });
  });
});
