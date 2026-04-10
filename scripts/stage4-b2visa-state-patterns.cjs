#!/usr/bin/env node
/**
 * Stage 4: B-2 Visa fills based on state field patterns
 * - state="International" → b2VisaEligible: "yes"
 * - state=single 2-letter US state code → b2VisaEligible: "no"
 *   (state-specific programs serve local residents, not visitors)
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../client/src/data/catalog.json');
const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

// Valid US state 2-letter codes
const US_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]);

let b2Updated = 0;

for (const item of catalog) {
  if (item.b2VisaEligible !== 'uncertain') continue;

  const state = (item.state || '').trim();

  // International → yes
  if (state === 'International') {
    item.b2VisaEligible = 'yes';
    b2Updated++;
    continue;
  }

  // Single 2-letter US state → no
  if (US_STATES.has(state)) {
    item.b2VisaEligible = 'no';
    b2Updated++;
    continue;
  }
}

fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));

console.log('=== Stage 4 B-2 State Patterns Results ===');
console.log(`B-2 updated: ${b2Updated}`);

const updated = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const t = updated.length;
console.log('\nVerification:');
console.log('B2 known:', updated.filter(g => g.b2VisaEligible === 'yes' || g.b2VisaEligible === 'no').length + '/' + t);
console.log('B2 yes:', updated.filter(g => g.b2VisaEligible === 'yes').length);
console.log('B2 no:', updated.filter(g => g.b2VisaEligible === 'no').length);
console.log('B2 uncertain remaining:', updated.filter(g => g.b2VisaEligible === 'uncertain').length);
