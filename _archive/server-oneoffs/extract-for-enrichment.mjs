/**
 * Extract grants needing LLM enrichment from the database.
 * Finds grants with empty applicationProcess, deadline, documentsRequired fields.
 * Outputs a JSON file with grant data for parallel LLM processing.
 */
import { writeFileSync } from "fs";
import { drizzle } from "drizzle-orm/mysql2";
import { sql, or, like } from "drizzle-orm";
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

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL not set.");
    process.exit(1);
  }

  const db = drizzle(dbUrl);

  // Get grants that were added via research import (social_ or eu_social_ prefix)
  const results = await db.select({
    id: grants.id,
    itemId: grants.itemId,
    name: grants.name,
    organization: grants.organization,
    description: grants.description,
    category: grants.category,
    country: grants.country,
    state: grants.state,
    eligibility: grants.eligibility,
    website: grants.website,
    amount: grants.amount,
    applicationProcess: grants.applicationProcess,
    deadline: grants.deadline,
    targetDiagnosis: grants.targetDiagnosis,
    ageRange: grants.ageRange,
    documentsRequired: grants.documentsRequired,
    fundingType: grants.fundingType,
  }).from(grants).where(
    or(
      like(grants.itemId, "social_%"),
      like(grants.itemId, "eu_social_%"),
      like(grants.itemId, "cat5_%"),
      like(grants.itemId, "p6_%")
    )
  );

  console.log(`Found ${results.length} grants from research import.`);

  // Check which ones need enrichment (empty key fields)
  const needsEnrichment = results.filter(g => {
    const empty = (v) => !v || v.trim() === "" || v === "N/A";
    return empty(g.applicationProcess) || empty(g.deadline) || empty(g.documentsRequired) || empty(g.ageRange);
  });

  console.log(`Grants needing enrichment: ${needsEnrichment.length}`);

  // Stats on empty fields
  const stats = {
    applicationProcess: needsEnrichment.filter(g => !g.applicationProcess || g.applicationProcess.trim() === "").length,
    deadline: needsEnrichment.filter(g => !g.deadline || g.deadline.trim() === "").length,
    documentsRequired: needsEnrichment.filter(g => !g.documentsRequired || g.documentsRequired.trim() === "").length,
    ageRange: needsEnrichment.filter(g => !g.ageRange || g.ageRange.trim() === "").length,
    targetDiagnosis: needsEnrichment.filter(g => !g.targetDiagnosis || g.targetDiagnosis.trim() === "" || g.targetDiagnosis.startsWith("Subcategory:")).length,
  };

  console.log("\nEmpty field counts:");
  for (const [field, count] of Object.entries(stats)) {
    console.log(`  ${field}: ${count}/${needsEnrichment.length}`);
  }

  // Save to file for parallel processing
  const outputPath = "/home/ubuntu/grantkit-data/grants_for_enrichment.json";
  writeFileSync(outputPath, JSON.stringify(needsEnrichment, null, 2));
  console.log(`\nSaved to: ${outputPath}`);

  // Also create individual files for parallel map processing (batches of 10)
  const batchDir = "/home/ubuntu/grantkit-data/enrichment_batches";
  const { mkdirSync } = await import("fs");
  mkdirSync(batchDir, { recursive: true });

  const BATCH_SIZE = 10;
  const batches = [];
  for (let i = 0; i < needsEnrichment.length; i += BATCH_SIZE) {
    const batch = needsEnrichment.slice(i, i + BATCH_SIZE);
    const batchPath = `${batchDir}/batch_${String(Math.floor(i / BATCH_SIZE) + 1).padStart(3, "0")}.json`;
    writeFileSync(batchPath, JSON.stringify(batch, null, 2));
    batches.push(batchPath);
  }

  console.log(`Created ${batches.length} batch files in ${batchDir}`);

  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
