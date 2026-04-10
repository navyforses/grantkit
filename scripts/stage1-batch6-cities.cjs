#!/usr/bin/env node
/**
 * Stage 1: Batch 6 city updates
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../client/src/data/catalog.json');

const ORG_LOCATIONS = {
  'Chive Charities': { city: 'Austin', state: 'TX' },
  'Gifts of Mobility Foundation': { city: 'Columbia', state: 'MO' },
  'Kourageous Karter Foundation': { city: 'Hugo', state: 'MN' },
  'LifeNets': { city: 'Whitestown', state: 'IN' },
  "Lilly's Voice": { city: 'Meridian', state: 'ID' },
  'LittleWins': { city: 'Denver', state: 'CO' },
  'McLindon Family Foundation': { city: 'Baton Rouge', state: 'LA' },
  'Adaptivemall.com': { city: 'Dolgeville', state: 'NY' },
  'Making Headway Foundation': { city: 'Chappaqua', state: 'NY' },
  'Wheelchair Foundation': { city: 'Danville', state: 'CA' },
  'Wheelchairs 4 Kids': { city: 'Tarpon Springs', state: 'FL' },
  'Help Hope Live': { city: 'Radnor', state: 'PA' },
  'High Fives Foundation': { city: 'Truckee', state: 'CA' },
  "Holton's Heroes": { city: 'Marina del Rey', state: 'CA' },
  'Orange Effect Foundation': { city: 'Cleveland', state: 'OH' },
  'The Orange Effect Foundation': { city: 'Cleveland', state: 'OH' },
  'Whirlwind Wheelchair': { city: 'Berkeley', state: 'CA' },
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

console.log('=== Stage 1 Batch 6 Update Results ===');
console.log(`City filled: ${cityFilled}`);

const updated = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const t = updated.length;
const f = field => updated.filter(g => g[field] && g[field] !== '' && g[field] !== 'N/A').length;
console.log('\nVerification:');
console.log('City:', f('city') + '/' + t);
