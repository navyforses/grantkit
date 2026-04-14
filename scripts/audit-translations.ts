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

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
