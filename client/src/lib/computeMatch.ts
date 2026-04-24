/*
 * ⚠️ LEGACY — only consumed by EntityDetail.tsx (/grant/:id fallback).
 * See CLAUDE.md → LEGACY for the full list + removal plan.
 *
 * computeMatch — user ↔ grant eligibility scoring for the "Your Match N/M"
 * card on the grant detail page.
 *
 * Only evaluates criteria for which we have *both* user-side and grant-side
 * signals. Missing signals on either side are reported as `"unknown"` so
 * the UI can render a `?` chip (and link to onboarding/profile).
 *
 * Real schema coverage (as of 2026-04-21):
 *   - ✅ country      — user.targetCountry ↔ grant.country
 *   - ⚠️ diagnosis    — fuzzy match of user.purposeDetails / needDetails
 *                       against grant.targetDiagnosis (heuristic)
 *   - ❌ age          — user has no age column → always "unknown"
 *   - ❌ income       — user has no income column → always "unknown"
 *
 * See .grantkit-redesign/DATA_GAPS.md for the planned user-profile
 * extensions that will flip age/income from "unknown" to real scoring.
 */

export type MatchStatus = "match" | "no_match" | "unknown";

export interface MatchCriterion {
  key: "country" | "diagnosis" | "age" | "income";
  label: string;
  value: string;
  status: MatchStatus;
}

export interface MatchResult {
  matched: number;
  total: number;
  criteria: MatchCriterion[];
}

export interface MatchableUser {
  targetCountry?: string | null;
  purposes?: string | null;
  purposeDetails?: string | null;
  needs?: string | null;
  needDetails?: string | null;
}

export interface MatchableGrant {
  country?: string | null;
  targetDiagnosis?: string | null;
  ageRange?: string | null;
}

export interface MatchLabels {
  country: string;
  diagnosis: string;
  age: string;
  income: string;
  toConfirm: string;        // "To be confirmed" / "დასადასტურებელი"
  notProvided: string;      // "Not in your profile" / "პროფილში არ არის"
  anyCountry: string;       // "Any country"
  international: string;    // "International"
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Normalise a country string to uppercase ISO-2 or a canonical label. */
function normaliseCountry(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.trim().toUpperCase();
}

/**
 * Very lightweight diagnosis heuristic: check whether any word in the
 * grant's targetDiagnosis appears in the user's purposeDetails / needDetails.
 * Returns true only when there is a non-trivial overlap.
 */
function diagnosisOverlap(
  grantDiagnosis: string | null | undefined,
  userPurposeDetails: string | null | undefined,
  userNeedDetails: string | null | undefined,
): boolean {
  if (!grantDiagnosis) return false;
  const haystack = [userPurposeDetails, userNeedDetails]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (!haystack) return false;

  const needles = grantDiagnosis
    .toLowerCase()
    .split(/[\s,;/|]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 4); // skip short stop-words

  return needles.some((n) => haystack.includes(n));
}

// ── Main export ───────────────────────────────────────────────────────────────

export function computeMatch(
  user: MatchableUser | null | undefined,
  grant: MatchableGrant | null | undefined,
  labels: MatchLabels,
): MatchResult | null {
  if (!user || !grant) return null;

  const criteria: MatchCriterion[] = [];

  // ── 1. Country ──────────────────────────────────────────────────────────────
  const grantCountry = normaliseCountry(grant.country);
  const userCountry = normaliseCountry(user.targetCountry);

  const isGlobalGrant =
    !grantCountry ||
    grantCountry === "INTERNATIONAL" ||
    grantCountry === "GLOBAL" ||
    grantCountry === "ANY";

  if (isGlobalGrant) {
    criteria.push({
      key: "country",
      label: labels.country,
      value: labels.anyCountry,
      status: "match",
    });
  } else if (!userCountry) {
    criteria.push({
      key: "country",
      label: labels.country,
      value: labels.notProvided,
      status: "unknown",
    });
  } else {
    criteria.push({
      key: "country",
      label: labels.country,
      value: grantCountry,
      status: userCountry === grantCountry ? "match" : "no_match",
    });
  }

  // ── 2. Diagnosis / target condition ─────────────────────────────────────────
  if (grant.targetDiagnosis) {
    const overlap = diagnosisOverlap(
      grant.targetDiagnosis,
      user.purposeDetails,
      user.needDetails,
    );
    const hasUserSignal = !!(user.purposeDetails || user.needDetails);

    criteria.push({
      key: "diagnosis",
      label: labels.diagnosis,
      value: grant.targetDiagnosis,
      status: !hasUserSignal ? "unknown" : overlap ? "match" : "no_match",
    });
  }

  // ── 3. Age ──────────────────────────────────────────────────────────────────
  // User schema has no age column yet → always unknown when grant specifies range.
  if (grant.ageRange) {
    criteria.push({
      key: "age",
      label: labels.age,
      value: grant.ageRange,
      status: "unknown",
    });
  }

  // ── 4. Income ───────────────────────────────────────────────────────────────
  // No income data on either side yet → omit entirely (don't add unknown noise).

  if (criteria.length === 0) return null;

  const matched = criteria.filter((c) => c.status === "match").length;
  const total = criteria.filter((c) => c.status !== "unknown").length;

  return { matched, total, criteria };
}
