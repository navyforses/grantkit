/**
 * Country-code normalizer for grant imports & one-off DB migration.
 *
 * The grants DB uses **ISO 3166-1 alpha-2** codes (`US`, `GB`, `DE`, …)
 * everywhere the geocoder, frontend flag map, and region-bucket logic
 * expect them. Early iterations of `daily-discovery.ts` asked the LLM
 * for grants with `country=UK` (common human usage) and the LLM
 * obligingly echoed `UK` back into the database. Google Places then
 * returns `GB` when it resolves a UK address, so the geocoding pipeline
 * rejects those rows as "country mismatch". This module converts human-
 * friendly codes to their ISO-standard form so the rest of the pipeline
 * works consistently.
 */

const EXACT_MAP: Record<string, string> = {
  // ── Non-ISO aliases seen in the wild ────────────────────────────────
  UK: "GB",                    // United Kingdom's reserved code is GB
  EN: "GB",                    // "English"-coded entries (rare)
  USA: "US",
  "UNITED STATES": "US",
  "UNITED STATES OF AMERICA": "US",
  "UNITED KINGDOM": "GB",
  "GREAT BRITAIN": "GB",
  GERMANY: "DE",
  FRANCE: "FR",
  SPAIN: "ES",
  ITALY: "IT",
  NETHERLANDS: "NL",
  IRELAND: "IE",
  CANADA: "CA",
  PORTUGAL: "PT",
  SWEDEN: "SE",
  DENMARK: "DK",
  FINLAND: "FI",
  AUSTRIA: "AT",
  BELGIUM: "BE",
  ESTONIA: "EE",
};

/**
 * Return the ISO 3166-1 alpha-2 form of whatever the caller hands us,
 * or `undefined` if we can't normalise it. When we can't normalise, the
 * caller should *not* silently invent a code — better to surface the
 * row as needing manual review.
 *
 * Rules:
 *   - Trim + uppercase the input.
 *   - Exact matches in EXACT_MAP (UK → GB, UNITED STATES → US, …).
 *   - Two-letter input that's already uppercase A-Z → pass through.
 *   - Anything else → undefined.
 */
export function normalizeCountryCode(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  const upper = trimmed.toUpperCase();

  if (EXACT_MAP[upper]) return EXACT_MAP[upper];
  if (/^[A-Z]{2}$/.test(upper)) return upper;

  return undefined;
}
