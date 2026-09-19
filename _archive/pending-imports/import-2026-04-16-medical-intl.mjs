import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import * as schema from '../drizzle/schema.ts';

const grants = JSON.parse(readFileSync(new URL('./2026-04-16-medical-intl.json', import.meta.url), 'utf-8'));

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema });

let inserted = 0;
for (const grant of grants) {
  try {
    await db.insert(schema.grants).values({
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
    });
    inserted++;
    console.log('✓', grant.name);
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      console.log('⊘ Duplicate:', grant.name);
    } else {
      console.error('✗', grant.name, e.message);
    }
  }
}
console.log(`\nDone: ${inserted}/${grants.length} inserted`);
await connection.end();
