/*
 * orgTrust — provenance helpers for the organization page (Phase 1.5).
 *
 * Decision D7: a contact fact is shown as verified only when it carries a
 * provenance (source + verifiedAt). Decision D8: "verified" is valid for
 * 90 days; after that the line says "needs re-verification". Anything
 * else is "unverified — call to double-check".
 *
 * Pure functions (no React) so the rules are unit-testable.
 */

import type { Translations } from "@/i18n/types";

export const VERIFIED_TTL_DAYS = 90;

/** Minimum Google review count before a rating is displayed (D8). */
export const MIN_REVIEWS_FOR_RATING = 5;

export type ProvenanceState =
  | { kind: "verified"; date: Date; source: string }
  | { kind: "stale"; date: Date; source: string }
  | { kind: "unverified" };

type SourceKey = keyof Translations["orgTrust"]["source"];

export function provenanceState(
  verifiedAt: Date | string | null | undefined,
  source: string | null | undefined,
  now: Date = new Date(),
): ProvenanceState {
  if (!verifiedAt) return { kind: "unverified" };
  const date = verifiedAt instanceof Date ? verifiedAt : new Date(verifiedAt);
  if (Number.isNaN(date.getTime())) return { kind: "unverified" };
  const ageDays = (now.getTime() - date.getTime()) / 86_400_000;
  const src = source ?? "unknown";
  return ageDays > VERIFIED_TTL_DAYS
    ? { kind: "stale", date, source: src }
    : { kind: "verified", date, source: src };
}

export function formatProvenance(
  tr: Translations["orgTrust"],
  state: ProvenanceState,
  locale: string,
): string {
  if (state.kind === "unverified") return tr.unverified;
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(state.date);
  const source = tr.source[state.source as SourceKey] ?? tr.source.unknown;
  const template = state.kind === "stale" ? tr.needsRecheck : tr.lastChecked;
  return template.replace("{date}", date).replace("{source}", source);
}

/** D8 rule: show a Google rating only with enough reviews behind it. */
export function isRatingDisplayable(
  rating: number | null | undefined,
  reviewCount: number | null | undefined,
): boolean {
  return rating != null && rating > 0 && (reviewCount ?? 0) >= MIN_REVIEWS_FOR_RATING;
}
