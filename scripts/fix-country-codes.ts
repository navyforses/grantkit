/**
 * fix-country-codes.ts — normalize bad country values
 *
 * Phase 4 DB content audit (PR #206) found:
 *   - 1 row with country = "Canada" (should be "CA")
 *   - 6 + 6 = 12 rows with country = "International" (no ISO code; use "INT")
 *
 * "International" is a project convention for grants/orgs that explicitly
 * serve all countries — distinct from US/FR/etc. We use "INT" as the
 * canonical short form (3 chars, fits any reasonable country VARCHAR width).
 *
 * Affected tables: organizations, grants
 *   organizations.country: VARCHAR(64) since migration 0014
 *   grants.country: VARCHAR(64) per schema
 *
 * Usage:
 *   tsx scripts/fix-country-codes.ts          # dry-run (default)
 *   tsx scripts/fix-country-codes.ts --apply  # execute UPDATEs
 */

import "dotenv/config";
import mysql from "mysql2/promise";

const APPLY = process.argv.includes("--apply");

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is required");
  process.exit(1);
}

const FIXES = [
  { from: "Canada", to: "CA" },
  { from: "International", to: "INT" },
] as const;

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  console.log(`Mode: ${APPLY ? "APPLY (will UPDATE)" : "DRY-RUN (no changes)"}\n`);

  let totalChanges = 0;

  for (const { from, to } of FIXES) {
    console.log(`──────── "${from}" → "${to}" ────────`);

    for (const tbl of ["organizations", "grants"]) {
      const [rows] = await conn.query(`SELECT COUNT(*) as n FROM ${tbl} WHERE country = ?`, [from]);
      const n = (rows as any[])[0].n;

      if (n === 0) {
        console.log(`  ${tbl}: 0 matching rows`);
        continue;
      }

      console.log(`  ${tbl}: ${n} row(s) match`);
      totalChanges += n;

      if (APPLY) {
        const [result] = await conn.query(`UPDATE ${tbl} SET country = ? WHERE country = ?`, [to, from]);
        console.log(`  ${tbl}: ✓ updated ${(result as any).affectedRows} row(s)`);
      }
    }
    console.log();
  }

  console.log(`Total ${APPLY ? "updated" : "would update"}: ${totalChanges} row(s)`);

  if (!APPLY && totalChanges > 0) {
    console.log("\nRe-run with --apply to execute.");
  }

  await conn.end();
}

main().catch((err) => {
  console.error("✗ Failed:", err);
  process.exit(1);
});
