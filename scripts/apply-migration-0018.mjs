#!/usr/bin/env node
/**
 * apply-migration-0018.mjs
 *
 * Applies drizzle/0018_france_schema_and_drop_org_translations.sql against
 * the Railway MySQL database (DATABASE_URL).
 *
 *   Block 1: DROP TABLE organization_translations (dead, 0 rows).
 *   Block 2: ALTER organizations — translations JSON + 9 France columns.
 *   Block 3: CREATE TABLE organization_housing.
 *
 * After running, verify with:
 *   DESCRIBE organizations;          -- should show translations + 9 new cols
 *   SHOW TABLES LIKE 'organization%'; -- branches + housing, no _translations
 *   SELECT COUNT(*) FROM organization_housing;  -- 0 (populated by import script)
 *
 * Usage:
 *   DATABASE_URL=mysql://… node scripts/apply-migration-0018.mjs
 *
 * Idempotent — re-running on a DB that already has the changes logs the
 * duplicate-column / table-not-found errors but keeps going.
 */

import { createHash } from "crypto";
import { readFileSync } from "fs";
import path from "path";
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("ERROR: DATABASE_URL is not set");
  console.error("Usage: DATABASE_URL=mysql://… node scripts/apply-migration-0018.mjs");
  process.exit(1);
}

const migrationFile = path.resolve("drizzle/0018_france_schema_and_drop_org_translations.sql");
console.log(`[apply] file: ${migrationFile}\n`);

const sql = readFileSync(migrationFile, "utf8");
const hash = createHash("sha256").update(sql).digest("hex");
console.log(`[apply] SHA-256 hash: ${hash}`);

const statements = sql
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .map((s) => s.replace(/^--[^\n]*(\n|$)/gm, "").trim())
  .filter((s) => s.length > 0);

console.log(`[apply] found ${statements.length} statements\n`);

const conn = await mysql.createConnection(url);
try {
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.replace(/\s+/g, " ").slice(0, 120);
    console.log(`[apply] [${i + 1}/${statements.length}] ${preview}${stmt.length > 120 ? "…" : ""}`);
    try {
      await conn.query(stmt);
      console.log(`        ✓ OK`);
    } catch (err) {
      const code = err && err.code ? err.code : "UNKNOWN";
      const message = err && err.message ? err.message : String(err);
      console.warn(`        ✗ ${code}: ${message.slice(0, 200)}`);
    }
  }

  // Verification — confirm what's installed.
  console.log(`\n[apply] verifying organizations new columns:`);
  const [orgCols] = await conn.query(
    `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'organizations'
        AND COLUMN_NAME IN ('translations','abbreviation','organizationType',
                            'servicesOffered','targetAudience','emigrationPurpose',
                            'foundedYear','legalStatus','mainCategory','isNational')
      ORDER BY ORDINAL_POSITION`
  );
  console.table(orgCols);

  console.log(`[apply] verifying organization_translations is gone:`);
  const [orgTransExists] = await conn.query(
    `SELECT COUNT(*) AS exists_count
       FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'organization_translations'`
  );
  console.table(orgTransExists);

  console.log(`[apply] verifying organization_housing table:`);
  const [housingCols] = await conn.query(
    `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'organization_housing'
      ORDER BY ORDINAL_POSITION`
  );
  console.table(housingCols);

  console.log(`\n[apply] done.`);
} finally {
  await conn.end();
}
