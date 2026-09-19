/**
 * Import script for daily grant discovery — 2026-04-19
 * Category: SOCIAL (Saturday rotation)
 * Run: node pending-imports/import-2026-04-19.mjs
 */
import { readFileSync } from "fs";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const grants = JSON.parse(readFileSync(new URL("./2026-04-19.json", import.meta.url), "utf-8"));

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const grant of grants) {
    try {
      await connection.execute(
        `INSERT INTO grants (itemId, name, organization, description, category, grantType, country, eligibility, website, phone, grantEmail, amount, status, state, city, targetDiagnosis, fundingType, b2VisaEligible, applicationProcess, geographicScope, documentsRequired, ageRange, isActive)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          grant.id,
          grant.name,
          grant.organization || "",
          grant.description || "",
          grant.category || "other",
          grant.type === "resource" ? "resource" : "grant",
          grant.country || "",
          grant.eligibility || "",
          grant.website || "",
          grant.phone || "",
          grant.email || "",
          grant.amount || "",
          grant.status || "",
          grant.state || "",
          grant.city || "",
          grant.targetDiagnosis || "",
          grant.fundingType || "",
          grant.b2VisaEligible || "",
          grant.applicationProcess || "",
          grant.geographicScope || "",
          grant.documentsRequired || "",
          grant.ageRange || "",
          1,
        ]
      );
      inserted++;
      console.log("\u2713", grant.name);
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY") {
        skipped++;
        console.log("\u2298 Duplicate:", grant.name);
      } else {
        errors++;
        console.error("\u2717", grant.name, e.message);
      }
    }
  }

  console.log(`\nDone: ${inserted} inserted, ${skipped} duplicates, ${errors} errors (out of ${grants.length} total)`);
  await connection.end();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
