import { describe, expect, it } from "vitest";
import { CATEGORIES } from "@/lib/constants";
import { NEED_OPTIONS } from "./profileTypes";
import {
  DOMAIN_KEYS,
  CATEGORY_TO_DOMAIN,
  MAIN_CATEGORY_TO_DOMAIN,
  NON_DOMAIN_CATEGORIES,
  NEVER_MONETIZE,
  categoryToDomain,
  mainCategoryToDomain,
  needToDomain,
  domainsForOrganization,
  domainForOrganization,
  sourceValuesForDomain,
  isDomain,
  normalizeKey,
} from "./domains";

/** Expected France `mainCategory` labels (Excel not in repo — see report). */
const EXPECTED_MAIN_CATEGORIES = [
  "Santé", "Logement", "Emploi", "Juridique", "Éducation", "Social",
  "Aides financières", "Famille", "Santé mentale",
];

describe("shared/domains — taxonomy", () => {
  it("has exactly the 11 plan domains", () => {
    expect(DOMAIN_KEYS).toHaveLength(11);
    expect(new Set(DOMAIN_KEYS).size).toBe(11);
    expect(isDomain("health")).toBe(true);
    expect(isDomain("medical_treatment")).toBe(false);
  });

  it("every mapping value is a real domain", () => {
    for (const table of [CATEGORY_TO_DOMAIN, MAIN_CATEGORY_TO_DOMAIN]) {
      for (const d of Object.values(table)) expect(DOMAIN_KEYS).toContain(d);
    }
  });

  it("every known category (constants.ts) maps, except the sentinels", () => {
    const values = CATEGORIES.map((c) => c.value);
    const unmapped = values.filter(
      (v) => !(NON_DOMAIN_CATEGORIES as readonly string[]).includes(v) && categoryToDomain(v) === null,
    );
    expect(unmapped).toEqual([]);
  });

  it("`other`/unmapped share over the known category list is ≤ 3 %", () => {
    // Sentinels (`all`, `international`, `other`) are excluded by design;
    // among the remaining values none may fall through.
    const values = CATEGORIES.map((c) => c.value)
      .filter((v) => !(NON_DOMAIN_CATEGORIES as readonly string[]).includes(v));
    const other = values.filter((v) => categoryToDomain(v) === null).length;
    expect(other / values.length).toBeLessThanOrEqual(0.03);
  });

  it("every expected France mainCategory maps (accent/case-insensitive)", () => {
    const unmapped = EXPECTED_MAIN_CATEGORIES.filter((m) => mainCategoryToDomain(m) === null);
    expect(unmapped).toEqual([]);
    expect(unmapped.length / EXPECTED_MAIN_CATEGORIES.length).toBeLessThanOrEqual(0.03);
    expect(mainCategoryToDomain("SANTÉ MENTALE")).toBe("mental_health");
    expect(mainCategoryToDomain("health")).toBe("health");
    expect(mainCategoryToDomain("")).toBeNull();
    expect(mainCategoryToDomain("zzz_unknown")).toBeNull();
  });

  it("every onboarding Need maps to a domain", () => {
    for (const n of NEED_OPTIONS) expect(needToDomain(n.value)).not.toBeNull();
    expect(needToDomain("VISA")).toBe("legal_status");
    expect(needToDomain("banking")).toBe("money_benefits");
  });

  it("domainsForOrganization combines mainCategory + categories, de-duplicated", () => {
    expect(domainsForOrganization({ mainCategory: "Logement", categories: "medical_treatment, housing" }))
      .toEqual(["housing", "health"]);
    expect(domainsForOrganization({ categories: "financial_assistance; medical_treatment" }))
      .toEqual(["money_benefits", "health"]);
    expect(domainForOrganization({ categories: "other" })).toBeNull();
    expect(domainForOrganization({})).toBeNull();
  });

  it("sourceValuesForDomain is the exact inverse of the tables", () => {
    const src = sourceValuesForDomain("health");
    expect(src.categories.sort()).toEqual(["assistive_technology", "medical_treatment"]);
    for (const m of src.mainCategories) expect(MAIN_CATEGORY_TO_DOMAIN[m]).toBe("health");
    for (const d of DOMAIN_KEYS) expect(sourceValuesForDomain(d).mainCategories.length).toBeGreaterThan(0);
  });

  it("normalizeKey folds accents, case and separators", () => {
    expect(normalizeKey(" Aides-financières ")).toBe("aides_financieres");
    expect(normalizeKey("Droits & démarches")).toBe("droits_demarches");
  });
});

describe("shared/domains — NEVER_MONETIZE (MASTER-PLAN §2.5)", () => {
  it("matches the agreed snapshot — any change needs an owner decision", () => {
    expect(NEVER_MONETIZE).toMatchInlineSnapshot(`
      {
        "domains": [
          "legal_status",
          "mental_health",
          "safety_rights",
        ],
        "organizations": {
          "acceptsUndocumented": [
            "yes",
          ],
          "providerType": [
            "public",
            "nonprofit",
          ],
        },
        "subdomains": [
          "health.emergency",
          "health.free_clinic",
          "health.insurance_access_asylum",
          "housing.emergency_shelter",
          "family_children.women_gbv",
        ],
        "viewerStatus": [
          "asylum_seeker",
          "undocumented",
        ],
      }
    `);
  });

  it("only references real domains", () => {
    for (const d of NEVER_MONETIZE.domains) expect(DOMAIN_KEYS).toContain(d);
    for (const s of NEVER_MONETIZE.subdomains) expect(DOMAIN_KEYS).toContain(s.split(".")[0]);
  });
});
