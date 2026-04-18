/**
 * fix-country.ts
 *
 * Quick one-off utility to update a single grant's country code in the live DB.
 * Useful for correcting country mismatches surfaced by geocode-grants.ts.
 *
 * Usage:
 *   pnpm tsx scripts/fix-country.ts <grant_id> <iso_alpha2_country_code>
 *
 * Examples:
 *   pnpm tsx scripts/fix-country.ts 59 GE     # ქართუ ფონდი → Georgia
 *   pnpm tsx scripts/fix-country.ts 13 PL     # FamiCord Group → Poland
 *
 * After running, re-run `pnpm tsx scripts/sync-catalog-coords.ts` so
 * catalog.json picks up the new country value for the frontend bundle.
 */

import "dotenv/config";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  if (!DATABASE_URL) {
    console.error("ERROR: DATABASE_URL not set in .env");
    process.exit(1);
  }

  const [, , idArg, countryArg] = process.argv;
  if (!idArg || !countryArg) {
    console.error(
      "Usage: pnpm tsx scripts/fix-country.ts <grant_id> <iso_alpha2_country_code>",
    );
    console.error("Example: pnpm tsx scripts/fix-country.ts 59 GE");
    process.exit(1);
  }

  const id = Number.parseInt(idArg, 10);
  if (!Number.isInteger(id) || id <= 0) {
    console.error(`ERROR: invalid grant_id '${idArg}' (must be a positive integer)`);
    process.exit(1);
  }

  const country = countryArg.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) {
    console.error(`ERROR: invalid country code '${countryArg}' (must be ISO alpha-2, e.g. US, GE, PL)`);
    process.exit(1);
  }

  const db = await mysql.createConnection(DATABASE_URL);

  // Show current state first
  const [currentRows] = await db.execute<mysql.RowDataPacket[]>(
    "SELECT id, itemId, organization, country FROM grants WHERE id = ?",
    [id],
  );
  if (currentRows.length === 0) {
    console.error(`ERROR: no grant with id=${id}`);
    await db.end();
    process.exit(1);
  }
  const before = currentRows[0];
  console.log(`Before: id=${before.id} itemId=${before.itemId} org="${before.organization}" country=${before.country ?? "NULL"}`);
  console.log(`Updating country → '${country}'...`);

  const [result] = await db.execute(
    "UPDATE grants SET country = ? WHERE id = ?",
    [country, id],
  );
  const affected = (result as mysql.ResultSetHeader).affectedRows ?? 0;
  console.log(`✅ Updated ${affected} row(s).`);

  await db.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
