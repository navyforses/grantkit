#!/usr/bin/env tsx
/**
 * audit-translations.ts — Grant translation coverage per language.
 *
 * Checks every active grant for FR/ES/RU/KA translations in grant_translations.
 * Outputs coverage % and list of missing itemIds per language.
 * Saves report to scripts/translation-audit.json for translate-missing.ts.
 *
 * Usage: pnpm translate:audit
 * Requires: DATABASE_URL in .env or environment
 */

import "dotenv/config";
import * as fs from "fs";
import mysql from "mysql2/promise";

const LANGUAGES = ["fr", "es", "ru", "ka"] as const;
type Lang = (typeof LANGUAGES)[number];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is required");
    process.exit(1);
  }

  const db = await mysql.createConnection(process.env.DATABASE_URL);
  console.log("Connected to database.\n");

  // 1. Get all active grants
  const [grantRows] = await db.execute<mysql.RowDataPacket[]>(
    "SELECT itemId, name FROM grants WHERE isActive = 1 ORDER BY id"
  );
  const allGrants = grantRows as { itemId: string; name: string }[];
  const total = allGrants.length;
  console.log(`Total active grants: ${total}\n`);

  // 2. Get all existing translations (only non-empty names)
  const [transRows] = await db.execute<mysql.RowDataPacket[]>(
    "SELECT grantItemId, language FROM grant_translations WHERE name IS NOT NULL AND name != ''"
  );

  // Build set: "itemId:lang"
  const translatedSet = new Set<string>();
  for (const row of transRows as { grantItemId: string; language: string }[]) {
    translatedSet.add(`${row.grantItemId}:${row.language}`);
  }

  // 3. Audit per language
  console.log("=== Translation Coverage ===\n");
  const byLanguage: Record<string, { complete: number; missing: number; percentage: number; missingIds: string[] }> = {};

  for (const lang of LANGUAGES) {
    const missingIds: string[] = [];
    let complete = 0;

    for (const g of allGrants) {
      if (translatedSet.has(`${g.itemId}:${lang}`)) {
        complete++;
      } else {
        missingIds.push(g.itemId);
      }
    }

    const pct = total > 0 ? Number(((complete / total) * 100).toFixed(1)) : 0;
    byLanguage[lang] = { complete, missing: missingIds.length, percentage: pct, missingIds };

    const bar = "█".repeat(Math.floor(pct / 5)) + "░".repeat(20 - Math.floor(pct / 5));
    console.log(`${lang.toUpperCase()}  ${bar}  ${pct}%  (${complete}/${total}, ${missingIds.length} missing)`);
  }

  // 4. Save report
  const report = { total, generatedAt: new Date().toISOString(), byLanguage };
  fs.writeFileSync("scripts/translation-audit.json", JSON.stringify(report, null, 2));
  console.log("\n✅ Report saved to scripts/translation-audit.json");

  const needsWork = LANGUAGES.some((l) => byLanguage[l].percentage < 95);
  if (needsWork) {
    console.log("⚠️  Some languages are below 95%. Run: pnpm translate:missing");
  } else {
    console.log("✅ All languages are at 95%+.");
  }

  await db.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Audit failed:", err.message);
  process.exit(1);
});