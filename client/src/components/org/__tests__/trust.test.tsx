// @vitest-environment jsdom
/*
 * Phase 1.5 — provenance + trust UI. Three states: verified / unverified /
 * all-unknown, plus the D8 rating threshold.
 */
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { LanguageProvider } from "@/contexts/LanguageContext";
import ProvenanceLine from "@/components/org/ProvenanceLine";
import TrustPanel from "@/components/org/TrustPanel";
import WhoWeHelpCard from "@/components/org/WhoWeHelpCard";
import { formatProvenance, provenanceState } from "@/lib/orgTrust";
import { en } from "@/i18n/en";

beforeAll(() => {
  // framer-motion `whileInView` needs IntersectionObserver in jsdom.
  class IO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as any).IntersectionObserver = IO;
});

afterEach(cleanup);

function wrap(ui: ReactNode) {
  localStorage.setItem("grantkit-lang", "en");
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

describe("provenanceState (D7/D8)", () => {
  const now = new Date("2026-09-19T00:00:00Z");
  it("verified within 90 days", () => {
    const s = provenanceState("2026-08-01T00:00:00Z", "google_places", now);
    expect(s.kind).toBe("verified");
    expect(formatProvenance(en.orgTrust, s, "en")).toMatch(/Last checked .*Aug 1, 2026.*Google Places/);
  });
  it("stale after 90 days → needs re-verification", () => {
    const s = provenanceState("2026-01-01T00:00:00Z", "website", now);
    expect(s.kind).toBe("stale");
    expect(formatProvenance(en.orgTrust, s, "en")).toMatch(/needs re-verification/);
  });
  it("no date → unverified, regardless of source", () => {
    expect(provenanceState(null, "manual", now).kind).toBe("unverified");
    expect(provenanceState("not-a-date", "manual", now).kind).toBe("unverified");
  });
  it("unknown source falls back to the 'unknown source' label", () => {
    const s = provenanceState("2026-09-01T00:00:00Z", "weird", now);
    expect(formatProvenance(en.orgTrust, s, "en")).toMatch(/unknown source/);
  });
});

describe("ProvenanceLine", () => {
  it("verified state renders date + source", () => {
    wrap(<ProvenanceLine verifiedAt={new Date().toISOString()} source="google_places" />);
    const el = screen.getByText(/Last checked/);
    expect(el.getAttribute("data-provenance")).toBe("verified");
    expect(el.textContent).toContain("Google Places");
  });
  it("unverified state renders the call-to-double-check line", () => {
    wrap(<ProvenanceLine verifiedAt={null} source={null} />);
    const el = screen.getByText(en.orgTrust.unverified);
    expect(el.getAttribute("data-provenance")).toBe("unverified");
  });
});

describe("TrustPanel (D8 rating threshold)", () => {
  it("renders without a rating — no stars, explanatory line instead", () => {
    wrap(<TrustPanel googleRating={null} googleReviewCount={null} verifiedAt={null} verifiedSource={null} />);
    expect(screen.getByTestId("trust-panel")).toBeTruthy();
    expect(screen.queryByTestId("trust-rating")).toBeNull();
    expect(screen.getByText(en.orgTrust.ratingHidden)).toBeTruthy();
    expect(screen.getByText(en.orgTrust.unverified)).toBeTruthy();
  });
  it("hides a rating backed by fewer than 5 reviews", () => {
    wrap(<TrustPanel googleRating={4.8} googleReviewCount={4} verifiedAt={null} verifiedSource={null} />);
    expect(screen.queryByTestId("trust-rating")).toBeNull();
  });
  it("shows the rating at 5 reviews", () => {
    wrap(<TrustPanel googleRating={4.8} googleReviewCount={5} verifiedAt={new Date().toISOString()} verifiedSource="manual" />);
    expect(screen.getByTestId("trust-rating")).toBeTruthy();
    expect(screen.queryByText(en.orgTrust.ratingHidden)).toBeNull();
  });
});

describe("WhoWeHelpCard", () => {
  it("all-unknown → one muted line, no 'unconfirmed' rows", () => {
    wrap(
      <WhoWeHelpCard
        languages={null}
        acceptsUndocumented="unknown"
        acceptsUninsured="unknown"
        serviceCost="unknown"
        appointmentPolicy="unknown"
      />,
    );
    expect(screen.getByTestId("who-we-help-empty").textContent).toBe(en.orgTrust.nothingKnown);
    expect(screen.queryByText(en.orgEnrichment.status.unknown)).toBeNull();
    expect(screen.queryByText(en.orgEnrichment.cost.unknown)).toBeNull();
  });
  it("renders only the known rows", () => {
    wrap(
      <WhoWeHelpCard
        languages={null}
        acceptsUndocumented="yes"
        acceptsUninsured="unknown"
        serviceCost="free"
        appointmentPolicy="unknown"
      />,
    );
    expect(screen.getByText(en.orgEnrichment.status.yes)).toBeTruthy();
    expect(screen.getByText(en.orgEnrichment.cost.free)).toBeTruthy();
    expect(screen.queryByText(en.orgEnrichment.insurance.unknown)).toBeNull();
    expect(screen.queryByText(en.orgEnrichment.appointment.unknown)).toBeNull();
    expect(screen.queryByTestId("who-we-help-empty")).toBeNull();
  });
});
