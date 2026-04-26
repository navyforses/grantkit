#!/usr/bin/env tsx
/**
 * geocode-branches.ts
 *
 * Fills `organization_branches.latitude / longitude / geocodedAt` for rows
 * whose lat/lng is still NULL. Mirrors `geocode-grants.ts` (Google Places
 * Text Search), but resolves the place using the parent organization's
 * name + the branch's address/city/country.
 *
 * Why this exists:
 *   The France import (Wave 2, PR #176) inserted 624 FR branches but the
 *   HQ rows arrived without coordinates, so the Catalog map filter
 *   (`country=FR + isActive + has lat/lng`) shows zero markers.
 *
 * Query strategy (per branch, in order):
 *   1. branch.address → Text Search (regionCode = country)
 *   2. "{org.name}, {branch.city}, {branch.state}, {countryName}"
 *   3. "{org.name}, {branch.city}, {countryName}"
 *   4. "{org.name}, {countryName}"
 *   failure → logged to geocode-branches-failed.json
 *
 * Result validation (same as geocode-grants.ts):
 *   * primaryType not in CENTROID_TYPES (we want a real place, not a
 *     country/locality centroid).
 *   * country code matches the row's country (when both are alpha-2).
 *
 * DB write (only with --apply):
 *   UPDATE organization_branches
 *      SET latitude = ?, longitude = ?,
 *          source = COALESCE(NULLIF(source,''), 'Google Places'),
 *          geocodedAt = NOW()
 *    WHERE branchId = ?;
 *
 * Default mode is dry-run — pass `--apply` to actually call Places + write
 * to MySQL. Cost: Places Text Search (New) is $32 / 1000 calls; 624 FR
 * branches ≈ $20, comfortably inside Google's $200/mo free credit.
 *
 * Idempotency: WHERE latitude IS NULL AND longitude IS NULL (skipped if
 * already geocoded). `--force` re-geocodes regardless.
 *
 * Env vars:
 *   DATABASE_URL          (required for non-dry runs)
 *   GOOGLE_MAPS_API_KEY   (required for non-dry runs; server key
 *                          "grantkit-server-geocoding-v2" — IP-unrestricted)
 *
 * Usage:
 *   pnpm geocode:branches:dry              # default — preview queries, no API, no DB
 *   pnpm geocode:branches:fr               # --country=FR --apply
 *   pnpm geocode:branches -- --apply --limit=10
 *   pnpm geocode:branches -- --apply --country=FR --force
 */

import "dotenv/config";
import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { isInsideCountryBox } from "./_country-bbox";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DATABASE_URL = process.env.DATABASE_URL;
const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY
  ?? process.env.GOOGLE_PLACES_API_KEY
  ?? process.env.VITE_GOOGLE_MAPS_API_KEY;

const DELAY_MS = 150;
const CHECKPOINT_EVERY = 50;
const CHECKPOINT_PATH = path.resolve(".grantkit-redesign/geocode-branches-checkpoint.json");
const REPORT_PATH = path.resolve("geocode-branches-report.json");
const FAILED_PATH = path.resolve("geocode-branches-failed.json");

const PLACES_URL = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = [
  "places.location",
  "places.formattedAddress",
  "places.displayName",
  "places.primaryType",
  "places.types",
  "places.addressComponents",
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

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------

const arg = (name: string) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];

// Default = dry-run. Pass --apply to enable API calls + DB writes.
const APPLY = process.argv.includes("--apply");
const DRY_RUN = !APPLY || process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");
const NO_HALT = process.argv.includes("--no-halt");
const LIMIT = parseInt(arg("limit") ?? "999999", 10);
const COUNTRY = arg("country")?.trim().toUpperCase() ?? null;
const MAX_FAIL_RATE = parseFloat(arg("max-fail-rate") ?? "0.2");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BranchRow {
  id: number;
  branchId: string;
  orgId: string;
  branchType: "HQ" | "Branch";
  country: string;
  state: string | null;
  city: string | null;
  address: string | null;
  latitude: string | null;
  longitude: string | null;
  orgName: string | null;
}

interface Checkpoint {
  lastProcessedId: number;
  totalSuccessful: number;
  totalFailed: number;
}

interface FailedBranch {
  id: number;
  branchId: string;
  orgId: string;
  orgName: string | null;
  reason: string;
  attemptedQueries?: string[];
}

interface PlaceResult {
  lat: number;
  lng: number;
  address: string;
  displayName: string;
  primaryType: string | null;
  countryCode: string | null;
  query: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function countryName(code: string): string {
  const trimmed = code?.trim().toUpperCase();
  if (!trimmed) return "";
  if (trimmed.length > 3) return code.trim();
  try {
    return regionNames.of(trimmed) ?? code.trim();
  } catch {
    return code.trim();
  }
}

function loadCheckpoint(): Checkpoint {
  try {
    if (fs.existsSync(CHECKPOINT_PATH)) {
      const raw = JSON.parse(fs.readFileSync(CHECKPOINT_PATH, "utf-8"));
      return {
        lastProcessedId: raw.lastProcessedId ?? 0,
        totalSuccessful: raw.totalSuccessful ?? 0,
        totalFailed: raw.totalFailed ?? 0,
      };
    }
  } catch {}
  return { lastProcessedId: 0, totalSuccessful: 0, totalFailed: 0 };
}

function saveCheckpoint(cp: Checkpoint) {
  fs.mkdirSync(path.dirname(CHECKPOINT_PATH), { recursive: true });
  fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(cp, null, 2));
}

// ---------------------------------------------------------------------------
// Google Places Text Search
// ---------------------------------------------------------------------------

interface PlacesApiResponse {
  places?: Array<{
    location?: { latitude: number; longitude: number };
    formattedAddress?: string;
    displayName?: { text: string; languageCode?: string };
    primaryType?: string;
    types?: string[];
    addressComponents?: Array<{
      longText: string;
      shortText: string;
      types: string[];
    }>;
  }>;
}

async function placesSearch(
  query: string,
  regionCode?: string
): Promise<PlaceResult | null> {
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

  const data = (await res.json()) as PlacesApiResponse;
  const place = data.places?.[0];
  if (!place?.location) return null;

  const countryComp = place.addressComponents?.find((c) =>
    c.types?.includes("country")
  );

  return {
    lat: place.location.latitude,
    lng: place.location.longitude,
    address: place.formattedAddress ?? "",
    displayName: place.displayName?.text ?? "",
    primaryType: place.primaryType ?? null,
    countryCode: countryComp?.shortText?.toUpperCase() ?? null,
    query,
  };
}

function isValidResult(result: PlaceResult, expectedCountry: string): { ok: true } | { ok: false; reason: string } {
  if (result.primaryType && CENTROID_TYPES.has(result.primaryType)) {
    return { ok: false, reason: `centroid match (primaryType=${result.primaryType})` };
  }
  const expected = expectedCountry?.trim().toUpperCase();
  if (expected && expected.length === 2 && result.countryCode && result.countryCode !== expected) {
    return { ok: false, reason: `country mismatch (got ${result.countryCode}, expected ${expected})` };
  }
  // Defensive bbox check — Places sometimes omits the country addressComponent
  // (then countryCode = null and the check above passes). If the lat/lng falls
  // outside the country's bounding box, reject so we don't seed the cluster
  // centroid drift bug. Unknown country codes are accepted (no box → no veto).
  if (expected && expected.length === 2 && !isInsideCountryBox(expected, result.lat, result.lng)) {
    return { ok: false, reason: `lat/lng outside ${expected} bbox (got ${result.lat.toFixed(3)}, ${result.lng.toFixed(3)})` };
  }
  return { ok: true };
}

function buildQueries(branch: BranchRow): string[] {
  const queries: string[] = [];
  if (branch.address?.trim()) queries.push(branch.address.trim());

  const org = branch.orgName?.trim();
  const city = branch.city?.trim();
  const state = branch.state?.trim();
  const cn = countryName(branch.country);

  if (org && city && state && cn) queries.push(`${org}, ${city}, ${state}, ${cn}`);
  if (org && city && cn)          queries.push(`${org}, ${city}, ${cn}`);
  if (org && state && cn)         queries.push(`${org}, ${state}, ${cn}`);
  if (org && cn)                  queries.push(`${org}, ${cn}`);

  return Array.from(new Set(queries));
}

async function geocodeBranch(branch: BranchRow): Promise<
  | { ok: true; result: PlaceResult }
  | { ok: false; attempted: string[]; lastReason: string }
> {
  const queries = buildQueries(branch);
  const regionCode = branch.country?.trim().length === 2 ? branch.country.trim() : undefined;

  let lastReason = "no query candidates";
  const attempted: string[] = [];

  for (const q of queries) {
    attempted.push(q);
    try {
      const result = await placesSearch(q, regionCode);
      if (!result) {
        lastReason = "no Places result";
        await sleep(DELAY_MS);
        continue;
      }
      const validation = isValidResult(result, branch.country);
      if (!validation.ok) {
        lastReason = validation.reason;
        await sleep(DELAY_MS);
        continue;
      }
      return { ok: true, result };
    } catch (err) {
      lastReason = err instanceof Error ? err.message : String(err);
      await sleep(DELAY_MS);
    }
  }

  return { ok: false, attempted, lastReason };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!DRY_RUN && !GOOGLE_KEY) {
    console.error("\n❌  GOOGLE_MAPS_API_KEY not set.");
    console.error("    Use the server key 'grantkit-server-geocoding-v2' (IP-unrestricted).");
    console.error('    PowerShell: $env:GOOGLE_MAPS_API_KEY = "AIza..."\n');
    process.exit(1);
  }
  if (!DATABASE_URL) {
    console.error("\n❌  DATABASE_URL not set.\n");
    process.exit(1);
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  GrantKit — Branches Geocoding (Google Places API)`);
  console.log(`  Mode      : ${DRY_RUN ? "✅ DRY-RUN (no API, no DB writes)" : "⚠️  APPLY (live API + DB)"}`);
  console.log(`  Country   : ${COUNTRY ?? "(all)"}`);
  console.log(`  Force     : ${FORCE ? "⚠️  YES (re-geocode all)" : "no"}`);
  console.log(`  No-halt   : ${NO_HALT ? "YES" : `no (halt if fail > ${(MAX_FAIL_RATE*100).toFixed(0)}%)`}`);
  console.log(`  Limit     : ${LIMIT === 999999 ? "all" : LIMIT}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  const db = await mysql.createConnection(DATABASE_URL);

  const checkpoint = FORCE
    ? { lastProcessedId: 0, totalSuccessful: 0, totalFailed: 0 }
    : loadCheckpoint();

  if (checkpoint.lastProcessedId > 0) {
    console.log(
      `  ▶ Resuming from id > ${checkpoint.lastProcessedId} ` +
      `(cumulative: ${checkpoint.totalSuccessful} ✓, ${checkpoint.totalFailed} ✗)\n`
    );
  }

  const where: string[] = [];
  const params: unknown[] = [];
  if (!FORCE) {
    where.push("b.latitude IS NULL", "b.longitude IS NULL");
  }
  if (COUNTRY) {
    where.push("b.country = ?");
    params.push(COUNTRY);
  }
  where.push("b.id > ?");
  params.push(checkpoint.lastProcessedId);

  const sql = `
    SELECT b.id, b.branchId, b.orgId, b.branchType, b.country, b.state, b.city,
           b.address, b.latitude, b.longitude, o.name AS orgName
      FROM organization_branches b
      LEFT JOIN organizations o ON o.orgId = b.orgId
     WHERE ${where.join(" AND ")}
     ORDER BY b.id ASC
     LIMIT ${LIMIT}
  `;

  const [rows] = await db.execute<mysql.RowDataPacket[]>(sql, params);
  const branches = rows as BranchRow[];
  const total = branches.length;

  if (total === 0) {
    console.log("  ✅ No branches need geocoding.\n");
    await db.end();
    return;
  }

  console.log(`  📍 ${total} branches to geocode\n`);

  const failed: FailedBranch[] = [];
  let runSuccess = 0;
  let runFail = 0;
  const startTime = Date.now();

  for (let i = 0; i < branches.length; i++) {
    const branch = branches[i];
    const prefix = `  [${String(i + 1).padStart(3)}/${total}]`;

    if (DRY_RUN) {
      const queries = buildQueries(branch);
      const preview = queries[0] ?? "(no query candidates)";
      console.log(
        `${prefix} DRY  ${branch.branchId} (${branch.branchType}) → "${preview}"` +
        (queries.length > 1 ? `  +${queries.length - 1} fallback` : "")
      );
      continue;
    }

    try {
      const outcome = await geocodeBranch(branch);
      if (outcome.ok) {
        const r = outcome.result;
        await db.execute(
          `UPDATE organization_branches
              SET latitude = ?, longitude = ?,
                  source = COALESCE(NULLIF(source,''), 'Google Places'),
                  geocodedAt = NOW()
            WHERE branchId = ?`,
          [r.lat, r.lng, branch.branchId]
        );
        runSuccess++;
        const label = `${branch.branchId} (${branch.orgName?.slice(0, 30) ?? branch.orgId})`;
        console.log(
          `${prefix} ✓  ${label} → (${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}) ${r.primaryType ? `[${r.primaryType}]` : ""}`
        );
      } else {
        runFail++;
        failed.push({
          id: branch.id,
          branchId: branch.branchId,
          orgId: branch.orgId,
          orgName: branch.orgName,
          reason: outcome.lastReason,
          attemptedQueries: outcome.attempted,
        });
        console.log(
          `${prefix} ✗  ${branch.branchId} → ${outcome.lastReason.slice(0, 70)}`
        );
      }
    } catch (err) {
      runFail++;
      const reason = err instanceof Error ? err.message : String(err);
      failed.push({
        id: branch.id,
        branchId: branch.branchId,
        orgId: branch.orgId,
        orgName: branch.orgName,
        reason,
      });
      console.log(`${prefix} ✗  ${branch.branchId} → error: ${reason.slice(0, 80)}`);
    }

    if ((i + 1) % CHECKPOINT_EVERY === 0) {
      saveCheckpoint({
        lastProcessedId: branch.id,
        totalSuccessful: checkpoint.totalSuccessful + runSuccess,
        totalFailed: checkpoint.totalFailed + runFail,
      });
      console.log(`\n  💾 Checkpoint saved (processed ${i + 1}/${total})\n`);
    }

    if (i < branches.length - 1) await sleep(DELAY_MS);
  }

  await db.end();

  if (DRY_RUN) {
    console.log(`\n  ✅ Dry-run complete. ${total} branches would be processed.`);
    console.log(`     Re-run with --apply to call Places + write to DB.\n`);
    return;
  }

  const lastBranch = branches[branches.length - 1];
  saveCheckpoint({
    lastProcessedId: lastBranch?.id ?? checkpoint.lastProcessedId,
    totalSuccessful: checkpoint.totalSuccessful + runSuccess,
    totalFailed: checkpoint.totalFailed + runFail,
  });

  if (failed.length > 0) {
    fs.writeFileSync(FAILED_PATH, JSON.stringify(failed, null, 2));
    console.log(`\n  ⚠️  Failed branches written to ${FAILED_PATH}`);
  }

  const durationMs = Date.now() - startTime;
  const successRate = total > 0 ? ((runSuccess / total) * 100).toFixed(1) : "0";

  const report = {
    runTotal: total,
    runSuccessful: runSuccess,
    runFailed: runFail,
    runSuccessRate: `${successRate}%`,
    cumulativeSuccessful: checkpoint.totalSuccessful + runSuccess,
    cumulativeFailed: checkpoint.totalFailed + runFail,
    duration_ms: durationMs,
    countryFilter: COUNTRY,
    failedBranches: failed,
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  ✅ Branches geocoding complete (this run)`);
  console.log(`  Run total    : ${total}`);
  console.log(`  Run success  : ${runSuccess} (${successRate}%)`);
  console.log(`  Run failed   : ${runFail}`);
  console.log(`  Duration     : ${(durationMs / 1000).toFixed(1)}s`);
  console.log(`  Report       : ${REPORT_PATH}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  if (!NO_HALT && total >= 10 && runFail / total > MAX_FAIL_RATE) {
    console.error(`\n  ❌ HALT: run fail rate ${((runFail/total)*100).toFixed(1)}% > ${(MAX_FAIL_RATE*100).toFixed(0)}%. Check ${FAILED_PATH}.`);
    console.error(`     (Use --no-halt or --max-fail-rate=0.9 for leftover batches.)\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n❌ Fatal:", err);
  process.exit(1);
});
