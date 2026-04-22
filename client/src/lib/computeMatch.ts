/*
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

// ── helpers ─────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  // Lowercase + strip punctuation we care about (commas, periods, parens,
  // slashes…). Using an explicit class keeps us off the `u` flag, which the
  // project's TS target predates.
  return s
    .toLowerCase()
    .replace(/[.,;:!?()/\\\[\]{}"'`~@#$%^&*+=<>|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string): string[] {
  return normalize(s).split(" ").filter((w) => w.length >= 3);
}

/**
 * Fuzzy check: does the user's purpose/needs text mention any of the grant's
 * target conditions? Keyword overlap ≥1 → match.
 */
function diagnosisOverlap(userText: string, grantText: string): boolean {
  const userWords = new Set(tokens(userText));
  if (userWords.size === 0) return false;
  const grantWords = tokens(grantText);
  return grantWords.some((w) => userWords.has(w));
}

function isGenericDiagnosis(s: string): boolean {
  const n = normalize(s);
  return !n || n === "general" || n === "all" || n === "any" || n === "various" || n === "n a";
}

// ── main ────────────────────────────────────────────────────────────────────

export function computeMatch(
  user: MatchableUser | null | undefined,
  grant: MatchableGrant,
  labels: MatchLabels,
): MatchResult | null {
  if (!user) return null;

  const criteria: MatchCriterion[] = [];

  // 1. Country
  const grantCountry = (grant.country || "").trim();
  const userCountry = (user.targetCountry || "").trim();
  if (grantCountry) {
    if (!userCountry) {
      criteria.push({
        key: "country",
        label: labels.country,
        value: labels.notProvided,
        status: "unknown",
      });
    } else {
      const isInternational =
        grantCountry.toLowerCase() === "international" || grantCountry === "🌐";
      const ok =
        isInternational ||
        grantCountry.toLowerCase() === userCountry.toLowerCase();
      criteria.push({
        key: "country",
        label: labels.country,
        value: isInternational ? labels.international : grantCountry,
        status: ok ? "match" : "no_match",
      });
    }
  }

  // 2. Diagnosis — only evaluate when grant specifies a real target
  const targetDx = (grant.targetDiagnosis || "").trim();
  if (targetDx && !isGenericDiagnosis(targetDx)) {
    const userText = [user.purposes, user.purposeDetails, user.needs, user.needDetails]
      .filter(Boolean)
      .join(" ");
    if (!userText.trim()) {
      criteria.push({
        key: "diagnosis",
        label: labels.diagnosis,
        value: labels.notProvided,
        status: "unknown",
      });
    } else {
      const ok = diagnosisOverlap(userText, targetDx);
      criteria.push({
        key: "diagnosis",
        label: labels.diagnosis,
        value: targetDx,
        status: ok ? "match" : "no_match",
      });
    }
  }

  // 3. Age — user profile has no age field yet (see DATA_GAPS.md)
  const ageRange = (grant.ageRange || "").trim();
  if (ageRange && ageRange !== "0-100") {
    criteria.push({
      key: "age",
      label: labels.age,
      value: ageRange,
      status: "unknown",
    });
  }

  // 4. Income — no user field; no reliable signal on grant side
  // (skipped entirely; document in DATA_GAPS.md)

  if (criteria.length === 0) return null;

  const matched = criteria.filter((c) => c.status === "match").length;
  return { matched, total: criteria.length, criteria };
}
