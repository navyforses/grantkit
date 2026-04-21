#!/usr/bin/env node
/**
 * apply-migration-0013.mjs
 *
 * ხელით ატარებს 0013_far_giant_girl.sql-ს Railway MySQL-ზე და
 * არეგისტრირებს entry-ს __drizzle_migrations ცხრილში.
 *
 * რატომ ხელით: drizzle-kit migrate ცდილობდა 0009-0012-ის ხელახლა გაშვებას
 * (ადრე db:push-ით დამატებული), რაც "already exists" შეცდომით დასრულდება.
 *
 * გაშვება: node scripts/apply-migration-0013.mjs
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

const migrationFile = path.resolve("drizzle/0013_far_giant_girl.sql");
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

// --- წინასწარი შემოწმებები ---
const [existing] = await conn.query("SHOW TABLES LIKE 'organization%'");
if (existing.length > 0) {
  console.log("⚠ organization* ცხრილები უკვე არსებობს:");
  for (const row of existing) console.log(`   - ${Object.values(row)[0]}`);
  console.log("\nsktipti უკვე გაშვებული იყო? გავჩერდი.");
  await conn.end();
  process.exit(1);
}

const [existingMig] = await conn.query(
  "SELECT id, hash FROM __drizzle_migrations WHERE hash = ?",
  [hash]
);
if (existingMig.length > 0) {
  console.log(`⚠ Migration entry უკვე არსებობს id=${existingMig[0].id}`);
  await conn.end();
  process.exit(1);
}

// --- Statements-ის გაშვება ---
console.log("=== 0013 Migration გაშვება ===\n");
for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  const preview = stmt.substring(0, 90).replace(/\s+/g, " ");
  console.log(`[${i + 1}/${statements.length}] ${preview}...`);
  try {
    await conn.query(stmt);
    console.log(`   ✓ OK`);
  } catch (e) {
    console.error(`   ❌ ERROR: ${e.message}`);
    console.error("\n[apply] გავჩერდი. წინა statements შესრულებულია — ცხრილები შეიძლება ნახევრად-შექმნილი იყოს.");
    await conn.end();
    process.exit(1);
  }
}

// --- Migration entry-ის რეგისტრაცია ---
const now = Date.now();
await conn.query(
  "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
  [hash, now]
);
console.log(`\n✓ __drizzle_migrations entry ჩაწერილია (hash=${hash.substring(0, 16)}..., created_at=${now})`);

// --- საბოლოო ვერიფიკაცია ---
const [tables] = await conn.query("SHOW TABLES LIKE 'organization%'");
console.log("\n=== საბოლოო სტატუსი ===");
for (const row of tables) console.log(`   ✓ ${Object.values(row)[0]}`);

await conn.end();
console.log("\n[apply-migration-0013] წარმატებით დასრულდა.");
