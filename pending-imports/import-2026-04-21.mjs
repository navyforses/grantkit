import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { grants } from '../drizzle/schema.ts';

const grantsData = JSON.parse(readFileSync(new URL('./2026-04-21.json', import.meta.url), 'utf-8'));

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

let inserted = 0;
let skipped = 0;
let errors = 0;

for (const grant of grantsData) {
  try {
    await db.insert(grants).values({
      itemId: grant.itemId,
      name: grant.name,
      organization: grant.organization,
      description: grant.description,
      category: grant.category,
      type: grant.type,
      country: grant.country,
      eligibility: grant.eligibility,
      website: grant.website,
      amount: grant.amount,
      status: grant.status,
      applicationProcess: grant.applicationProcess,
      geographicScope: grant.geographicScope,
      documentsRequired: grant.documentsRequired,
      targetDiagnosis: grant.targetDiagnosis,
      ageRange: grant.ageRange,
      isActive: true,
    });
    inserted++;
    console.log('✓', grant.name);
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      skipped++;
      console.log('⊘ Duplicate:', grant.name);
    } else {
      errors++;
      console.error('✗', grant.name, e.message);
    }
  }
}

console.log(`\nDone: ${inserted} inserted, ${skipped} duplicates, ${errors} errors (out of ${grantsData.length} total)`);
await connection.end();
