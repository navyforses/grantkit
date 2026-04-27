#!/usr/bin/env tsx
/**
 * audit-org-duplicates.ts — read-only.
 *
 * Catalog screenshot from 2026-04-27 showed the same organization rendered
 * multiple times ("Small Steps in Speech" 4×, "Orange Effect Foundation" +
 * "The Orange Effect Foundation", etc). The list endpoint
 * (`organizations.list` → `listOrganizations`) is a flat
 * `SELECT * FROM organizations` with no joins, so duplicate cards = duplicate
 * rows in the `organizations` table itself.
 *
 * Possible sources (verified against repo state):
 *   - source Excel (data/organizations-2026-04-20.xlsx) already contains
 *     "Orange Effect Foundation" + "The Orange Effect Foundation" as two
 *     separate orgIds (ORG-0384 / ORG-0482) — these are name variants of one
 *     real-world org.
 *   - `organizations.name` has no UNIQUE constraint; only `orgId` does. So
 *     re-imports / France pipeline / ad-hoc inserts can introduce duplicates
 *     by name without violating any DB constraint.
 *   - `import-france-orgs.ts` has a 3-phase de-dup matcher but it's scoped
 *     to `country = 'FR'`, so it cannot collapse US duplicates.
 *
 * This script enumerates every duplicate-name cluster live in the DB so we
 * can see the full picture before deciding how to merge.
 *
 * Output: .grantkit-redesign/org-duplicates-report.json  (full detail)
 *         .grantkit-redesign/org-duplicates-report.md    (human-readable)
 *
 * Env: DATABASE_URL (use MYSQL_PUBLIC_URL for runs from outside Railway).
 *
 * Usage:
 *   pnpm tsx scripts/audit-org-duplicates.ts
 *   pnpm tsx scripts/audit-org-duplicates.ts --country=US
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";

interface Args {
  country: string | null;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const out: Args = { country: null };
  for (const a of args) {
    if (a.startsWith("--country=")) out.country = a.slice("--country=".length);
  }
  return out;
}

interface OrgRow {
  orgId: string;
  name: string;
  country: string;
  city: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  programsCount: number;
  branchesCount: number;
  contactEnrichmentBatch: string | null;
  contactEnrichmentStatus: string;
  isActive: number;
  createdAt: Date;
}

async function main() {
  const args = parseArgs();
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("ERROR: DATABASE_URL not set. For Railway runs, export MYSQL_PUBLIC_URL — see .grantkit-redesign/OPS.md.");
    process.exit(1);
  }

  const conn = await mysql.createConnection(url);

  const filters: string[] = [];
  const params: unknown[] = [];
  if (args.country) {
    filters.push("country = ?");
    params.push(args.country);
  }
  const where = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

  const [totalRow] = (await conn.query(
    `SELECT COUNT(*) AS c FROM organizations ${where}`,
    params,
  )) as [Array<{ c: number }>, unknown];
  const total = Number(totalRow[0]?.c ?? 0);

  const [uniqRow] = (await conn.query(
    `SELECT COUNT(DISTINCT LOWER(TRIM(name))) AS c FROM organizations ${where}`,
    params,
  )) as [Array<{ c: number }>, unknown];
  const uniqueNames = Number(uniqRow[0]?.c ?? 0);

  const [dupNames] = (await conn.query(
    `SELECT LOWER(TRIM(name)) AS key_name, COUNT(*) AS c
       FROM organizations ${where}
       GROUP BY LOWER(TRIM(name))
       HAVING c > 1
       ORDER BY c DESC, key_name ASC`,
    params,
  )) as [Array<{ key_name: string; c: number }>, unknown];

  const clusters: Array<{
    keyName: string;
    count: number;
    rows: OrgRow[];
  }> = [];

  for (const d of dupNames) {
    const rowParams: unknown[] = [d.key_name];
    let rowWhere = "LOWER(TRIM(name)) = ?";
    if (args.country) {
      rowWhere += " AND country = ?";
      rowParams.push(args.country);
    }
    const [rows] = (await conn.query(
      `SELECT orgId, name, country, city, website, phone, email,
              programsCount, branchesCount,
              contactEnrichmentBatch, contactEnrichmentStatus,
              isActive, createdAt
         FROM organizations
        WHERE ${rowWhere}
        ORDER BY createdAt ASC, orgId ASC`,
      rowParams,
    )) as [OrgRow[], unknown];
    clusters.push({ keyName: d.key_name, count: Number(d.c), rows });
  }

  await conn.end();

  const dupRowTotal = clusters.reduce((sum, c) => sum + c.count, 0);
  const extraRows = dupRowTotal - clusters.length; // rows we'd remove if we kept 1 per cluster

  console.log("=== organizations duplicates audit ===");
  console.log(`Filter: country=${args.country ?? "(all)"}`);
  console.log(`Total rows:               ${total}`);
  console.log(`Distinct LOWER(TRIM(name)): ${uniqueNames}`);
  console.log(`Duplicate-name clusters:  ${clusters.length}`);
  console.log(`Rows in those clusters:   ${dupRowTotal}`);
  console.log(`Excess rows (dup - 1 each): ${extraRows}`);
  console.log("");

  for (const c of clusters.slice(0, 30)) {
    console.log(`  ${c.count}×  "${c.rows[0]?.name ?? c.keyName}"`);
    for (const r of c.rows) {
      console.log(
        `      ${r.orgId}  ${r.country}/${r.city ?? "-"}  ` +
        `prog=${r.programsCount} br=${r.branchesCount}  ` +
        `batch=${r.contactEnrichmentBatch ?? "-"}  ` +
        `status=${r.contactEnrichmentStatus}  ` +
        `created=${r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt}`,
      );
    }
  }
  if (clusters.length > 30) {
    console.log(`  … (${clusters.length - 30} more clusters in JSON report)`);
  }

  const reportDir = path.resolve(".grantkit-redesign");
  fs.mkdirSync(reportDir, { recursive: true });
  const jsonPath = path.join(reportDir, "org-duplicates-report.json");
  const mdPath = path.join(reportDir, "org-duplicates-report.md");

  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        filter: { country: args.country },
        totals: {
          totalRows: total,
          distinctNormalizedNames: uniqueNames,
          duplicateClusters: clusters.length,
          rowsInClusters: dupRowTotal,
          excessRows: extraRows,
        },
        clusters,
      },
      null,
      2,
    ),
  );

  const md: string[] = [];
  md.push("# Organizations — duplicate-name audit");
  md.push("");
  md.push(`Generated: ${new Date().toISOString()}`);
  md.push(`Filter: country=${args.country ?? "(all)"}`);
  md.push("");
  md.push(`- Total rows: **${total}**`);
  md.push(`- Distinct normalized names: **${uniqueNames}**`);
  md.push(`- Duplicate clusters: **${clusters.length}**`);
  md.push(`- Rows inside those clusters: **${dupRowTotal}**`);
  md.push(`- Excess rows (would be removed if kept 1 per cluster): **${extraRows}**`);
  md.push("");
  md.push("## Clusters");
  md.push("");
  for (const c of clusters) {
    md.push(`### ${c.count}× ${c.rows[0]?.name ?? c.keyName}`);
    md.push("");
    md.push("| orgId | country/city | programs | branches | batch | status | createdAt | website |");
    md.push("|---|---|---|---|---|---|---|---|");
    for (const r of c.rows) {
      const created = r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt);
      md.push(
        `| ${r.orgId} | ${r.country}/${r.city ?? "-"} | ${r.programsCount} | ${r.branchesCount} | ${r.contactEnrichmentBatch ?? "-"} | ${r.contactEnrichmentStatus} | ${created} | ${r.website ?? "-"} |`,
      );
    }
    md.push("");
  }
  fs.writeFileSync(mdPath, md.join("\n"));

  console.log("");
  console.log(`JSON report: ${jsonPath}`);
  console.log(`MD report:   ${mdPath}`);
}

main().catch((err) => {
  console.error("[audit-org-duplicates] Failed:", err);
  process.exit(1);
});
