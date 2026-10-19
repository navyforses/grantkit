// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { en } from "@/i18n/en";
const { listCalls } = vi.hoisted(() => ({ listCalls: [] as any[] }));
vi.mock("@/lib/trpc", () => ({ trpc: {
  organizations: new Proxy({}, { get: (_, key) => ({ useQuery: (input: any) => {
    if (key === "list") { listCalls.push(input); return { data: { organizations: [], total: 90 } }; }
    return { data: undefined };
  } }) }),
  grants: { savedList: { useQuery: () => ({ data: undefined }) } },
  catalog: { count: { useQuery: () => ({ data: { total: 90 } }) } },
} }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: false }) }));
vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({ t: en, language: "en" }) }));
vi.mock("wouter", () => ({ useSearch: () => "?page=2&mc=FR", useLocation: () => ["/organizations", () => {}] }));
vi.mock("@/hooks/useMobile", () => ({ useIsMobile: () => true }));
vi.mock("@/hooks/useSaveEntity", () => ({ useSaveEntity: () => ({ toggleSave: () => {} }) }));
vi.mock("@/hooks/useGoogleMapFlyTo", () => ({ useGoogleMapFlyTo: () => {} }));
vi.mock("@/components/Navbar", () => ({ default: () => null }));
vi.mock("@/components/SEO", () => ({ default: () => null }));
vi.mock("@/components/CatalogToolbar", () => ({ default: () => null, COST_OPTIONS: [], STATUS_OPTIONS: [] }));
vi.mock("@/components/map/MapStatsBar", () => ({ default: () => null }));
vi.mock("@/components/MapPanel", () => ({ default: () => null }));
vi.mock("@/components/map/MapFilterPanel", () => ({ default: () => null }));
vi.mock("@/components/MobileCatalogView", () => ({ default: () => null }));
import Catalog from "../Catalog";
afterEach(() => { cleanup(); listCalls.length = 0; });
it("lets an anonymous visitor request a full page beyond the first page", () => {
  render(<Catalog />);
  expect(listCalls[0]).toMatchObject({ page: 2, pageSize: 30, country: "FR" });
});
