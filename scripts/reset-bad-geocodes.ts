#!/usr/bin/env tsx
/**
 * reset-bad-geocodes.ts
 *
 * Nulls out geocoded fields (latitude, longitude, address, geocodedAt) for
 * specified id range so they can be re-geocoded from scratch.
 *
 * Default: resets ids 11-20 (the 10 grants written by the initial Mapbox run,
 *          all of which turned out to be street-name hallucinations).
 *
 * Usage:
 *   pnpm tsx scripts/reset-bad-geocodes.ts                # ids 11..20
 *   pnpm tsx scripts/reset-bad-geocodes.ts --from=11 --to=20
 *   pnpm tsx scripts/reset-bad-geocodes.ts --all          # reset every geocoded grant
 *   pnpm tsx scripts/reset-bad-geocodes.ts --dry-run      # preview, don't write
 */

import "dotenv/config";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not set");
  process.exit(1);
}

const arg = (name: string) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];

const DRY_RUN = process.argv.includes("--dry-run");
const ALL = process.argv.includes("--all");
const FROM = parseInt(arg("from") ?? "11");
const TO = parseInt(arg("to") ?? "20");

async function main() {
  const db = await mysql.createConnection(DATABASE_URL!);

  const whereClause = ALL
    ? "latitude IS NOT NULL"
    : `id BETWEEN ${FROM} AND ${TO} AND latitude IS NOT NULL`;

  // Preview
  const [preview] = await db.query<any[]>(
    `SELECT id, itemId, LEFT(organization, 40) AS organization, country,
            latitude, longitude, LEFT(address, 60) AS address
     FROM grants WHERE ${whereClause} ORDER BY id ASC`
  );

  console.log(`\n=== Will reset ${preview.length} grant(s) ===`);
  if (preview.length === 0) {
    console.log("(nothing to reset)");
    await db.end();
    return;
  }
  console.table(preview);

  if (DRY_RUN) {
    console.log("\n✅ DRY-RUN — no changes written.\n");
    await db.end();
    return;
  }

  const [result] = await db.execute<any>(
    `UPDATE grants
     SET latitude = NULL, longitude = NULL, address = NULL, geocodedAt = NULL
     WHERE ${whereClause}`
  );

  console.log(`\n✅ Reset ${result.affectedRows} grant(s). Ready for re-geocoding.\n`);
  await db.end();
}

main().catch((err) => {
  console.error("❌", err);
  process.exit(1);
});
