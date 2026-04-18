/**
 * clean-catalog-unmatched.ts
 *
 * Removes catalog.json entries whose itemId doesn't exist in the live DB.
 * DB is authoritative — if a grant isn't there (or was soft-deleted via isActive=0),
 * it shouldn't be shipped to the client bundle either.
 *
 * Usage:
 *   pnpm tsx scripts/clean-catalog-unmatched.ts             # writes catalog.json
 *   pnpm tsx scripts/clean-catalog-unmatched.ts --dry-run   # report only
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
const DRY_RUN = process.argv.includes("--dry-run");

const CATALOG_PATH = path.resolve(process.cwd(), "client/src/data/catalog.json");

interface CatalogItem {
  id?: string;
  itemId?: string;
  name?: string;
  organization?: string;
  [k: string]: unknown;
}

async function main() {
  if (!DATABASE_URL) {
    console.error("ERROR: DATABASE_URL not set");
    process.exit(1);
  }
  if (!fs.existsSync(CATALOG_PATH)) {
    console.error(`ERROR: catalog.json not found at ${CATALOG_PATH}`);
    process.exit(1);
  }

  console.log(`Dry run: ${DRY_RUN ? "YES" : "no"}`);
  const raw = fs.readFileSync(CATALOG_PATH, "utf-8");
  const items = JSON.parse(raw) as CatalogItem[];
  console.log(`Catalog items: ${items.length}`);

  const db = await mysql.createConnection(DATABASE_URL);
  const [rows] = await db.execute<mysql.RowDataPacket[]>(
    `SELECT itemId FROM grants WHERE isActive = 1`,
  );
  await db.end();

  const activeIds = new Set<string>();
  for (const r of rows as Array<{ itemId: string }>) activeIds.add(r.itemId);
  console.log(`DB active itemIds: ${activeIds.size}`);

  const kept: CatalogItem[] = [];
  const removed: Array<{ id: string; name: string; org: string }> = [];

  for (const item of items) {
    const key = (item.itemId ?? item.id ?? "") as string;
    if (key && activeIds.has(key)) {
      kept.push(item);
    } else {
      removed.push({
        id: key || "(no id)",
        name: (item.name as string) ?? "(no name)",
        org: (item.organization as string) ?? "(no org)",
      });
    }
  }

  console.log(`\nKept:    ${kept.length}`);
  console.log(`Removed: ${removed.length}`);

  if (removed.length > 0) {
    console.log(`\nRemoved entries:`);
    for (const r of removed) {
      console.log(`  - ${r.id.padEnd(12)} | ${r.name.slice(0, 50).padEnd(50)} | ${r.org.slice(0, 40)}`);
    }
  }

  if (DRY_RUN) {
    console.log("\n[dry-run] catalog.json NOT written.");
    return;
  }

  fs.writeFileSync(CATALOG_PATH, JSON.stringify(kept, null, 2), "utf-8");
  const sizeKb = (fs.statSync(CATALOG_PATH).size / 1024).toFixed(0);
  console.log(`\nWrote ${CATALOG_PATH} (${sizeKb} KB, ${kept.length} items)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
