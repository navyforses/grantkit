/**
 * find-grant.ts
 *
 * Quick lookup utility: find grants by organization substring or itemId.
 * Returns DB id (the auto-increment primary key), which is what
 * fix-country.ts and other admin scripts expect.
 *
 * Usage:
 *   pnpm tsx scripts/find-grant.ts <keyword>
 *
 * Examples:
 *   pnpm tsx scripts/find-grant.ts ქართუ
 *   pnpm tsx scripts/find-grant.ts FamiCord
 *   pnpm tsx scripts/find-grant.ts item_0053
 */

import "dotenv/config";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  if (!DATABASE_URL) {
    console.error("ERROR: DATABASE_URL not set in .env");
    process.exit(1);
  }

  const [, , keyword] = process.argv;
  if (!keyword) {
    console.error("Usage: pnpm tsx scripts/find-grant.ts <keyword>");
    process.exit(1);
  }

  const db = await mysql.createConnection(DATABASE_URL);
  const pattern = `%${keyword}%`;
  const [rows] = await db.execute<mysql.RowDataPacket[]>(
    `SELECT id, itemId, organization, country, latitude, longitude
       FROM grants
      WHERE organization LIKE ?
         OR itemId LIKE ?
      ORDER BY id
      LIMIT 50`,
    [pattern, pattern],
  );

  if (rows.length === 0) {
    console.log(`No grants found matching '${keyword}'`);
  } else {
    console.table(
      rows.map((r) => ({
        id: r.id,
        itemId: r.itemId,
        organization: String(r.organization ?? "").slice(0, 60),
        country: r.country,
        hasCoords: r.latitude != null && r.longitude != null ? "yes" : "no",
      })),
    );
    console.log(`\n${rows.length} row(s) — use the 'id' column with fix-country.ts`);
  }

  await db.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
