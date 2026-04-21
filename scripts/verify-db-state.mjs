#!/usr/bin/env node
/**
 * verify-db-state.mjs
 *
 * სრული DB state snapshot — ცხრილები + ველები. სანამ pending მიგრაციებს
 * ვუშვებთ, ვნახოთ რა უკვე არსებობს რომ ავიცილოთ "already exists" შეცდომები.
 */

import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("ERROR: DATABASE_URL არ არის დაყენებული");
  process.exit(1);
}

const conn = await mysql.createConnection(url);

console.log("=== ყველა ცხრილი ===\n");
const [allTables] = await conn.query("SHOW TABLES");
for (const row of allTables) {
  const name = Object.values(row)[0];
  console.log(`   ${name}`);
}

console.log("\n=== users ცხრილის ველები (0009 user_profile-ის შემოწმება) ===\n");
try {
  const [userCols] = await conn.query("SHOW COLUMNS FROM users");
  for (const col of userCols) {
    console.log(`   ${col.Field.padEnd(28)} ${col.Type}`);
  }
} catch (e) {
  console.log(`   ERROR: ${e.message}`);
}

console.log("\n=== grants ცხრილის ველები ===\n");
try {
  const [grantCols] = await conn.query("SHOW COLUMNS FROM grants");
  for (const col of grantCols) {
    console.log(`   ${col.Field.padEnd(28)} ${col.Type}`);
  }
} catch (e) {
  console.log(`   ERROR: ${e.message}`);
}

await conn.end();
console.log("\n[verify-db-state] დასრულდა.");
