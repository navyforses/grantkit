#!/usr/bin/env node
/**
 * apply-migration-0020.mjs
 *
 * Applies drizzle/0020_processed_webhook_events.sql against the Railway
 * MySQL database (DATABASE_URL).
 *
 *   Block 1: CREATE TABLE processed_webhook_events.
 *   Block 2: Record migration in __drizzle_migrations so a later
 *            `pnpm db:push` does not retry it.
 *
 * Run BEFORE deploying the webhook-hardening PR — paddleWebhook.ts
 * INSERTs into this table for every event to enforce idempotency.
 *
 * Usage:
 *   DATABASE_URL=mysql://… node scripts/apply-migration-0020.mjs
 *
 * Idempotent — duplicate-table errors are logged and the script keeps
 * going.
 */

import { createHash } from "crypto";
import { readFileSync } from "fs";
import path from "path";
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("ERROR: DATABASE_URL is not set");
  console.error("Usage: DATABASE_URL=mysql://… node scripts/apply-migration-0020.mjs");
  process.exit(1);
}

const migrationFile = path.resolve("drizzle/0020_processed_webhook_events.sql");
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

  console.log(`\n[apply] verifying processed_webhook_events table:`);
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'processed_webhook_events'
      ORDER BY ORDINAL_POSITION`
  );
  console.table(cols);

  console.log(`[apply] verifying indexes:`);
  const [idx] = await conn.query(
    `SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE
       FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'processed_webhook_events'`
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
