/**
 * Fix state codes (2-letter abbreviations) to full state names in the grants table.
 * The existing grants use full names (e.g., "California") while newly imported social grants
 * use 2-letter codes (e.g., "CA"). This script normalizes all to full names.
 * 
 * Also sets "Federal" state entries to "Nationwide" for consistency.
 * 
 * Usage: node server/fix-state-codes.mjs
 */
import { drizzle } from "drizzle-orm/mysql2";
import { eq, sql } from "drizzle-orm";
import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
import dotenv from "dotenv";

dotenv.config();

const grants = mysqlTable("grants", {
  id: int("id").autoincrement().primaryKey(),
  state: varchar("state", { length: 128 }),
});

const STATE_CODE_TO_NAME = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas",
  CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware",
  DC: "District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii",
  ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine",
  MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska",
  NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico",
  NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island",
  SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas",
  UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL not set.");
    process.exit(1);
  }

  const db = drizzle(dbUrl);

  // Get all distinct state values
  const rows = await db.select({ state: grants.state }).from(grants).groupBy(grants.state);
  const distinctStates = rows.map(r => r.state).filter(Boolean);
  
  console.log(`Found ${distinctStates.length} distinct state values:`);
  for (const s of distinctStates.sort()) {
    console.log(`  "${s}"`);
  }

  let updated = 0;

  // Fix 2-letter codes to full names
  for (const [code, fullName] of Object.entries(STATE_CODE_TO_NAME)) {
    const result = await db.update(grants)
      .set({ state: fullName })
      .where(eq(grants.state, code));
    
    if (result[0]?.affectedRows > 0) {
      console.log(`  ${code} → ${fullName}: ${result[0].affectedRows} rows`);
      updated += result[0].affectedRows;
    }
  }

  // Fix "Federal" to "Nationwide"
  const fedResult = await db.update(grants)
    .set({ state: "Nationwide" })
    .where(eq(grants.state, "Federal"));
  if (fedResult[0]?.affectedRows > 0) {
    console.log(`  Federal → Nationwide: ${fedResult[0].affectedRows} rows`);
    updated += fedResult[0].affectedRows;
  }

  console.log(`\n=== Done: ${updated} rows updated ===`);

  // Show updated distinct states
  const afterRows = await db.select({ state: grants.state }).from(grants).groupBy(grants.state);
  const afterStates = afterRows.map(r => r.state).filter(Boolean);
  console.log(`\nDistinct states after fix (${afterStates.length}):`);
  for (const s of afterStates.sort()) {
    console.log(`  "${s}"`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
