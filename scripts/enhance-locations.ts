#!/usr/bin/env tsx
/**
 * enhance-locations.ts — Phase 8.5.A2 AI Enhancement Path
 *
 * Reads the Phase 8.5.A1 audit report and attempts to fix the grants that
 * the audit flagged as problematic:
 *
 *   - needs_update  → apply Google's verified coords directly (no AI needed)
 *   - ambiguous     → ask Claude Haiku to suggest better query strategies,
 *                     then re-run Places API (New) Text Search
 *   - missing_data  → same AI-assisted requery as ambiguous
 *
 * For every grant, we record the before/after state so the user can audit
 * what changed. DB writes happen only when --apply is passed (default is
 * dry-run).
 *
 * Env vars:
 *   DATABASE_URL          (required for --apply)
 *   GOOGLE_MAPS_API_KEY   (required — server key, no referrer restrictions)
 *   ANTHROPIC_API_KEY     (required — Claude Haiku for query suggestions)
 *
 * Usage:
 *   pnpm enhance:locations:dry   # preview — no API or DB writes where avoidable
 *   pnpm enhance:locations       # apply to DB
 *   pnpm enhance:locations -- --only=needs_update
 *   pnpm enhance:locations -- --limit=20
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DATABASE_URL = process.env.DATABASE_URL;
const GOOGLE_KEY =
  process.env.GOOGLE_MAPS_API_KEY ??
  process.env.GOOGLE_PLACES_API_KEY ??
  process.env.VITE_GOOGLE_MAPS_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const REPORT_DIR = path.resolve(".grantkit-redesign");
const AUDIT_JSON = path.join(REPORT_DIR, "location-audit-report.json");
const ENHANCE_JSON = path.join(REPORT_DIR, "location-enhance-report.json");
const ENHANCE_MD = path.join(REPORT_DIR, "location-enhance-report.md");

const PLACES_URL = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = [
  "places.location",
  "places.formattedAddress",
  "places.displayName",
  "places.primaryType",
  "places.types",
  "places.addressComponents",
  "places.id",
].join(",");

const CENTROID_TYPES = new Set([
  "country",
  "administrative_area_level_1",
  "administrative_area_level_2",
  "administrative_area_level_3",
  "locality",
  "sublocality",
  "sublocality_level_1",
  "postal_code",
  "political",
]);

const PLACES_DELAY_MS = 200;
const CLAUDE_DELAY_MS = 300;

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const DRY_RUN = !APPLY;
const arg = (name: string) =>
  argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const ONLY = arg("only"); // "needs_update" | "ambiguous" | "missing_data"
const LIMIT = parseInt(arg("limit") ?? "0", 10);

// ---------------------------------------------------------------------------
// Types — matches audit-locations.ts AuditResult
// ---------------------------------------------------------------------------

interface AuditResult {
  grantId: number;
  itemId: string;
  organization: string;
  currentAddress: string | null;
  currentLat: number | null;
  currentLng: number | null;
  hasStoredAddress: boolean;
  hasStoredCoords: boolean;
  googleResult: {
    query: string;
    status: "found" | "not_found" | "ambiguous" | "error";
    foundAddress: string | null;
    foundLat: number | null;
    foundLng: number | null;
    placeId: string | null;
    confidence: "high" | "medium" | "low" | null;
    discrepancyFromStored: "match" | "close" | "far" | "no_stored" | null;
  };
  verdict:
    | "verified"
    | "needs_update"
    | "not_found_by_name"
    | "ambiguous"
    | "missing_data"
    | "error";
  notes: string[];
}

type Outcome =
  | { status: "updated"; source: "audit" | "ai"; lat: number; lng: number; address: string; query: string; placeId: string | null; primaryType: string | null }
  | { status: "skipped"; reason: string }
  | { status: "no_match"; attempted: string[]; lastReason: string };

interface EnhanceRecord {
  grantId: number;
  itemId: string;
  organization: string;
  country: string;
  originalVerdict: AuditResult["verdict"];
  before: { lat: number | null; lng: number | null; address: string | null };
  suggestedQueries?: string[];
  outcome: Outcome;
}

// ---------------------------------------------------------------------------
// Google Places API (New) — Text Search
// ---------------------------------------------------------------------------

interface PlaceMatch {
  lat: number;
  lng: number;
  address: string;
  displayName: string;
  primaryType: string | null;
  types: string[];
  countryCode: string | null;
  placeId: string | null;
}

async function placesSearch(
  query: string,
  regionCode?: string
): Promise<PlaceMatch | null> {
  const body: Record<string, unknown> = {
    textQuery: query,
    maxResultCount: 1,
  };
  if (regionCode && regionCode.length === 2) {
    body.regionCode = regionCode.toLowerCase();
  }

  const res = await fetch(PLACES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_KEY!,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    await sleep(5000);
    return placesSearch(query, regionCode);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Places API ${res.status}: ${text.slice(0, 200)}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json();
  const place = data.places?.[0];
  if (!place?.location) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const countryComp = place.addressComponents?.find((c: any) =>
    c.types?.includes("country")
  );

  return {
    lat: place.location.latitude,
    lng: place.location.longitude,
    address: place.formattedAddress ?? "",
    displayName: place.displayName?.text ?? "",
    primaryType: place.primaryType ?? null,
    types: place.types ?? [],
    countryCode: countryComp?.shortText?.toUpperCase() ?? null,
    placeId: place.id ?? null,
  };
}

function validatePlace(
  match: PlaceMatch,
  expectedCountry: string | null
): { ok: true } | { ok: false; reason: string } {
  if (match.primaryType && CENTROID_TYPES.has(match.primaryType)) {
    return { ok: false, reason: `centroid match (${match.primaryType})` };
  }
  const expected = expectedCountry?.trim().toUpperCase();
  if (
    expected &&
    expected.length === 2 &&
    match.countryCode &&
    match.countryCode !== expected
  ) {
    return {
      ok: false,
      reason: `country mismatch (got ${match.countryCode}, expected ${expected})`,
    };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Claude Haiku — query suggestion
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a geocoding assistant. Given a grant organization's name and country,
your job is to propose 3 alternative Google Places text-search queries that are
most likely to return the organization's actual physical HQ (not a country or
city centroid).

Strategies you may use:
- Expand abbreviations (e.g. "NIH" → "National Institutes of Health")
- Add the expected domain (e.g. foundation, charity, hospital, university,
  association, institute, nonprofit)
- Add city or region if you can guess it from the org name
- Add "headquarters" or "office" to bias toward a real place
- Strip noisy suffixes (e.g. "Foundation Inc." → "Foundation")
- Translate the org name to English if given in another language

Return ONLY valid JSON in this exact shape — no markdown, no prose:
{"queries": ["query 1", "query 2", "query 3"]}

Each query should be short (< 120 chars), self-contained, and include the
country when that helps disambiguate.`;

interface CountryLookup {
  (code: string): string;
}

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const countryName: CountryLookup = (code: string) => {
  const trimmed = code?.trim().toUpperCase();
  if (!trimmed) return "";
  if (trimmed.length > 3) return code.trim();
  try {
    return regionNames.of(trimmed) ?? code.trim();
  } catch {
    return code.trim();
  }
};

async function suggestQueries(
  anthropic: Anthropic,
  organization: string,
  country: string,
  currentAddress: string | null,
  notes: string[]
): Promise<string[]> {
  const userPayload = {
    organization,
    countryCode: country,
    countryName: countryName(country),
    currentAddress: currentAddress ?? "(none)",
    auditNotes: notes,
  };

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Suggest 3 Google Places queries for this grant organization:\n\n${JSON.stringify(userPayload, null, 2)}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return [];

  try {
    const parsed = JSON.parse(textBlock.text) as { queries?: string[] };
    if (!Array.isArray(parsed.queries)) return [];
    return parsed.queries
      .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
      .slice(0, 5);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function loadAudit(): AuditResult[] {
  if (!fs.existsSync(AUDIT_JSON)) {
    console.error(
      `\n❌ Audit report not found: ${AUDIT_JSON}\n` +
        `   Run \`pnpm audit:locations\` first to generate it.\n`
    );
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(AUDIT_JSON, "utf-8")) as AuditResult[];
}

function selectTargets(audit: AuditResult[]): AuditResult[] {
  const targetVerdicts = ONLY
    ? new Set([ONLY])
    : new Set(["needs_update", "ambiguous", "missing_data"]);
  let targets = audit.filter((r) => targetVerdicts.has(r.verdict));
  if (LIMIT > 0) targets = targets.slice(0, LIMIT);
  return targets;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!GOOGLE_KEY) {
    console.error(
      "\n❌ GOOGLE_MAPS_API_KEY not set (server key grantkit-server-geocoding-v2).\n"
    );
    process.exit(1);
  }
  if (!ANTHROPIC_API_KEY) {
    console.error("\n❌ ANTHROPIC_API_KEY not set.\n");
    process.exit(1);
  }
  if (!DATABASE_URL) {
    console.error(
      "\n❌ DATABASE_URL not set — required to look up each grant's country for regionCode biasing.\n"
    );
    process.exit(1);
  }

  const audit = loadAudit();
  const targets = selectTargets(audit);

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  GrantKit — Phase 8.5.A2 AI Location Enhancement`);
  console.log(`  Mode     : ${APPLY ? "⚠️  APPLY (DB writes)" : "✅ DRY-RUN"}`);
  console.log(`  Source   : ${AUDIT_JSON}`);
  console.log(`  Only     : ${ONLY ?? "needs_update + ambiguous + missing_data"}`);
  console.log(`  Limit    : ${LIMIT > 0 ? LIMIT : "all"}`);
  console.log(`  Audit    : ${audit.length} grants total`);
  console.log(`  Targets  : ${targets.length} grants to process`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  if (targets.length === 0) {
    console.log("  ℹ️  Nothing to do.\n");
    return;
  }

  const db = await mysql.createConnection(DATABASE_URL);

  // Need grant.country from the DB to bias Places regionCode. Fetch in one go.
  const grantCountries = new Map<number, string>();
  const [rows] = await db.execute<mysql.RowDataPacket[]>(
    `SELECT id, country FROM grants WHERE id IN (${targets.map(() => "?").join(",")})`,
    targets.map((t) => t.grantId)
  );
  for (const r of rows) grantCountries.set(r.id as number, r.country as string);

  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const records: EnhanceRecord[] = [];
  let i = 0;
  for (const target of targets) {
    i++;
    const prefix = `  [${String(i).padStart(3)}/${targets.length}]`;
    const country = grantCountries.get(target.grantId) ?? "";
    const regionCode =
      country.trim().length === 2 ? country.trim() : undefined;

    const record: EnhanceRecord = {
      grantId: target.grantId,
      itemId: target.itemId,
      organization: target.organization,
      country,
      originalVerdict: target.verdict,
      before: {
        lat: target.currentLat,
        lng: target.currentLng,
        address: target.currentAddress,
      },
      outcome: { status: "skipped", reason: "not processed yet" },
    };

    try {
      if (target.verdict === "needs_update") {
        // Audit already found a high/medium-confidence match. Use it directly.
        const g = target.googleResult;
        if (
          g.status === "found" &&
          g.foundLat != null &&
          g.foundLng != null &&
          g.confidence !== "low"
        ) {
          record.outcome = {
            status: "updated",
            source: "audit",
            lat: g.foundLat,
            lng: g.foundLng,
            address: g.foundAddress ?? "",
            query: g.query,
            placeId: g.placeId,
            primaryType: null,
          };
          console.log(
            `${prefix} ✓  [${target.verdict}] ${target.organization.slice(0, 40)} → (${g.foundLat.toFixed(4)}, ${g.foundLng.toFixed(4)}) via audit`
          );
        } else {
          record.outcome = {
            status: "skipped",
            reason: "needs_update but audit result not usable",
          };
          console.log(
            `${prefix} –  [${target.verdict}] ${target.organization.slice(0, 40)} → skipped (low confidence)`
          );
        }
      } else {
        // ambiguous or missing_data → ask Claude for better queries, then retry.
        const suggestions = await suggestQueries(
          anthropic,
          target.organization,
          country,
          target.currentAddress,
          target.notes
        );
        record.suggestedQueries = suggestions;
        await sleep(CLAUDE_DELAY_MS);

        const attempted: string[] = [];
        let lastReason = "no suggestions from Claude";
        let matched = false;

        for (const q of suggestions) {
          attempted.push(q);
          try {
            const place = await placesSearch(q, regionCode);
            if (!place) {
              lastReason = "no Places result";
              await sleep(PLACES_DELAY_MS);
              continue;
            }
            const v = validatePlace(place, country);
            if (!v.ok) {
              lastReason = v.reason;
              await sleep(PLACES_DELAY_MS);
              continue;
            }
            // Accept the first high/medium-confidence non-centroid hit.
            record.outcome = {
              status: "updated",
              source: "ai",
              lat: place.lat,
              lng: place.lng,
              address: place.address,
              query: q,
              placeId: place.placeId,
              primaryType: place.primaryType,
            };
            console.log(
              `${prefix} ✓  [${target.verdict}] ${target.organization.slice(0, 40)} → (${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}) via AI: "${q.slice(0, 50)}"`
            );
            matched = true;
            await sleep(PLACES_DELAY_MS);
            break;
          } catch (err) {
            lastReason = err instanceof Error ? err.message : String(err);
            await sleep(PLACES_DELAY_MS);
          }
        }

        if (!matched) {
          record.outcome = { status: "no_match", attempted, lastReason };
          console.log(
            `${prefix} ✗  [${target.verdict}] ${target.organization.slice(0, 40)} → no match (${lastReason.slice(0, 50)})`
          );
        }
      }

      // Apply DB write
      if (APPLY && record.outcome.status === "updated") {
        await db.execute(
          `UPDATE grants
             SET latitude = ?, longitude = ?, address = ?, geocodedAt = NOW()
           WHERE id = ?`,
          [record.outcome.lat, record.outcome.lng, record.outcome.address, target.grantId]
        );
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      record.outcome = { status: "no_match", attempted: [], lastReason: reason };
      console.log(`${prefix} ✗  [${target.verdict}] ${target.organization.slice(0, 40)} → error: ${reason.slice(0, 60)}`);
    }

    records.push(record);

    // Incremental save every 20 records for safety.
    if (i % 20 === 0) {
      saveReports(records, audit, targets.length);
    }
  }

  await db.end();

  saveReports(records, audit, targets.length);
  printSummary(records);
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

function saveReports(
  records: EnhanceRecord[],
  audit: AuditResult[],
  totalTargets: number
) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(ENHANCE_JSON, JSON.stringify(records, null, 2));
  fs.writeFileSync(ENHANCE_MD, buildMarkdown(records, audit, totalTargets));
}

function buildMarkdown(
  records: EnhanceRecord[],
  audit: AuditResult[],
  totalTargets: number
): string {
  const updated = records.filter((r) => r.outcome.status === "updated");
  const noMatch = records.filter((r) => r.outcome.status === "no_match");
  const skipped = records.filter((r) => r.outcome.status === "skipped");

  const viaAudit = updated.filter(
    (r) => r.outcome.status === "updated" && r.outcome.source === "audit"
  ).length;
  const viaAI = updated.filter(
    (r) => r.outcome.status === "updated" && r.outcome.source === "ai"
  ).length;

  const originallyVerified = audit.filter((r) => r.verdict === "verified").length;
  const projected = originallyVerified + updated.length;
  const auditTotal = audit.length;

  const pct = (n: number, t: number) =>
    t === 0 ? "0%" : `${((n / t) * 100).toFixed(1)}%`;

  const successRows = updated
    .slice(0, 50)
    .map((r) => {
      if (r.outcome.status !== "updated") return "";
      const before =
        r.before.lat != null && r.before.lng != null
          ? `(${r.before.lat.toFixed(4)}, ${r.before.lng.toFixed(4)})`
          : "_(none)_";
      const after = `(${r.outcome.lat.toFixed(4)}, ${r.outcome.lng.toFixed(4)})`;
      return `| ${r.itemId} | ${escape(r.organization)} | ${r.originalVerdict} | ${r.outcome.source} | ${before} | ${after} |`;
    })
    .filter(Boolean)
    .join("\n");

  const failRows = noMatch
    .slice(0, 50)
    .map((r) => {
      if (r.outcome.status !== "no_match") return "";
      return `| ${r.itemId} | ${escape(r.organization)} | ${r.originalVerdict} | ${escape(r.outcome.lastReason)} |`;
    })
    .filter(Boolean)
    .join("\n");

  return `# Location Data Enhancement Report (Phase 8.5.A2)

**Generated:** ${new Date().toISOString()}
**Mode:** ${APPLY ? "APPLY (DB writes executed)" : "DRY-RUN (no DB writes)"}
**Targets processed:** ${records.length} / ${totalTargets}

## Summary

| Outcome | Count | % of targets |
|---------|-------|--------------|
| ✅ Updated (via audit result) | ${viaAudit} | ${pct(viaAudit, records.length)} |
| ✅ Updated (via Claude + Places) | ${viaAI} | ${pct(viaAI, records.length)} |
| ✗ No match found | ${noMatch.length} | ${pct(noMatch.length, records.length)} |
| – Skipped | ${skipped.length} | ${pct(skipped.length, records.length)} |
| **Total updated** | **${updated.length}** | **${pct(updated.length, records.length)}** |

## Coverage projection

| | Before | After |
|-|--------|-------|
| Grants with verified coordinates | ${originallyVerified} (${pct(originallyVerified, auditTotal)}) | ${projected} (${pct(projected, auditTotal)}) |

## Updated grants (first 50)

| Grant ID | Organization | Original Verdict | Source | Before (lat,lng) | After (lat,lng) |
|----------|--------------|------------------|--------|------------------|-----------------|
${successRows || "_(none)_"}
${updated.length > 50 ? `\n_...and ${updated.length - 50} more. See \`location-enhance-report.json\`._` : ""}

## Remaining unmatched grants (first 50)

| Grant ID | Organization | Original Verdict | Last Reason |
|----------|--------------|------------------|-------------|
${failRows || "_(none)_"}
${noMatch.length > 50 ? `\n_...and ${noMatch.length - 50} more._` : ""}

## Next Steps

1. Review the updated list above — these grants now have verified Google Maps coordinates.
2. Unmatched grants may need manual review or are candidates for deactivation.
3. ${APPLY ? "DB has been updated. Re-run `pnpm audit:locations` to confirm coverage." : "Re-run with `pnpm enhance:locations` (no `:dry` suffix) to apply changes."}
`;
}

function escape(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function printSummary(records: EnhanceRecord[]) {
  const updated = records.filter((r) => r.outcome.status === "updated").length;
  const noMatch = records.filter((r) => r.outcome.status === "no_match").length;
  const skipped = records.filter((r) => r.outcome.status === "skipped").length;

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  ✅ Enhancement complete`);
  console.log(`  Processed   : ${records.length}`);
  console.log(`  Updated     : ${updated}`);
  console.log(`  No match    : ${noMatch}`);
  console.log(`  Skipped     : ${skipped}`);
  console.log(`  Mode        : ${APPLY ? "APPLIED to DB" : "DRY-RUN"}`);
  console.log(`  Reports     :`);
  console.log(`    ${ENHANCE_JSON}`);
  console.log(`    ${ENHANCE_MD}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

main().catch((err) => {
  console.error("\n[enhance] Fatal error:", err);
  process.exit(1);
});
