#!/usr/bin/env tsx
/**
 * audit-branches-coords.ts
 *
 * Read-only sanity check on `organization_branches.latitude / longitude`.
 *
 * Two failure modes hurt the catalog's SuperCluster centroids most:
 *
 *   1. Null-island rows (lat=0, lng=0) — pull every cluster they share
 *      toward the Gulf of Guinea.
 *   2. Country mismatch — a row whose country = 'FR' but whose lat/lng
 *      land in another country's bounding box. One mis-geocoded org can
 *      drift a 400-marker France cluster visibly toward the UK at
 *      world zoom (the bug report from Catalog).
 *
 * Output is grouped by country with counts + a sample of rows so the
 * operator can decide whether to NULL out the bad coordinates and
 * re-run `pnpm geocode:branches:fr`.
 *
 * Usage:
 *   DATABASE_URL=mysql://… pnpm audit:branches:coords
 *
 * Read-only — no UPDATEs.
 */

import "dotenv/config";
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

// Loose lat/lng bounding boxes for the countries we care about.
// Wide enough to allow legitimate suburb/branch locations; tight enough
// to flag a row that's clearly in another country.
const COUNTRY_BBOX: Record<string, { latMin: number; latMax: number; lngMin: number; lngMax: number }> = {
  FR: { latMin: 41.0, latMax: 51.5, lngMin: -5.5, lngMax: 9.8 },
  GB: { latMin: 49.5, latMax: 61.0, lngMin: -8.7, lngMax: 2.0 },
  US: { latMin: 24.0, latMax: 49.5, lngMin: -125.0, lngMax: -66.5 },
  CA: { latMin: 41.5, latMax: 70.0, lngMin: -141.5, lngMax: -52.0 },
  DE: { latMin: 47.2, latMax: 55.1, lngMin: 5.9, lngMax: 15.1 },
  ES: { latMin: 35.9, latMax: 43.9, lngMin: -9.4, lngMax: 4.4 },
  IT: { latMin: 35.5, latMax: 47.1, lngMin: 6.6, lngMax: 18.6 },
  GE: { latMin: 41.0, latMax: 43.6, lngMin: 40.0, lngMax: 46.7 },
};

const conn = await mysql.createConnection(url);

console.log("\n━━━ organization_branches coordinate audit ━━━\n");

// 1. Coverage by country
const [coverage] = await conn.query<any[]>(`
  SELECT country,
         COUNT(*) AS total,
         SUM(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 ELSE 0 END) AS geocoded,
         SUM(CASE WHEN latitude = 0 AND longitude = 0 THEN 1 ELSE 0 END) AS null_island
    FROM organization_branches
   GROUP BY country
   ORDER BY total DESC
`);
console.log("Coverage per country:");
console.table(coverage);

// 2. Null-island rows
const [nullIsland] = await conn.query<any[]>(`
  SELECT branchId, orgId, branchType, country, city, address
    FROM organization_branches
   WHERE latitude = 0 AND longitude = 0
   ORDER BY country, branchId
   LIMIT 50
`);
console.log("\nNull-island rows (lat=0 AND lng=0) — sample of 50:");
if (nullIsland.length === 0) console.log("(none ✓)");
else console.table(nullIsland);

// 3. Per-country mismatches
console.log("\nCountry mismatches (lat/lng outside country's bbox):");
let totalMismatch = 0;
for (const [code, bbox] of Object.entries(COUNTRY_BBOX)) {
  const [rows] = await conn.query<any[]>(
    `SELECT branchId, orgId, branchType, country, city,
            CAST(latitude  AS DECIMAL(10,5)) AS lat,
            CAST(longitude AS DECIMAL(10,5)) AS lng
       FROM organization_branches
      WHERE country = ?
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
        AND NOT (latitude = 0 AND longitude = 0)
        AND (
          latitude  < ? OR latitude  > ? OR
          longitude < ? OR longitude > ?
        )
      ORDER BY branchId
      LIMIT 25`,
    [code, bbox.latMin, bbox.latMax, bbox.lngMin, bbox.lngMax],
  );
  if (rows.length === 0) {
    console.log(`  ${code}: ✓ all in-bbox`);
    continue;
  }
  totalMismatch += rows.length;
  console.log(`  ${code}: ✗ ${rows.length} out-of-bbox (sample)`);
  console.table(rows);
}
if (totalMismatch === 0) {
  console.log("  (no mismatches across audited countries — clusters should track data geometry)");
}

// 4. Cross-check: bounding box of each country's geocoded branches
const [bbox] = await conn.query<any[]>(`
  SELECT country,
         MIN(CAST(latitude  AS DECIMAL(10,5))) AS lat_min,
         MAX(CAST(latitude  AS DECIMAL(10,5))) AS lat_max,
         MIN(CAST(longitude AS DECIMAL(10,5))) AS lng_min,
         MAX(CAST(longitude AS DECIMAL(10,5))) AS lng_max,
         COUNT(*) AS n
    FROM organization_branches
   WHERE latitude IS NOT NULL
     AND longitude IS NOT NULL
     AND NOT (latitude = 0 AND longitude = 0)
   GROUP BY country
   ORDER BY n DESC
`);
console.log("\nObserved lat/lng bounding box per country:");
console.table(bbox);

await conn.end();
process.exit(0);
