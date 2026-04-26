#!/usr/bin/env tsx
/**
 * null-bad-coords.ts
 *
 * One-off cleanup: NULL out `organization_branches.latitude / longitude`
 * for rows whose coordinates fall outside their country's bounding box.
 *
 * Why: a handful of branches geocoded into the wrong country (a "FR" row
 * landing in London) drag the SuperCluster centroid northwest at world
 * zoom — the 521-marker France cluster visually appears over Britain.
 * Setting the bad rows back to NULL lets `pnpm geocode:branches --apply`
 * (which now has a defensive bbox check) re-resolve them cleanly.
 *
 * Default mode is dry-run — pass `--apply` to actually write.
 *
 * Usage:
 *   DATABASE_URL=mysql://… pnpm null:bad-coords          # preview
 *   DATABASE_URL=mysql://… pnpm null:bad-coords:apply    # write
 *
 * Idempotent: safe to re-run. Once a row is NULL it won't be touched.
 */

import "dotenv/config";
import mysql from "mysql2/promise";
import { COUNTRY_BBOX } from "./_country-bbox";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");

const conn = await mysql.createConnection(url);

console.log("\n━━━ null-bad-coords ━━━");
console.log(APPLY ? "Mode: APPLY (writes)" : "Mode: DRY-RUN (no writes — pass --apply to commit)");
console.log("");

let total = 0;

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
      ORDER BY branchId`,
    [code, bbox.latMin, bbox.latMax, bbox.lngMin, bbox.lngMax],
  );

  if (rows.length === 0) {
    console.log(`  ${code}: ✓ all in-bbox`);
    continue;
  }

  total += rows.length;
  console.log(`  ${code}: ${rows.length} out-of-bbox row(s)`);
  for (const r of rows) {
    console.log(`    ${r.branchId} (${r.orgId}, ${r.branchType}) ${r.city ?? "-"} → lat=${r.lat} lng=${r.lng}`);
  }

  if (APPLY) {
    const [result] = await conn.query<any>(
      `UPDATE organization_branches
          SET latitude = NULL,
              longitude = NULL,
              geocodedAt = NULL
        WHERE country = ?
          AND latitude IS NOT NULL
          AND longitude IS NOT NULL
          AND NOT (latitude = 0 AND longitude = 0)
          AND (
            latitude  < ? OR latitude  > ? OR
            longitude < ? OR longitude > ?
          )`,
      [code, bbox.latMin, bbox.latMax, bbox.lngMin, bbox.lngMax],
    );
    console.log(`    → NULLed ${result.affectedRows} row(s) for ${code}`);
  }
}

// Also clean up null-island rows (lat=0 AND lng=0). These passed the prior
// SQL filter but shouldn't be in the table either — re-geocoding will give
// them real coordinates or leave them NULL (still better than 0,0).
const [nullIsland] = await conn.query<any[]>(
  `SELECT branchId, orgId, country, city
     FROM organization_branches
    WHERE latitude = 0 AND longitude = 0`,
);
if (nullIsland.length > 0) {
  console.log(`\n  null-island: ${nullIsland.length} row(s) at (0, 0)`);
  for (const r of nullIsland) {
    console.log(`    ${r.branchId} (${r.orgId}, ${r.country}) ${r.city ?? "-"}`);
  }
  total += nullIsland.length;
  if (APPLY) {
    const [result] = await conn.query<any>(
      `UPDATE organization_branches
          SET latitude = NULL, longitude = NULL, geocodedAt = NULL
        WHERE latitude = 0 AND longitude = 0`,
    );
    console.log(`    → NULLed ${result.affectedRows} null-island row(s)`);
  }
} else {
  console.log("\n  null-island: ✓ none");
}

console.log(`\n━━━ Done. ${total} row(s) ${APPLY ? "NULLed" : "would be NULLed (re-run with --apply)"}. ━━━`);
if (APPLY && total > 0) {
  console.log("Next: GOOGLE_MAPS_API_KEY=… pnpm geocode:branches -- --apply");
}

await conn.end();
process.exit(0);
