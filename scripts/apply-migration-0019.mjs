#!/usr/bin/env node
/**
 * apply-migration-0019.mjs
 *
 * Applies drizzle/0019_branches_geocoded_at.sql against the Railway MySQL
 * database (DATABASE_URL).
 *
 *   Block 1: ALTER organization_branches ADD COLUMN geocodedAt TIMESTAMP NULL.
 *   Block 2: CREATE INDEX branches_geocoded_at_idx.
 *   Block 3: Record migration in __drizzle_migrations so a later
 *            `pnpm db:push` does not retry it.
 *
 * Run BEFORE `pnpm geocode:branches:fr` — the script's UPDATE references
 * the new column and will fail with "Unknown column" without it.
 *
 * Usage:
 *   DATABASE_URL=mysql://… node scripts/apply-migration-0019.mjs
 *
 * Idempotent — duplicate-column / duplicate-key errors are logged and
 * the script keeps going.
 */

import { createHash } from "crypto";
import { readFileSync } from "fs";
import path from "path";
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("ERROR: DATABASE_URL is not set");
  console.error("Usage: DATABASE_URL=mysql://… node scripts/apply-migration-0019.mjs");
  process.exit(1);
}

const migrationFile = path.resolve("drizzle/0019_branches_geocoded_at.sql");
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

  console.log(`\n[apply] verifying organization_branches.geocodedAt column:`);
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'organization_branches'
        AND COLUMN_NAME = 'geocodedAt'`
  );
  console.table(cols);

  console.log(`[apply] verifying index branches_geocoded_at_idx:`);
  const [idx] = await conn.query(
    `SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE
       FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'organization_branches'
        AND INDEX_NAME = 'branches_geocoded_at_idx'`
  );
  console.table(idx);

  console.log(`\n[apply] recording in __drizzle_migrations:`);
  await conn.query(
    `CREATE TABLE IF NOT EXISTS __drizzle_migrations (
       id SERIAL PRIMARY KEY,
       hash TEXT NOT NULL,
       created_at BIGINT
     )`
  );
  const [existingRows] = await conn.query(
    `SELECT id, created_at FROM __drizzle_migrations WHERE hash = ? LIMIT 1`,
    [hash]
  );
  if (existingRows.length > 0) {
    console.log(`        ✓ already recorded (id=${existingRows[0].id}, created_at=${existingRows[0].created_at})`);
  } else {
    const createdAt = Date.now();
    await conn.query(
      `INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)`,
      [hash, createdAt]
    );
    console.log(`        ✓ inserted (hash=${hash.slice(0, 16)}…, created_at=${createdAt})`);
  }

  console.log(`[apply] last 3 __drizzle_migrations rows:`);
  const [tailRows] = await conn.query(
    `SELECT id, LEFT(hash, 16) AS hash_prefix, created_at
       FROM __drizzle_migrations
      ORDER BY id DESC
      LIMIT 3`
  );
  console.table(tailRows);

  console.log(`\n[apply] done.`);
} finally {
  await conn.end();
}
