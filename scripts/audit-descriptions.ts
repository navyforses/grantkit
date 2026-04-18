#!/usr/bin/env tsx
/**
 * audit-descriptions.ts — Grant description quality audit.
 *
 * For each active grant:
 *   - critical: NULL or empty description
 *   - needsEnrichment: < 20 words OR < 200 chars
 *   - good: 200+ chars
 *
 * Output: console report + scripts/description-audit.json
 *
 * Usage: pnpm audit:descriptions
 * Requires: DATABASE_URL in .env or environment
 */

import "dotenv/config";
import * as fs from "fs";
import mysql from "mysql2/promise";

const WORD_THRESHOLD = 20;   // < 20 words → needs enrichment
const CHAR_THRESHOLD = 200;  // < 200 chars → needs enrichment (matches enrich-descriptions.ts)

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is required");
    process.exit(1);
  }

  const db = await mysql.createConnection(process.env.DATABASE_URL);
  console.log("Connected to database.\n");

  const [rows] = await db.execute<mysql.RowDataPacket[]>(
    "SELECT itemId, name, description FROM grants WHERE isActive = 1 ORDER BY id"
  );

  const grants = rows as { itemId: string; name: string; description: string | null }[];
  const total = grants.length;

  const critical: { itemId: string; name: string }[] = [];
  const needsEnrichment: { itemId: string; name: string; chars: number; words: number }[] = [];
  let good = 0;

  for (const g of grants) {
    const desc = g.description?.trim() ?? "";
    if (!desc) {
      critical.push({ itemId: g.itemId, name: g.name });
    } else {
      const words = desc.split(/\s+/).filter(Boolean).length;
      const chars = desc.length;
      if (words < WORD_THRESHOLD || chars < CHAR_THRESHOLD) {
        needsEnrichment.push({ itemId: g.itemId, name: g.name, chars, words });
      } else {
        good++;
      }
    }
  }

  const totalBad = critical.length + needsEnrichment.length;
  const badPct = total > 0 ? ((totalBad / total) * 100).toFixed(1) : "0";
  const goodPct = total > 0 ? ((good / total) * 100).toFixed(1) : "0";

  console.log("=== Description Quality Audit ===\n");
  console.log(`Total active grants : ${total}`);
  console.log(`❌ Critical (null/empty)         : ${critical.length}`);
  console.log(`⚠️  Needs enrichment (<${WORD_THRESHOLD}w / <${CHAR_THRESHOLD}c) : ${needsEnrichment.length}`);
  console.log(`✅ Good (${CHAR_THRESHOLD}+ chars)              : ${good} (${goodPct}%)`);
  console.log(`\nNeeds work: ${totalBad} grants (${badPct}%)`);

  // Save report
  const report = {
    total,
    generatedAt: new Date().toISOString(),
    thresholds: { minWords: WORD_THRESHOLD, minChars: CHAR_THRESHOLD },
    critical: { count: critical.length, ids: critical.map((g) => g.itemId) },
    needsEnrichment: {
      count: needsEnrichment.length,
      ids: needsEnrichment.map((g) => g.itemId),
    },
    good: { count: good, percentage: Number(goodPct) },
  };

  fs.writeFileSync("scripts/description-audit.json", JSON.stringify(report, null, 2));
  console.log("\n✅ Report saved to scripts/description-audit.json");

  if (totalBad > 0) {
    const critPct = ((critical.length / total) * 100).toFixed(1);
    if (Number(critPct) > 5) {
      console.log(`\n⚠️  ${critPct}% of grants have no description. Run: pnpm enrich:descriptions`);
    } else {
      console.log(`\n✅ Critical rate is below 5%. Run: pnpm enrich:descriptions to improve the rest.`);
    }
  } else {
    console.log("\n✅ All descriptions meet the quality threshold.");
  }

  await db.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Audit failed:", err.message);
  process.exit(1);
});
