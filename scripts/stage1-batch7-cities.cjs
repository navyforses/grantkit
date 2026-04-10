#!/usr/bin/env node
/**
 * Stage 1: Batch 7 city updates
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../client/src/data/catalog.json');

const ORG_LOCATIONS = {
  'ADI - Assistance Dogs International': { city: 'Maumee', state: 'OH' },
  'Autism Care Today': { city: 'Woodland Hills', state: 'CA' },
  'Dollar For Organization': { city: 'Portland', state: 'OR' },
  'Doug Flutie Jr. Foundation': { city: 'Waltham', state: 'MA' },
  'Granted Wish Foundation': { city: 'Canton', state: 'OH' },
  'Foreseeable Future Foundation': { city: 'New York', state: 'NY' },
  'Benefit4Kids': { city: 'Macomb', state: 'MI' },
  'Autistic People of Color Fund': { city: 'Lincoln', state: 'NE' },
  'Sunshine on a Ranney Day': { city: 'Roswell', state: 'GA' },
  'Small Steps in Speech': { city: 'Eagleville', state: 'PA' },
  'Alyssa V Phillips Foundation': { city: 'Southlake', state: 'TX' },
  'Association of Horizon, Inc': { city: 'Chicago', state: 'IL' },
  'The Parker Lee Project': { city: 'Ennis', state: 'TX' },
  'Garage 10': { city: 'Baton Rouge', state: 'LA' },
  'Elderly or Disabled Living (EDL)': { city: 'North Richland Hills', state: 'TX' },
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

console.log('=== Stage 1 Batch 7 Update Results ===');
console.log(`City filled: ${cityFilled}`);

const updated = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const t = updated.length;
const f = field => updated.filter(g => g[field] && g[field] !== '' && g[field] !== 'N/A').length;
console.log('\nVerification:');
console.log('City:', f('city') + '/' + t);
