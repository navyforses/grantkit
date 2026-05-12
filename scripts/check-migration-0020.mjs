#!/usr/bin/env node
/**
 * check-migration-0020.mjs
 *
 * Read-only verification that migration 0020 (processed_webhook_events
 * table) is applied to production. ZERO writes — safe to run anytime.
 *
 * Why we need this: PR #231 (Paddle webhook hardening) was merged
 * 2026-05-04 and the new code calls
 *     INSERT INTO processed_webhook_events ...
 * for every webhook event to enforce idempotency. If the table doesn't
 * exist, every Paddle webhook fails — production subscriptions silently
 * stop activating.
 *
 * Usage:
 *   DATABASE_URL="mysql://..." node scripts/check-migration-0020.mjs
 *
 * Exit codes:
 *   0 — table exists AND drizzle_migrations recorded (fully applied)
 *   1 — DATABASE_URL not set
 *   2 — table exists but drizzle_migrations not recorded (apply re-records)
 *   3 — table does NOT exist (urgent: run apply-migration-0020.mjs)
 */

import { createHash } from "crypto";
import { readFileSync } from "fs";
import path from "path";
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("❌ DATABASE_URL is not set");
  console.error("Usage: DATABASE_URL=\"mysql://...\" node scripts/check-migration-0020.mjs");
  process.exit(1);
}

const migrationFile = path.resolve("drizzle/0020_processed_webhook_events.sql");
const sql = readFileSync(migrationFile, "utf8");
const expectedHash = createHash("sha256").update(sql).digest("hex");

console.log("🔍 Checking migration 0020 (processed_webhook_events)\n");
console.log(`Expected SHA-256: ${expectedHash}\n`);

const conn = await mysql.createConnection(url);
let exitCode = 0;

try {
  // 1. Does the table exist?
  const [tableRows] = await conn.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'processed_webhook_events'`,
  );
  const tableExists = tableRows.length > 0;

  if (!tableExists) {
    console.log("❌ Table `processed_webhook_events` does NOT exist.");
    console.log("   Production webhooks are likely broken.");
    console.log("   Run:  DATABASE_URL=\"...\" node scripts/apply-migration-0020.mjs\n");
    exitCode = 3;
  } else {
    console.log("✅ Table `processed_webhook_events` exists.");

    // 2. Inspect schema — columns and indexes
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
         FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'processed_webhook_events'
        ORDER BY ORDINAL_POSITION`,
    );
    console.log("\n   Columns:");
    console.table(cols);

    const [idx] = await conn.query(
      `SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE
         FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'processed_webhook_events'`,
    );
    console.log("   Indexes:");
    console.table(idx);

    // 3. Row count (real production traffic indicator)
    const [countRows] = await conn.query(
      `SELECT COUNT(*) AS n,
              MIN(processed_at) AS oldest,
              MAX(processed_at) AS newest
         FROM processed_webhook_events`,
    );
    console.log("   Webhook events recorded:");
    console.table(countRows);
  }

  // 4. Is it tracked in __drizzle_migrations?
  const [hashRows] = await conn.query(
    `SELECT id, LEFT(hash, 16) AS hash_prefix, created_at
       FROM __drizzle_migrations
      WHERE hash = ?
      LIMIT 1`,
    [expectedHash],
  );

  if (hashRows.length > 0) {
    const row = hashRows[0];
    const date = new Date(Number(row.created_at)).toISOString();
    console.log(`\n✅ Tracked in __drizzle_migrations (id=${row.id}, applied=${date})`);
  } else {
    console.log("\n⚠️  Migration NOT recorded in __drizzle_migrations.");
    if (tableExists) {
      console.log("   Table exists but the apply script never ran.");
      console.log("   Re-run `apply-migration-0020.mjs` — it's idempotent and");
      console.log("   will just record the hash without changing the table.");
      exitCode = 2;
    }
  }

  // 5. Last 5 drizzle migrations for context
  console.log("\n📋 Last 5 __drizzle_migrations entries:");
  const [tail] = await conn.query(
    `SELECT id, LEFT(hash, 16) AS hash_prefix, created_at,
            FROM_UNIXTIME(created_at / 1000) AS applied_at
       FROM __drizzle_migrations
      ORDER BY id DESC
      LIMIT 5`,
  );
  console.table(tail);

  // 6. Final verdict
  console.log("\n─── Verdict ───");
  if (exitCode === 0) {
    console.log("✅ Migration 0020 is fully applied. Paddle webhook idempotency is functional.");
  } else if (exitCode === 2) {
    console.log("⚠️  Table OK but Drizzle tracking missing — non-urgent, re-apply to record.");
  } else if (exitCode === 3) {
    console.log("🔴 URGENT: Table missing. First Paddle webhook will fail with ER_NO_SUCH_TABLE.");
  }
} finally {
  await conn.end();
}

process.exit(exitCode);
