/**
 * import-2026-04-16.mjs — Import daily discovery grants (2026-04-16, SOCIAL category)
 * Run with: railway run node pending-imports/import-2026-04-16.mjs
 * Or locally: node pending-imports/import-2026-04-16.mjs (with DATABASE_URL in .env)
 */
import 'dotenv/config';
import { createRequire } from 'module';
import mysql from 'mysql2/promise';

const require = createRequire(import.meta.url);
const grants = require('./2026-04-16.json');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);

let inserted = 0;
let duplicates = 0;
let errors = 0;

console.log(`\nImporting ${grants.length} grants from 2026-04-16 discovery...\n`);

for (const grant of grants) {
  try {
    await connection.execute(
      `INSERT INTO grants
        (itemId, name, organization, description, category, grantType, country,
         eligibility, website, amount, status, applicationProcess, geographicScope,
         documentsRequired, state, city, isActive)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        grant.itemId,
        grant.name,
        grant.organization ?? null,
        grant.description ?? null,
        grant.category,
        grant.type ?? 'resource',
        grant.country,
        grant.eligibility ?? null,
        grant.website ?? null,
        grant.amount ?? null,
        grant.status ?? 'active',
        grant.applicationProcess ?? null,
        grant.geographicScope ?? null,
        grant.documentsRequired ?? null,
        grant.state ?? null,
        grant.city ?? null,
      ]
    );
    console.log(`  ✓ ${grant.itemId}: ${grant.name}`);
    inserted++;
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      console.log(`  ⊘ Duplicate: ${grant.name}`);
      duplicates++;
    } else {
      console.error(`  ✗ Error: ${grant.name} — ${e.message}`);
      errors++;
    }
  }
}

console.log(`\n=== Summary ===`);
console.log(`✓ Inserted:   ${inserted}`);
console.log(`⊘ Duplicates: ${duplicates}`);
console.log(`✗ Errors:     ${errors}`);
console.log(`Total:        ${grants.length}`);

await connection.end();
process.exit(errors > 0 ? 1 : 0);
