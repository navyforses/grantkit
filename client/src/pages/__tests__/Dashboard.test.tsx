// @vitest-environment jsdom
/*
 * Dashboard (Phase 1.3) — organizations for the user's country × domains,
 * page works with no needs, and no fake "643" fallback for counts.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { en } from "@/i18n/en";

const listCalls: unknown[] = [];
const state: { profile: any; count: any; orgs: any[] } = { profile: null, count: undefined, orgs: [] };

vi.mock("@/lib/trpc", () => ({
  trpc: {
    subscription: { status: { useQuery: () => ({ data: { isActive: false } }) } },
    organizations: {
      count: { useQuery: () => ({ data: state.count }) },
      list: {
        useQuery: (input: unknown) => {
          listCalls.push(input);
          return { data: { organizations: state.orgs, total: state.orgs.length }, isLoading: false };
        },
      },
    },
    onboarding: { getProfile: { useQuery: () => ({ data: state.profile }) } },
  },
}));
vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: true, loading: false, user: { id: 1, name: "Ana Test" } }),
}));
vi.mock("@/components/Navbar", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));
vi.mock("@/components/SEO", () => ({ default: () => null }));

import Dashboard from "../Dashboard";

beforeAll(() => {
  class IO { observe() {} unobserve() {} disconnect() {} }
  (globalThis as any).IntersectionObserver = IO;
});
afterEach(() => {
  cleanup();
  listCalls.length = 0;
});

function wrap() {
  localStorage.setItem("grantkit-lang", "en");
  return render(<LanguageProvider><Dashboard /></LanguageProvider>);
}

const FR_ORG = { orgId: "ORG-FR-001", name: "France terre d'asile", city: "Paris", description: "Hébergement et accompagnement." };

describe("Dashboard — organizations for the user's needs", () => {
  it("queries organizations.list per top domain (legacy Need values mapped) and shows ≥1 org", () => {
    state.profile = { targetCountry: "FR", needs: ["HOUSING", "legal_status"], profileCompletedAt: "2026-09-19T00:00:00Z" };
    state.count = { total: 1234 };
    state.orgs = [FR_ORG];
    wrap();

    expect(listCalls).toEqual(expect.arrayContaining([
      expect.objectContaining({ country: "FR", domain: "housing" }),
      expect.objectContaining({ country: "FR", domain: "legal_status" }),
    ]));
    expect(screen.getAllByText(FR_ORG.name).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("domain-section-housing")).toBeTruthy();
    expect(screen.getAllByText("1,234").length).toBeGreaterThanOrEqual(1);
  });

  it("works with no needs: one country-wide section, no domain filter", () => {
    state.profile = { targetCountry: "FR", needs: [], profileCompletedAt: "2026-09-19T00:00:00Z" };
    state.count = { total: 10 };
    state.orgs = [FR_ORG];
    wrap();

    expect(listCalls).toHaveLength(1);
    expect(listCalls[0]).toEqual(expect.objectContaining({ country: "FR", domain: undefined }));
    expect(screen.getByTestId("domain-section-all")).toBeTruthy();
    expect(screen.getByText(en.dashboard.forYouAll)).toBeTruthy();
  });

  it("renders '—' instead of a fake 643 while the count is unknown; shows the profile banner without a profile", () => {
    state.profile = null;
    state.count = undefined;
    state.orgs = [];
    const { container } = wrap();

    expect(container.textContent).not.toContain("643");
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(en.profile.completeProfileBanner)).toBeTruthy();
    expect(listCalls).toHaveLength(0);
  });
});
