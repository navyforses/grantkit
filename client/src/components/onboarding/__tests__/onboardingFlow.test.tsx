// @vitest-environment jsdom
/*
 * Onboarding v2 (Phase 1.3) — a new user walks country → city/language →
 * status (skipped) → needs in 4 steps; the submit payload carries only
 * targetCountry + domain needs (status/city stay in localStorage, D6).
 */
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MotionGlobalConfig } from "framer-motion";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { en } from "@/i18n/en";
import { VIEWER_CITY_KEY, VIEWER_STATUS_KEY } from "@/lib/onboardingLocal";

const mutateAsync = vi.fn(async (_input: unknown) => ({ success: true }));
const navigate = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    onboarding: { saveProfile: { useMutation: () => ({ mutateAsync, isPending: false }) } },
  },
}));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: true, user: { id: 1 }, loading: false }) }));
vi.mock("wouter", () => ({ useLocation: () => ["/onboarding", navigate] }));

import OnboardingFlow, { buildProfilePayload, normalizeNeeds } from "../OnboardingFlow";

beforeAll(() => {
  // AnimatePresence mode="wait" never finishes its exit animation in jsdom.
  MotionGlobalConfig.skipAnimations = true;
  class IO { observe() {} unobserve() {} disconnect() {} }
  (globalThis as any).IntersectionObserver = IO;
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  mutateAsync.mockClear();
  navigate.mockClear();
});

function wrap() {
  localStorage.setItem("grantkit-lang", "en");
  return render(<LanguageProvider><OnboardingFlow /></LanguageProvider>);
}

describe("buildProfilePayload / normalizeNeeds", () => {
  it("never includes status or city, even when the state has them", () => {
    const payload = buildProfilePayload({ country: "FR", needs: ["housing"], status: "asylum_seeker", city: "Paris" } as any);
    expect(payload).toEqual({ targetCountry: "FR", needs: ["housing"] });
    expect(Object.keys(payload)).not.toContain("status");
  });
  it("maps legacy Need values to domains and keeps domain keys", () => {
    expect(normalizeNeeds(["VISA", "housing", "FOOD", "bogus", "housing"])).toEqual(["legal_status", "housing", "money_benefits"]);
    expect(normalizeNeeds(null)).toEqual([]);
  });
});

describe("OnboardingFlow — 4 steps to the dashboard", () => {
  it("country → city/language → skip status → needs → saveProfile → /dashboard", async () => {
    wrap();

    // 1. country
    fireEvent.click(screen.getByText(en.country.FR));
    fireEvent.click(screen.getByText(en.profile.next));

    // 2. city + language (optional city)
    await screen.findByText(en.onboardingV2.stepCityHint);
    fireEvent.change(screen.getByPlaceholderText(en.onboardingV2.cityPlaceholder), { target: { value: "Paris" } });
    fireEvent.click(screen.getByText(en.profile.next));

    // 3. status — privacy note + skip
    const note = await screen.findByTestId("status-privacy-note");
    expect(note.textContent).toContain(en.onboardingV2.privacyNote);
    fireEvent.click(screen.getByText(en.profile.skip));

    // 4. needs — the 11 domains
    await screen.findByText(en.onboardingV2.stepNeeds);
    fireEvent.click(screen.getByText(en.domains.housing.label));
    fireEvent.click(screen.getByText(en.profile.finish));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    const payload = mutateAsync.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toEqual({ targetCountry: "FR", needs: ["housing"] });
    expect(JSON.stringify(payload)).not.toMatch(/status|city|Paris/);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/dashboard"));
    expect(localStorage.getItem(VIEWER_STATUS_KEY)).toBeNull(); // skipped
    expect(localStorage.getItem(VIEWER_CITY_KEY)).toBe("Paris"); // client-only
  });

  it("a chosen status is stored locally and still absent from the payload", async () => {
    wrap();
    fireEvent.click(screen.getByText(en.country.FR));
    fireEvent.click(screen.getByText(en.profile.next));
    await screen.findByText(en.onboardingV2.stepCityHint);
    fireEvent.click(screen.getByText(en.profile.next));
    fireEvent.click(await screen.findByText(en.onboardingV2.statuses.asylum_seeker));
    fireEvent.click(screen.getByText(en.profile.next));
    fireEvent.click(await screen.findByText(en.domains.legal_status.label));
    fireEvent.click(screen.getByText(en.profile.finish));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(JSON.stringify(mutateAsync.mock.calls[0][0])).not.toContain("asylum_seeker");
    expect(localStorage.getItem(VIEWER_STATUS_KEY)).toBe("asylum_seeker");
  });
});
