/**
 * Seed script: Migrate catalog.json + catalogTranslations.json into the database.
 * Run once: node seed-grants.mjs
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

// Read JSON files
const catalog = JSON.parse(readFileSync("client/src/data/catalog.json", "utf-8"));
const translations = JSON.parse(readFileSync("client/src/data/catalogTranslations.json", "utf-8"));

console.log(`Seeding ${catalog.length} grants...`);

const BATCH_SIZE = 50;

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);

  try {
    // Seed grants
    for (let i = 0; i < catalog.length; i += BATCH_SIZE) {
      const batch = catalog.slice(i, i + BATCH_SIZE);
      const values = batch.map((item) => [
        item.id,
        item.name || "",
        item.organization || "",
        item.description || "",
        item.category || "other",
        item.type === "resource" ? "resource" : "grant",
        item.country || "",
        item.eligibility || "",
        item.website || "",
        item.phone || "",
        item.email || "",
        item.amount || "",
        item.status || "",
        1, // isActive
      ]);

      const placeholders = values.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
      const flatValues = values.flat();

      await connection.execute(
        `INSERT INTO grants (itemId, name, organization, description, category, grantType, country, eligibility, website, phone, grantEmail, amount, status, isActive) VALUES ${placeholders} ON DUPLICATE KEY UPDATE name=VALUES(name), organization=VALUES(organization), description=VALUES(description), category=VALUES(category), grantType=VALUES(grantType), country=VALUES(country), eligibility=VALUES(eligibility), website=VALUES(website), phone=VALUES(phone), grantEmail=VALUES(grantEmail), amount=VALUES(amount), status=VALUES(status)`,
        flatValues
      );

      console.log(`  Grants: ${Math.min(i + BATCH_SIZE, catalog.length)}/${catalog.length}`);
    }

    // Seed translations
    const entries = Object.entries(translations);
    console.log(`Seeding translations for ${entries.length} items...`);

    const translationBatch = [];
    for (const [itemId, langs] of entries) {
      for (const [lang, content] of Object.entries(langs)) {
        translationBatch.push([
          itemId,
          lang,
          content.name || "",
          content.description || "",
          content.eligibility || "",
        ]);
      }
    }

    for (let i = 0; i < translationBatch.length; i += BATCH_SIZE) {
      const batch = translationBatch.slice(i, i + BATCH_SIZE);
      const placeholders = batch.map(() => "(?, ?, ?, ?, ?)").join(", ");
      const flatValues = batch.flat();

      await connection.execute(
        `INSERT INTO grant_translations (grantItemId, language, name, description, eligibility) VALUES ${placeholders} ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), eligibility=VALUES(eligibility)`,
        flatValues
      );

      if ((i + BATCH_SIZE) % 200 < BATCH_SIZE || i + BATCH_SIZE >= translationBatch.length) {
        console.log(`  Translations: ${Math.min(i + BATCH_SIZE, translationBatch.length)}/${translationBatch.length}`);
      }
    }

    console.log("✅ Seeding complete!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await connection.end();
    process.exit(0);
  }
}

main();
