#!/usr/bin/env tsx
/**
 * cleanup-deadlines.ts — Mark expired grants and flag closing-soon.
 *
 * For each active grant with a deadline:
 *   - deadline < today → set status = 'expired'
 *   - deadline within 30 days → flag as "closing soon" (logged, not auto-changed)
 *   - deadline text contains "rolling"/"ongoing"/"open" → skip (keep active)
 *
 * For grants without deadline:
 *   - If description mentions "rolling"/"ongoing" → keep active (logged)
 *
 * Usage:
 *   pnpm cleanup:deadlines           — dry-run (no DB writes)
 *   pnpm cleanup:deadlines --apply   — apply changes
 * Requires: DATABASE_URL in .env or environment
 */

import "dotenv/config";
import mysql from "mysql2/promise";

const APPLY = process.argv.includes("--apply");
const CLOSING_SOON_DAYS = 30;

const ONGOING_PATTERNS = /rolling|ongoing|open|continuous|no deadline|anytime|year.round/i;

// Attempt to parse various deadline text formats into a Date
function parseDeadline(text: string): Date | null {
  if (!text?.trim()) return null;

  // Skip obviously non-date strings
  if (ONGOING_PATTERNS.test(text)) return null;
  if (/tbd|tba|varies|n\/a|not specified|contact/i.test(text)) return null;

  const cleaned = text.trim();

  // Try native Date parsing (handles ISO 8601 and many English formats)
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d;

  // Try "Month DD, YYYY" and "Month YYYY"
  const monthYear = cleaned.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (monthYear) {
    const d2 = new Date(`${monthYear[1]} 1, ${monthYear[2]}`);
    if (!isNaN(d2.getTime())) return d2;
  }

  return null;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is required");
    process.exit(1);
  }

  const db = await mysql.createConnection(process.env.DATABASE_URL);
  console.log("Connected to database.\n");

  const mode = APPLY ? "🔧 APPLY mode — DB will be updated" : "🔍 DRY-RUN mode — no DB writes";
  console.log(`${mode}\n`);

  const [rows] = await db.execute<mysql.RowDataPacket[]>(
    `SELECT itemId, name, deadline, status, description
     FROM grants WHERE isActive = 1 ORDER BY id`
  );

  const grants = rows as {
    itemId: string;
    name: string;
    deadline: string | null;
    status: string | null;
    description: string | null;
  }[];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const soonDate = new Date(today);
  soonDate.setDate(soonDate.getDate() + CLOSING_SOON_DAYS);

  const expired: string[] = [];
  const closingSoon: { itemId: string; name: string; deadline: string }[] = [];
  const ongoing: string[] = [];
  const noDeadline: string[] = [];
  const unparseable: string[] = [];

  for (const g of grants) {
    if (!g.deadline?.trim()) {
      // No deadline — check description for ongoing signals
      if (g.description && ONGOING_PATTERNS.test(g.description)) {
        ongoing.push(g.itemId);
      } else {
        noDeadline.push(g.itemId);
      }
      continue;
    }

    // Has deadline text
    if (ONGOING_PATTERNS.test(g.deadline)) {
      ongoing.push(g.itemId);
      continue;
    }

    const parsed = parseDeadline(g.deadline);
    if (!parsed) {
      unparseable.push(g.itemId);
      continue;
    }

    if (parsed < today) {
      expired.push(g.itemId);
    } else if (parsed <= soonDate) {
      closingSoon.push({ itemId: g.itemId, name: g.name, deadline: g.deadline });
    }
  }

  // Report
  console.log("=== Deadline Cleanup Report ===\n");
  console.log(`Total active grants  : ${grants.length}`);
  console.log(`❌ Expired           : ${expired.length}`);
  console.log(`⏰ Closing soon (≤${CLOSING_SOON_DAYS}d): ${closingSoon.length}`);
  console.log(`♻️  Ongoing/rolling   : ${ongoing.length}`);
  console.log(`📭 No deadline       : ${noDeadline.length}`);
  console.log(`❓ Unparseable date  : ${unparseable.length}`);

  if (closingSoon.length > 0) {
    console.log("\n⏰ Closing soon:");
    for (const g of closingSoon.slice(0, 10)) {
      console.log(`   ${g.itemId}: "${g.name.slice(0, 50)}" — ${g.deadline}`);
    }
    if (closingSoon.length > 10) console.log(`   ... and ${closingSoon.length - 10} more`);
  }

  // Apply
  if (expired.length > 0) {
    if (APPLY) {
      console.log(`\n🔧 Marking ${expired.length} grants as expired...`);
      let done = 0;
      for (const id of expired) {
        await db.execute(
          "UPDATE grants SET status = 'expired' WHERE itemId = ?",
          [id]
        );
        done++;
      }
      console.log(`   ✅ ${done} grants marked as expired`);
    } else {
      console.log(`\nℹ️  Run with --apply to mark ${expired.length} expired grants in DB.`);
    }
  } else {
    console.log("\n✅ No expired grants found.");
  }

  await db.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Cleanup failed:", err.message);
  process.exit(1);
});
