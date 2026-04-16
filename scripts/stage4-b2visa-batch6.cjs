#!/usr/bin/env node
/**
 * Stage 4: B-2 Visa batch 6 - final remaining uncertain entries
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../client/src/data/catalog.json');
const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

// B-2 = "no" - US-only or local/placeholder entries
const NO_ORGS = [
  'Friends of Man',
  'Jewish Family Services',
  'Healthcare Hospitality Network',
  'Special Love for Children with Cancer',
  'Enchanted Peach Children\'s Foundation',
  'RMH WakeMed',
  "'Ween Dream",
  'Wheels of Happiness',
];

// Local/placeholder entries (Cary/Durham/NC area specific, or placeholder data)
const NO_ORG_CONTAINS = [
  'ქერი',        // Georgian for "Cary" - local NC resource
  'დარემი',      // Georgian for "Durham" - local NC resource
  '🇺🇸',         // US flag emoji entries
];

// B-2 = "yes"
const YES_ORGS = [
  'Be An Angel',         // international wheelchair program for children
  'IOCC (მართლმადიდ. ქველმოქ.)',  // International Orthodox Christian Charities
];

let b2Updated = 0;

for (const org of NO_ORGS) {
  const matches = catalog.filter(g => g.organization === org && g.b2VisaEligible === 'uncertain');
  for (const item of matches) {
    item.b2VisaEligible = 'no';
    b2Updated++;
  }
}

// Set placeholders/local entries to "no"
for (const item of catalog) {
  if (item.b2VisaEligible !== 'uncertain') continue;
  const org = item.organization || '';
  if (NO_ORG_CONTAINS.some(kw => org.includes(kw))) {
    item.b2VisaEligible = 'no';
    b2Updated++;
    continue;
  }
  // Placeholder entries like ~30, ~40, ~45, ~12, ~25, ~304, ~80
  if (/^~\d+$/.test(org.trim())) {
    item.b2VisaEligible = 'no';
    b2Updated++;
    continue;
  }
  // Georgian-only text entries (data cleanup rows, not real orgs)
  if (/^[\u10D0-\u10FF\s\/\(\)\.\u2014\u2013+,0-9\-]+$/.test(org.trim()) && org.trim().length > 2) {
    item.b2VisaEligible = 'no';
    b2Updated++;
    continue;
  }
}

for (const org of YES_ORGS) {
  const matches = catalog.filter(g => g.organization === org && g.b2VisaEligible === 'uncertain');
  for (const item of matches) {
    item.b2VisaEligible = 'yes';
    b2Updated++;
  }
}

fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));

console.log('=== Stage 4 B-2 Visa Batch 6 Results ===');
console.log(`B-2 updated: ${b2Updated}`);

const updated = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const t = updated.length;
console.log('\nVerification:');
console.log('B2 known:', updated.filter(g => g.b2VisaEligible === 'yes' || g.b2VisaEligible === 'no').length + '/' + t);
console.log('B2 yes:', updated.filter(g => g.b2VisaEligible === 'yes').length);
console.log('B2 no:', updated.filter(g => g.b2VisaEligible === 'no').length);
console.log('B2 uncertain:', updated.filter(g => g.b2VisaEligible === 'uncertain').length);

const stillUncertain = updated.filter(g => g.b2VisaEligible === 'uncertain');
if (stillUncertain.length > 0) {
  console.log('\nStill uncertain:');
  stillUncertain.forEach(g => console.log(' -', g.organization, '|', g.name, '|', g.state));
}
