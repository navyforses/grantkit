import { describe, expect, it, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

// The default lookup imports ./db; keep it inert so the tests never touch MySQL.
vi.mock("./db", () => ({
  getOrganizationDetail: vi.fn().mockRejectedValue(new Error("no DATABASE_URL")),
}));

import {
  applyHeadTags,
  buildHeadTags,
  clearSeoHeadCache,
  orgJsonLd,
  renderIndexHtml,
  type OrgSeoData,
} from "./seoHead";

const TEMPLATE = `<!doctype html><html lang="en"><head>
    <title>GrantKit</title>
    <meta name="description" content="static" />
    <meta property="og:title" content="GrantKit" />
    <meta property="og:description" content="static" />
  </head><body><div id="root"></div></body></html>`;

const org: OrgSeoData = {
  orgId: "ORG-0061",
  name: "Médecins du Monde",
  description: "Free clinic for people without insurance.\nWalk-in welcome.",
  country: "FR",
  city: "Paris",
  hqAddress: "62 rue Marcadet",
  website: "https://example.org",
  phone: "+33 1 00 00 00 00",
  phoneSource: null,
  phoneVerifiedAt: null,
  languages: "fr,en,ka",
  organizationType: "NGO",
  translations: { ka: { name: "მედიკოსები მსოფლიოსთვის", description: "უფასო კლინიკა" } },
};

function req(path: string, query: Record<string, string> = {}, ua = "Googlebot") {
  return {
    path,
    query,
    protocol: "https",
    get: (h: string) => ({ host: "grantkit.test", "user-agent": ua })[h.toLowerCase()],
  } as any;
}

beforeEach(() => clearSeoHeadCache());

describe("seoHead — /organizations/:orgId", () => {
  it("title contains the org name; canonical + 5 hreflang + x-default from the request host", async () => {
    const lookup = vi.fn().mockResolvedValue(org);
    const html = await renderIndexHtml(TEMPLATE, req("/organizations/ORG-0061"), lookup);
    expect(html).toContain("<title>Médecins du Monde | GrantKit</title>");
    expect(html).toContain('<link rel="canonical" href="https://grantkit.test/organizations/ORG-0061" />');
    expect(html).toContain('<meta property="og:url" content="https://grantkit.test/organizations/ORG-0061" />');
    for (const l of ["en", "fr", "es", "ru", "ka"]) {
      expect(html).toContain(`hreflang="${l}" href="https://grantkit.test/organizations/ORG-0061?lang=${l}"`);
    }
    expect(html).toContain('hreflang="x-default" href="https://grantkit.test/organizations/ORG-0061"');
    expect(html).toContain('<meta name="description" content="Free clinic for people without insurance. Walk-in welcome." />');
    expect(html).toContain('"@type":"NGO"');
  });

  it("uses the translation and a self-canonical URL when ?lang= is valid", async () => {
    const tags = await buildHeadTags(req("/organizations/ORG-0061", { lang: "ka" }), async () => org);
    expect(tags?.title).toBe("მედიკოსები მსოფლიოსთვის | GrantKit");
    expect(tags?.canonical).toBe("https://grantkit.test/organizations/ORG-0061?lang=ka");
    const en = await buildHeadTags(req("/organizations/ORG-0061", { lang: "xx" }), async () => org);
    expect(en?.canonical).toBe("https://grantkit.test/organizations/ORG-0061");
  });

  it("JSON-LD has no telephone when the phone has no provenance, and has it when verified", () => {
    const unverified = orgJsonLd(org, null, "https://grantkit.test/organizations/ORG-0061");
    expect(unverified).not.toHaveProperty("telephone");
    expect(unverified.availableLanguage).toEqual(["fr", "en", "ka"]);
    expect(unverified.address).toMatchObject({ addressLocality: "Paris", addressCountry: "FR" });
    const verified = orgJsonLd({ ...org, phoneSource: "google_places" }, null, "u");
    expect(verified.telephone).toBe("+33 1 00 00 00 00");
    const gov = orgJsonLd({ ...org, organizationType: "government" }, null, "u");
    expect(gov["@type"]).toBe("GovernmentOrganization");
  });

  it("caches the lookup per orgId", async () => {
    const lookup = vi.fn().mockResolvedValue(org);
    await buildHeadTags(req("/organizations/ORG-0061"), lookup);
    await buildHeadTags(req("/organizations/ORG-0061", { lang: "fr" }), lookup);
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it("escapes HTML in org data", async () => {
    const html = await renderIndexHtml(TEMPLATE, req("/organizations/X"), async () => ({
      ...org, name: 'A "<b>" & Co', description: "x</script><script>alert(1)",
    }));
    expect(html).toContain("<title>A &quot;&lt;b&gt;&quot; &amp; Co | GrantKit</title>");
    expect(html).not.toContain("</script><script>alert");
  });
});

describe("seoHead — degrades gracefully", () => {
  it("returns the untouched HTML when the lookup throws (no DB)", async () => {
    const html = await renderIndexHtml(TEMPLATE, req("/organizations/ORG-0061"), async () => {
      throw new Error("ECONNREFUSED");
    });
    expect(html).toBe(TEMPLATE);
  });

  it("falls back to canonical + hreflang only when the org is unknown; leaves other routes alone", async () => {
    const html = await renderIndexHtml(TEMPLATE, req("/organizations/NOPE"), async () => null);
    expect(html).toContain("<title>GrantKit</title>");
    expect(html).toContain('rel="canonical"');
    expect(html).not.toContain("ld+json");
    expect(await renderIndexHtml(TEMPLATE, req("/dashboard"), async () => org)).toBe(TEMPLATE);
    expect(await renderIndexHtml(TEMPLATE, req("/"), async () => org)).toContain(
      'hreflang="x-default" href="https://grantkit.test/"'
    );
  });

  it("does not crash through Express with the default (DB-less) lookup", async () => {
    const app = express();
    app.use(async (r, res) => {
      res.type("html").send(await renderIndexHtml(TEMPLATE, r));
    });
    const res = await request(app).get("/organizations/ORG-0061").set("User-Agent", "Googlebot");
    expect(res.status).toBe(200);
    expect(res.text).toContain("<title>GrantKit</title>");
    expect(res.text).toContain('<div id="root">');
  });

  it("applyHeadTags is a pure string rewrite", () => {
    const out = applyHeadTags(TEMPLATE, { title: "T", description: "D", canonical: "c", hreflang: "H" });
    expect(out).toContain("<title>T</title>");
    expect(out).toContain('og:title" content="T"');
    expect(out).toContain('og:description" content="D"');
    expect(out).toContain("H\n  </head>");
  });
});

describe("seoHead — /health-abroad (1.11) is a landing route with noindex", () => {
  it("gets canonical + hreflang and a robots noindex meta", async () => {
    const tags = await buildHeadTags(req("/health-abroad", { lang: "ka" }), async () => null);
    expect(tags?.canonical).toBe("https://grantkit.test/health-abroad?lang=ka");
    expect(tags?.noindex).toBe(true);
    const out = applyHeadTags(TEMPLATE, tags!);
    expect(out).toContain('<meta name="robots" content="noindex, nofollow" />');
  });

  it("other landing routes stay indexable", async () => {
    const tags = await buildHeadTags(req("/organizations"), async () => null);
    expect(tags?.noindex).toBeUndefined();
    expect(applyHeadTags(TEMPLATE, tags!)).not.toContain("noindex");
  });
});
