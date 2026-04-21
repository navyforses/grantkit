#!/usr/bin/env node
/**
 * verify-migration.mjs
 *
 * Read-only: ამოწმებს Railway MySQL-ზე რომ მიგრაცია 0013_far_giant_girl
 * ნამდვილად გაშვებულია (organizations + organization_branches ცხრილები).
 *
 * გაშვება: node scripts/verify-migration.mjs
 * საჭიროა: $env:DATABASE_URL დაყენებული იყოს Railway MYSQL_PUBLIC_URL-ით.
 */

import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("ERROR: DATABASE_URL არ არის დაყენებული");
  process.exit(1);
}

const conn = await mysql.createConnection(url);

console.log("=== Organization ცხრილების შემოწმება ===\n");

const [orgTables] = await conn.query("SHOW TABLES LIKE 'organization%'");
if (orgTables.length === 0) {
  console.log("❌ organization* ცხრილები ვერ მოიძებნა — მიგრაცია 0013 არ არის გაშვებული");
} else {
  console.log("✓ ნაპოვნია ცხრილები:");
  for (const row of orgTables) {
    const name = Object.values(row)[0];
    console.log(`   - ${name}`);
  }
}

console.log("\n=== organizations columns ===\n");
try {
  const [orgCols] = await conn.query("SHOW COLUMNS FROM organizations");
  for (const col of orgCols) {
    console.log(`   ${col.Field.padEnd(22)} ${col.Type}`);
  }
  const [orgCount] = await conn.query("SELECT COUNT(*) AS n FROM organizations");
  console.log(`\n   სტრიქონები: ${orgCount[0].n}`);
} catch (e) {
  console.log(`   ERROR: ${e.message}`);
}

console.log("\n=== organization_branches columns ===\n");
try {
  const [branchCols] = await conn.query("SHOW COLUMNS FROM organization_branches");
  for (const col of branchCols) {
    console.log(`   ${col.Field.padEnd(22)} ${col.Type}`);
  }
  const [branchCount] = await conn.query("SELECT COUNT(*) AS n FROM organization_branches");
  console.log(`\n   სტრიქონები: ${branchCount[0].n}`);
} catch (e) {
  console.log(`   ERROR: ${e.message}`);
}

console.log("\n=== ბოლო 5 მიგრაცია ===\n");
try {
  const [migs] = await conn.query(
    "SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY id DESC LIMIT 5"
  );
  for (const m of migs) {
    console.log(`   #${m.id}  ${m.hash}  ${m.created_at}`);
  }
} catch (e) {
  console.log(`   __drizzle_migrations ცხრილი მიუწვდომელია: ${e.message}`);
}

await conn.end();
console.log("\n[verify-migration] დასრულდა.");
