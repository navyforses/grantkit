/**
 * organizations.detail mapper — Phase 1.6 (France fields + localisation).
 * Pure unit tests: housing present/absent, translations present/absent/malformed.
 */
import { describe, expect, it } from "vitest";
import { mapOrganizationDetail, normalizeOrgTranslations } from "./organizationDetail";

const org = {
  orgId: "ORG-FR-0001",
  name: "France terre d'asile",
  description: "Accueil et accompagnement des demandeurs d'asile.",
  translations: null as unknown,
} as any;

const housing = {
  id: 1,
  orgId: "ORG-FR-0001",
  housingType: "shelter",
  capacity: "40 places",
  maxStayDuration: "6 mois",
  registrationProcess: "Via le 115",
  costDetails: "Gratuit",
  childrenFriendly: "yes",
  disabledAccessible: "unknown",
} as any;

describe("normalizeOrgTranslations", () => {
  it("accepts the import's short keys and the canonical field names", () => {
    const out = normalizeOrgTranslations({
      ka: { name: "საფრანგეთის თავშესაფრის ასოციაცია", description: "აღწერა", services: "მომსახურება", target: "ვისთვის", mission: "მისია" },
      fr: { servicesOffered: "Services", targetAudience: "Public", missionStatement: "Mission" },
    });
    expect(out.ka).toEqual({
      name: "საფრანგეთის თავშესაფრის ასოციაცია",
      description: "აღწერა",
      servicesOffered: "მომსახურება",
      targetAudience: "ვისთვის",
      missionStatement: "მისია",
    });
    expect(out.fr).toEqual({ servicesOffered: "Services", targetAudience: "Public", missionStatement: "Mission" });
  });

  it("parses a JSON string column and drops empty / non-string / unknown cells", () => {
    const out = normalizeOrgTranslations(JSON.stringify({ en: { name: "", description: 42, bogus: "x", services: "  " }, ru: { name: "Имя" } }));
    expect(out).toEqual({ ru: { name: "Имя" } });
  });

  it("returns {} for null, arrays and malformed JSON", () => {
    expect(normalizeOrgTranslations(null)).toEqual({});
    expect(normalizeOrgTranslations([1, 2])).toEqual({});
    expect(normalizeOrgTranslations("{not json")).toEqual({});
    expect(normalizeOrgTranslations({ ka: "string not object" })).toEqual({});
  });
});

describe("mapOrganizationDetail", () => {
  it("housing present + translations present", () => {
    const out = mapOrganizationDetail({
      organization: { ...org, translations: { ka: { description: "ქართული აღწერა" } } },
      branches: [],
      housing,
    });
    expect(out.housing).toBe(housing);
    expect(out.translations).toEqual({ ka: { description: "ქართული აღწერა" } });
    expect(out.organization?.orgId).toBe("ORG-FR-0001");
  });

  it("housing absent + translations absent → null / {} (never undefined)", () => {
    const out = mapOrganizationDetail({ organization: org, branches: [], housing: undefined });
    expect(out.housing).toBeNull();
    expect(out.translations).toEqual({});
  });

  it("organization not found → everything empty, even if a housing row slipped through", () => {
    const out = mapOrganizationDetail({ organization: undefined, branches: [], housing });
    expect(out).toEqual({ organization: null, branches: [], housing: null, translations: {} });
  });
});
