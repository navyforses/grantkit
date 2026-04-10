#!/usr/bin/env node
/**
 * Stage 1: Batch 4 city updates
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../client/src/data/catalog.json');

const ORG_LOCATIONS = {
  'NEADS World Class Service Dogs': { city: 'Princeton', state: 'MA' },
  'Miracle Flights': { city: 'Las Vegas', state: 'NV' },
  'Show Hope': { city: 'Franklin', state: 'TN' },
  'Shriners Hospitals for Children': { city: 'Tampa', state: 'FL' },
  'The Assistance Fund': { city: 'Orlando', state: 'FL' },
  'Paralyzed Veterans of America': { city: 'Washington', state: 'DC' },
  "St. Jude Children's Research Hospital": { city: 'Memphis', state: 'TN' },
  "United Healthcare Children's Foundation": { city: 'Minneapolis', state: 'MN' },
  'Wings of Hope': { city: 'Chesterfield', state: 'MO' },
  'Guide Dogs of America': { city: 'Sylmar', state: 'CA' },
  "Army Women's Foundation": { city: 'Fort Lee', state: 'VA' },
  'Wheelchairs 4 kids': { city: 'Tarpon Springs', state: 'FL' },
  'Orange Effect Foundartion': { city: 'Cleveland', state: 'OH' },
  'Askate Foundation': { city: 'Homewood', state: 'AL' },
  'Canines for Disabled Kids': { city: 'Worcester', state: 'MA' },
  "Children's Flight of Hope": { city: 'Raleigh', state: 'NC' },
  'Room To Dream Foundation': { city: 'Newton', state: 'MA' },
  'Autism on the Seas Foundation': { city: 'Shelton', state: 'CT' },
  'American Association on Health and Disability': { city: 'Rockville', state: 'MD' },
  'Impossible Dream': { city: 'Miami', state: 'FL' },
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

console.log('=== Stage 1 Batch 4 Update Results ===');
console.log(`City filled: ${cityFilled}`);

const updated = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const t = updated.length;
const f = field => updated.filter(g => g[field] && g[field] !== '' && g[field] !== 'N/A').length;
console.log('\nVerification:');
console.log('City:', f('city') + '/' + t);
