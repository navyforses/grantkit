#!/usr/bin/env tsx
/**
 * audit-translations.ts — Check grant translation coverage across all languages.
 *
 * For each active grant in MySQL, checks if grantTranslations entries exist
 * for FR, ES, RU, KA with non-empty name and description.
 *
 * Usage: pnpm tsx scripts/audit-translations.ts
 * Requires: DATABASE_URL in .env or environment
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { grants, grantTranslations } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const LANGUAGES = ["fr", "es", "ru", "ka"] as const;

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const db = drizzle(process.env.DATABASE_URL);

  // 1. Get all active grants
  const allGrants = await db
    .select({ itemId: grants.itemId, name: grants.name })
    .from(grants)
    .where(eq(grants.isActive, true));

  console.log(`Total active grants: ${allGrants.length}`);

  // 2. Get all existing translations
  const allTranslations = await db
    .select({
      grantItemId: grantTranslations.grantItemId,
      language: grantTranslations.language,
      name: grantTranslations.name,
      description: grantTranslations.description,
    })
    .from(grantTranslations);

  // Build lookup: { grantItemId: { lang: { name, description } } }
  const translationMap = new Map<string, Map<string, { name: string | null; description: string | null }>>();
  for (const t of allTranslations) {
    if (!translationMap.has(t.grantItemId)) {
      translationMap.set(t.grantItemId, new Map());
    }
    translationMap.get(t.grantItemId)!.set(t.language, {
      name: t.name,
      description: t.description,
    });
  }

  // 3. Audit each language
  const report: Record<string, { complete: number; missing: number; missingIds: string[] }> = {};

  for (const lang of LANGUAGES) {
    const missingIds: string[] = [];
    let complete = 0;

    for (const grant of allGrants) {
      const langMap = translationMap.get(grant.itemId);
      const trans = langMap?.get(lang);

      if (!trans || !trans.name || trans.name.trim() === "") {
        missingIds.push(grant.itemId);
      } else {
        complete++;
      }
    }

    report[lang] = {
      complete,
      missing: missingIds.length,
      missingIds,
    };
  }

  // 4. Print report
  const total = allGrants.length;
  console.log("\n=== Grant Translation Audit ===\n");
  console.log(`Total active grants: ${total}\n`);

  for (const lang of LANGUAGES) {
    const r = report[lang];
    const pct = ((r.complete / total) * 100).toFixed(1);
    console.log(`${lang.toUpperCase()}: ${r.complete}/${total} (${pct}%) — ${r.missing} missing`);
  }

  // 5. Output JSON report
  const jsonReport = {
    total,
    byLanguage: Object.fromEntries(
      LANGUAGES.map((lang) => [
        lang,
        {
          complete: report[lang].complete,
          missing: report[lang].missing,
          percentage: Number(((report[lang].complete / total) * 100).toFixed(1)),
          missingIds: report[lang].missingIds,
        },
      ])
    ),
  };

  // Write to file for Task 2 to consume
  const fs = await import("fs");
  fs.writeFileSync("scripts/translation-audit.json", JSON.stringify(jsonReport, null, 2));
  console.log("\nReport saved to scripts/translation-audit.json");

  process.exit(0);
}

main().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
