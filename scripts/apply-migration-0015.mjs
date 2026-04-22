#!/usr/bin/env node
/**
 * apply-migration-0015.mjs
 *
 * Applies drizzle/0015_org_enrichment.sql against the Railway MySQL
 * database (DATABASE_URL). Adds the enrichment columns on
 * `organizations` and creates the `organization_translations` table
 * that backs Step 1 of the org data-enrichment plan.
 *
 * Usage:
 *   DATABASE_URL=mysql://… node scripts/apply-migration-0015.mjs
 *
 * Mirrors the pattern established by apply-migration-0013.mjs and
 * apply-migration-0014.mjs — prints the SQL, applies each statement,
 * and reports success / failure per statement.
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

const migrationFile = path.resolve("drizzle/0015_org_enrichment.sql");
console.log(`[apply] file: ${migrationFile}\n`);

const sql = readFileSync(migrationFile, "utf8");
const hash = createHash("sha256").update(sql).digest("hex");
console.log(`[apply] SHA-256 hash: ${hash}`);

const statements = sql
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  // Drop the leading comment block that precedes the first statement.
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
      // Columns / tables may already exist if a prior run was partial.
      // Surface the error but keep going so operators can see what
      // ran and what failed.
      const code = err && err.code ? err.code : "UNKNOWN";
      const message = err && err.message ? err.message : String(err);
      console.warn(`        ✗ ${code}: ${message.slice(0, 200)}`);
    }
  }
  console.log(`\n[apply] done.`);
} finally {
  await conn.end();
}
