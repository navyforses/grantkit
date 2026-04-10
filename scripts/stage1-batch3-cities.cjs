#!/usr/bin/env node
/**
 * Stage 1: Batch 3 city updates
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../client/src/data/catalog.json');

const ORG_LOCATIONS = {
  'Friends of Man': { city: 'Littleton', state: 'CO' },
  'My Gym Foundation': { city: 'Sherman Oaks', state: 'CA' },
  'Canine Assistants': { city: 'Milton', state: 'GA' },
  "Children's Craniofacial Association": { city: 'Dallas', state: 'TX' },
  'Child Neurology Foundation': { city: 'Lexington', state: 'KY' },
  'National Federation of the Blind': { city: 'Baltimore', state: 'MD' },
  "Starlight Children's Foundation": { city: 'Culver City', state: 'CA' },
  'Good RX': { city: 'Santa Monica', state: 'CA' },
  'Family Voices': { city: 'Albuquerque', state: 'NM' },
  'Kelly Brush Foundation': { city: 'Burlington', state: 'VT' },
  'Lime Connect': { city: 'New York', state: 'NY' },
  'Karman Healthcare Inc.': { city: 'City of Industry', state: 'CA' },
  'Lilly Cares Foundation': { city: 'Indianapolis', state: 'IN' },
  'Dreams Come True': { city: 'Jacksonville', state: 'FL' },
  "Sophia's Voice": { city: 'Cornelius', state: 'NC' },
  'MagicMobility Vans': { city: 'Lakewood', state: 'NJ' },
  'Wolf Pups On Wheels': { city: 'Pittsburgh', state: 'PA' },
  'WolfPups On Wheels, Inc.': { city: 'Pittsburgh', state: 'PA' },
  'Be An Angel': { city: 'Houston', state: 'TX' },
  'Colorado Fund for Muscular Dystrophy': { city: 'Denver', state: 'CO' },
  'Begin Again Foundation': { city: 'Virginia Beach', state: 'VA' },
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

console.log('=== Stage 1 Batch 3 Update Results ===');
console.log(`City filled: ${cityFilled}`);

const updated = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const t = updated.length;
const f = field => updated.filter(g => g[field] && g[field] !== '' && g[field] !== 'N/A').length;
console.log('\nVerification:');
console.log('City:', f('city') + '/' + t);
