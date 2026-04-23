#!/usr/bin/env node
/**
 * apply-migration-0017.mjs
 *
 * Applies drizzle/0017_add_orgid_to_grants.sql against the Railway MySQL
 * database (DATABASE_URL). This is PR#1 of the 5-PR org-centric migration:
 * it adds a nullable `orgId` column, an index, and a foreign key from
 * `grants.orgId` → `organizations.orgId`.
 *
 * After running this script, verify with:
 *   SELECT COUNT(*) AS total,
 *          SUM(CASE WHEN orgId IS NOT NULL THEN 1 ELSE 0 END) AS linked
 *     FROM grants;
 *
 * Expected output: total=637, linked=0 (backfill happens in PR#2).
 *
 * Usage:
 *   DATABASE_URL=mysql://… node scripts/apply-migration-0017.mjs
 *
 * Idempotent — re-running on a DB that already has the column logs the
 * duplicate-key error but keeps going.
 */

import { createHash } from "crypto";
import { readFileSync } from "fs";
import path from "path";
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("ERROR: DATABASE_URL is not set");
  console.error("Usage: DATABASE_URL=mysql://… node scripts/apply-migration-0017.mjs");
  process.exit(1);
}

const migrationFile = path.resolve("drizzle/0017_add_orgid_to_grants.sql");
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

  // Verification query — show the schema we just installed.
  console.log(`\n[apply] verifying installed schema:`);
  const [rows] = await conn.query(
    `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'grants'
        AND COLUMN_NAME = 'orgId'`
  );
  console.table(rows);

  const [fkRows] = await conn.query(
    `SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'grants'
        AND CONSTRAINT_NAME = 'fk_grants_org'`
  );
  console.log(`[apply] foreign key:`);
  console.table(fkRows);

  const [countRows] = await conn.query(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN orgId IS NOT NULL THEN 1 ELSE 0 END) AS linked
       FROM grants`
  );
  console.log(`[apply] current linkage (expect linked=0 until PR#2):`);
  console.table(countRows);

  console.log(`\n[apply] done.`);
} finally {
  await conn.end();
}
