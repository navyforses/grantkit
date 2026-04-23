#!/usr/bin/env node
/**
 * apply-migration-0016.mjs
 *
 * Applies drizzle/0016_contact_provenance.sql against the Railway MySQL
 * database (DATABASE_URL). Adds 7 provenance columns + 2 indexes to
 * the `organizations` table so the contact-enrichment pipeline can
 * tag every phone/email it writes with a source + timestamp.
 *
 * Usage:
 *   DATABASE_URL=mysql://… node scripts/apply-migration-0016.mjs
 *
 * Idempotent — re-running on a DB that already has the columns logs
 * errors but keeps going.
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

const migrationFile = path.resolve("drizzle/0016_contact_provenance.sql");
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
  console.log(`\n[apply] done.`);
} finally {
  await conn.end();
}
