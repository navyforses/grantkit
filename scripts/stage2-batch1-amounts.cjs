#!/usr/bin/env node
/**
 * Stage 2: Batch 1 - Fill specific grant amounts for "Varies" entries
 * Only updates entries where amount === 'Varies' and org+name match exactly
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../client/src/data/catalog.json');

// Keyed by [organization, name] -> new amount
const GRANT_AMOUNTS = [
  { org: 'Challenged Athletes Foundation', name: 'CAF + ÖSSUR Grants', amount: 'Up to $5,000' },
  { org: 'United Healthcare Children\'s Foundation', name: 'UHCCF Medical Grant', amount: 'Up to $5,000/year' },
  { org: 'Accessia Health', name: 'Copay Assistance', amount: 'Up to $5,000' },
  { org: 'Accessia Health', name: 'Health Insurance Premiums Assistance', amount: 'Up to $5,000' },
  { org: 'Accessia Health', name: 'Travel Assistance', amount: 'Up to $500' },
  { org: 'Kelly Brush Foundation', name: 'The Active Project (Kelly Brush Foundation)', amount: 'Up to $5,000' },
  { org: 'Sweet Julia Grace Foundation', name: 'Holiday & Seasonal Celebrations', amount: 'Up to $1,000/year' },
  { org: 'Lime Connect', name: 'Lime Connect Pathways Scholarship for High School Seniors', amount: '$1,000' },
  { org: 'Lime Connect', name: 'BMO Capital Markets Equity Through Education Scholarship', amount: '$10,000' },
  { org: 'Lime Connect', name: 'Johnson & Johnson Access-Ability Lime Scholarship', amount: '$10,000' },
  { org: 'AG Bell', name: 'Parent & Infant Financial Aid- Hearing loss', amount: 'Up to $2,000' },
  { org: 'Surfgimp Foundation', name: 'Grant for Adaptive Equipment and sport fees', amount: 'Up to $2,500' },
  { org: 'MBA Opens Doors Foundation', name: 'Mortgage & Rental Assistance Grants', amount: 'Up to $2,000' },
  { org: 'Laughing At My Nightmare, Inc.', name: 'Tech-Cessibility Grants', amount: 'Up to $15,000' },
];

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

let amountFilled = 0;
let notFound = [];

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

console.log('=== Stage 2 Batch 1 Update Results ===');
console.log(`Amount filled: ${amountFilled}`);
if (notFound.length > 0) {
  console.log('Not matched:', notFound);
}

const updated = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const t = updated.length;
const specific = updated.filter(g => g.amount && g.amount !== '' && g.amount !== 'Varies' && g.amount !== 'N/A' && g.amount !== 'Free' && g.amount !== 'Free service').length;
const varies = updated.filter(g => g.amount === 'Varies').length;
console.log('\nVerification:');
console.log('Specific amounts:', specific + '/' + t, '(' + (100*specific/t).toFixed(1) + '%)');
console.log('Still Varies:', varies);
