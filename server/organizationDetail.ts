/**
 * organizations.detail response mapper (Phase 1.6 — France fields + org
 * localisation, read-only). Pure: no DB access, unit-tested in
 * server/organizationDetail.test.ts.
 *
 * - `housing`: the one organization_housing row per org, or null.
 * - `translations`: `organizations.translations` JSON normalised to
 *   { [lang]: { name?, description?, missionStatement?, servicesOffered?, targetAudience? } }
 *   so the client can feed `translations[lang]` straight into `pickLocalized`.
 *   The import wrote short keys (`services`, `target`); both spellings are accepted.
 */
import type { Organization, OrganizationBranch, OrganizationHousing } from "../drizzle/schema";

export const ORG_TRANSLATION_FIELDS = [
  "name",
  "description",
  "missionStatement",
  "servicesOffered",
  "targetAudience",
] as const;

export type OrgTranslationField = (typeof ORG_TRANSLATION_FIELDS)[number];
export type OrgTranslationFields = Partial<Record<OrgTranslationField, string>>;
export type OrgTranslations = Record<string, OrgTranslationFields>;

const FIELD_ALIASES: Readonly<Record<string, OrgTranslationField>> = {
  name: "name",
  description: "description",
  missionStatement: "missionStatement",
  mission: "missionStatement",
  servicesOffered: "servicesOffered",
  services: "servicesOffered",
  targetAudience: "targetAudience",
  target: "targetAudience",
};

/** JSON string or object → per-language field map. Anything malformed → {}. */
export function normalizeOrgTranslations(raw: unknown): OrgTranslations {
  let value: unknown = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return {};
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const out: OrgTranslations = {};
  for (const [lang, fields] of Object.entries(value as Record<string, unknown>)) {
    if (!fields || typeof fields !== "object" || Array.isArray(fields)) continue;
    const mapped: OrgTranslationFields = {};
    for (const [key, text] of Object.entries(fields as Record<string, unknown>)) {
      const field = FIELD_ALIASES[key];
      if (field && typeof text === "string" && text.trim()) mapped[field] = text;
    }
    if (Object.keys(mapped).length > 0) out[lang] = mapped;
  }
  return out;
}

export interface OrganizationDetailResult {
  organization: Organization | null;
  branches: OrganizationBranch[];
  housing: OrganizationHousing | null;
  translations: OrgTranslations;
}

export function mapOrganizationDetail(input: {
  organization: Organization | null | undefined;
  branches: OrganizationBranch[];
  housing: OrganizationHousing | null | undefined;
}): OrganizationDetailResult {
  const organization = input.organization ?? null;
  return {
    organization,
    branches: input.branches,
    housing: organization ? input.housing ?? null : null,
    translations: organization ? normalizeOrgTranslations(organization.translations) : {},
  };
}
