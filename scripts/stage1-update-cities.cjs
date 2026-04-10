#!/usr/bin/env node
/**
 * Stage 1: Update city (and optionally state) from research
 * Only fills empty city fields, does not overwrite existing data
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../client/src/data/catalog.json');

// Organization → { city, state } mapping from WebSearch research
// Key must match organization field exactly (case-sensitive)
const ORG_LOCATIONS = {
  'Accessia Health': { city: 'Midlothian', state: 'VA' },
  'BraunAbility': { city: 'Winamac', state: 'IN' },
  'Kids Mobility Network': { city: 'Centennial', state: 'CO' },
  'Adaptx': { city: 'Lancaster', state: 'MA' },
  'Semper FI & America\'s Fund': { city: 'Quantico', state: 'VA' },
  'Casey Cares': { city: 'Columbia', state: 'MD' },
  'Sweet Julia Grace Foundation': { city: 'Manassas', state: 'VA' },
  'FRIENDS OF KAREN': { city: 'North Salem', state: 'NY' },
  'Children\'s Hemiplegia and Stroke Association (CHASA)': { city: 'Arlington', state: 'TX' },
  'United Special Sportsman Alliance': { city: 'Pittsville', state: 'WI' },
  'Wheels of Happiness': { city: 'Alpharetta', state: 'GA' },
  'Achieve Tahoe': { city: 'Truckee', state: 'CA' },
  'Circle Tail, Inc.': { city: 'Pleasant Plain', state: 'OH' },
  'DAV': { city: 'Erlanger', state: 'KY' },
  'Air & Space Forces Association': { city: 'Arlington', state: 'VA' },
  'Cochlear Americas': { city: 'Lone Tree', state: 'CO' },
  'Easter Seals': { city: 'Chicago', state: 'IL' },
  'Chariots 4 Hope': { city: 'Omaha', state: 'NE' },
  'Chase Warrior Foundation': { city: 'Prior Lake', state: 'MN' },
  'Computer Banc': { city: 'Springfield', state: 'IL' },
  'Connecticut Tech Act Project': { city: 'Hartford', state: 'CT' },
  'Hope Haven International': { city: 'Sioux Falls', state: 'SD' },
  'Laughing At My Nightmare, Inc.': { city: 'Bethlehem', state: 'PA' },
  'May we help': { city: 'Cincinnati', state: 'OH' },
  'Surfgimp Foundation': { city: 'Arlington', state: 'VA' },
  'THE GOHAWKEYE FOUNDATION': { city: 'Telluride', state: 'CO' },
  '180 Medical': { city: 'Oklahoma City', state: 'OK' },
  'Cherished Creations': { city: 'Berkeley Heights', state: 'NJ' },
  'Music Movement': { city: 'Los Angeles', state: 'CA' },
};

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

let cityFilled = 0;
let stateUpdated = 0;

for (const item of catalog) {
  const loc = ORG_LOCATIONS[item.organization];
  if (!loc) continue;

  // Only fill empty city
  if (!item.city || item.city === '') {
    item.city = loc.city;
    cityFilled++;
  }

  // Update state only if it's empty, "Nationwide" stays as-is (national scope)
  // But if state is empty, fill it
  if ((!item.state || item.state === '') && loc.state) {
    item.state = loc.state;
    stateUpdated++;
  }
}

fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));

console.log('=== Stage 1 Batch 1 Update Results ===');
console.log(`City filled: ${cityFilled}`);
console.log(`State updated: ${stateUpdated}`);

// Verify
const updated = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const t = updated.length;
const f = (field, min) => updated.filter(g => g[field] && g[field] !== '' && g[field] !== 'N/A' && (!min || g[field].length >= min)).length;
console.log('\nVerification:');
console.log('City:', f('city') + '/' + t);
console.log('Desc 30+:', f('description', 30) + '/' + t);
console.log('Amount !Varies:', updated.filter(g => g.amount && !g.amount.toLowerCase().includes('varies')).length + '/' + t);
