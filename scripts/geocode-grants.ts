#!/usr/bin/env tsx
/**
 * geocode-grants.ts
 *
 * Mapbox Geocoding API-ის გამოყენებით ავსებს grants ცხრილის
 * latitude, longitude, address, geocodedAt ველებს.
 *
 * Query strategy (in order):
 *   1. grant.address non-empty → geocode directly
 *   2. {organization}, {city}, {country}
 *   3. {organization}, {country}
 *   4. failure → logged to geocode-failed.json
 *
 * Rate limit: 110ms delay between calls (~545 req/min, Mapbox free = 600/min)
 * Checkpoint: every 50 grants → .grantkit-redesign/geocode-checkpoint.json
 * Idempotency: WHERE latitude IS NULL AND geocodedAt IS NULL (unless --force)
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
const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

const DELAY_MS = 110;          // 110ms = ~545 req/min, safe under 600 free-tier limit
const CHECKPOINT_EVERY = 50;
const CHECKPOINT_PATH = path.resolve(".grantkit-redesign/geocode-checkpoint.json");
const REPORT_PATH = path.resolve("geocode-report.json");
const FAILED_PATH = path.resolve("geocode-failed.json");

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------

const arg = (name: string) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE   = process.argv.includes("--force");
const LIMIT   = parseInt(arg("limit") ?? "999999");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GrantRow {
  id: number;
  itemId: string;
  organization: string | null;
  city: string | null;
  country: string;
  address: string | null;
  latitude: string | null;
  longitude: string | null;
}

interface Checkpoint {
  lastProcessedId: number;
  successful: number;
  failed: number;
}

interface FailedGrant {
  id: number;
  itemId: string;
  organization: string | null;
  reason: string;
}

// ---------------------------------------------------------------------------
// Checkpoint helpers
// ---------------------------------------------------------------------------

function loadCheckpoint(): Checkpoint {
  try {
    if (fs.existsSync(CHECKPOINT_PATH)) {
      return JSON.parse(fs.readFileSync(CHECKPOINT_PATH, "utf-8"));
    }
  } catch {}
  return { lastProcessedId: 0, successful: 0, failed: 0 };
}

function saveCheckpoint(cp: Checkpoint) {
  fs.mkdirSync(path.dirname(CHECKPOINT_PATH), { recursive: true });
  fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(cp, null, 2));
}

// ---------------------------------------------------------------------------
// Rate limiter
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Mapbox Geocoding API
// ---------------------------------------------------------------------------

interface MapboxFeature {
  center: [number, number]; // [longitude, latitude]
  place_name: string;
}

interface MapboxResponse {
  features: MapboxFeature[];
}

async function geocodeQuery(query: string): Promise<{ lat: number; lng: number; placeName: string } | null> {
  const encoded = encodeURIComponent(query);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${MAPBOX_TOKEN}&limit=1&types=address,place,poi`;

  const res = await fetch(url);

  if (res.status === 429) {
    // Back off 5s then retry once
    await sleep(5000);
    const retry = await fetch(url);
    if (!retry.ok) return null;
    const data = (await retry.json()) as MapboxResponse;
    return extractResult(data);
  }

  if (!res.ok) {
    throw new Error(`Mapbox API ${res.status}: ${await res.text().catch(() => "")}`);
  }

  const data = (await res.json()) as MapboxResponse;
  return extractResult(data);
}

function extractResult(data: MapboxResponse): { lat: number; lng: number; placeName: string } | null {
  const feature = data.features?.[0];
  if (!feature) return null;
  const [lng, lat] = feature.center;
  return { lat, lng, placeName: feature.place_name };
}

async function geocodeGrant(grant: GrantRow): Promise<{ lat: number; lng: number; placeName: string } | null> {
  const queries: string[] = [];

  if (grant.address?.trim()) {
    queries.push(grant.address.trim());
  }

  const org = grant.organization?.trim();
  const city = grant.city?.trim();
  const country = grant.country?.trim();

  if (org && city && country) queries.push(`${org}, ${city}, ${country}`);
  if (org && country)          queries.push(`${org}, ${country}`);
  if (city && country)         queries.push(`${city}, ${country}`);
  if (country)                 queries.push(country);

  for (const q of queries) {
    const result = await geocodeQuery(q);
    if (result) return result;
    await sleep(DELAY_MS);
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // --- Guard checks ---
  if (!MAPBOX_TOKEN && !DRY_RUN) {
    console.error("\n❌  MAPBOX_ACCESS_TOKEN not set.\n");
    process.exit(1);
  }
  if (!DATABASE_URL && !DRY_RUN) {
    console.error("\n❌  DATABASE_URL not set.\n");
    process.exit(1);
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  GrantKit — Geocoding Pipeline (Mapbox)`);
  console.log(`  Dry-run   : ${DRY_RUN ? "✅ YES (no API calls, no DB writes)" : "❌ disabled"}`);
  console.log(`  Force     : ${FORCE ? "⚠️  YES (re-geocode all)" : "no"}`);
  console.log(`  Limit     : ${LIMIT === 999999 ? "all" : LIMIT}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  if (DRY_RUN && !DATABASE_URL) {
    console.log("  ℹ️  Dry-run without DATABASE_URL: printing example query strategy only.\n");
    console.log("  [  1/???] DRY  Example Grant → would query: \"Organization Name, City, Country\"");
    console.log("\n  ✅ Dry-run complete. Set DATABASE_URL to run against real data.\n");
    return;
  }

  const db = await mysql.createConnection(DATABASE_URL!);

  // Load checkpoint (resume support)
  const checkpoint = FORCE ? { lastProcessedId: 0, successful: 0, failed: 0 } : loadCheckpoint();
  if (checkpoint.lastProcessedId > 0) {
    console.log(`  ▶ Resuming from id > ${checkpoint.lastProcessedId} (prev: ${checkpoint.successful} ✓, ${checkpoint.failed} ✗)\n`);
  }

  // Query grants
  const whereClause = FORCE
    ? `id > ${checkpoint.lastProcessedId}`
    : `latitude IS NULL AND geocodedAt IS NULL AND id > ${checkpoint.lastProcessedId}`;

  const [rows] = await db.execute<mysql.RowDataPacket[]>(
    `SELECT id, itemId, organization, city, country, address, latitude, longitude
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

  const failed: FailedGrant[] = [];
  let successful = checkpoint.successful;
  let failCount  = checkpoint.failed;
  const startTime = Date.now();

  for (let i = 0; i < grants.length; i++) {
    const grant = grants[i];
    const prefix = `  [${String(i + 1).padStart(3)}/${total}]`;

    if (DRY_RUN) {
      const query = grant.address?.trim()
        || [grant.organization, grant.city, grant.country].filter(Boolean).join(", ")
        || grant.country;
      console.log(`${prefix} DRY  ${grant.organization || grant.itemId} → would query: "${query}"`);
      continue;
    }

    try {
      const result = await geocodeGrant(grant);

      if (result) {
        await db.execute(
          `UPDATE grants SET latitude = ?, longitude = ?, address = COALESCE(NULLIF(address,''), ?), geocodedAt = NOW() WHERE id = ?`,
          [result.lat, result.lng, result.placeName, grant.id]
        );
        successful++;
        console.log(`${prefix} ✓  ${(grant.organization || grant.itemId)?.slice(0, 50)} → (${result.lat.toFixed(4)}, ${result.lng.toFixed(4)})`);
      } else {
        failCount++;
        failed.push({ id: grant.id, itemId: grant.itemId, organization: grant.organization, reason: "No Mapbox result" });
        console.log(`${prefix} ✗  ${grant.organization || grant.itemId} → no result`);
      }
    } catch (err) {
      failCount++;
      const reason = err instanceof Error ? err.message : String(err);
      failed.push({ id: grant.id, itemId: grant.itemId, organization: grant.organization, reason });
      console.log(`${prefix} ✗  ${grant.organization || grant.itemId} → error: ${reason.slice(0, 80)}`);
    }

    // Checkpoint every N grants
    if ((i + 1) % CHECKPOINT_EVERY === 0) {
      checkpoint.lastProcessedId = grant.id;
      checkpoint.successful = successful;
      checkpoint.failed = failCount;
      saveCheckpoint(checkpoint);
      console.log(`\n  💾 Checkpoint saved (processed ${i + 1}/${total})\n`);
    }

    // Rate limit
    if (i < grants.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  await db.end();

  if (DRY_RUN) {
    console.log(`\n  ✅ Dry-run complete. ${total} grants would be processed.\n`);
    return;
  }

  // Final checkpoint
  const lastGrant = grants[grants.length - 1];
  saveCheckpoint({ lastProcessedId: lastGrant?.id ?? 0, successful, failed: failCount });

  // Write failed grants
  if (failed.length > 0) {
    fs.writeFileSync(FAILED_PATH, JSON.stringify(failed, null, 2));
    console.log(`\n  ⚠️  Failed grants written to ${FAILED_PATH}`);
  }

  const durationMs = Date.now() - startTime;
  const successRate = total > 0 ? ((successful / total) * 100).toFixed(1) : "0";

  const report = {
    total,
    successful,
    failed: failCount,
    successRate: `${successRate}%`,
    duration_ms: durationMs,
    failedGrants: failed,
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  ✅ Geocoding complete`);
  console.log(`  Total    : ${total}`);
  console.log(`  Success  : ${successful} (${successRate}%)`);
  console.log(`  Failed   : ${failCount}`);
  console.log(`  Duration : ${(durationMs / 1000).toFixed(1)}s`);
  console.log(`  Report   : ${REPORT_PATH}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  if (failCount / total > 0.2) {
    console.error(`\n  ❌ HALT: success rate ${successRate}% < 80%. Check geocode-failed.json.\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n❌ Fatal:", err);
  process.exit(1);
});
