#!/usr/bin/env node
/**
 * verify-organizations-import.mjs
 *
 * Read-only sanity check post-import:
 * - Total orgs / branches
 * - Branch type breakdown
 * - Geocoded counts (lat/lng not NULL)
 * - Country distribution
 * - Sample rows (first 5 orgs + their branches)
 *
 * გაშვება: node scripts/verify-organizations-import.mjs
 */

import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("ERROR: DATABASE_URL არ არის დაყენებული");
  process.exit(1);
}

const conn = await mysql.createConnection(url);

console.log("=== Counts ===\n");
const [[orgCount]] = await conn.query("SELECT COUNT(*) AS c FROM organizations");
const [[branchCount]] = await conn.query("SELECT COUNT(*) AS c FROM organization_branches");
const [[hqCount]] = await conn.query("SELECT COUNT(*) AS c FROM organization_branches WHERE branchType='HQ'");
const [[brCount]] = await conn.query("SELECT COUNT(*) AS c FROM organization_branches WHERE branchType='Branch'");
console.log(`   organizations:            ${orgCount.c}`);
console.log(`   organization_branches:    ${branchCount.c}`);
console.log(`     ├── HQ:                 ${hqCount.c}`);
console.log(`     └── Branch:             ${brCount.c}`);

console.log("\n=== Geocoded ===\n");
const [[orgGeo]] = await conn.query(
  "SELECT COUNT(*) AS c FROM organizations WHERE latitude IS NOT NULL AND longitude IS NOT NULL"
);
const [[brGeo]] = await conn.query(
  "SELECT COUNT(*) AS c FROM organization_branches WHERE latitude IS NOT NULL AND longitude IS NOT NULL"
);
console.log(`   organizations with lat/lng:        ${orgGeo.c}/${orgCount.c} (${((orgGeo.c/orgCount.c)*100).toFixed(1)}%)`);
console.log(`   organization_branches with lat/lng: ${brGeo.c}/${branchCount.c} (${((brGeo.c/branchCount.c)*100).toFixed(1)}%)`);

console.log("\n=== Country distribution (orgs) ===\n");
const [orgByCountry] = await conn.query(
  "SELECT country, COUNT(*) AS c FROM organizations GROUP BY country ORDER BY c DESC"
);
for (const row of orgByCountry) {
  console.log(`   ${row.country.padEnd(16)} ${row.c}`);
}

console.log("\n=== Branch type × country ===\n");
const [brByCountry] = await conn.query(
  "SELECT country, branchType, COUNT(*) AS c FROM organization_branches GROUP BY country, branchType ORDER BY country, branchType"
);
for (const row of brByCountry) {
  console.log(`   ${row.country.padEnd(16)} ${row.branchType.padEnd(8)} ${row.c}`);
}

console.log("\n=== Sample: first 3 orgs + their branches ===\n");
const [sampleOrgs] = await conn.query(
  "SELECT orgId, name, country, city, latitude, longitude, branchesCount FROM organizations ORDER BY orgId LIMIT 3"
);
for (const o of sampleOrgs) {
  console.log(`\n   ◆ ${o.orgId} [${o.country}] ${o.name}`);
  console.log(`     HQ: ${o.city ?? "-"}  lat=${o.latitude ?? "-"}  lng=${o.longitude ?? "-"}  branchesCount=${o.branchesCount}`);
  const [branches] = await conn.query(
    "SELECT branchId, branchType, city, latitude, longitude, source FROM organization_branches WHERE orgId=? ORDER BY branchType, branchId",
    [o.orgId]
  );
  for (const b of branches) {
    console.log(`        ├── ${b.branchId}  ${b.branchType.padEnd(6)} ${(b.city ?? "-").padEnd(20)} lat=${b.latitude ?? "-"}  src=${b.source ?? "-"}`);
  }
}

console.log("\n=== ბოლო მიგრაციები ===\n");
const [migs] = await conn.query(
  "SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY id DESC LIMIT 3"
);
for (const m of migs) {
  console.log(`   #${m.id}  ${m.hash.substring(0, 32)}...  ${m.created_at}`);
}

await conn.end();
console.log("\n[verify-organizations-import] დასრულდა.");
