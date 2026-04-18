/**
 * sync-catalog-coords.ts
 *
 * Reads lat/lng/address + geo metadata from the live MySQL `grants` table and
 * merges them into `client/src/data/catalog.json`. Without this, the static
 * catalog bundled on the frontend has no coordinates (MapPanel filters them out)
 * and no proper country codes (Region filters + countryCount stat break).
 *
 * Matching key: DB `itemId` (varchar) ↔ JSON item `id` (e.g. "item_0408").
 *
 * Fields synced from DB:
 *   - latitude, longitude, address (coordinates for MapPanel)
 *   - country, city, state (filters + stats bar)
 *
 * Only non-empty DB values overwrite catalog values — if DB has NULL/empty,
 * the catalog value is preserved.
 *
 * Usage:
 *   pnpm tsx scripts/sync-catalog-coords.ts           # write back to catalog.json
 *   pnpm tsx scripts/sync-catalog-coords.ts --dry-run # just report counts
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
const DRY_RUN = process.argv.includes("--dry-run");

const CATALOG_PATH = path.resolve(
  process.cwd(),
  "client/src/data/catalog.json",
);

interface GrantRow {
  itemId: string;
  latitude: string | null;
  longitude: string | null;
  address: string | null;
  country: string | null;
  city: string | null;
  state: string | null;
}

interface CatalogItem {
  id?: string;
  itemId?: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  country?: string | null;
  city?: string | null;
  state?: string | null;
  [k: string]: unknown;
}

function nonEmpty(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t.length ? t : null;
}

async function main() {
  if (!DATABASE_URL) {
    console.error("ERROR: DATABASE_URL not set in .env");
    process.exit(1);
  }
  if (!fs.existsSync(CATALOG_PATH)) {
    console.error(`ERROR: catalog.json not found at ${CATALOG_PATH}`);
    process.exit(1);
  }

  console.log(`Dry run: ${DRY_RUN ? "YES" : "no (will write file)"}`);
  console.log(`Reading catalog: ${CATALOG_PATH}`);

  const raw = fs.readFileSync(CATALOG_PATH, "utf-8");
  const items = JSON.parse(raw) as CatalogItem[];
  console.log(`Catalog items: ${items.length}`);

  const db = await mysql.createConnection(DATABASE_URL);

  const [rows] = await db.execute<mysql.RowDataPacket[]>(
    `SELECT itemId, latitude, longitude, address, country, city, state
       FROM grants
      WHERE isActive = 1`,
  );
  const grants = rows as GrantRow[];
  const withCoords = grants.filter(
    (g) => g.latitude != null && g.longitude != null,
  ).length;
  console.log(`DB active grants: ${grants.length} (with coords: ${withCoords})`);

  const byItemId = new Map<string, GrantRow>();
  for (const g of grants) byItemId.set(g.itemId, g);

  let matched = 0;
  let missing = 0;
  let countryChanged = 0;
  let cityChanged = 0;
  let stateChanged = 0;

  const merged = items.map((item) => {
    const key = item.itemId ?? item.id;
    if (!key) {
      missing++;
      return item;
    }
    const row = byItemId.get(String(key));
    if (!row) {
      missing++;
      return item;
    }
    matched++;

    const dbCountry = nonEmpty(row.country);
    const dbCity = nonEmpty(row.city);
    const dbState = nonEmpty(row.state);
    const dbAddress = nonEmpty(row.address);

    const newCountry = dbCountry ?? (item.country as string | null) ?? null;
    const newCity = dbCity ?? (item.city as string | null) ?? null;
    const newState = dbState ?? (item.state as string | null) ?? null;

    if (dbCountry && dbCountry !== item.country) countryChanged++;
    if (dbCity && dbCity !== item.city) cityChanged++;
    if (dbState && dbState !== item.state) stateChanged++;

    return {
      ...item,
      latitude: row.latitude != null ? Number(row.latitude) : item.latitude ?? null,
      longitude: row.longitude != null ? Number(row.longitude) : item.longitude ?? null,
      address: dbAddress ?? (item.address as string | null) ?? null,
      country: newCountry,
      city: newCity,
      state: newState,
    };
  });

  console.log(`Matched: ${matched}`);
  console.log(`Unmatched (itemId not in DB): ${missing}`);
  console.log(`Country overwrites: ${countryChanged}`);
  console.log(`City overwrites:    ${cityChanged}`);
  console.log(`State overwrites:   ${stateChanged}`);

  // Report unique country distribution after merge
  const countrySet = new Map<string, number>();
  for (const it of merged) {
    const c = (it.country as string | null) ?? "NULL";
    countrySet.set(c, (countrySet.get(c) ?? 0) + 1);
  }
  const topCountries = Array.from(countrySet.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  console.log(
    `\nDistinct countries after merge: ${countrySet.size}` +
      ` (top 15: ${topCountries.map(([c, n]) => `${c}=${n}`).join(", ")})`,
  );

  await db.end();

  if (DRY_RUN) {
    console.log("\n[dry-run] catalog.json NOT written.");
    return;
  }

  fs.writeFileSync(CATALOG_PATH, JSON.stringify(merged, null, 2), "utf-8");
  const sizeKb = (fs.statSync(CATALOG_PATH).size / 1024).toFixed(0);
  console.log(`\nWrote ${CATALOG_PATH} (${sizeKb} KB)`);
  console.log("Restart `pnpm dev` to pick up the new bundle.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
