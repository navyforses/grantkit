#!/usr/bin/env node
/**
 * Stage 2: Batch 9 - Free equipment/wish/support programs
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../client/src/data/catalog.json');

const GRANT_AMOUNTS = [
  // Kids Mobility Network - free equipment to children
  { org: 'Kids Mobility Network', name: 'THERAPEUTIC RECREATION PRODUCTS', amount: 'Free' },
  { org: 'Kids Mobility Network', name: 'EARLY INTERVENTION EQUIPMENT PROGRAM', amount: 'Free' },
  { org: 'Kids Mobility Network', name: 'Kids Mobility Network', amount: 'Free' },
  { org: 'Kids Mobility Network', name: 'THERAPEUTIC RECREATION EQUIPMENT', amount: 'Free' },
  // Free surgeries/medical for kids
  { org: 'Little Baby Face Foundation', name: 'Face surgery for born-deformities', amount: 'Free' },
  // Free instrument donations
  { org: 'Music Movement', name: 'Instrument Donations', amount: 'Free' },
  // Free support services
  { org: "Avery's Angels", name: 'Bereavement Support', amount: 'Free' },
  // Free adaptive equipment consultation/loan
  { org: 'May we help', name: 'Adaptive Equipment', amount: 'Free' },
  // Free hero experiences (U+2019 apostrophes in org name)
  { org: 'Holton\u2019s Hero\u2019s', name: 'Submit A Hero', amount: 'Free' },
  // Free wish granting for seriously ill children
  { org: "The Children's Dream Fund", name: 'Children\u2019s Dream Grants', amount: 'Free' },
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

console.log('=== Stage 2 Batch 9 Update Results ===');
console.log(`Amount filled: ${amountFilled}`);
if (notFound.length > 0) console.log('Not matched:', notFound);

const updated = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const t = updated.length;
const specific = updated.filter(g => g.amount && g.amount !== '' && g.amount !== 'Varies' && g.amount !== 'N/A' && g.amount !== 'Free' && g.amount !== 'Free service').length;
const varies = updated.filter(g => g.amount === 'Varies').length;
console.log('\nVerification:');
console.log('Specific amounts:', specific + '/' + t, '(' + (100 * specific / t).toFixed(1) + '%)');
console.log('Still Varies:', varies);
