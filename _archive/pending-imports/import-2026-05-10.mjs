import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import * as schema from '../drizzle/schema.ts';

const raw = readFileSync(new URL('./2026-05-10.json', import.meta.url), 'utf-8');
const newGrants = JSON.parse(raw);

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema });

let inserted = 0;
let skipped = 0;
let errors = 0;

for (const grant of newGrants) {
  try {
    await db.insert(schema.grants).values({
      itemId: grant.id,
      name: grant.name,
      organization: grant.organization,
      description: grant.description,
      category: grant.category,
      type: grant.type,
      country: grant.country,
      eligibility: grant.eligibility,
      website: grant.website,
      phone: grant.phone || null,
      email: grant.email || null,
      amount: grant.amount,
      status: grant.status,
      state: grant.state || null,
      city: grant.city || null,
      targetDiagnosis: grant.targetDiagnosis || null,
      fundingType: grant.fundingType || null,
      b2VisaEligible: grant.b2VisaEligible || null,
      applicationProcess: grant.applicationProcess || null,
      geographicScope: grant.geographicScope || null,
      documentsRequired: grant.documentsRequired || null,
      ageRange: grant.ageRange || null,
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

console.log(`\nDone: ${inserted}/${newGrants.length} inserted, ${skipped} duplicates skipped, ${errors} errors`);
await connection.end();
