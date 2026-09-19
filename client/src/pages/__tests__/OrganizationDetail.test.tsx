// @vitest-environment jsdom
/*
 * OrganizationDetail — Phase 1.6 France fields + localisation.
 * Mocked FR org with a housing row; rendered in ka and fr.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ka } from "@/i18n/ka";
import { fr } from "@/i18n/fr";

const state: { data: any } = { data: null };

vi.mock("@/lib/trpc", () => ({
  trpc: {
    organizations: {
      detail: { useQuery: () => ({ data: state.data, isLoading: false, isError: false, refetch: vi.fn() }) },
    },
  },
}));
vi.mock("wouter", () => ({
  useParams: () => ({ orgId: "ORG-FR-0001" }),
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: false, loading: false, user: null }) }));
vi.mock("@/components/OrganizationsMap", () => ({ default: () => null }));
vi.mock("@/components/OrgAiChat", () => ({ default: () => null }));
vi.mock("@/components/grant/GrantDetailHeader", () => ({ default: () => null }));
vi.mock("@/components/SEO", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));

import OrganizationDetail from "../OrganizationDetail";

const FR_ORG = {
  orgId: "ORG-FR-0001",
  name: "France terre d'asile",
  description: "Accueil et accompagnement des demandeurs d'asile.",
  country: "FR",
  city: "Paris",
  categories: "housing,social_services",
  servicesOffered: "Hébergement d'urgence, domiciliation, accompagnement juridique.",
  targetAudience: "Demandeurs d'asile et réfugiés.",
  emigrationPurpose: "all,medical",
  isNational: true,
  acceptsUndocumented: "unknown",
  acceptsUninsured: "unknown",
  serviceCost: "unknown",
  appointmentPolicy: "unknown",
  branchesCount: 1,
  programsCount: 0,
};

const HOUSING = {
  id: 1,
  orgId: "ORG-FR-0001",
  housingType: "shelter",
  capacity: "40 places",
  maxStayDuration: "6 mois",
  registrationProcess: null,
  costDetails: "Gratuit",
  childrenFriendly: "yes",
  disabledAccessible: "unknown",
};

const TRANSLATIONS = {
  ka: { description: "თავშესაფრის მაძიებელთა მიღება და მხარდაჭერა.", servicesOffered: "გადაუდებელი თავშესაფარი, იურიდიული დახმარება." },
  fr: { description: "Description en français." },
};

beforeAll(() => {
  class IO { observe() {} unobserve() {} disconnect() {} }
  (globalThis as any).IntersectionObserver = IO;
});
afterEach(cleanup);

function wrap(lang: "ka" | "fr") {
  localStorage.setItem("grantkit-lang", lang);
  return render(<LanguageProvider><OrganizationDetail /></LanguageProvider>);
}

describe("OrganizationDetail — France fields (Phase 1.6)", () => {
  it("ka: localised description + services, housing card with known rows only, national + purpose badges", () => {
    state.data = { organization: FR_ORG, branches: [], housing: HOUSING, translations: TRANSLATIONS };
    wrap("ka");

    expect(screen.getByText(TRANSLATIONS.ka.description)).toBeTruthy();
    expect(screen.getByTestId("services-offered-card").textContent).toContain(TRANSLATIONS.ka.servicesOffered);
    // targetAudience has no ka translation → raw column (pickLocalized fallback)
    expect(screen.getByTestId("target-audience-card").textContent).toContain(FR_ORG.targetAudience);

    const housing = screen.getByTestId("housing-card");
    expect(housing.textContent).toContain(ka.orgFrance.housingType.shelter);
    expect(screen.getByTestId("housing-capacity").textContent).toContain("40 places");
    expect(screen.getByTestId("housing-maxStayDuration").textContent).toContain("6 mois");
    expect(screen.getByTestId("housing-childrenFriendly").textContent).toContain(ka.orgFrance.yes);
    expect(screen.queryByTestId("housing-disabledAccessible")).toBeNull(); // unknown → hidden
    expect(screen.queryByTestId("housing-registrationProcess")).toBeNull(); // null → hidden

    expect(screen.getByTestId("badge-national").textContent).toContain("მთელი საფრანგეთი");
    const purposes = screen.getAllByTestId("badge-purpose").map((el) => el.textContent);
    expect(purposes).toEqual([ka.orgFrance.purpose.all, ka.orgFrance.purpose.medical]);
  });

  it("fr: fr description, services fall back to the source column, fr housing labels", () => {
    state.data = { organization: FR_ORG, branches: [], housing: HOUSING, translations: TRANSLATIONS };
    wrap("fr");

    expect(screen.getByText(TRANSLATIONS.fr.description)).toBeTruthy();
    expect(screen.queryByText(TRANSLATIONS.ka.description)).toBeNull();
    expect(screen.getByTestId("services-offered-card").textContent).toContain(FR_ORG.servicesOffered);
    expect(screen.getByTestId("housing-card").textContent).toContain(fr.orgFrance.housingType.shelter);
    expect(screen.getByTestId("badge-national").textContent).toContain(fr.orgFrance.nationwide.replace("{country}", "France"));
  });

  it("no housing row / no translations → no housing card, source-language prose", () => {
    state.data = { organization: { ...FR_ORG, isNational: false, emigrationPurpose: null }, branches: [], housing: null, translations: {} };
    wrap("ka");

    expect(screen.queryByTestId("housing-card")).toBeNull();
    expect(screen.queryByTestId("badge-national")).toBeNull();
    expect(screen.queryAllByTestId("badge-purpose")).toHaveLength(0);
    expect(screen.getByText(FR_ORG.description)).toBeTruthy();
  });
});
