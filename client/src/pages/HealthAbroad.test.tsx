// @vitest-environment jsdom
/**
 * /health-abroad — Concierge v0 (1.11) render test in ka / ru / en.
 * Asserts the page renders (≈ "200") with the disclaimer, Art. 9 consent,
 * 90-day retention, both prices and the catalog deep-links, in each language.
 */
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LanguageContext } from "@/contexts/LanguageContext";
import { en } from "@/i18n/en";
import { ka } from "@/i18n/ka";
import { ru } from "@/i18n/ru";
import type { Translations } from "@/i18n/types";
import HealthAbroad from "./HealthAbroad"; // vi.mock calls below are hoisted above this import

vi.mock("@/components/Navbar", () => ({ default: () => <nav data-testid="navbar" /> }));
vi.mock("@/components/Footer", () => ({ default: () => <footer /> }));
vi.mock("@/components/SEO", () => ({ default: () => null }));
vi.mock("@/lib/trpc", () => ({
  trpc: { concierge: { intake: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) } } },
}));

function render(language: "en" | "ka" | "ru", t: Translations): string {
  const ctx = {
    language, setLanguage: vi.fn(), t,
    tCategory: (c: string) => c, tCountry: (c: string) => c,
    tCatalogContent: (_: string, f: any) => f,
  };
  return renderToStaticMarkup(
    <LanguageContext.Provider value={ctx}>
      <HealthAbroad />
    </LanguageContext.Provider>,
  );
}

describe("/health-abroad renders in ka / ru / en", () => {
  for (const [lang, t] of [["ka", ka], ["ru", ru], ["en", en]] as const) {
    it(`${lang}: disclaimer, consent, retention, prices, links`, () => {
      const html = render(lang, t);
      expect(html).toContain(t.healthAbroad.heading);
      expect(html).toContain(t.healthAbroad.notMedicalAdvice);
      expect(html).toContain(t.healthAbroad.consentText);
      expect(html).toContain(t.healthAbroad.retention);
      expect(html).toContain("€290");
      expect(html).toContain("€590");
      // Country order per 08-online-validation §4.2: US, TR, DE, FR.
      const order = ["US", "TR", "DE", "FR"].map((c) => html.indexOf(`domain=health&amp;mc=${c}`));
      expect(order.every((i) => i >= 0)).toBe(true);
      expect([...order].sort((a, b) => a - b)).toEqual(order);
      expect(html).toContain("domain=housing&amp;mc=US");
      expect(html).toContain("&amp;diagnosis=cancer");
      // Official + fundraising as plain links; no Paddle / checkout.
      expect(html).toContain("service-public.fr");
      expect(html).toContain("travel.state.gov");
      expect(html).toContain("leetchi.com");
      expect(html).toContain("helloasso.com");
      expect(html).not.toMatch(/paddle/i);
    });
  }

  it("ka copy is Georgian, not English, and the language select defaults to the page language", () => {
    const html = render("ka", ka);
    expect(ka.healthAbroad.heading).not.toBe(en.healthAbroad.heading);
    expect(html).toContain('<option selected="" value="ka">');
  });
});
