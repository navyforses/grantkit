#!/usr/bin/env node
/**
 * Stage 1: Batch 5 city updates
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../client/src/data/catalog.json');

const ORG_LOCATIONS = {
  'Hope Floats Foundation': { city: 'Woodbridge', state: 'VA' },
  'Special Spectator': { city: 'Detroit', state: 'MI' },
  'Wishers and Dreamers': { city: 'Temecula', state: 'CA' },
  'Community Connections Inc.': { city: 'South Yarmouth', state: 'MA' },
  'Angel Flight East': { city: 'Blue Bell', state: 'PA' },
  "Cameron's Crusaders": { city: 'Fitchburg', state: 'MA' },
  "Children's Brain Tumor Foundation": { city: 'New York', state: 'NY' },
  'Travis Burkhart foundation': { city: 'Plainville', state: 'IN' },
  'The Kyle Pease Foundation': { city: 'Atlanta', state: 'GA' },
  'Joeys Friends Too': { city: 'New Hyde Park', state: 'NY' },
  'Crescent Moon Cares Foundation': { city: 'Barkhamsted', state: 'CT' },
  "Mission Fishin'": { city: 'Fort Lauderdale', state: 'FL' },
  'The Coalition Against Pediatric Pain': { city: 'Marshfield', state: 'MA' },
  'Healthcare Equipment Recycling Organization': { city: 'Fargo', state: 'ND' },
  'The Assistance Fund': { city: 'Orlando', state: 'FL' },
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

console.log('=== Stage 1 Batch 5 Update Results ===');
console.log(`City filled: ${cityFilled}`);

const updated = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const t = updated.length;
const f = field => updated.filter(g => g[field] && g[field] !== '' && g[field] !== 'N/A').length;
console.log('\nVerification:');
console.log('City:', f('city') + '/' + t);
