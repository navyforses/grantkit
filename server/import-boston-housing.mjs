/**
 * Import Boston Housing Assistance programs into the GrantKit database.
 * 
 * Usage: node server/import-boston-housing.mjs
 */
import { readFileSync } from "fs";
import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
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

const DATA_PATH = "/home/ubuntu/grantkit-data/boston_housing_grants.json";

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function mapToGrant(item, index) {
  const nameSlug = slugify(item.name).substring(0, 40);
  const itemId = `bos_housing_${String(index + 1).padStart(3, "0")}_${nameSlug}`;

  return {
    itemId,
    name: item.name,
    organization: item.organization || "",
    description: item.description || "",
    category: item.category || "housing",
    type: "resource",
    country: item.country || "US",
    eligibility: item.eligibility || "",
    website: item.website || "",
    phone: item.phone || "",
    email: item.email || "",
    amount: item.amount || "",
    status: item.status || "Active",
    applicationProcess: item.applicationProcess || "",
    deadline: item.deadline || "",
    fundingType: item.fundingType || "",
    targetDiagnosis: item.targetDiagnosis || "",
    ageRange: item.ageRange || "",
    geographicScope: item.geographicScope || "",
    documentsRequired: item.documentsRequired || "",
    b2VisaEligible: item.b2VisaEligible || "",
    state: item.state || "Massachusetts",
    city: item.city || "Boston",
    isActive: true,
  };
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL not set.");
    process.exit(1);
  }

  console.log("Connecting to database...");
  const db = drizzle(dbUrl);

  console.log(`Loading data from ${DATA_PATH}...`);
  const rawData = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
  console.log(`Loaded ${rawData.length} Boston housing programs.`);

  // Check existing grants to avoid duplicates
  const existingGrants = await db.select({ name: grants.name, itemId: grants.itemId }).from(grants);
  const existingNames = new Set(existingGrants.map(g => g.name?.toLowerCase()));
  console.log(`Found ${existingGrants.length} existing grants in database.`);

  const toImport = [];
  const skipped = [];
  for (let i = 0; i < rawData.length; i++) {
    const mapped = mapToGrant(rawData[i], i);
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
    console.log(`\nSkipped:`);
    for (const s of skipped) {
      console.log(`  - ${s.name}`);
    }
  }

  let imported = 0;
  let errors = 0;

  for (const grant of toImport) {
    try {
      await db.insert(grants).values(grant);
      imported++;
    } catch (err) {
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

  console.log(`\n=== Import Complete ===`);
  console.log(`  Imported: ${imported}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Skipped: ${skipped.length}`);

  const totalResult = await db.select({ count: sql`COUNT(*)` }).from(grants);
  console.log(`  Total grants in DB: ${totalResult[0]?.count}`);

  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
