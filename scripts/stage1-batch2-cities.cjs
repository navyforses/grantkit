#!/usr/bin/env node
/**
 * Stage 1: Batch 2 city updates
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../client/src/data/catalog.json');

const ORG_LOCATIONS = {
  'Triumph Foundation': { city: 'Valencia', state: 'CA' },
  'Air Care Alliance': { city: 'Albuquerque', state: 'NM' },
  'Air Charity Network': { city: 'Norfolk', state: 'VA' },
  'Challenged Athletes Foundation': { city: 'San Diego', state: 'CA' },
  'Can Do Canines': { city: 'New Hope', state: 'MN' },
  'Boomer Esiason Foundation': { city: 'New York', state: 'NY' },
  'Love Them All Foundation': { city: 'Upland', state: 'CA' },
  'Avery\'s Angels': { city: 'Raleigh', state: 'NC' },
  'Oley Foundation': { city: 'Albany', state: 'NY' },
  'Beads of Courage': { city: 'Tucson', state: 'AZ' },
  'Believe in Tomorrow': { city: 'Baltimore', state: 'MD' },
  'Ronald McDonald House Charities': { city: 'Chicago', state: 'IL' },
  'Patient Access Network Foundation (PAN Foundation)': { city: 'Hampton', state: 'VA' },
  'AG Bell': { city: 'Washington', state: 'DC' },
  'Lighthouse Guild': { city: 'New York', state: 'NY' },
  'AMBUCS': { city: 'High Point', state: 'NC' },
  'Little Baby Face Foundation': { city: 'New York', state: 'NY' },
  'Mays Mission for the Handicapped': { city: 'Heber Springs', state: 'AR' },
  "Casey's Circle": { city: 'Austin', state: 'TX' },
  'Oracle Health Foundation': { city: 'Kansas City', state: 'MO' },
  'The Ability Center': { city: 'Sylvania', state: 'OH' },
  'Specialty Kids Fund': { city: 'Chicago', state: 'IL' },
  'The Dane Foundation': { city: 'Cuyahoga Falls', state: 'OH' },
  'MJB Foundation': { city: 'Galloway', state: 'OH' },
  'Share A Vision': { city: 'Mentor', state: 'OH' },
  "Lion's Hope Nonprofit": { city: 'Chicago', state: 'IL' },
  'Maggie Welby Foundation': { city: 'Dardenne Prairie', state: 'MO' },
  'Aubrey Rose': { city: 'Cincinnati', state: 'OH' },
  'Ariana Rye Foundation': { city: 'Las Vegas', state: 'NV' },
  'KinActive Kids': { city: 'Southlake', state: 'TX' },
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

console.log('=== Stage 1 Batch 2 Update Results ===');
console.log(`City filled: ${cityFilled}`);

const updated = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const t = updated.length;
const f = (field, min) => updated.filter(g => g[field] && g[field] !== '' && g[field] !== 'N/A' && (!min || g[field].length >= min)).length;
console.log('\nVerification:');
console.log('City:', f('city') + '/' + t);
