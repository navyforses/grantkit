/**
 * Import Phase 7 EU grants (19 countries × 5 categories) into the GrantKit database.
 * Maps research JSON fields to the existing grants table schema.
 * 
 * Usage: node server/import-research-grants.mjs
 */
import { readFileSync } from "fs";
import { drizzle } from "drizzle-orm/mysql2";
import { eq, sql } from "drizzle-orm";
import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar, uniqueIndex, index } from "drizzle-orm/mysql-core";
import dotenv from "dotenv";

dotenv.config();

// Re-define grants table inline to avoid TS import issues in .mjs
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

const DATA_PATH = "/home/ubuntu/grantkit-data/phase7/processed/phase7_all.json";

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function mapResearchToGrant(research, index) {
  // Generate a unique itemId based on name
  const nameSlug = slugify(research.name).substring(0, 40);
  const itemId = research.itemId || `p7_${String(index + 1).padStart(4, "0")}_${nameSlug}`;

  const category = research.category || "other";

  // Handle both old (amount_description/amount_min/amount_max) and new (amount) format
  let amount = research.amount || research.amount_description || "Varies";
  if (research.amount_min && research.amount_max) {
    amount = `${research.amount_min} - ${research.amount_max}`;
    if (research.amount_description) amount += ` (${research.amount_description})`;
  }

  // Handle both old (eligibility_description) and new (eligibility) format
  let eligibility = research.eligibility || research.eligibility_description || "";

  // Map state
  let state = research.state || research.state_or_region || "";
  if (!state || state.toLowerCase() === "n/a" || state.toLowerCase() === "none") state = "";

  // Determine geographic scope
  const geographicScope = research.geographic_scope || research.country || "";

  // Determine funding type from funding_source
  let fundingType = "";
  const fs = research.funding_source || "";
  if (fs === "government") fundingType = "Government";
  else if (fs === "nonprofit") fundingType = "Nonprofit";
  else if (fs === "mixed") fundingType = "Mixed (Government + Nonprofit)";
  else fundingType = fs;

  return {
    itemId,
    name: research.name,
    organization: research.organization || research.funder_name || "",
    description: research.description || "",
    category,
    type: "grant",
    country: research.country || "Unknown",
    eligibility,
    website: research.website || research.funder_url || research.application_url || "",
    phone: research.phone || "",
    email: research.email || "",
    amount,
    status: research.status === "active" ? "Active" : (research.status || "Active"),
    applicationProcess: research.application_process || "",
    deadline: research.deadline || "",
    fundingType,
    targetDiagnosis: research.subcategory ? `Subcategory: ${research.subcategory}` : "",
    ageRange: "",
    geographicScope,
    documentsRequired: "",
    b2VisaEligible: "",
    state,
    city: research.city || "",
    isActive: true,
  };
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL not set. Please run from the project directory with .env loaded.");
    process.exit(1);
  }

  console.log("Connecting to database...");
  const db = drizzle(dbUrl);

  // Load research data
  console.log(`Loading research data from ${DATA_PATH}...`);
  const rawData = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
  console.log(`Loaded ${rawData.length} grants from research data.`);

  // Check existing grants to avoid duplicates
  const existingGrants = await db.select({ name: grants.name, itemId: grants.itemId }).from(grants);
  const existingNames = new Set(existingGrants.map(g => g.name?.toLowerCase()));
  console.log(`Found ${existingGrants.length} existing grants in database.`);

  // Transform and filter
  const toImport = [];
  const skipped = [];
  for (let i = 0; i < rawData.length; i++) {
    const mapped = mapResearchToGrant(rawData[i], i);
    
    // Check for name duplicates with existing DB
    if (existingNames.has(mapped.name.toLowerCase())) {
      skipped.push({ name: mapped.name, reason: "duplicate_name" });
      continue;
    }
    
    toImport.push(mapped);
  }

  console.log(`\nImport plan:`);
  console.log(`  To import: ${toImport.length}`);
  console.log(`  Skipped (duplicates): ${skipped.length}`);

  if (skipped.length > 0) {
    console.log(`\nSkipped grants:`);
    for (const s of skipped.slice(0, 20)) {
      console.log(`  - ${s.name} (${s.reason})`);
    }
    if (skipped.length > 20) console.log(`  ... and ${skipped.length - 20} more`);
  }

  // Import in batches
  const BATCH_SIZE = 25;
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < toImport.length; i += BATCH_SIZE) {
    const batch = toImport.slice(i, i + BATCH_SIZE);
    
    for (const grant of batch) {
      try {
        await db.insert(grants).values(grant);
        imported++;
      } catch (err) {
        // Try with a modified itemId if duplicate
        try {
          grant.itemId = grant.itemId + "_" + Date.now().toString(36);
          await db.insert(grants).values(grant);
          imported++;
        } catch (err2) {
          console.error(`  Error importing "${grant.name}": ${err2.message}`);
          errors++;
        }
      }
    }
    
    console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${imported} imported, ${errors} errors`);
  }

  console.log(`\n=== Import Complete ===`);
  console.log(`  Imported: ${imported}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Skipped: ${skipped.length}`);

  // Verify
  const totalResult = await db.select({ count: sql`COUNT(*)` }).from(grants);
  console.log(`  Total grants in DB: ${totalResult[0]?.count}`);

  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
