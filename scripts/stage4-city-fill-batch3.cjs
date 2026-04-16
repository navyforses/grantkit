#!/usr/bin/env node
/**
 * Stage 4: City fill batch 3 - remaining known orgs
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../client/src/data/catalog.json');
const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

const CITY_MAP = {
  // NC local orgs (Cary/Durham/Raleigh area)
  'All Kids Are Perfect (AKAP)': 'Cary',
  'All Kids are Perfect': 'Cary',
  'The Cary Condo / AKAP Way \u10e1\u10e2\u10d8\u10de\u10d4\u10dc\u10d3\u10d8\u10d0': 'Cary',
  'Welcome House / CBF NC': 'Durham',
  '\u10d3\u10d0\u10e0\u10b0\u10d0\u10db\u10d8\u10e1 \u10e1\u10d0\u10e0\u10ec\u10db\u10e3\u10dc\u10d4\u10d1\u10e0\u10d8\u10d5\u10d8 \u10dd\u10e0\u10d2. \ud83c\udd95': 'Durham',
  '\u10d0\u10d5\u10d4\u10ef\u10d8\u10d0\u10dc\u10d8 \u10e5\u10d8\u10e0\u10d0 (Carolina Furn.)': 'Cary',
  'Salvation Army \u2014 \u10e0\u10d0\u10da\u10d8 + \u10d3\u10d0\u10e0\u10d4\u10db\u10d8': 'Raleigh',
  'Salvation Army (\u10e0\u10d0\u10da\u10d8+\u10d3\u10d0\u10e0\u10d4\u10db\u10d8)': 'Raleigh',
  'Team Luke Hope for Minds \ud83c\udd95': 'Durham',

  // Florida orgs
  'Ray Tye Medical Aid Foundation': 'Clearwater',
  'The Ray Tye Medical Foundation': 'Clearwater',
  'Deliver the Dream': 'Hollywood',    // already in batch2, but restate for safety
  'Enchanted Peach Children\u2019s Foundation': 'Allen',

  // Texas orgs
  'Enchanted Peach Children\'s Foundation': 'Allen',  // TX

  // California orgs
  'Beam': 'Oakland',
  'Joys of Living Assistance Dogs': 'Watsonville',

  // Tech/crowdfunding platforms
  'FundRazr \ud83c\udd95': 'Victoria',          // Canada
  'GoodRx + NeedyMeds': 'Santa Monica',

  // Medical / advocacy orgs
  'Beckwith Weidemann Foundation': 'Plymouth',  // MI
  'Coalition Against Pediatric Pain': 'Pittsburgh',
  'Medicine Assistance Tool': 'Washington',    // PhRMA initiative, DC
  'Paws 4 Autism': 'Marietta',                // GA
  'Rx Outreach': 'Saint Louis',               // MO
  'SIT Service Dogs': 'Richland',             // WA
  'ABC Law Centers': 'Grand Rapids',          // MI law firm
  'AvaCare Medical': 'Far Rockaway',          // NY
  'Philoptochos Children\u2019s Medical Fund \ud83c\udd95': 'New York',
  'Philoptochos Children\'s Medical Fund \ud83c\udd95': 'New York',
  'National Neutropenia Network': 'Salt Lake City',  // UT - national patient org
  'Grottoes of North America': 'Alexandria',  // VA (Grotto fraternity HQ)
  'Autism Spectrum Disorder Foundation': 'Lewisville',  // TX

  // Georgian diaspora (US)
  '\u10d0\u10e8\u10e8-\u10e8\u10d8 \u10e1\u10d0\u10e5\u10d0\u10e0\u10d7\u10d5\u10d4\u10da\u10dd\u10e1 \u10d0\u10e1\u10dd\u10ea\u10d8\u10d0\u10ea\u10d8\u10d0': 'Washington',
};

let cityUpdated = 0;
const notFound = [];

for (const [org, city] of Object.entries(CITY_MAP)) {
  const matches = catalog.filter(g => g.organization === org && (!g.city || g.city === ''));
  if (matches.length === 0) {
    const existing = catalog.filter(g => g.organization === org);
    if (existing.length === 0) notFound.push(org);
  }
  for (const item of matches) {
    item.city = city;
    cityUpdated++;
  }
}

fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));

console.log('=== Stage 4 City Fill Batch 3 Results ===');
console.log(`City updated: ${cityUpdated}`);
if (notFound.length > 0) {
  console.log('\nNot found in catalog:');
  notFound.forEach(o => console.log(' -', o));
}

const updated = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const t = updated.length;
const hasCity = updated.filter(g => g.city && g.city !== '').length;
console.log('\nVerification:');
console.log(`City filled: ${hasCity}/${t} (${(hasCity/t*100).toFixed(1)}%)`);
console.log(`Still missing city: ${t - hasCity}`);
