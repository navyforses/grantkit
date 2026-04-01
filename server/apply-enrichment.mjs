/**
 * Parse LLM enrichment results and update grants in the database.
 * Reads the parallel processing output and applies enriched fields.
 */
import { readFileSync } from "fs";
import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { int, mysqlTable, text, timestamp, varchar, boolean, mysqlEnum } from "drizzle-orm/mysql-core";
import dotenv from "dotenv";

dotenv.config();

const grants = mysqlTable("grants", {
  id: int("id").autoincrement().primaryKey(),
  itemId: varchar("itemId", { length: 64 }).notNull().unique(),
  name: text("name").notNull(),
  organization: text("organization"),
  description: text("description"),
  category: varchar("category", { length: 64 }).notNull(),
  type: mysqlEnum("grantType", ["grant", "resource"]).default("grant").notNull(),
  country: varchar("country", { length: 64 }).notNull(),
  eligibility: text("eligibility"),
  website: text("website"),
  phone: varchar("phone", { length: 128 }),
  email: varchar("grantEmail", { length: 320 }),
  amount: text("amount"),
  status: text("status"),
  applicationProcess: text("applicationProcess"),
  deadline: text("deadline"),
  fundingType: varchar("fundingType", { length: 64 }),
  targetDiagnosis: text("targetDiagnosis"),
  ageRange: varchar("ageRange", { length: 32 }),
  geographicScope: text("geographicScope"),
  documentsRequired: text("documentsRequired"),
  b2VisaEligible: varchar("b2VisaEligible", { length: 32 }),
  state: varchar("state", { length: 128 }),
  city: varchar("city", { length: 128 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

function tryParseJSON(str) {
  if (!str || typeof str !== "string") return null;
  
  // Remove markdown code fences if present
  let cleaned = str.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/```\s*$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/```\s*$/, "");
  }
  
  // Fix escaped newlines
  cleaned = cleaned.replace(/\\n/g, " ");
  
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Try to extract JSON array from the string
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e2) {
        return null;
      }
    }
    return null;
  }
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL not set.");
    process.exit(1);
  }

  const db = drizzle(dbUrl);

  // Load enrichment results
  const resultsPath = "/home/ubuntu/enrich_phase5_grants.json";
  const rawResults = JSON.parse(readFileSync(resultsPath, "utf-8"));
  
  console.log(`Loaded ${rawResults.results.length} batch results.`);

  // Parse all enriched grants
  let allEnriched = [];
  let parseErrors = 0;
  
  for (const result of rawResults.results) {
    if (result.error) {
      console.error(`Batch error: ${result.input} - ${result.error}`);
      parseErrors++;
      continue;
    }
    
    const enrichedJson = result.output?.enriched_json;
    const parsed = tryParseJSON(enrichedJson);
    
    if (parsed && Array.isArray(parsed)) {
      allEnriched.push(...parsed);
    } else {
      console.error(`Failed to parse batch: ${result.input}`);
      parseErrors++;
    }
  }

  console.log(`\nParsed ${allEnriched.length} enriched grant records.`);
  console.log(`Parse errors: ${parseErrors}`);

  // Apply updates to database
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const enriched of allEnriched) {
    const grantId = enriched.id;
    if (!grantId) {
      skipped++;
      continue;
    }

    const updateData = {};
    
    if (enriched.applicationProcess && enriched.applicationProcess.trim()) {
      updateData.applicationProcess = enriched.applicationProcess.trim();
    }
    if (enriched.deadline && enriched.deadline.trim()) {
      updateData.deadline = enriched.deadline.trim();
    }
    if (enriched.documentsRequired && enriched.documentsRequired.trim()) {
      updateData.documentsRequired = enriched.documentsRequired.trim();
    }
    if (enriched.ageRange && enriched.ageRange.trim()) {
      // Truncate to 32 chars for varchar(32) field
      updateData.ageRange = enriched.ageRange.trim().substring(0, 32);
    }
    if (enriched.targetDiagnosis && enriched.targetDiagnosis.trim()) {
      updateData.targetDiagnosis = enriched.targetDiagnosis.trim();
    }

    if (Object.keys(updateData).length === 0) {
      skipped++;
      continue;
    }

    try {
      await db.update(grants).set(updateData).where(eq(grants.id, grantId));
      updated++;
    } catch (err) {
      console.error(`Error updating grant ${grantId}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n=== Enrichment Import Complete ===`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Errors: ${errors}`);

  // Verify by checking how many fields are still empty
  const { sql: sqlFn } = await import("drizzle-orm");
  const verifyResult = await db.execute(
    sqlFn`SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN applicationProcess IS NULL OR applicationProcess = '' THEN 1 ELSE 0 END) as empty_appProcess,
      SUM(CASE WHEN deadline IS NULL OR deadline = '' THEN 1 ELSE 0 END) as empty_deadline,
      SUM(CASE WHEN documentsRequired IS NULL OR documentsRequired = '' THEN 1 ELSE 0 END) as empty_docs,
      SUM(CASE WHEN ageRange IS NULL OR ageRange = '' THEN 1 ELSE 0 END) as empty_age,
      SUM(CASE WHEN targetDiagnosis IS NULL OR targetDiagnosis = '' OR targetDiagnosis LIKE 'Subcategory:%' THEN 1 ELSE 0 END) as empty_target
    FROM grants WHERE itemId LIKE 'social_%' OR itemId LIKE 'eu_social_%' OR itemId LIKE 'cat5_%'`
  );
  
  console.log(`\n=== Post-Enrichment Verification ===`);
  const row = verifyResult[0]?.[0] || verifyResult[0];
  if (row) {
    console.log(`  Total research grants: ${row.total}`);
    console.log(`  Empty applicationProcess: ${row.empty_appProcess}`);
    console.log(`  Empty deadline: ${row.empty_deadline}`);
    console.log(`  Empty documentsRequired: ${row.empty_docs}`);
    console.log(`  Empty ageRange: ${row.empty_age}`);
    console.log(`  Empty/generic targetDiagnosis: ${row.empty_target}`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
