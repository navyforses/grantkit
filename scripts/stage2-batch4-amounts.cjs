#!/usr/bin/env node
/**
 * Stage 2: Batch 4 - Fill specific grant amounts for "Varies" entries
 * Mix of dollar amounts and "Free" for free services
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../client/src/data/catalog.json');

const GRANT_AMOUNTS = [
  // Dollar amounts
  { org: 'My Gym Foundation', name: 'Apply for a Gift', amount: 'Up to $500' },
  { org: 'Music Movement', name: 'Wireless Family Fund', amount: 'Up to $2,500' },
  // Free services
  { org: 'Healthcare Equipment Recycling Organization', name: "Hero's Care Form", amount: 'Free' },
  { org: 'United Special Sportsman Alliance', name: 'Special Kids Wish (SKW) - 2025 Youth Application', amount: 'Free' },
  { org: 'United Special Sportsman Alliance', name: 'United Special Sportsman Alliance (USSA) - 2025 Veteran Recipient Program', amount: 'Free' },
  { org: 'United Special Sportsman Alliance', name: 'United Special Sportsman Alliance (USSA) - 2025 Referral Program', amount: 'Free' },
  { org: 'Believe in Tomorrow', name: 'Children\u2019s House at Johns Hopkins', amount: 'Free' },
  { org: 'Believe in Tomorrow', name: 'For Families: Respite Housing', amount: 'Free' },
  { org: 'Special Spectator', name: 'special spectators', amount: 'Free' },
  { org: 'Casey Cares', name: 'Hammy\u2019s Heart', amount: 'Free' },
  { org: 'Casey Cares', name: 'Better Together Program', amount: 'Free' },
  { org: 'Casey Cares', name: 'Family Festivities Program', amount: 'Free' },
  { org: 'MagicMobility Vans', name: 'Magic Mobility Vans \u2013 Supporting Kids and Families', amount: 'Free' },
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

console.log('=== Stage 2 Batch 4 Update Results ===');
console.log(`Amount filled: ${amountFilled}`);
if (notFound.length > 0) console.log('Not matched:', notFound);

const updated = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const t = updated.length;
const specific = updated.filter(g => g.amount && g.amount !== '' && g.amount !== 'Varies' && g.amount !== 'N/A' && g.amount !== 'Free' && g.amount !== 'Free service').length;
const varies = updated.filter(g => g.amount === 'Varies').length;
console.log('\nVerification:');
console.log('Specific amounts:', specific + '/' + t, '(' + (100 * specific / t).toFixed(1) + '%)');
console.log('Still Varies:', varies);
