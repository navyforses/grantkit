#!/usr/bin/env node
/**
 * Stage 2: Batch 3 - Fill specific grant amounts for "Varies" entries
 * Mix of dollar amounts and "Free" for free services
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../client/src/data/catalog.json');

const GRANT_AMOUNTS = [
  // Dollar amounts
  { org: 'Maggie Welby Foundation', name: 'Scholarship', amount: 'Up to $8,000' },
  { org: 'American Association on Health and Disability', name: 'AAHD Frederick J. Krause Scholarship on Health and Disability', amount: '$1,000' },
  { org: 'Canines for Disabled Kids', name: 'The Canines for Disabled Kids Scholarship', amount: 'Up to $5,000' },
  { org: 'UnitedHealthcare Children\'s Foundation', name: 'UHCCF medical grant', amount: 'Up to $5,000/year' },
  // Free services (more accurate than Varies)
  { org: 'National Institute of Canine Service and Training', name: 'Dogs4Diabetics (D4D) - Service Dog', amount: 'Free' },
  { org: 'Wings of Hope', name: 'Wings of Hope', amount: 'Free' },
  { org: '180 Medical', name: '180 Medical Emotional Support and Resources', amount: 'Free' },
  { org: 'Triumph Foundation', name: 'Equipment & Supply Exchange', amount: 'Free' },
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

console.log('=== Stage 2 Batch 3 Update Results ===');
console.log(`Amount filled: ${amountFilled}`);
if (notFound.length > 0) console.log('Not matched:', notFound);

const updated = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const t = updated.length;
const specific = updated.filter(g => g.amount && g.amount !== '' && g.amount !== 'Varies' && g.amount !== 'N/A' && g.amount !== 'Free' && g.amount !== 'Free service').length;
const varies = updated.filter(g => g.amount === 'Varies').length;
console.log('\nVerification:');
console.log('Specific amounts:', specific + '/' + t, '(' + (100 * specific / t).toFixed(1) + '%)');
console.log('Still Varies:', varies);
