/**
 * Apply retry enrichment for batch 051.
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
  applicationProcess: text("applicationProcess"),
  deadline: text("deadline"),
  targetDiagnosis: text("targetDiagnosis"),
  ageRange: varchar("ageRange", { length: 32 }),
  documentsRequired: text("documentsRequired"),
});

function tryParseJSON(str) {
  if (!str || typeof str !== "string") return null;
  let cleaned = str.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.replace(/^```json\s*/, "").replace(/```\s*$/, "");
  else if (cleaned.startsWith("```")) cleaned = cleaned.replace(/^```\s*/, "").replace(/```\s*$/, "");
  cleaned = cleaned.replace(/\\n/g, " ");
  try { return JSON.parse(cleaned); } catch (e) {
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) { try { return JSON.parse(match[0]); } catch (e2) { return null; } }
    return null;
  }
}

async function main() {
  const db = drizzle(process.env.DATABASE_URL);
  const rawResults = JSON.parse(readFileSync("/home/ubuntu/enrich_batch_063_retry.json", "utf-8"));
  
  let updated = 0;
  for (const result of rawResults.results) {
    const parsed = tryParseJSON(result.output?.enriched_json);
    if (!parsed || !Array.isArray(parsed)) { console.error("Failed to parse retry"); continue; }
    
    for (const enriched of parsed) {
      if (!enriched.id) continue;
      const updateData = {};
      if (enriched.applicationProcess?.trim()) updateData.applicationProcess = enriched.applicationProcess.trim();
      if (enriched.deadline?.trim()) updateData.deadline = enriched.deadline.trim();
      if (enriched.documentsRequired?.trim()) updateData.documentsRequired = enriched.documentsRequired.trim();
      if (enriched.ageRange?.trim()) updateData.ageRange = enriched.ageRange.trim().substring(0, 32);
      if (enriched.targetDiagnosis?.trim()) updateData.targetDiagnosis = enriched.targetDiagnosis.trim();
      
      if (Object.keys(updateData).length > 0) {
        try {
          await db.update(grants).set(updateData).where(eq(grants.id, enriched.id));
          updated++;
        } catch (err) { console.error(`Error: ${err.message}`); }
      }
    }
  }
  
  console.log(`Updated: ${updated}`);
  
  // Final verification
  const { sql: sqlFn } = await import("drizzle-orm");
  const verify = await db.execute(
    sqlFn`SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN applicationProcess IS NULL OR applicationProcess = '' THEN 1 ELSE 0 END) as empty_app,
      SUM(CASE WHEN deadline IS NULL OR deadline = '' THEN 1 ELSE 0 END) as empty_deadline,
      SUM(CASE WHEN documentsRequired IS NULL OR documentsRequired = '' THEN 1 ELSE 0 END) as empty_docs,
      SUM(CASE WHEN ageRange IS NULL OR ageRange = '' THEN 1 ELSE 0 END) as empty_age,
      SUM(CASE WHEN targetDiagnosis IS NULL OR targetDiagnosis = '' OR targetDiagnosis LIKE 'Subcategory:%' THEN 1 ELSE 0 END) as empty_target
    FROM grants WHERE itemId LIKE 'social_%' OR itemId LIKE 'eu_social_%' OR itemId LIKE 'cat5_%'`
  );
  
  const row = verify[0]?.[0] || verify[0];
  if (row) {
    console.log(`\nFinal verification (research grants only):`);
    console.log(`  Total: ${row.total}`);
    console.log(`  Empty applicationProcess: ${row.empty_app}`);
    console.log(`  Empty deadline: ${row.empty_deadline}`);
    console.log(`  Empty documentsRequired: ${row.empty_docs}`);
    console.log(`  Empty ageRange: ${row.empty_age}`);
    console.log(`  Empty/generic targetDiagnosis: ${row.empty_target}`);
  }
  
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
