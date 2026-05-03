#!/usr/bin/env node
/**
 * apply-migration-0011.mjs
 *
 * Applies drizzle/0011_volatile_demogoblin.sql to Railway MySQL.
 *
 * Adds email/password auth columns to `users` table:
 *   passwordHash, emailVerified, verificationToken (+expires),
 *   resetPasswordToken (+expires), failedLoginAttempts, lockedUntil
 * Plus 3 indexes (email, verification token, reset token).
 *
 * BACKGROUND
 * ---------
 * Phase 4 DB content audit (PR #206) discovered that production was missing
 * `users.emailVerified` and `users.lockedUntil` columns even though
 * CLAUDE.md claimed Phase 0 (email auth) was complete. The migration file
 * has existed since the original Phase 0 PR but was never executed against
 * Railway. Schema.ts was therefore drifting ahead of the actual DB by ~6
 * months. This script closes that gap.
 *
 * USAGE
 * -----
 *   node scripts/apply-migration-0011.mjs          # dry-run (default, prints plan)
 *   node scripts/apply-migration-0011.mjs --apply  # actually executes
 *
 * Idempotent: if a column already exists, that ALTER is skipped (logged).
 * If all columns already exist, the script exits 0 with no changes.
 */

import { createHash } from "crypto";
import { readFileSync } from "fs";
import path from "path";
import mysql from "mysql2/promise";

const APPLY = process.argv.includes("--apply");
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("ERROR: DATABASE_URL not set");
  process.exit(1);
}

const migrationFile = path.resolve("drizzle/0011_volatile_demogoblin.sql");
console.log(`[apply-0011] file: ${migrationFile}`);
console.log(`[apply-0011] mode: ${APPLY ? "APPLY (will execute)" : "DRY-RUN"}\n`);

const sql = readFileSync(migrationFile, "utf8");
const hash = createHash("sha256").update(sql).digest("hex");
console.log(`[apply-0011] SHA-256: ${hash}\n`);

const conn = await mysql.createConnection(url);

// ===== Pre-check: identify which columns/indexes already exist =====
const [colRows] = await conn.query(
  "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'",
);
const existingCols = new Set(colRows.map((r) => r.COLUMN_NAME));
const [idxRows] = await conn.query(
  "SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'",
);
const existingIdx = new Set(idxRows.map((r) => r.INDEX_NAME));

const targetCols = [
  "passwordHash",
  "emailVerified",
  "verificationToken",
  "verificationTokenExpires",
  "resetPasswordToken",
  "resetPasswordTokenExpires",
  "failedLoginAttempts",
  "lockedUntil",
];
const missingCols = targetCols.filter((c) => !existingCols.has(c));
const presentCols = targetCols.filter((c) => existingCols.has(c));

console.log(`[apply-0011] users columns present: ${existingCols.size}`);
console.log(`[apply-0011] target columns missing: ${missingCols.length}`);
if (presentCols.length) console.log(`[apply-0011] already present (will skip): ${presentCols.join(", ")}`);
console.log(`[apply-0011] will add: ${missingCols.join(", ") || "(none)"}\n`);

const targetIdx = ["users_email_idx", "users_verification_token_idx", "users_reset_token_idx"];
const missingIdx = targetIdx.filter((i) => !existingIdx.has(i));
const presentIdx = targetIdx.filter((i) => existingIdx.has(i));
console.log(`[apply-0011] indexes already present (will skip): ${presentIdx.join(", ") || "(none)"}`);
console.log(`[apply-0011] will create: ${missingIdx.join(", ") || "(none)"}\n`);

if (missingCols.length === 0 && missingIdx.length === 0) {
  console.log("[apply-0011] ✓ Nothing to do — DB is already up to date.");
  await conn.end();
  process.exit(0);
}

if (!APPLY) {
  console.log("[apply-0011] DRY-RUN complete. Re-run with --apply to execute.");
  await conn.end();
  process.exit(0);
}

// ===== Execute =====
const colDefs = {
  passwordHash: "ADD COLUMN passwordHash VARCHAR(255)",
  emailVerified: "ADD COLUMN emailVerified BOOLEAN DEFAULT false NOT NULL",
  verificationToken: "ADD COLUMN verificationToken VARCHAR(100)",
  verificationTokenExpires: "ADD COLUMN verificationTokenExpires TIMESTAMP NULL",
  resetPasswordToken: "ADD COLUMN resetPasswordToken VARCHAR(100)",
  resetPasswordTokenExpires: "ADD COLUMN resetPasswordTokenExpires TIMESTAMP NULL",
  failedLoginAttempts: "ADD COLUMN failedLoginAttempts INT DEFAULT 0 NOT NULL",
  lockedUntil: "ADD COLUMN lockedUntil TIMESTAMP NULL",
};

for (const col of missingCols) {
  const stmt = `ALTER TABLE users ${colDefs[col]}`;
  console.log(`[apply-0011] ▸ ${stmt}`);
  await conn.query(stmt);
  console.log(`[apply-0011] ✓ added ${col}`);
}

const idxDefs = {
  users_email_idx: "CREATE INDEX users_email_idx ON users (email)",
  users_verification_token_idx: "CREATE INDEX users_verification_token_idx ON users (verificationToken)",
  users_reset_token_idx: "CREATE INDEX users_reset_token_idx ON users (resetPasswordToken)",
};
for (const idx of missingIdx) {
  console.log(`[apply-0011] ▸ ${idxDefs[idx]}`);
  await conn.query(idxDefs[idx]);
  console.log(`[apply-0011] ✓ created ${idx}`);
}

// ===== Post-check =====
const [verifyRows] = await conn.query(
  "SELECT COUNT(*) as n FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME IN ('emailVerified', 'lockedUntil')",
);
console.log(`\n[apply-0011] post-check: ${verifyRows[0].n}/2 critical columns now present`);

await conn.end();
console.log("[apply-0011] ✓ done");
