#!/usr/bin/env node
/**
 * apply-migration-0014.mjs
 *
 * ხელით ატარებს 0014_widen_country.sql-ს Railway MySQL-ზე:
 * ALTER TABLE organizations, organization_branches — country varchar(8) → varchar(64).
 *
 * მიზეზი: data/organizations-2026-04-20.xlsx-ში 6 რიგია country="International"
 * (13 სიმბოლო). schema თავდაპირველად ISO-2 კოდებს ელოდებოდა (varchar(8)),
 * მაგრამ "International" semantically scope-ია, არა ქვეყანა. varchar(64)
 * ემთხვევა grants.country pattern-ს.
 *
 * გაშვება: node scripts/apply-migration-0014.mjs
 */

import { createHash } from "crypto";
import { readFileSync } from "fs";
import path from "path";
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("ERROR: DATABASE_URL არ არის დაყენებული");
  process.exit(1);
}

const migrationFile = path.resolve("drizzle/0014_widen_country.sql");
console.log(`[apply] ფაილი: ${migrationFile}\n`);

const sql = readFileSync(migrationFile, "utf8");
const hash = createHash("sha256").update(sql).digest("hex");
console.log(`[apply] SHA-256 hash: ${hash}`);

const statements = sql
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

console.log(`[apply] ნაპოვნია ${statements.length} statements\n`);

const conn = await mysql.createConnection(url);

// --- Pre-check: 0013 არის უკვე გაშვებული? ---
const [orgTables] = await conn.query("SHOW TABLES LIKE 'organization%'");
if (orgTables.length < 2) {
  console.error("❌ organizations/organization_branches ცხრილები არ არსებობს. ჯერ გაუშვი apply-migration-0013.mjs");
  await conn.end();
  process.exit(1);
}

// --- Pre-check: უკვე გაშვებულია? ---
const [existingMig] = await conn.query(
  "SELECT id FROM __drizzle_migrations WHERE hash = ?",
  [hash]
);
if (existingMig.length > 0) {
  console.log(`⚠ Migration 0014 უკვე გაშვებულია id=${existingMig[0].id}. გავჩერდი.`);
  await conn.end();
  process.exit(1);
}

// --- Current state ---
console.log("=== ALTER-ის წინა state ===");
const [beforeOrg] = await conn.query("SHOW COLUMNS FROM organizations LIKE 'country'");
const [beforeBr] = await conn.query("SHOW COLUMNS FROM organization_branches LIKE 'country'");
console.log(`   organizations.country:        ${beforeOrg[0].Type}`);
console.log(`   organization_branches.country: ${beforeBr[0].Type}\n`);

// --- ALTER ---
console.log("=== 0014 Migration გაშვება ===\n");
for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  const preview = stmt.substring(0, 100).replace(/\s+/g, " ");
  console.log(`[${i + 1}/${statements.length}] ${preview}`);
  try {
    await conn.query(stmt);
    console.log(`   ✓ OK`);
  } catch (e) {
    console.error(`   ❌ ERROR: ${e.message}`);
    await conn.end();
    process.exit(1);
  }
}

// --- After state ---
console.log("\n=== ALTER-ის შემდგომი state ===");
const [afterOrg] = await conn.query("SHOW COLUMNS FROM organizations LIKE 'country'");
const [afterBr] = await conn.query("SHOW COLUMNS FROM organization_branches LIKE 'country'");
console.log(`   organizations.country:        ${afterOrg[0].Type}`);
console.log(`   organization_branches.country: ${afterBr[0].Type}`);

// --- Register in __drizzle_migrations ---
const now = Date.now();
await conn.query(
  "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
  [hash, now]
);
console.log(`\n✓ __drizzle_migrations entry ჩაწერილია (hash=${hash.substring(0, 16)}..., created_at=${now})`);

await conn.end();
console.log("\n[apply-migration-0014] წარმატებით დასრულდა. ახლა გაუშვი: pnpm import:organizations");
