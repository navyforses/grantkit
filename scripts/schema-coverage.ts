#!/usr/bin/env tsx
/**
 * schema-coverage.ts
 *
 * Diagnostic: count how many grants have populated data in each key field.
 * Read-only — no DB writes.
 */

import "dotenv/config";
import { getDb } from "../server/db";
import { grants } from "../drizzle/schema";
import { sql, count, isNotNull, and, eq } from "drizzle-orm";

async function coverageCheck() {
  const db = await getDb();
  if (!db) {
    console.error("DB connection failed — DATABASE_URL not set or connection error");
    process.exit(1);
  }

  console.log("[coverage] Analyzing grants table...\n");

  const [{ n: total }] = await db
    .select({ n: count() })
    .from(grants)
    .where(eq(grants.isActive, true));

  const [{ n: withWebsite }] = await db
    .select({ n: count() })
    .from(grants)
    .where(and(eq(grants.isActive, true), isNotNull(grants.website)));

  const [{ n: withPhone }] = await db
    .select({ n: count() })
    .from(grants)
    .where(and(eq(grants.isActive, true), isNotNull(grants.phone)));

  const [{ n: withEmail }] = await db
    .select({ n: count() })
    .from(grants)
    .where(and(eq(grants.isActive, true), isNotNull(grants.email)));

  const [{ n: withAddress }] = await db
    .select({ n: count() })
    .from(grants)
    .where(and(
      eq(grants.isActive, true),
      isNotNull(grants.address),
      sql`LENGTH(${grants.address}) > 5`
    ));

  const [{ n: withCoords }] = await db
    .select({ n: count() })
    .from(grants)
    .where(and(
      eq(grants.isActive, true),
      isNotNull(grants.latitude),
      isNotNull(grants.longitude)
    ));

  console.log("=== Coverage Report (active grants) ===\n");
  console.log(`Total active:              ${total}`);
  console.log(
    `With website URL:          ${withWebsite} (${((withWebsite / total) * 100).toFixed(1)}%)`
  );
  console.log(`With phone:                ${withPhone} (${((withPhone / total) * 100).toFixed(1)}%)`);
  console.log(`With email:                ${withEmail} (${((withEmail / total) * 100).toFixed(1)}%)`);
  console.log(
    `With valid address:        ${withAddress} (${((withAddress / total) * 100).toFixed(1)}%)`
  );
  console.log(
    `With lat/lng coordinates:  ${withCoords} (${((withCoords / total) * 100).toFixed(1)}%)`
  );
  console.log(
    `\n[coverage] Done. Results also saved to .grantkit-redesign/schema-inventory.md`
  );
}

coverageCheck().catch((err) => {
  console.error("[coverage] Error:", err);
  process.exit(1);
});
