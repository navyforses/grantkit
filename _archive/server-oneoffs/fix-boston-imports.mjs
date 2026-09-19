/**
 * Fix the 3 Boston housing programs that failed to import due to ageRange > 32 chars.
 */
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

const failedItems = [
  {
    itemId: "bos_housing_016_bha_federal_public_housing",
    name: "Boston Housing Authority (BHA) — Federal Public Housing",
    organization: "Boston Housing Authority",
    description: "New England's largest public housing authority manages over 12,000 units of federal, state, and city-funded public housing. Provides affordable apartments for low-income families, elderly, and disabled residents.",
    category: "housing",
    type: "resource",
    country: "US",
    eligibility: "Low-income families, elderly (62+), and persons with disabilities. Income limits vary by household size (generally below 80% AMI for initial eligibility, below 50% AMI for priority).",
    website: "https://www.bostonhousing.org",
    phone: "617-988-3400",
    email: "",
    amount: "Rent set at 30% of household income",
    status: "Active",
    applicationProcess: "Apply online at boston.myhousing.com for federal/city housing. Apply via CHAMP portal for state housing. Wait times can exceed 10 years. Priority 1 status (homeless, displaced, DV survivor) may accelerate.",
    deadline: "Ongoing — waitlist (2–10+ yrs)",
    fundingType: "Government",
    targetDiagnosis: "",
    ageRange: "All ages",
    geographicScope: "City of Boston",
    documentsRequired: "Photo ID, Social Security cards, birth certificates, proof of income, tax returns, landlord references",
    b2VisaEligible: "No",
    state: "Massachusetts",
    city: "Boston",
    isActive: true,
  },
  {
    itemId: "bos_housing_032_heading_home_family_housing",
    name: "Heading Home — Family & Individual Housing",
    organization: "Heading Home Inc.",
    description: "Provides emergency shelter for 360+ families, transitional housing, and permanent supportive housing for families and individuals experiencing homelessness in Greater Boston.",
    category: "housing",
    type: "resource",
    country: "US",
    eligibility: "Families and individuals experiencing homelessness in Greater Boston.",
    website: "https://headinghomeinc.org",
    phone: "617-864-8140",
    email: "",
    amount: "Free shelter and subsidized permanent housing",
    status: "Active",
    applicationProcess: "Referral through Coordinated Entry System or contact Heading Home directly at 617-864-8140.",
    deadline: "Ongoing",
    fundingType: "Nonprofit",
    targetDiagnosis: "",
    ageRange: "All ages",
    geographicScope: "Greater Boston",
    documentsRequired: "Varies by program",
    b2VisaEligible: "No",
    state: "Massachusetts",
    city: "Boston",
    isActive: true,
  },
  {
    itemId: "bos_housing_039_home_share_pilot_senior",
    name: "Home Share Pilot Program — Senior Housing",
    organization: "City of Boston — Age Strong Commission",
    description: "Pilot program matching seniors who have extra space in their homes with individuals seeking affordable housing. Seniors receive companionship and/or rental income while providing affordable housing.",
    category: "housing",
    type: "resource",
    country: "US",
    eligibility: "Senior homeowners with extra space and individuals seeking affordable housing in Boston.",
    website: "https://www.boston.gov/departments/age-strong-commission/housing-support-older-adults",
    phone: "617-635-4366",
    email: "",
    amount: "Reduced rent for tenants; rental income for seniors",
    status: "Active (pilot)",
    applicationProcess: "Contact Age Strong Commission at 617-635-4366.",
    deadline: "Ongoing — pilot program",
    fundingType: "Government",
    targetDiagnosis: "",
    ageRange: "Seniors 65+; all ages",
    geographicScope: "City of Boston",
    documentsRequired: "Proof of homeownership, background check",
    b2VisaEligible: "No",
    state: "Massachusetts",
    city: "Boston",
    isActive: true,
  },
];

async function main() {
  const db = drizzle(process.env.DATABASE_URL);

  for (const item of failedItems) {
    try {
      await db.insert(grants).values(item);
      console.log(`✓ Imported: ${item.name}`);
    } catch (err) {
      console.error(`✗ Failed: ${item.name} — ${err.message}`);
    }
  }

  const totalResult = await db.select({ count: sql`COUNT(*)` }).from(grants);
  console.log(`\nTotal grants in DB: ${totalResult[0]?.count}`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
