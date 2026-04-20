#!/usr/bin/env tsx
/**
 * audit-locations.ts
 *
 * Queries every active grant and classifies its address/geocoding data quality
 * using the Google Maps Geocoding API.
 *
 * Output (read-only — no DB writes):
 *   .grantkit-redesign/location-audit-report.json   full per-grant detail
 *   .grantkit-redesign/location-audit-report.md     markdown summary table
 *
 * Env vars required:
 *   DATABASE_URL
 *   GOOGLE_MAPS_API_KEY  (preferred — server key, no referrer restrictions)
 *   VITE_GOOGLE_MAPS_BROWSER_KEY  (fallback; browser key may 403 from server)
 *
 * Usage:
 *   pnpm audit:locations:sample   # 20-grant smoke test
 *   pnpm audit:locations          # full run (~5 min for 643 grants)
 */

import "dotenv/config";
import { getDb } from "../server/db";
import { grants } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const GOOGLE_MAPS_API_KEY =
  process.env.GOOGLE_MAPS_API_KEY ??
  process.env.GOOGLE_PLACES_API_KEY ??
  process.env.VITE_GOOGLE_MAPS_BROWSER_KEY;

const args = process.argv.slice(2);
const limitArg = args.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1], 10) : null;

const DELAY_MS = 200; // 5 req/sec — well below Google's 50/sec free quota
const REPORT_DIR = path.resolve(".grantkit-redesign");
const JSON_REPORT = path.join(REPORT_DIR, "location-audit-report.json");
const MD_REPORT = path.join(REPORT_DIR, "location-audit-report.md");

const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";

// ---------------------------------------------------------------------------
// Types
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

interface GeoResult {
  status: "found" | "not_found" | "error";
  formattedAddress: string | null;
  lat: number | null;
  lng: number | null;
  placeId: string | null;
  confidence: "high" | "medium" | "low" | null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function auditAllGrants() {
  if (!GOOGLE_MAPS_API_KEY) {
    console.error(
      "Missing Google Maps API key. Set GOOGLE_MAPS_API_KEY (preferred server key) or VITE_GOOGLE_MAPS_BROWSER_KEY."
    );
    process.exit(1);
  }

  const db = await getDb();
  if (!db) {
    console.error("Cannot connect to database — DATABASE_URL not set or connection failed.");
    process.exit(1);
  }

  let allGrants = await db
    .select()
    .from(grants)
    .where(eq(grants.isActive, true));

  if (LIMIT) {
    console.log(`[audit] --limit=${LIMIT}: auditing sample of ${LIMIT} grants.`);
    allGrants = allGrants.slice(0, LIMIT);
  }

  console.log(`[audit] Auditing ${allGrants.length} active grants...`);

  const results: AuditResult[] = [];
  let processed = 0;

  for (const grant of allGrants) {
    const result = await auditSingleGrant(grant);
    results.push(result);
    processed++;

    if (processed % 10 === 0) {
      console.log(`[audit] Progress: ${processed}/${allGrants.length}`);
      saveReport(results, "partial");
    }

    await sleep(DELAY_MS);
  }

  saveReport(results, "final");
  printSummary(results);
}

// ---------------------------------------------------------------------------
// Per-grant audit
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function auditSingleGrant(grant: any): Promise<AuditResult> {
  const hasStoredAddress = !!grant.address && grant.address.trim().length > 0;
  const storedLat = grant.latitude != null ? parseFloat(String(grant.latitude)) : null;
  const storedLng = grant.longitude != null ? parseFloat(String(grant.longitude)) : null;
  const hasStoredCoords = storedLat !== null && storedLng !== null;

  const queries = buildQueries(grant);

  let googleResult: AuditResult["googleResult"] = {
    query: "",
    status: "not_found",
    foundAddress: null,
    foundLat: null,
    foundLng: null,
    placeId: null,
    confidence: null,
    discrepancyFromStored: null,
  };

  for (const query of queries) {
    const raw = await queryGoogleMaps(query);
    googleResult.query = query;

    if (raw.status === "found") {
      googleResult = {
        query,
        status: "found",
        foundAddress: raw.formattedAddress,
        foundLat: raw.lat,
        foundLng: raw.lng,
        placeId: raw.placeId,
        confidence: raw.confidence,
        discrepancyFromStored: calculateDiscrepancy(
          storedLat,
          storedLng,
          raw.lat!,
          raw.lng!
        ),
      };
      break;
    }
    if (raw.status === "error") {
      googleResult.status = "error";
      break;
    }
  }

  const verdict = classifyResult(googleResult, hasStoredAddress, hasStoredCoords);
  const notes = generateNotes(grant, googleResult, verdict);

  return {
    grantId: grant.id,
    itemId: grant.itemId,
    organization: grant.organization || "(no organization)",
    currentAddress: grant.address ?? null,
    currentLat: storedLat,
    currentLng: storedLng,
    hasStoredAddress,
    hasStoredCoords,
    googleResult,
    verdict,
    notes,
  };
}

// ---------------------------------------------------------------------------
// Query strategy
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildQueries(grant: any): string[] {
  const queries: string[] = [];

  // Strategy 1: stored address + org
  if (grant.address && grant.organization) {
    queries.push(`${grant.organization}, ${grant.address}`);
  } else if (grant.address) {
    queries.push(grant.address);
  }

  // Strategy 2: org + city + country
  if (grant.organization && grant.city && grant.country) {
    queries.push(`${grant.organization}, ${grant.city}, ${grant.country}`);
  }

  // Strategy 3: org + country
  if (grant.organization && grant.country) {
    queries.push(`${grant.organization}, ${grant.country}`);
  }

  // Strategy 4: "org Foundation" variant for orgs that may be stored abbreviated
  if (
    grant.organization &&
    !grant.organization.toLowerCase().includes("foundation")
  ) {
    queries.push(
      `${grant.organization} Foundation, ${grant.country || ""}`.trim()
    );
  }

  // Strategy 5: org name alone
  if (grant.organization) {
    queries.push(grant.organization);
  }

  return queries.filter((q) => q.trim().length > 0);
}

// ---------------------------------------------------------------------------
// Google Maps Geocoding API
// ---------------------------------------------------------------------------

async function queryGoogleMaps(query: string): Promise<GeoResult> {
  try {
    const url = `${GEOCODE_URL}?address=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(url);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await response.json();

    if (data.status === "OK" && data.results.length > 0) {
      const result = data.results[0];
      const types: string[] = result.types ?? [];

      let confidence: "high" | "medium" | "low" = "low";
      if (types.includes("establishment") || types.includes("point_of_interest")) {
        confidence = "high";
      } else if (
        types.includes("street_address") ||
        types.includes("premise") ||
        types.includes("subpremise")
      ) {
        confidence = "medium";
      }

      return {
        status: "found",
        formattedAddress: result.formatted_address,
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        placeId: result.place_id,
        confidence,
      };
    }

    if (data.status === "ZERO_RESULTS") {
      return {
        status: "not_found",
        formattedAddress: null,
        lat: null,
        lng: null,
        placeId: null,
        confidence: null,
      };
    }

    console.warn(`[audit] API status "${data.status}" for query: "${query}"`);
    return {
      status: "error",
      formattedAddress: null,
      lat: null,
      lng: null,
      placeId: null,
      confidence: null,
    };
  } catch (err) {
    console.error(`[audit] Fetch error for "${query}":`, err);
    return {
      status: "error",
      formattedAddress: null,
      lat: null,
      lng: null,
      placeId: null,
      confidence: null,
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calculateDiscrepancy(
  storedLat: number | null,
  storedLng: number | null,
  foundLat: number,
  foundLng: number
): "match" | "close" | "far" | "no_stored" {
  if (storedLat === null || storedLng === null) return "no_stored";
  const dist = haversineKm(storedLat, storedLng, foundLat, foundLng);
  if (dist < 0.1) return "match"; // < 100 m
  if (dist < 5) return "close";   // < 5 km
  return "far";
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function classifyResult(
  google: AuditResult["googleResult"],
  hasStored: boolean,
  hasCoords: boolean
): AuditResult["verdict"] {
  if (google.status === "error") return "error";

  if (google.status === "not_found") {
    if (!hasStored && !hasCoords) return "missing_data";
    return "not_found_by_name";
  }

  // Google found something
  if (google.confidence === "low") return "ambiguous";

  const disc = google.discrepancyFromStored;
  if (disc === "match" || disc === "close") return "verified";
  if (disc === "far" || disc === "no_stored") return "needs_update";

  return "needs_update";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateNotes(grant: any, google: AuditResult["googleResult"], verdict: string): string[] {
  const notes: string[] = [];

  if (!grant.organization || grant.organization.trim().length === 0) {
    notes.push("WARNING: grant has no organization name");
  } else if (grant.organization.trim().length < 5) {
    notes.push("Organization name very short — may be incomplete");
  }

  if (!grant.address && !grant.latitude) {
    notes.push("No stored address or coordinates");
  }

  if (google.status === "found" && google.confidence === "low") {
    notes.push(`Google result low confidence: ${google.foundAddress}`);
  }

  if (google.discrepancyFromStored === "far") {
    notes.push("Google location differs significantly from stored — may be wrong org or stale coords");
  }

  if (verdict === "not_found_by_name") {
    notes.push("All query strategies failed — org name may be typo, incomplete, or defunct");
  }

  return notes;
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function saveReport(results: AuditResult[], stage: "partial" | "final") {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(JSON_REPORT, JSON.stringify(results, null, 2));

  if (stage === "final") {
    fs.writeFileSync(MD_REPORT, buildMarkdownReport(results));
    console.log(`[audit] Reports saved:\n  ${JSON_REPORT}\n  ${MD_REPORT}`);
  }
}

function buildMarkdownReport(results: AuditResult[]): string {
  const byVerdict = groupBy(results, (r) => r.verdict);

  const total = results.length;
  const verified = (byVerdict["verified"] ?? []).length;
  const needsUpdate = (byVerdict["needs_update"] ?? []).length;
  const notFound = (byVerdict["not_found_by_name"] ?? []).length;
  const ambiguous = (byVerdict["ambiguous"] ?? []).length;
  const missing = (byVerdict["missing_data"] ?? []).length;
  const errors = (byVerdict["error"] ?? []).length;

  const pct = (n: number) => `${((n / total) * 100).toFixed(1)}%`;

  const notFoundRows = (byVerdict["not_found_by_name"] ?? [])
    .slice(0, 50)
    .map(
      (r) =>
        `| ${r.itemId} | ${r.organization} | ${r.currentAddress ?? "-"} |`
    )
    .join("\n");

  const missingRows = (byVerdict["missing_data"] ?? [])
    .slice(0, 30)
    .map((r) => `| ${r.itemId} | ${r.organization} |`)
    .join("\n");

  return `# Location Data Audit Report

**Generated:** ${new Date().toISOString()}
**Total grants audited:** ${total}${LIMIT ? ` (sample — full DB has more)` : ""}

## Summary

| Verdict | Count | % | Action Needed |
|---------|-------|---|---------------|
| ✅ Verified | ${verified} | ${pct(verified)} | None — data is accurate |
| 🔄 Needs update | ${needsUpdate} | ${pct(needsUpdate)} | Update lat/lng + address with Google's version |
| 🔍 Not found by name | ${notFound} | ${pct(notFound)} | Manual review — org name may be wrong/incomplete |
| ❓ Ambiguous | ${ambiguous} | ${pct(ambiguous)} | Manual review — multiple possible matches |
| 📭 Missing data | ${missing} | ${pct(missing)} | No stored data AND Google can't find — likely delete |
| ⚠️ Errors | ${errors} | ${pct(errors)} | Retry — API errors during audit |

**Total:** ${verified + needsUpdate + notFound + ambiguous + missing + errors} (should equal ${total})

## Organizations not found by name (${notFound})

These grants reference an organization that Google Maps cannot locate via
any query strategy. Likely causes: typo in name, org renamed, defunct,
or never was a real grant-giver.

| Grant ID | Organization | Stored Address |
|----------|--------------|----------------|
${notFoundRows || "_(none)_"}
${notFound > 50 ? `\n_...and ${notFound - 50} more. See location-audit-report.json for full list._` : ""}

## Missing data entirely (${missing})

No stored address, no coordinates, and Google cannot locate. Strong
candidates for deletion or manual enrichment.

| Grant ID | Organization |
|----------|--------------|
${missingRows || "_(none)_"}
${missing > 30 ? `\n_...and ${missing - 30} more._` : ""}

## Recommendations

1. **${needsUpdate} grants can be auto-updated** — they exist in Google's
   database; their stored address/coords are stale or absent.
   Phase 8.5.A2 will update them with Google's verified coordinates.

2. **${notFound} grants not found by name** — either:
   (a) Organization name needs correction (Phase 8.5.A2 AI enhancement step)
   (b) Organization is defunct — delete

3. **${missing} grants missing all location data** — strong deletion
   candidates. Confirm with user before Phase 8.5.A2.

4. **${ambiguous} ambiguous grants** — need human review. Phase 8.5.A2
   will provide an admin queue for these.

5. **${errors} errors** — rerun the audit for these specific grants.

## Next Steps

Review this report, then proceed to Phase 8.5.A2 (Location Fix + Cleanup).

**Decision gate before Phase 8.5.A2:**
- Are the "verified" numbers acceptable?
- For "not_found_by_name" — AI enhancement attempt first, or direct delete?
- For "missing_data" — confirm deletion is acceptable?
`;
}

function printSummary(results: AuditResult[]) {
  const byVerdict = groupBy(results, (r) => r.verdict);
  console.log("\n=== AUDIT COMPLETE ===");
  console.log(`Total audited: ${results.length}`);
  for (const verdict of [
    "verified",
    "needs_update",
    "not_found_by_name",
    "ambiguous",
    "missing_data",
    "error",
  ]) {
    const count = (byVerdict[verdict] ?? []).length;
    const pct = ((count / results.length) * 100).toFixed(1);
    console.log(`  ${verdict.padEnd(25)} ${count.toString().padStart(4)} (${pct}%)`);
  }
  const sum = results.reduce(
    (acc, r) =>
      acc +
      (["verified", "needs_update", "not_found_by_name", "ambiguous", "missing_data", "error"].includes(
        r.verdict
      )
        ? 1
        : 0),
    0
  );
  console.log(`  ${"TOTAL".padEnd(25)} ${sum.toString().padStart(4)}`);
  console.log(`\nReports: ${REPORT_DIR}/`);
}

function groupBy<T>(arr: T[], keyFn: (t: T) => string): Record<string, T[]> {
  return arr.reduce(
    (acc, item) => {
      const key = keyFn(item);
      acc[key] = acc[key] ?? [];
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, T[]>
  );
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

auditAllGrants().catch((err) => {
  console.error("[audit] Fatal error:", err);
  process.exit(1);
});
