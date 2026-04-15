/**
 * Audit translation coverage for all active grants.
 * Shows per-language stats: how many grants have translations vs how many are missing.
 *
 * Usage: pnpm tsx scripts/audit-translations.ts
 */

import "dotenv/config";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const LANGUAGES = ["fr", "es", "ru", "ka"];
const CORE_FIELDS = ["name", "description", "eligibility"];
const ENRICHED_FIELDS = [
  "applicationProcess",
  "deadline",
  "targetDiagnosis",
  "ageRange",
  "geographicScope",
  "documentsRequired",
];

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL!);

  // Total active grants
  const [totalRows] = await connection.execute<mysql.RowDataPacket[]>(
    `SELECT COUNT(*) as cnt FROM grants WHERE isActive = 1`
  );
  const totalActive = totalRows[0].cnt as number;

  // Total active grants that have at least one enriched field
  const enrichedCondition = ENRICHED_FIELDS.map(
    (f) => `(${f} IS NOT NULL AND ${f} != '')`
  ).join(" OR ");
  const [enrichedRows] = await connection.execute<mysql.RowDataPacket[]>(
    `SELECT COUNT(*) as cnt FROM grants WHERE isActive = 1 AND (${enrichedCondition})`
  );
  const totalWithEnriched = enrichedRows[0].cnt as number;

  console.log(`\n========== GrantKit Translation Audit ==========`);
  console.log(`Active grants: ${totalActive}`);
  console.log(`Grants with enriched fields: ${totalWithEnriched}\n`);

  // Per-language core field coverage
  console.log(`--- Core Fields (name, description, eligibility) ---`);
  for (const lang of LANGUAGES) {
    const [rows] = await connection.execute<mysql.RowDataPacket[]>(
      `SELECT
        COUNT(DISTINCT t.grantItemId) as has_translation,
        SUM(CASE WHEN t.name IS NOT NULL AND t.name != '' THEN 1 ELSE 0 END) as has_name,
        SUM(CASE WHEN t.description IS NOT NULL AND t.description != '' THEN 1 ELSE 0 END) as has_desc,
        SUM(CASE WHEN t.eligibility IS NOT NULL AND t.eligibility != '' THEN 1 ELSE 0 END) as has_elig
      FROM grant_translations t
      INNER JOIN grants g ON g.itemId = t.grantItemId AND g.isActive = 1
      WHERE t.language = ?`,
      [lang]
    );

    const r = rows[0];
    const translated = r.has_translation as number;
    const missing = totalActive - translated;
    const pct = totalActive > 0 ? ((translated / totalActive) * 100).toFixed(1) : "0";

    console.log(
      `  ${lang.toUpperCase()}: ${translated}/${totalActive} (${pct}%) | missing: ${missing} | name: ${r.has_name}, desc: ${r.has_desc}, elig: ${r.has_elig}`
    );
  }

  // Per-language enriched field coverage
  console.log(`\n--- Enriched Fields (applicationProcess, deadline, etc.) ---`);
  for (const lang of LANGUAGES) {
    const fieldChecks = ENRICHED_FIELDS.map(
      (f) =>
        `SUM(CASE WHEN t.${f} IS NOT NULL AND t.${f} != '' THEN 1 ELSE 0 END) as ${f}_cnt`
    ).join(", ");

    const [rows] = await connection.execute<mysql.RowDataPacket[]>(
      `SELECT ${fieldChecks}
      FROM grant_translations t
      INNER JOIN grants g ON g.itemId = t.grantItemId AND g.isActive = 1
      WHERE t.language = ?`,
      [lang]
    );

    const r = rows[0];
    const parts = ENRICHED_FIELDS.map((f) => `${f}: ${r[`${f}_cnt`]}`).join(", ");
    console.log(`  ${lang.toUpperCase()}: ${parts}`);
  }

  // List grants missing ALL translations (no row in grant_translations for any language)
  const [missingAll] = await connection.execute<mysql.RowDataPacket[]>(
    `SELECT g.itemId, g.name, g.category, g.country
     FROM grants g
     LEFT JOIN grant_translations t ON g.itemId = t.grantItemId
     WHERE g.isActive = 1 AND t.id IS NULL
     ORDER BY g.id DESC
     LIMIT 20`
  );

  if ((missingAll as any[]).length > 0) {
    console.log(`\n--- Grants with NO translations at all (up to 20) ---`);
    for (const g of missingAll as any[]) {
      console.log(`  ${g.itemId} | ${g.name?.substring(0, 60)} | ${g.category} | ${g.country}`);
    }
  }

  // List grants missing specific languages
  for (const lang of LANGUAGES) {
    const [missingLang] = await connection.execute<mysql.RowDataPacket[]>(
      `SELECT g.itemId, g.name
       FROM grants g
       LEFT JOIN grant_translations t ON g.itemId = t.grantItemId AND t.language = ?
       WHERE g.isActive = 1 AND t.id IS NULL
       ORDER BY g.id DESC
       LIMIT 10`,
      [lang]
    );

    if ((missingLang as any[]).length > 0) {
      console.log(`\n--- Missing ${lang.toUpperCase()} (up to 10) ---`);
      for (const g of missingLang as any[]) {
        console.log(`  ${g.itemId} | ${g.name?.substring(0, 60)}`);
      }
    }
  }

  console.log(`\n=================================================\n`);

  await connection.end();
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
