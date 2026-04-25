#!/usr/bin/env node
/**
 * Import 7 new grants discovered on 2026-04-25 (EDUCATION — vocational/credential category).
 * Run: DATABASE_URL="..." node pending-imports/import-2026-04-25.mjs
 * Requires: DATABASE_URL env var
 */

import mysql from "mysql2/promise";
import { readFileSync } from "fs";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not set");
  process.exit(1);
}

function makeItemId(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

const newGrants = JSON.parse(
  readFileSync(new URL("./2026-04-25.json", import.meta.url), "utf-8")
);

async function main() {
  const db = await mysql.createConnection(DATABASE_URL);

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Daily Discovery Import — 2026-04-25 (EDUCATION)`);
  console.log(`  ${newGrants.length} grants to import`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const grant of newGrants) {
    const itemId = makeItemId(grant.name);

    try {
      const [existing] = await db.execute(
        "SELECT itemId FROM grants WHERE itemId = ? OR name = ? LIMIT 1",
        [itemId, grant.name]
      );

      if (existing.length > 0) {
        console.log(`⏭  SKIP (exists): ${grant.name}`);
        skipped++;
        continue;
      }

      await db.execute(
        `INSERT INTO grants (itemId, name, organization, description, category, grantType, country, eligibility, website, phone, grantEmail, amount, status, state, city, targetDiagnosis, fundingType, b2VisaEligible, applicationProcess, geographicScope, documentsRequired, ageRange, isActive, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
        [
          itemId,
          grant.name,
          grant.organization || null,
          grant.description || null,
          grant.category,
          grant.type || "grant",
          grant.country,
          grant.eligibility || null,
          grant.website || null,
          grant.phone || null,
          grant.email || null,
          grant.amount || null,
          grant.status || "Active",
          grant.state || null,
          grant.city || null,
          grant.targetDiagnosis || null,
          grant.fundingType || null,
          grant.b2VisaEligible || null,
          grant.applicationProcess || null,
          grant.geographicScope || null,
          grant.documentsRequired || null,
          grant.ageRange || null,
        ]
      );

      console.log(`✅  IMPORTED: ${grant.name} [${itemId}]`);
      imported++;
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY") {
        console.log(`⏭  SKIP (duplicate): ${grant.name}`);
        skipped++;
      } else {
        console.error(`✗  ERROR: ${grant.name} — ${e.message}`);
        errors++;
      }
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  ✅ Imported: ${imported}`);
  console.log(`  ⏭  Skipped:  ${skipped}`);
  console.log(`  ✗  Errors:   ${errors}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  await db.end();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
