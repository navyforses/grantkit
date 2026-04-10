#!/usr/bin/env node
/**
 * Stage 1: Batch 8b fix - correct apostrophe encoding for 2 orgs
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../client/src/data/catalog.json');

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

let cityFilled = 0;

for (const item of catalog) {
  if (!item.city || item.city === '') {
    // Holton's Hero's uses U+2019 for both apostrophes (e28099 in UTF-8)
    if (item.organization === 'Holton\u2019s Hero\u2019s') {
      item.city = 'Marina del Rey';
      cityFilled++;
    }
    // Ragan's Hope uses ASCII apostrophe (0x27)
    if (item.organization === "Ragan's Hope") {
      item.city = 'Dallas';
      cityFilled++;
    }
  }
}

fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));

console.log('=== Stage 1 Batch 8b Fix Results ===');
console.log(`City filled: ${cityFilled}`);

const updated = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const t = updated.length;
const f = field => updated.filter(g => g[field] && g[field] !== '' && g[field] !== 'N/A').length;
console.log('\nVerification:');
console.log('City:', f('city') + '/' + t);
