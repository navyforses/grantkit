#!/usr/bin/env tsx
/**
 * geocode-grants.ts
 *
 * Google Places API (New) — Text Search — ავსებს grants ცხრილის
 * latitude, longitude, address, geocodedAt ველებს.
 *
 * რატომ Google Places და არა Mapbox:
 *   Mapbox Geocoding ადგილების/მისამართების ძიებისთვისაა და არა ბიზნეს-
 *   სახელების. "Cochlear Americas, US" Mapbox-ში → "Americas, Canton, MO"
 *   (ქუჩის სახელი, რომლის სიტყვაც ემთხვევა). Google Places Text Search კი
 *   ზუსტად ბიზნესების სახელებზე მუშაობს და ორგანიზაციას
 *   მის რეალურ HQ-ზე აბრუნებს.
 *
 * Query strategy (in order):
 *   1. grant.address (თუ არსებობს) → Text Search
 *   2. "{org}, {city}, {state}, {countryName}"
 *   3. "{org}, {city}, {countryName}"
 *   4. "{org}, {state}, {countryName}"
 *   5. "{org}, {countryName}"
 *   failure → logged to geocode-failed.json
 *
 * Result validation:
 *   - primaryType არ უნდა იყოს country / administrative_area_* / locality / postal_code
 *     (ეს centroid match-ებია და ჩვენ establishment/POI გვინდა)
 *   - დაბრუნებული ქვეყანა უნდა ემთხვეოდეს მოსალოდნელს (საწინააღმდეგო → reject)
 *
 * Rate limit: 150ms delay (~400 req/min). Google Places-ს მკაცრი ლიმიტი არ აქვს,
 *             მაგრამ burst-ებს ერიდება. 643 grants ≈ 2 წუთი.
 *
 * Checkpoint: every 50 grants → .grantkit-redesign/geocode-checkpoint.json
 * Idempotency: WHERE latitude IS NULL AND geocodedAt IS NULL (unless --force)
 *
 * Env vars:
 *   DATABASE_URL           (required)
 *   GOOGLE_MAPS_API_KEY    (required; enable "Places API (New)" in Google Cloud)
 *
 * Usage:
 *   pnpm geocode:grants:dry       # dry-run — no API calls, no DB writes
 *   pnpm geocode:grants:limit10   # test on 10 grants
 *   pnpm geocode:grants           # full run
 *   pnpm geocode:grants -- --force --limit=50   # re-geocode up to 50
 */

import "dotenv/config";
import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DATABASE_URL = process.env.DATABASE_URL;
const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY
  ?? process.env.GOOGLE_PLACES_API_KEY
  ?? process.env.VITE_GOOGLE_MAPS_API_KEY;

const DELAY_MS = 150;
const CHECKPOINT_EVERY = 50;
const CHECKPOINT_PATH = path.resolve(".grantkit-redesign/geocode-checkpoint.json");
const REPORT_PATH = path.resolve("geocode-report.json");
const FAILED_PATH = path.resolve("geocode-failed.json");

const PLACES_URL = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = [
  "places.location",
  "places.formattedAddress",
  "places.displayName",
  "places.primaryType",
  "places.types",
  "places.addressComponents",
].join(",");

// primaryType values that indicate a centroid rather than a real place/business
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

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE   = process.argv.includes("--force");
const NO_HALT = process.argv.includes("--no-halt");
const LIMIT   = parseInt(arg("limit") ?? "999999");
const MAX_FAIL_RATE = parseFloat(arg("max-fail-rate") ?? "0.2"); // default 20%

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GrantRow {
  id: number;
  itemId: string;
  organization: string | null;
  city: string | null;
  state: string | null;
  country: string;
  address: string | null;
  latitude: string | null;
  longitude: string | null;
}

interface Checkpoint {
  lastProcessedId: number;
  totalSuccessful: number; // cumulative across resumed runs
  totalFailed: number;     // cumulative across resumed runs
}

interface FailedGrant {
  id: number;
  itemId: string;
  organization: string | null;
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

// ISO alpha-2 country code → English display name
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

/**
 * Convert a slug-format itemId to a human-readable organization name.
 * Used as fallback when `organization` field is empty but `itemId` contains
 * a slug (e.g., "erasmus-programme" → "Erasmus Programme").
 *
 * Skips pure "item_NNNN" format (those are opaque IDs, not slugs).
 */
function slugToTitle(slug: string | null | undefined): string | null {
  if (!slug) return null;
  const trimmed = slug.trim();
  if (!trimmed) return null;
  // Skip opaque item_NNNN format
  if (/^item_\d+$/i.test(trimmed)) return null;
  // Skip if no dashes (probably not a slug)
  if (!trimmed.includes("-")) return null;
  return trimmed
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function countryName(code: string): string {
  const trimmed = code?.trim().toUpperCase();
  if (!trimmed) return "";
  // If already a long name (e.g. "United States"), return as-is
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
        totalSuccessful: raw.totalSuccessful ?? raw.successful ?? 0,
        totalFailed: raw.totalFailed ?? raw.failed ?? 0,
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
    // ISO-3166-1 alpha-2 for regionCode biasing
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
    return placesSearch(query, regionCode); // one retry
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
  // Reject centroids (country/state/city-level matches, not actual places)
  if (result.primaryType && CENTROID_TYPES.has(result.primaryType)) {
    return { ok: false, reason: `centroid match (primaryType=${result.primaryType})` };
  }
  // Reject country mismatches
  const expected = expectedCountry?.trim().toUpperCase();
  if (expected && expected.length === 2 && result.countryCode && result.countryCode !== expected) {
    return { ok: false, reason: `country mismatch (got ${result.countryCode}, expected ${expected})` };
  }
  return { ok: true };
}

async function geocodeGrant(grant: GrantRow): Promise<
  | { ok: true; result: PlaceResult }
  | { ok: false; attempted: string[]; lastReason: string }
> {
  const queries: string[] = [];

  if (grant.address?.trim()) queries.push(grant.address.trim());

  // Fallback: derive human-readable org from itemId slug when organization is empty
  const org = grant.organization?.trim() || slugToTitle(grant.itemId) || undefined;
  const city = grant.city?.trim();
  const state = grant.state?.trim();
  const cn = countryName(grant.country);

  if (org && city && state && cn) queries.push(`${org}, ${city}, ${state}, ${cn}`);
  if (org && city && cn)          queries.push(`${org}, ${city}, ${cn}`);
  if (org && state && cn)         queries.push(`${org}, ${state}, ${cn}`);
  if (org && cn)                  queries.push(`${org}, ${cn}`);

  // Deduplicate while preserving order
  const unique = Array.from(new Set(queries));
  const regionCode = grant.country?.trim().length === 2 ? grant.country.trim() : undefined;

  let lastReason = "no query candidates";
  const attempted: string[] = [];

  for (const q of unique) {
    attempted.push(q);
    try {
      const result = await placesSearch(q, regionCode);
      if (!result) {
        lastReason = "no Places result";
        await sleep(DELAY_MS);
        continue;
      }
      const validation = isValidResult(result, grant.country);
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
  if (!GOOGLE_KEY && !DRY_RUN) {
    console.error("\n❌  GOOGLE_MAPS_API_KEY not set.");
    console.error("    Enable 'Places API (New)' in Google Cloud Console, then:");
    console.error('    PowerShell: $env:GOOGLE_MAPS_API_KEY = "AIza..."\n');
    process.exit(1);
  }
  if (!DATABASE_URL && !DRY_RUN) {
    console.error("\n❌  DATABASE_URL not set.\n");
    process.exit(1);
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  GrantKit — Geocoding Pipeline (Google Places API)`);
  console.log(`  Dry-run   : ${DRY_RUN ? "✅ YES (no API calls, no DB writes)" : "❌ disabled"}`);
  console.log(`  Force     : ${FORCE ? "⚠️  YES (re-geocode all)" : "no"}`);
  console.log(`  No-halt   : ${NO_HALT ? "YES (never halt on fail rate)" : `no (halt if fail > ${(MAX_FAIL_RATE*100).toFixed(0)}%)`}`);
  console.log(`  Limit     : ${LIMIT === 999999 ? "all" : LIMIT}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  if (DRY_RUN && !DATABASE_URL) {
    console.log("  ℹ️  Dry-run without DATABASE_URL: skipping query preview.\n");
    return;
  }

  const db = await mysql.createConnection(DATABASE_URL!);

  const checkpoint = FORCE
    ? { lastProcessedId: 0, totalSuccessful: 0, totalFailed: 0 }
    : loadCheckpoint();

  if (checkpoint.lastProcessedId > 0) {
    console.log(
      `  ▶ Resuming from id > ${checkpoint.lastProcessedId} ` +
      `(cumulative: ${checkpoint.totalSuccessful} ✓, ${checkpoint.totalFailed} ✗)\n`
    );
  }

  const whereClause = FORCE
    ? `id > ${checkpoint.lastProcessedId}`
    : `latitude IS NULL AND geocodedAt IS NULL AND id > ${checkpoint.lastProcessedId}`;

  const [rows] = await db.execute<mysql.RowDataPacket[]>(
    `SELECT id, itemId, organization, city, state, country, address, latitude, longitude
     FROM grants
     WHERE ${whereClause}
     ORDER BY id ASC
     LIMIT ${LIMIT}`
  );

  const grants = rows as GrantRow[];
  const total = grants.length;

  if (total === 0) {
    console.log("  ✅ No grants need geocoding.\n");
    await db.end();
    return;
  }

  console.log(`  📍 ${total} grants to geocode\n`);

  // Run-scoped counters (NOT pre-seeded from checkpoint → no bleed)
  const failed: FailedGrant[] = [];
  let runSuccess = 0;
  let runFail = 0;
  const startTime = Date.now();

  for (let i = 0; i < grants.length; i++) {
    const grant = grants[i];
    const prefix = `  [${String(i + 1).padStart(3)}/${total}]`;

    if (DRY_RUN) {
      const org = grant.organization?.trim();
      const city = grant.city?.trim();
      const state = grant.state?.trim();
      const cn = countryName(grant.country);
      const preview = grant.address?.trim()
        || [org, city, state, cn].filter(Boolean).join(", ");
      console.log(`${prefix} DRY  ${org || grant.itemId} → "${preview}"`);
      continue;
    }

    try {
      const outcome = await geocodeGrant(grant);
      if (outcome.ok) {
        const r = outcome.result;
        await db.execute(
          `UPDATE grants
             SET latitude = ?, longitude = ?,
                 address = COALESCE(NULLIF(address,''), ?),
                 geocodedAt = NOW()
           WHERE id = ?`,
          [r.lat, r.lng, r.address, grant.id]
        );
        runSuccess++;
        const name = (grant.organization || grant.itemId)?.slice(0, 45);
        console.log(
          `${prefix} ✓  ${name} → (${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}) ${r.primaryType ? `[${r.primaryType}]` : ""}`
        );
      } else {
        runFail++;
        failed.push({
          id: grant.id,
          itemId: grant.itemId,
          organization: grant.organization,
          reason: outcome.lastReason,
          attemptedQueries: outcome.attempted,
        });
        console.log(
          `${prefix} ✗  ${grant.organization || grant.itemId} → ${outcome.lastReason.slice(0, 60)}`
        );
      }
    } catch (err) {
      runFail++;
      const reason = err instanceof Error ? err.message : String(err);
      failed.push({ id: grant.id, itemId: grant.itemId, organization: grant.organization, reason });
      console.log(`${prefix} ✗  ${grant.organization || grant.itemId} → error: ${reason.slice(0, 80)}`);
    }

    if ((i + 1) % CHECKPOINT_EVERY === 0) {
      saveCheckpoint({
        lastProcessedId: grant.id,
        totalSuccessful: checkpoint.totalSuccessful + runSuccess,
        totalFailed: checkpoint.totalFailed + runFail,
      });
      console.log(`\n  💾 Checkpoint saved (processed ${i + 1}/${total})\n`);
    }

    if (i < grants.length - 1) await sleep(DELAY_MS);
  }

  await db.end();

  if (DRY_RUN) {
    console.log(`\n  ✅ Dry-run complete. ${total} grants would be processed.\n`);
    return;
  }

  // Final checkpoint
  const lastGrant = grants[grants.length - 1];
  saveCheckpoint({
    lastProcessedId: lastGrant?.id ?? checkpoint.lastProcessedId,
    totalSuccessful: checkpoint.totalSuccessful + runSuccess,
    totalFailed: checkpoint.totalFailed + runFail,
  });

  if (failed.length > 0) {
    fs.writeFileSync(FAILED_PATH, JSON.stringify(failed, null, 2));
    console.log(`\n  ⚠️  Failed grants written to ${FAILED_PATH}`);
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
    failedGrants: failed,
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  ✅ Geocoding complete (this run)`);
  console.log(`  Run total    : ${total}`);
  console.log(`  Run success  : ${runSuccess} (${successRate}%)`);
  console.log(`  Run failed   : ${runFail}`);
  console.log(`  Duration     : ${(durationMs / 1000).toFixed(1)}s`);
  console.log(`  Report       : ${REPORT_PATH}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // HALT only on THIS RUN's failure rate, not cumulative
  // Skip halt when --no-halt passed (useful for "leftover" batches where high fail rate is expected)
  if (!NO_HALT && total >= 10 && runFail / total > MAX_FAIL_RATE) {
    console.error(`\n  ❌ HALT: run fail rate ${((runFail/total)*100).toFixed(1)}% > ${(MAX_FAIL_RATE*100).toFixed(0)}%. Check geocode-failed.json.`);
    console.error(`     (Use --no-halt or --max-fail-rate=0.9 for leftover batches.)\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n❌ Fatal:", err);
  process.exit(1);
});
