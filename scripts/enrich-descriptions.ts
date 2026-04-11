#!/usr/bin/env tsx
/**
 * enrich-descriptions.ts
 *
 * Finds all active grants missing a description, searches GrantedAI for each
 * one by name, and back-fills the description from the best-match result.
 *
 * Usage:
 *   pnpm tsx scripts/enrich-descriptions.ts
 *   pnpm tsx scripts/enrich-descriptions.ts --limit 20 --dry-run
 *
 * Requires:
 *   DATABASE_URL=mysql://...  in .env (or environment)
 *   (GrantedAI API requires no key — public endpoint)
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { and, eq, isNull, or } from "drizzle-orm";
import { grants } from "../drizzle/schema.js";
import { searchExternalGrants } from "../server/externalGrants.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const LIMIT = parseInt(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? "50");
const DRY_RUN = process.argv.includes("--dry-run");
const DELAY_MS = 600; // pause between GrantedAI calls to avoid rate limiting

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Normalise a description: collapse whitespace, trim. Returns null if empty. */
function clean(text: string | null | undefined): string | null {
  if (!text) return null;
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > 10 ? t : null;
}

/**
 * Pick the best-matching result from GrantedAI results.
 * Prefer an exact name match; fall back to first result that has a summary.
 */
function bestMatch(
  grantName: string,
  results: Awaited<ReturnType<typeof searchExternalGrants>>,
): string | null {
  if (!results.length) return null;

  const nameLower = grantName.toLowerCase().trim();

  // 1. Exact name match
  const exact = results.find((r) => r.name.toLowerCase().trim() === nameLower);
  if (exact && clean(exact.summary)) return clean(exact.summary)!;

  // 2. Name starts-with match (handles truncated titles)
  const partial = results.find(
    (r) =>
      nameLower.startsWith(r.name.toLowerCase().trim().slice(0, 15)) ||
      r.name.toLowerCase().includes(nameLower.slice(0, 15)),
  );
  if (partial && clean(partial.summary)) return clean(partial.summary)!;

  // 3. First result with a non-trivial summary
  const first = results.find((r) => clean(r.summary));
  return first ? clean(first.summary)! : null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌  DATABASE_URL is not set. Copy .env.example → .env and fill in the value.");
    process.exit(1);
  }

  const db = drizzle(databaseUrl);

  console.log(`\n🔍  Fetching up to ${LIMIT} active grants with missing description…`);
  if (DRY_RUN) console.log("⚠️   DRY RUN — no database writes will occur\n");

  // Replicate the list_incomplete_grants MCP tool logic
  const incomplete = await db
    .select({
      itemId: grants.itemId,
      name:   grants.name,
    })
    .from(grants)
    .where(
      and(
        eq(grants.isActive, true),
        or(isNull(grants.description), eq(grants.description, "")),
      ),
    )
    .limit(LIMIT);

  if (!incomplete.length) {
    console.log("✅  No grants missing a description — nothing to do.");
    return;
  }

  console.log(`📋  Found ${incomplete.length} grants without a description.\n`);

  // Counters
  let updated = 0;
  let notFound = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (let i = 0; i < incomplete.length; i++) {
    const { itemId, name } = incomplete[i];
    const progress = `[${String(i + 1).padStart(2)}/${incomplete.length}]`;

    process.stdout.write(`${progress} "${name}" … `);

    try {
      const results = await searchExternalGrants({ query: name, limit: 5 });
      const description = bestMatch(name, results);

      if (!description) {
        console.log("— no match");
        notFound++;
      } else if (DRY_RUN) {
        console.log(`✔  (dry-run) would update: "${description.slice(0, 70)}…"`);
        updated++;
      } else {
        await db
          .update(grants)
          .set({ description, updatedAt: new Date() })
          .where(eq(grants.itemId, itemId));
        console.log(`✔  updated: "${description.slice(0, 70)}…"`);
        updated++;
      }
    } catch (err) {
      console.log(`✖  error: ${(err as Error).message}`);
      failures.push(name);
      skipped++;
    }

    // Throttle — don't hammer the GrantedAI API
    if (i < incomplete.length - 1) await sleep(DELAY_MS);
  }

  // ---------------------------------------------------------------------------
  // Report
  // ---------------------------------------------------------------------------

  console.log("\n" + "─".repeat(50));
  console.log("📊  Results:");
  console.log(`   ✔  Updated   : ${updated}`);
  console.log(`   –  No match  : ${notFound}`);
  console.log(`   ✖  Errors    : ${skipped}`);
  if (DRY_RUN) console.log("\n   (Dry run — run without --dry-run to apply changes)");
  if (failures.length) {
    console.log("\n   Failed grants:");
    failures.forEach((n) => console.log(`     • ${n}`));
  }
  console.log("─".repeat(50) + "\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
