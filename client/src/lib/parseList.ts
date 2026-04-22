/*
 * parseList — turn free-text `eligibility` / `applicationProcess` strings
 * into arrays of bullet points or numbered steps for structured rendering.
 *
 * DB stores these fields as free text (sometimes newline-separated, sometimes
 * bullet-prefixed, sometimes "1. X\n2. Y"). We detect the shape client-side
 * so we can render them as <ul> / <ol> without another enrichment pass.
 *
 * Returns `[]` for falsy/whitespace input so callers can do
 * `items.length > 1 ? <List/> : <Paragraph/>` without extra null checks.
 */

const LEADING_MARKER = /^\s*(?:[-–—•·*]|\d+[.)]|[①-⑳])\s+/;
const MULTI_BULLET_SPLIT = /\s*(?:\n+|(?:(?<=\S)\s*[•·]\s+)|(?:(?<=\S);\s+))/;

export function parseToBullets(raw?: string | null): string[] {
  if (!raw) return [];
  const text = String(raw).trim();
  if (!text) return [];

  let parts = text
    .split(/\r?\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    parts = text
      .split(MULTI_BULLET_SPLIT)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Strip bullet/number prefix — UI renders its own marker.
  return parts.map((p) => p.replace(LEADING_MARKER, "").trim()).filter(Boolean);
}

/**
 * Parse a process description into ordered steps. Identical logic to
 * `parseToBullets` today, but kept as a separate export so we can diverge
 * later (e.g. require numeric prefixes, validate sequence).
 */
export function parseToSteps(raw?: string | null): string[] {
  return parseToBullets(raw);
}
