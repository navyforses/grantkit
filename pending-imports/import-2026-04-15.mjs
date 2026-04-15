/**
 * Import script for daily grant discovery: 2026-04-15
 * Category: SOCIAL (housing, legal aid, food, transportation for immigrants)
 *
 * Run: node pending-imports/import-2026-04-15.mjs
 * Requires: DATABASE_URL environment variable
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const grants = JSON.parse(readFileSync(new URL('./2026-04-15.json', import.meta.url), 'utf-8'));

const connection = await mysql.createConnection(DATABASE_URL);

let inserted = 0;
let duplicates = 0;
let errors = 0;

for (const grant of grants) {
  try {
    await connection.execute(
      `INSERT INTO grants (itemId, name, organization, description, category, grantType, country, eligibility, website, phone, grantEmail, amount, status, isActive, state, city, targetDiagnosis, fundingType, b2VisaEligible, applicationProcess, geographicScope, documentsRequired)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        grant.itemId,
        grant.name,
        grant.organization || '',
        grant.description || '',
        grant.category,
        grant.type === 'resource' ? 'resource' : 'grant',
        grant.country,
        grant.eligibility || '',
        grant.website || '',
        grant.phone || '',
        grant.email || '',
        grant.amount || '',
        grant.status || 'Active',
        grant.state || '',
        grant.city || '',
        grant.targetDiagnosis || null,
        grant.fundingType || null,
        grant.b2VisaEligible || 'no',
        grant.applicationProcess || null,
        grant.geographicScope || null,
        grant.documentsRequired || null,
      ]
    );
    inserted++;
    console.log('\u2713', grant.name);
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      duplicates++;
      console.log('\u2298 Duplicate:', grant.name);
    } else {
      errors++;
      console.error('\u2717', grant.name, e.message);
    }
  }
}

console.log(`\nDone: ${inserted}/${grants.length} inserted, ${duplicates} duplicates, ${errors} errors`);
await connection.end();
