/**
 * CatalogToolbar — Phase 1 (1.4) render test. No jsdom in this repo, so we
 * server-render with react-dom/server and assert on the HTML: the new
 * domain × language × cost × status dropdowns exist, and the diagnosis / B-2
 * sub-filter shows only when domain=health.
 */
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LanguageContext } from "@/contexts/LanguageContext";
import { en } from "@/i18n/en";
import { ka } from "@/i18n/ka";
import type { Translations } from "@/i18n/types";
import CatalogToolbar, { type CatalogToolbarProps } from "./CatalogToolbar";

function render(overrides: Partial<CatalogToolbarProps> = {}, t: Translations = en): string {
  const noop = vi.fn();
  const props: CatalogToolbarProps = {
    smartQuery: "", onSmartQueryChange: noop,
    regionFilter: null, onRegionChange: noop,
    countryFilter: null, onCountryChange: noop,
    stateFilter: null, onStateChange: noop,
    cityFilter: null, onCityChange: noop,
    domainFilter: null, onDomainChange: noop,
    languageFilter: null, onLanguageChange: noop,
    costFilter: null, onCostChange: noop,
    statusFilter: null, onStatusChange: noop,
    b2VisaFilter: "all", onB2VisaChange: noop,
    diagnosisFilter: "all", onDiagnosisChange: noop,
    viewMode: "list", onViewChange: noop,
    availableRegions: [], availableCountries: [], availableStates: [], availableCities: [],
    ...overrides,
  };
  const ctx = {
    language: "en" as const, setLanguage: noop, t,
    tCategory: (c: string) => c, tCountry: (c: string) => c,
    tCatalogContent: (_: string, f: any) => f,
  };
  return renderToStaticMarkup(
    <LanguageContext.Provider value={ctx}>
      <CatalogToolbar {...props} />
    </LanguageContext.Provider>,
  );
}

describe("CatalogToolbar — domain × language × cost × status filters", () => {
  it("renders the four new dropdown triggers", () => {
    const html = render();
    for (const label of [en.toolbar.domain.label, en.toolbar.language.label, en.toolbar.cost.label, en.toolbar.status.label]) {
      expect(html).toContain(`aria-label="${label}"`);
    }
    expect(html).toContain(en.toolbar.domain.all);
  });

  it("shows the selected domain label from i18n (Georgian everyday words)", () => {
    const html = render({ domainFilter: "housing" }, ka);
    expect(html).toContain("საცხოვრებელი");
    expect(html).toContain(`aria-label="${ka.toolbar.domain.label}"`);
  });

  it("hides diagnosis / B-2 unless domain=health", () => {
    expect(render()).not.toContain('data-testid="health-subfilter"');
    expect(render({ domainFilter: "housing" })).not.toContain('data-testid="health-subfilter"');
    const health = render({ domainFilter: "health", b2VisaFilter: "yes", diagnosisFilter: "cancer" });
    expect(health).toContain('data-testid="health-subfilter"');
    expect(health).toContain(en.toolbar.health.b2Yes);
    expect(health).toContain('value="cancer"');
  });

  it("reflects selected language / cost / status values", () => {
    const html = render({ languageFilter: "ka", costFilter: "free", statusFilter: "yes" });
    expect(html).toContain("ქართული");
    expect(html).toContain(en.toolbar.cost.free);
    expect(html).toContain(en.toolbar.status.yes);
  });
});
