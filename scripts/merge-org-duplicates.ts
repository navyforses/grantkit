#!/usr/bin/env tsx
/**
 * merge-org-duplicates.ts — TRANSACTIONAL.
 *
 * Found 4 dup org pairs whose only difference is name case (e.g.
 * "Wheelchairs 4 Kids" vs "Wheelchairs 4 kids"). Branches are byte-identical.
 * No grants/housing FK references on any of the 8 affected orgIds.
 *
 * Strategy: keep low orgId, delete high org's branches (identical dups),
 * delete high org row. All in one transaction with post-merge sanity check.
 *
 * Usage: pnpm tsx scripts/merge-org-duplicates.ts
 *        pnpm tsx scripts/merge-org-duplicates.ts --apply   (live commit)
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const PAIRS: Array<[string, string]> = [
  ["ORG-0450", "ORG-0451"], // Special Love for Children with Cancer
  ["ORG-0488", "ORG-0489"], // Travis Burkhart Foundation
  ["ORG-0511", "ORG-0512"], // Wheelchairs 4 Kids
  ["ORG-0521", "ORG-0522"], // Zac Speaks
];

async function main() {
  const apply = process.argv.includes("--apply");
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("ERROR: DATABASE_URL not set"); process.exit(1); }
  const conn = await mysql.createConnection(url);

  const beforeOrgs = (await conn.query<any[]>("SELECT COUNT(*) c FROM organizations") as any)[0][0].c;
  const beforeBranches = (await conn.query<any[]>("SELECT COUNT(*) c FROM organization_branches") as any)[0][0].c;
  console.log(`BEFORE: organizations=${beforeOrgs}  branches=${beforeBranches}`);

  const highIds = PAIRS.map(([_, h]) => h);
  const ph = highIds.map(() => "?").join(",");
  const [[gRefs]] = await conn.query<any[]>(`SELECT COUNT(*) c FROM grants WHERE orgId IN (${ph})`, highIds) as any;
  const [[hRefs]] = await conn.query<any[]>(`SELECT COUNT(*) c FROM organization_housing WHERE orgId IN (${ph})`, highIds) as any;
  console.log(`Pre-flight FK refs on high orgIds: grants=${gRefs.c}, housing=${hRefs.c}`);
  if (gRefs.c !== 0 || hRefs.c !== 0) {
    console.error("ABORT: Found unexpected FK references on high orgIds. Re-pointing logic needed.");
    await conn.end();
    process.exit(1);
  }

  console.log("\nBeginning transaction…");
  await conn.beginTransaction();
  try {
    let totalBranchesDeleted = 0;
    let totalOrgsDeleted = 0;
    for (const [low, high] of PAIRS) {
      const [bRes] = await conn.query<any>("DELETE FROM organization_branches WHERE orgId=?", [high]);
      const [oRes] = await conn.query<any>("DELETE FROM organizations WHERE orgId=?", [high]);
      console.log(`  ${low} ← ${high}:  branches deleted=${bRes.affectedRows}, org deleted=${oRes.affectedRows}`);
      totalBranchesDeleted += bRes.affectedRows;
      totalOrgsDeleted += oRes.affectedRows;
    }
    console.log(`Totals: branches deleted=${totalBranchesDeleted}, orgs deleted=${totalOrgsDeleted}`);

    const [[postOrg]] = await conn.query<any[]>("SELECT COUNT(*) c FROM organizations") as any;
    const [[postBranch]] = await conn.query<any[]>("SELECT COUNT(*) c FROM organization_branches") as any;
    const [postClusters] = await conn.query<any[]>(`
      SELECT LOWER(TRIM(name)) AS k, COUNT(*) c FROM organizations
      GROUP BY LOWER(TRIM(name)) HAVING COUNT(*) > 1
    `);
    console.log(`POST: organizations=${postOrg.c}  branches=${postBranch.c}  clusters_remaining=${postClusters.length}`);

    const expectedOrgs = beforeOrgs - 4;
    const expectedBranches = beforeBranches - 5; // 0451:2 + 0489:1 + 0512:1 + 0522:1 = 5
    if (postOrg.c !== expectedOrgs || postBranch.c !== expectedBranches || postClusters.length !== 0) {
      console.error(`SANITY FAIL: expected orgs=${expectedOrgs} branches=${expectedBranches} clusters=0`);
      console.error(`  got       orgs=${postOrg.c} branches=${postBranch.c} clusters=${postClusters.length}`);
      await conn.rollback();
      console.error("ROLLED BACK.");
      await conn.end();
      process.exit(1);
    }

    if (apply) {
      await conn.commit();
      console.log("\n✓ COMMITTED.");
    } else {
      await conn.rollback();
      console.log("\n(dry-run) ROLLED BACK. Re-run with --apply to commit.");
    }
  } catch (e) {
    await conn.rollback();
    console.error("Error during merge — rolled back.", e);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}
main();
