#!/usr/bin/env tsx
/**
 * audit-metadata.ts — Grant metadata completeness audit.
 *
 * Checks each active grant for:
 *   - category: NULL or empty
 *   - country: NULL or empty
 *   - eligibility: NULL
 *   - website: NULL (no source URL)
 *   - amount: NULL
 *
 * With --fix flag: applies safe programmatic fixes:
 *   - eligibility = 'See website for eligibility details' when NULL
 *
 * Usage:
 *   pnpm audit:metadata           — report only
 *   pnpm audit:metadata --fix     — report + apply safe fixes
 * Requires: DATABASE_URL in .env or environment
 */

import "dotenv/config";
import * as fs from "fs";
import mysql from "mysql2/promise";

const FIX = process.argv.includes("--fix");

interface GrantRow {
  itemId: string;
  name: string;
  category: string | null;
  country: string | null;
  eligibility: string | null;
  website: string | null;
  amount: string | null;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is required");
    process.exit(1);
  }

  const db = await mysql.createConnection(process.env.DATABASE_URL);
  console.log("Connected to database.\n");

  if (FIX) console.log("🔧 --fix mode enabled: safe fixes will be applied\n");

  const [rows] = await db.execute<mysql.RowDataPacket[]>(
    `SELECT itemId, name, category, country, eligibility, website, amount
     FROM grants WHERE isActive = 1 ORDER BY id`
  );

  const grants = rows as GrantRow[];
  const total = grants.length;

  // Track issues
  const issues = {
    noCategory:    [] as string[],
    noCountry:     [] as string[],
    noEligibility: [] as string[],
    noWebsite:     [] as string[],
    noAmount:      [] as string[],
  };

  for (const g of grants) {
    if (!g.category?.trim())    issues.noCategory.push(g.itemId);
    if (!g.country?.trim())     issues.noCountry.push(g.itemId);
    if (!g.eligibility?.trim()) issues.noEligibility.push(g.itemId);
    if (!g.website?.trim())     issues.noWebsite.push(g.itemId);
    if (!g.amount?.trim())      issues.noAmount.push(g.itemId);
  }

  // Report
  console.log("=== Metadata Completeness Audit ===\n");
  console.log(`Total active grants : ${total}\n`);

  const pct = (n: number) => `${n} (${total > 0 ? ((n / total) * 100).toFixed(1) : 0}%)`;

  console.log(`❌ No category    : ${pct(issues.noCategory.length)}`);
  console.log(`❌ No country     : ${pct(issues.noCountry.length)}`);
  console.log(`⚠️  No eligibility : ${pct(issues.noEligibility.length)}`);
  console.log(`⚠️  No website     : ${pct(issues.noWebsite.length)}`);
  console.log(`ℹ️  No amount      : ${pct(issues.noAmount.length)}`);

  // Safe fixes
  let fixed = 0;
  if (FIX && issues.noEligibility.length > 0) {
    console.log(`\n🔧 Setting default eligibility for ${issues.noEligibility.length} grants...`);
    for (const id of issues.noEligibility) {
      await db.execute(
        "UPDATE grants SET eligibility = ? WHERE itemId = ? AND (eligibility IS NULL OR eligibility = '')",
        ["See website for eligibility details", id]
      );
      fixed++;
    }
    console.log(`   ✅ Fixed ${fixed} grants`);
  }

  // Save report
  const report = {
    total,
    generatedAt: new Date().toISOString(),
    fixApplied: FIX,
    issues: {
      noCategory:    { count: issues.noCategory.length,    ids: issues.noCategory },
      noCountry:     { count: issues.noCountry.length,     ids: issues.noCountry },
      noEligibility: { count: issues.noEligibility.length, ids: issues.noEligibility },
      noWebsite:     { count: issues.noWebsite.length,     ids: issues.noWebsite },
      noAmount:      { count: issues.noAmount.length,      ids: issues.noAmount },
    },
    fixedCount: fixed,
  };

  fs.writeFileSync("scripts/metadata-audit.json", JSON.stringify(report, null, 2));
  console.log("\n✅ Report saved to scripts/metadata-audit.json");

  // Recommendations
  const critical = issues.noCategory.length + issues.noCountry.length;
  if (critical > 0) {
    console.log(`\n⚠️  ${critical} grants missing category or country — requires manual review.`);
    console.log(`   Check scripts/metadata-audit.json for itemIds.`);
  }
  if (!FIX && issues.noEligibility.length > 0) {
    console.log(`\nℹ️  Run with --fix to set default eligibility text for ${issues.noEligibility.length} grants.`);
  }

  await db.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Audit failed:", err.message);
  process.exit(1);
});
