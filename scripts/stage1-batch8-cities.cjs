#!/usr/bin/env node
/**
 * Stage 1: Batch 8 city updates
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../client/src/data/catalog.json');

const ORG_LOCATIONS = {
  'Make-A-Wish America': { city: 'Phoenix', state: 'AZ' },
  'Joni and Friends': { city: 'Agoura Hills', state: 'CA' },
  'Kids Wish Network': { city: 'Palm Harbor', state: 'FL' },
  'New Hope Assistance Dogs Inc': { city: 'Warren', state: 'PA' },
  "The Children's Dream Fund": { city: 'St. Petersburg', state: 'FL' },
  'Miracles For Kids': { city: 'Irvine', state: 'CA' },
  'Joseph Groh Foundation': { city: 'McKinney', state: 'TX' },
  'The Arya Foundation': { city: 'Chesterfield', state: 'MO' },
  'Patient Access Network Foundation': { city: 'Washington', state: 'DC' },
  'Special Angels Foundation': { city: 'Chino Hills', state: 'CA' },
  'Modest Needs Foundation': { city: 'New York', state: 'NY' },
  'Paws with a Cause': { city: 'Wayland', state: 'MI' },
  "Kya's Krusade": { city: 'Gahanna', state: 'OH' },
  'Light for Levi Foundation': { city: 'Zionsville', state: 'IN' },
  'THE SIDNEY R. BAER, JR. FOUNDATION': { city: 'Clayton', state: 'MO' },
  '\u2018Holton\u2019s Hero\u2019s': { city: 'Marina del Rey', state: 'CA' },
  'Mesa Angels Foundation': { city: 'Phoenix', state: 'AZ' },
  'Ragan\u2019s Hope': { city: 'Dallas', state: 'TX' },
};

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

let cityFilled = 0;

for (const item of catalog) {
  const loc = ORG_LOCATIONS[item.organization];
  if (!loc) continue;

  if (!item.city || item.city === '') {
    item.city = loc.city;
    cityFilled++;
  }
}

fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));

console.log('=== Stage 1 Batch 8 Update Results ===');
console.log(`City filled: ${cityFilled}`);

const updated = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const t = updated.length;
const f = field => updated.filter(g => g[field] && g[field] !== '' && g[field] !== 'N/A').length;
console.log('\nVerification:');
console.log('City:', f('city') + '/' + t);
