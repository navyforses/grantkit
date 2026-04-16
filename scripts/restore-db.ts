#!/usr/bin/env tsx
/**
 * scripts/restore-db.ts
 * Restores grants and translations from local JSON files to MySQL.
 *
 * Usage:
 *   DATABASE_URL="mysql://user:pass@host:3306/railway" tsx scripts/restore-db.ts
 *
 * Safe to re-run — uses ON DUPLICATE KEY UPDATE.
 */

import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import { grants, grantTranslations } from "../drizzle/schema";
import type { InsertGrant, InsertGrantTranslation } from "../drizzle/schema";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ── Types ──────────────────────────────────────────────────────────────────

interface CatalogEntry {
  id: string;
  name: string;
  organization?: string;
  description?: string;
  category: string;
  type: "grant" | "resource";
  country: string;
  eligibility?: string;
  website?: string;
  phone?: string;
  email?: string;
  amount?: string;
  status?: string;
  applicationProcess?: string;
  deadline?: string;
  fundingType?: string;
  targetDiagnosis?: string;
  ageRange?: string;
  geographicScope?: string;
  documentsRequired?: string;
  b2VisaEligible?: string;
  state?: string;
  city?: string;
}

type TranslationFields = {
  name?: string;
  description?: string;
  eligibility?: string;
  applicationProcess?: string;
  deadline?: string;
  targetDiagnosis?: string;
  ageRange?: string;
  geographicScope?: string;
  documentsRequired?: string;
};

type TranslationsFile = Record<string, Record<string, TranslationFields>>;

// ── DB ─────────────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable is required.\n");
  console.error(
    "Usage: DATABASE_URL='mysql://user:pass@host:3306/railway' tsx scripts/restore-db.ts"
  );
  process.exit(1);
}

const db = drizzle(DATABASE_URL);

// ── Restore grants ──────────────────────────────────────────────────────────

async function restoreGrants(catalog: CatalogEntry[]): Promise<void> {
  const BATCH = 50;
  console.log(
    `\n[grants] Inserting ${catalog.length} records in batches of ${BATCH}...`
  );

  for (let i = 0; i < catalog.length; i += BATCH) {
    const batch = catalog.slice(i, i + BATCH);

    const rows: InsertGrant[] = batch.map((g) => ({
      itemId: g.id,
      name: g.name,
      organization: g.organization ?? null,
      description: g.description ?? null,
      category: g.category,
      type: g.type,
      country: g.country,
      eligibility: g.eligibility ?? null,
      website: g.website ?? null,
      phone: g.phone ?? null,
      email: g.email ?? null,
      amount: g.amount ?? null,
      status: g.status ?? null,
      applicationProcess: g.applicationProcess ?? null,
      deadline: g.deadline ?? null,
      fundingType: g.fundingType ?? null,
      targetDiagnosis: g.targetDiagnosis ?? null,
      ageRange: g.ageRange ?? null,
      geographicScope: g.geographicScope ?? null,
      documentsRequired: g.documentsRequired ?? null,
      b2VisaEligible: g.b2VisaEligible ?? null,
      state: g.state ?? null,
      city: g.city ?? null,
      isActive: true,
    }));

    await db
      .insert(grants)
      .values(rows)
      .onDuplicateKeyUpdate({
        set: {
          name: sql`VALUES(name)`,
          organization: sql`VALUES(organization)`,
          description: sql`VALUES(description)`,
          category: sql`VALUES(category)`,
          country: sql`VALUES(country)`,
          eligibility: sql`VALUES(eligibility)`,
          website: sql`VALUES(website)`,
          phone: sql`VALUES(phone)`,
          email: sql`VALUES(grantEmail)`,
          amount: sql`VALUES(amount)`,
          status: sql`VALUES(status)`,
          isActive: true,
        },
      });

    console.log(
      `  [grants] ${Math.min(i + BATCH, catalog.length)}/${catalog.length}`
    );
  }

  console.log("[grants] Done.\n");
}

// ── Restore translations ────────────────────────────────────────────────────

async function restoreTranslations(
  translations: TranslationsFile
): Promise<void> {
  const rows: InsertGrantTranslation[] = [];

  for (const [itemId, langs] of Object.entries(translations)) {
    for (const [lang, content] of Object.entries(langs)) {
      if (!content || typeof content !== "object") continue;
      rows.push({
        grantItemId: itemId,
        language: lang,
        name: content.name ?? null,
        description: content.description ?? null,
        eligibility: content.eligibility ?? null,
        applicationProcess: content.applicationProcess ?? null,
        deadline: content.deadline ?? null,
        targetDiagnosis: content.targetDiagnosis ?? null,
        ageRange: content.ageRange ?? null,
        geographicScope: content.geographicScope ?? null,
        documentsRequired: content.documentsRequired ?? null,
      });
    }
  }

  const BATCH = 100;
  console.log(
    `[translations] Inserting ${rows.length} records in batches of ${BATCH}...`
  );

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);

    await db
      .insert(grantTranslations)
      .values(batch)
      .onDuplicateKeyUpdate({
        set: {
          name: sql`VALUES(name)`,
          description: sql`VALUES(description)`,
          eligibility: sql`VALUES(eligibility)`,
        },
      });

    console.log(
      `  [translations] ${Math.min(i + BATCH, rows.length)}/${rows.length}`
    );
  }

  console.log("[translations] Done.\n");
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== GrantKit DB Restore ===");
  console.log(`Reading data from: ${ROOT}\n`);

  const catalogPath = resolve(ROOT, "catalog.json");
  const catalog: CatalogEntry[] = JSON.parse(
    readFileSync(catalogPath, "utf-8")
  );
  console.log(`Loaded ${catalog.length} grants from catalog.json`);

  const translationsPath = resolve(ROOT, "catalogTranslations.json");
  const translations: TranslationsFile = JSON.parse(
    readFileSync(translationsPath, "utf-8")
  );
  console.log(
    `Loaded ${Object.keys(translations).length} translation sets from catalogTranslations.json`
  );

  await restoreGrants(catalog);
  await restoreTranslations(translations);

  console.log("=== Restore complete! ===");
  process.exit(0);
}

main().catch((err) => {
  console.error("Restore failed:", err);
  process.exit(1);
});
