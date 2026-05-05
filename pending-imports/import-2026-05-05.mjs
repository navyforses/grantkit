import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { grants } from '../drizzle/schema.ts';

const grantsData = JSON.parse(readFileSync(new URL('./2026-05-05.json', import.meta.url), 'utf-8'));

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

let inserted = 0;
for (const grant of grantsData) {
  try {
    await db.insert(grants).values(grant);
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
console.log(`Done: ${inserted}/${grantsData.length} inserted`);
await connection.end();
