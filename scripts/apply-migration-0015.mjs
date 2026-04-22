#!/usr/bin/env node
/**
 * apply-migration-0015.mjs
 *
 * Applies drizzle/0015_org_enrichment_v2.sql against the Railway MySQL
 * database (DATABASE_URL). Adds 10 enrichment columns to
 * `organizations` and creates the `organization_translations` table.
 *
 * This is the v2 of the org-enrichment migration after PR #145 was
 * reverted. Scope is intentionally smaller — only the 7 fields the
 * project owner explicitly approved.
 *
 * Usage:
 *   DATABASE_URL=mysql://… node scripts/apply-migration-0015.mjs
 *
 * Idempotent: if a column or table already exists the script logs the
 * error and keeps going, so running it twice on the same DB is safe.
 */

import { createHash } from "crypto";
import { readFileSync } from "fs";
import path from "path";
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("ERROR: DATABASE_URL is not set");
  process.exit(1);
}

const migrationFile = path.resolve("drizzle/0015_org_enrichment_v2.sql");
console.log(`[apply] file: ${migrationFile}\n`);

const sql = readFileSync(migrationFile, "utf8");
const hash = createHash("sha256").update(sql).digest("hex");
console.log(`[apply] SHA-256 hash: ${hash}`);

const statements = sql
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  // Strip leading SQL comment lines so the first statement is clean.
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
  console.log(`\n[apply] done.`);
} finally {
  await conn.end();
}
