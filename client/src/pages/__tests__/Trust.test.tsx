// @vitest-environment jsdom
/*
 * Phase 1.13 — /trust renders in all 5 languages: 8 contract points, the
 * partner names + disclosure, and never a tracking URL.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Trust, { PUBLIC_PARTNERS } from "@/pages/Trust";
import { en } from "@/i18n/en";
import { fr } from "@/i18n/fr";
import { es } from "@/i18n/es";
import { ru } from "@/i18n/ru";
import { ka } from "@/i18n/ka";
import type { Translations } from "@/i18n/types";

// Navbar pulls auth/tRPC; the page under test is the trust copy, not the chrome.
vi.mock("@/components/Navbar", () => ({ default: () => <nav /> }));
vi.mock("@/components/Footer", () => ({ default: () => <footer /> }));
vi.mock("@/components/SEO", () => ({ default: () => null }));

afterEach(cleanup);

const DICTS: Record<string, Translations> = { en, fr, es, ru, ka };

function renderIn(lang: string) {
  localStorage.setItem("grantkit-lang", lang);
  return render(<LanguageProvider><Trust /></LanguageProvider>);
}

describe("/trust", () => {
  it("public partner list carries no trackingUrl field", () => {
    expect(PUBLIC_PARTNERS.length).toBeGreaterThanOrEqual(4);
    for (const p of PUBLIC_PARTNERS) expect(Object.keys(p).sort()).toEqual(["disclosure", "domain", "name", "slug"]);
  });

  for (const lang of Object.keys(DICTS)) {
    it(`renders the 8-point contract and partner disclosures in ${lang}`, () => {
      const dict = DICTS[lang].trust;
      expect(dict.points).toHaveLength(8);
      const { container } = renderIn(lang);
      const html = container.innerHTML;
      expect(container.querySelector("h1")?.textContent).toBe(dict.title);
      const h2 = Array.from(container.querySelectorAll("h2")).map((h) => h.textContent);
      expect(h2).toEqual([...dict.points.map((p) => p.title), dict.partnersTitle]);
      for (const p of PUBLIC_PARTNERS) {
        const card = container.querySelector(`[data-partner="${p.slug}"]`);
        expect(card?.textContent).toContain(p.name);
        expect(card?.textContent).toContain(p.disclosure[lang as keyof typeof p.disclosure]);
      }
      // No tracking link anywhere: no placeholder, no partner <a>, only mailto links.
      expect(html).not.toContain("TODO-after-registration");
      expect(html).not.toMatch(/trackingUrl|gk_ref|utm_/);
      for (const a of Array.from(container.querySelectorAll("a[href]"))) {
        expect(a.getAttribute("href")).toMatch(/^(mailto:|\/$)/);
      }
    });
  }
});
