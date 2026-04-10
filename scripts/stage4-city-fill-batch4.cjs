#!/usr/bin/env node
/**
 * Stage 4: City fill batch 4 - final known orgs + Georgian text org fixes
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../client/src/data/catalog.json');
const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

let cityUpdated = 0;

// Exact name → city map
const CITY_MAP = {
  // Wish / special programs
  'The Original 1800-Charity Cars': 'Miramar',    // FL
  'I GOT LEGS': 'Minneapolis',                     // MN
  "'Ween Dream": 'Nashville',                      // TN
  'Live Like Jake Foundation': 'Solvang',          // CA
  'A Moment of Magic': 'Allentown',               // PA
  'Zac Speaks': 'Franklin',                        // TN
  "A Mother's Rest": 'Litchfield',                // CT
  // Medical / therapy
  'Acoustics for Autism': 'Suwanee',              // GA
  'Let\'s Cure CP / CureCP': 'Shaker Heights',    // OH
  'Let\'s Build Beds': 'Nashville',               // TN
  // Rx / insurance
  'HelpRx': 'Houston',                            // TX
  'Insider Rx': 'Woonsocket',                     // RI (CVS Health)
  // Service dogs
  'National Institute of Canine Service and Training': 'Berkeley Springs',  // WV
  // Other US orgs
  'Be Perfect Foundation': 'Canonsburg',          // PA
  'PATH-WAY Foundation': 'Columbus',              // OH
  'Autism Spectrum Disorder Foundation': 'Lewisville', // TX (already in batch3, re-state)
};

for (const [org, city] of Object.entries(CITY_MAP)) {
  const matches = catalog.filter(g => g.organization === org && (!g.city || g.city === ''));
  for (const item of matches) {
    item.city = city;
    cityUpdated++;
  }
}

// Georgian text orgs - use substring matching to find exact entries
// Durham religious org
for (const item of catalog) {
  if (item.city && item.city !== '') continue;
  const org = item.organization || '';
  // "დარჰამის სარwmunoebrivi orgi" → Durham (Durham religious organization)
  if (org.includes('\u10d3\u10d0\u10e0\u10f0\u10d0\u10db\u10d8\u10e1') && org.includes('\u10e1\u10d0\u10e0\u10ec\u10db\u10e3\u10dc')) {
    item.city = 'Durham';
    cityUpdated++;
    continue;
  }
  // Georgian churches in US - assign Tbilisi as origin (these are Georgian diaspora churches)
  if (org.includes('\u10e5\u10d0\u10e0\u10d7\u10e3\u10da\u10d8 \u10db\u10d0\u10e0\u10d7\u10da\u10db\u10d0\u10d3\u10d8\u10d3\u10d4\u10d1\u10da')) {
    item.city = 'Various';
    cityUpdated++;
    continue;
  }
}

fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));

console.log('=== Stage 4 City Fill Batch 4 Results ===');
console.log(`City updated: ${cityUpdated}`);

const updated = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const t = updated.length;
const hasCity = updated.filter(g => g.city && g.city !== '').length;
console.log('\nVerification:');
console.log(`City filled: ${hasCity}/${t} (${(hasCity/t*100).toFixed(1)}%)`);
console.log(`Still missing city: ${t - hasCity}`);

// Show remaining missing for review
const missing = updated.filter(g => !g.city || g.city === '');
const orgs = [...new Set(missing.map(g => g.organization))];
if (orgs.length <= 30) {
  console.log('\nRemaining missing orgs:');
  orgs.forEach(o => console.log(' -', o));
}
