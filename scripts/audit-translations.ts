#!/usr/bin/env tsx
/**
 * audit-translations.ts
 *
 * აუდიტი — ყოველი ენისთვის აჩვენებს:
 *   - სულ რამდენი აქტიური grant არსებობს
 *   - რამდენს აქვს თარგმანი (name, description, eligibility)
 *   - რამდენს აქვს enriched ველების თარგმანი
 *   - coverage პროცენტი
 *   - missing grant-ების itemId სია (პირველი 20)
 *
 * გამოყენება:
 *   pnpm translate:audit                   # Railway-ით: railway run pnpm translate:audit
 *   pnpm tsx scripts/audit-translations.ts
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { sql, eq, and, isNull, or } from "drizzle-orm";
import { grants, grantTranslations } from "../drizzle/schema.js";

const LANGUAGES = ["en", "fr", "es", "ru", "ka"] as const;
const LANG_NAMES: Record<string, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
  ru: "Russian",
  ka: "Georgian",
};

const CORE_FIELDS = ["name", "description", "eligibility"] as const;
const ENRICHED_FIELDS = [
  "applicationProcess",
  "deadline",
  "targetDiagnosis",
  "ageRange",
  "geographicScope",
  "documentsRequired",
] as const;

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const db = drizzle(process.env.DATABASE_URL);

  // Total active grants
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(grants)
    .where(eq(grants.isActive, true));

  console.log(`\n=== GrantKit Translation Audit ===`);
  console.log(`Total active grants: ${total}\n`);

  // Per-language stats
  for (const lang of LANGUAGES) {
    // Count translations that exist for this language
    const [{ translationRows }] = await db
      .select({ translationRows: sql<number>`count(*)` })
      .from(grantTranslations)
      .where(eq(grantTranslations.language, lang));

    // Count translations with core fields filled (name non-empty)
    const [{ withCore }] = await db
      .select({ withCore: sql<number>`count(*)` })
      .from(grantTranslations)
      .where(
        and(
          eq(grantTranslations.language, lang),
          sql`${grantTranslations.name} IS NOT NULL AND ${grantTranslations.name} != ''`
        )
      );

    // Count translations with at least one enriched field filled
    const [{ withEnriched }] = await db
      .select({ withEnriched: sql<number>`count(*)` })
      .from(grantTranslations)
      .where(
        and(
          eq(grantTranslations.language, lang),
          sql`(
            (${grantTranslations.applicationProcess} IS NOT NULL AND ${grantTranslations.applicationProcess} != '') OR
            (${grantTranslations.deadline} IS NOT NULL AND ${grantTranslations.deadline} != '') OR
            (${grantTranslations.targetDiagnosis} IS NOT NULL AND ${grantTranslations.targetDiagnosis} != '') OR
            (${grantTranslations.geographicScope} IS NOT NULL AND ${grantTranslations.geographicScope} != '') OR
            (${grantTranslations.documentsRequired} IS NOT NULL AND ${grantTranslations.documentsRequired} != '')
          )`
        )
      );

    const corePct = total > 0 ? ((withCore / total) * 100).toFixed(1) : "0.0";
    const enrichedPct = total > 0 ? ((withEnriched / total) * 100).toFixed(1) : "0.0";

    console.log(
      `${LANG_NAMES[lang]} (${lang}):  rows=${translationRows}  core=${withCore}/${total} (${corePct}%)  enriched=${withEnriched}/${total} (${enrichedPct}%)`
    );

    // List missing grants (no translation row or empty name) — show first 20
    if (lang !== "en") {
      const missing = await db
        .select({ itemId: grants.itemId })
        .from(grants)
        .leftJoin(
          grantTranslations,
          and(
            eq(grantTranslations.grantItemId, grants.itemId),
            eq(grantTranslations.language, lang)
          )
        )
        .where(
          and(
            eq(grants.isActive, true),
            or(
              isNull(grantTranslations.id),
              sql`${grantTranslations.name} IS NULL OR ${grantTranslations.name} = ''`
            )
          )
        )
        .limit(20);

      if (missing.length > 0) {
        console.log(
          `  Missing (first ${missing.length}): ${missing.map((m) => m.itemId).join(", ")}`
        );
      }
    }
    console.log();
  }

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
  console.error("Fatal:", err);
  console.error("Audit failed:", err.message);
  process.exit(1);
});
