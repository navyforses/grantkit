#!/usr/bin/env node
/**
 * Stage 2: Batch 2 - Fill specific grant amounts for "Varies" entries
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../client/src/data/catalog.json');

const GRANT_AMOUNTS = [
  { org: 'Semper FI & America\'s Fund', name: 'Housing Assistance (The Fund)', amount: 'Up to $50,000' },
  { org: 'Semper FI & America\'s Fund', name: 'Transportation Assistance (The Fund)', amount: 'Up to $20,000' },
  { org: 'Cochlear Americas', name: 'Anders Tjellstr\u00f6m Scholarship', amount: '$2,000/year' },
  { org: 'Cochlear Americas', name: 'Graeme Clark Scholarship', amount: '$2,000/year' },
  { org: 'Lighthouse Guild', name: 'Lighthouse Guild Scholarships for Higher Education', amount: '$10,000' },
  { org: 'AMBUCS', name: 'AMBUCS Scholarships for Therapists 2024', amount: 'Up to $1,500' },
  { org: 'Show Hope', name: 'Show Hope Medical Care Grants for Families', amount: 'Up to $10,000' },
  { org: 'Ariana Rye Foundation', name: 'Apply for Help', amount: 'Up to $1,000' },
  { org: 'Airana Rye Foundation', name: 'Medical Equipment Application', amount: 'Up to $1,000' },
  { org: 'Children\'s Brain Tumor Foundation', name: "Lakken's Legacy Sibling Scholarship", amount: '$1,000' },
  { org: "Army Women's Foundation", name: 'Professional Contract Services, Inc. (PCSI) Scholarship for Disabled Veterans', amount: '$5,000' },
  { org: 'THE GOHAWKEYE FOUNDATION', name: 'Sports Equipment Grant', amount: 'Up to $5,000' },
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

console.log('=== Stage 2 Batch 2 Update Results ===');
console.log(`Amount filled: ${amountFilled}`);
if (notFound.length > 0) console.log('Not matched:', notFound);

const updated = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const t = updated.length;
const specific = updated.filter(g => g.amount && g.amount !== '' && g.amount !== 'Varies' && g.amount !== 'N/A' && g.amount !== 'Free' && g.amount !== 'Free service').length;
const varies = updated.filter(g => g.amount === 'Varies').length;
console.log('\nVerification:');
console.log('Specific amounts:', specific + '/' + t, '(' + (100 * specific / t).toFixed(1) + '%)');
console.log('Still Varies:', varies);
