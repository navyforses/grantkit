#!/usr/bin/env node
/**
 * Stage 2: Batch 8 - Free programs confirmed by research + HSLDA dollar amount
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../client/src/data/catalog.json');

const GRANT_AMOUNTS = [
  // Free programs (confirmed via research)
  { org: 'Askate Foundation', name: 'Askate and Create', amount: 'Free' },
  { org: 'Lilly Cares Foundation', name: 'Medications', amount: 'Free' },
  { org: 'Sweet Julia Grace Foundation', name: 'TrackChair Program', amount: 'Free' },
  { org: 'The Ability Center', name: 'Agility Program (formerly Agility Angels)', amount: 'Free' },
  { org: 'Council of Citizens with Low Vision International', name: 'Carl Foley Memorial Magnification Award Program', amount: 'Free' },
  { org: 'Impossible Dream', name: 'The Impossible Dream Media Lab', amount: 'Free' },
  // Free tech recycling
  { org: 'Connecticut Tech Act Project', name: 'AT Recycling - Assistive Technology Recycling Program', amount: 'Free' },
  // Free resource services
  { org: 'Special Needs Resource Project (SNRP)', name: 'Special Needs Resource Project (SNRP)', amount: 'Free' },
  // Dollar amount confirmed
  { org: 'Home School Legal Defense Association', name: 'HSLDA Annual Group Grants', amount: '$500' },
];

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

let amountFilled = 0;
const notFound = [];

for (const { org, name, amount } of GRANT_AMOUNTS) {
  let found = false;
  for (const item of catalog) {
    if (item.organization === org && item.name === name && item.amount === 'Varies') {
      item.amount = amount;
      amountFilled++;
      found = true;
    }
  }
  if (!found) notFound.push(`${org} | ${name}`);
}

fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));

console.log('=== Stage 2 Batch 8 Update Results ===');
console.log(`Amount filled: ${amountFilled}`);
if (notFound.length > 0) console.log('Not matched:', notFound);

const updated = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const t = updated.length;
const specific = updated.filter(g => g.amount && g.amount !== '' && g.amount !== 'Varies' && g.amount !== 'N/A' && g.amount !== 'Free' && g.amount !== 'Free service').length;
const varies = updated.filter(g => g.amount === 'Varies').length;
console.log('\nVerification:');
console.log('Specific amounts:', specific + '/' + t, '(' + (100 * specific / t).toFixed(1) + '%)');
console.log('Still Varies:', varies);
