#!/usr/bin/env tsx
/**
 * normalize-country-codes.ts — one-off DB fix.
 *
 * Scans `grants.country` for non-ISO-3166 codes and rewrites them in
 * place to the canonical two-letter alpha-2 form. The main offender
 * historically has been `UK` (the UK's reserved-not-assigned code),
 * where the ISO code is `GB`. This script also handles full country
 * names ("United States", "Germany") that occasionally crept in via
 * the LLM discovery pipeline before `normalizeCountryCode` was wired
 * into `import-new-grants.ts`.
 *
 * After running this, the geocoding pipeline should succeed on rows
 * that previously failed with `country mismatch (got GB, expected UK)`.
 *
 * Usage:
 *   pnpm tsx scripts/normalize-country-codes.ts --dry-run   # preview
 *   pnpm tsx scripts/normalize-country-codes.ts             # apply
 *
 * Env:
 *   DATABASE_URL (required) — same shape as geocode-grants.ts
 *
 * Safety:
 *   - Only writes rows where the normalised value *differs* from the
 *     existing one. No-op for already-correct rows.
 *   - Skips rows where the normaliser returns undefined (unknown form)
 *     — those are logged so the operator can review manually.
 *   - Transactional: all updates in a single transaction, rollback on
 *     any error.
 */

import "dotenv/config";
import mysql from "mysql2/promise";
import { normalizeCountryCode } from "./_lib/countryCodes";

const DRY_RUN = process.argv.includes("--dry-run");
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL not set.");
  console.error('    PowerShell: $env:DATABASE_URL = "mysql://..."');
  console.error('    Bash:       export DATABASE_URL="mysql://..."');
  process.exit(1);
}

async function main() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  GrantKit — Country-code Normaliser");
  console.log(`  Dry-run : ${DRY_RUN ? "✅ enabled (no writes)" : "❌ disabled (will mutate)"}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const db = await mysql.createConnection(DATABASE_URL!);

  try {
    // Pull the distinct country values in use. No LIMIT — there will be
    // at most ~30–40 distinct codes even in a pessimistic import history.
    const [rows] = await db.execute(
      `SELECT country, COUNT(*) AS grantCount
         FROM grants
        WHERE country IS NOT NULL AND country != ''
        GROUP BY country
        ORDER BY grantCount DESC`,
    );

    const distinct = rows as Array<{ country: string; grantCount: number }>;
    console.log(`  Distinct country values in grants table: ${distinct.length}\n`);

    const toRewrite: Array<{ from: string; to: string; count: number }> = [];
    const unknownForms: Array<{ value: string; count: number }> = [];

    for (const row of distinct) {
      const normalised = normalizeCountryCode(row.country);
      if (!normalised) {
        unknownForms.push({ value: row.country, count: Number(row.grantCount) });
        continue;
      }
      if (normalised === row.country) continue;
      toRewrite.push({ from: row.country, to: normalised, count: Number(row.grantCount) });
    }

    if (toRewrite.length === 0) {
      console.log("  ✅ Nothing to do — every country code is already canonical.\n");
      if (unknownForms.length > 0) {
        console.log("  ⚠️  Unknown forms found (left untouched — review manually):");
        for (const u of unknownForms) {
          console.log(`       "${u.value}" (${u.count} grants)`);
        }
      }
      return;
    }

    console.log("  Rewrites planned:");
    for (const r of toRewrite) {
      console.log(`    "${r.from}" → "${r.to}"   (${r.count} grants)`);
    }
    console.log();

    if (unknownForms.length > 0) {
      console.log("  ⚠️  Unknown forms (will NOT be rewritten):");
      for (const u of unknownForms) {
        console.log(`       "${u.value}" (${u.count} grants)`);
      }
      console.log();
    }

    if (DRY_RUN) {
      console.log("  ℹ️  Dry-run complete — no rows modified.\n");
      return;
    }

    await db.beginTransaction();
    try {
      let totalUpdated = 0;
      for (const r of toRewrite) {
        const [result] = await db.execute(
          `UPDATE grants SET country = ?, updatedAt = NOW() WHERE country = ?`,
          [r.to, r.from],
        );
        const affected = (result as { affectedRows: number }).affectedRows;
        totalUpdated += affected;
        console.log(`  ✓  "${r.from}" → "${r.to}"   (${affected} rows updated)`);
      }
      await db.commit();
      console.log(`\n  ✅ Committed ${totalUpdated} row updates.\n`);
    } catch (err) {
      await db.rollback();
      throw err;
    }
  } finally {
    await db.end();
  }
}

main().catch((err) => {
  console.error("\n❌ Fatal:", err);
  process.exit(1);
});
