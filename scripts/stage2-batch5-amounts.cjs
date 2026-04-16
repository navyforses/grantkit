#!/usr/bin/env node
/**
 * Stage 2: Batch 5 - Fill "Free" for well-known free service programs
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../client/src/data/catalog.json');

const GRANT_AMOUNTS = [
  // Free flight/transport
  { org: 'Air Care Alliance', name: 'Public Benefit Flying', amount: 'Free' },
  { org: 'Miracle Flights', name: 'Request a Flight', amount: 'Free' },
  // Free service dogs
  { org: 'Canine Assistants', name: 'Canine Assistants Service Dog Program', amount: 'Free' },
  { org: 'Can Do Canines', name: 'Can Do Canines Assistance Dogs', amount: 'Free' },
  { org: 'NEADS World Class Service Dogs', name: 'NEADS Service Dog', amount: 'Free' },
  // Free healthcare / hospital programs
  { org: 'Shriners Hospitals for Children', name: "Shriners Children's Quality Care", amount: 'Free' },
  { org: 'Ronald McDonald House Charities', name: 'Ronald McDonald Care Mobile', amount: 'Free' },
  // Free programs for hospitalized children
  { org: 'Beads of Courage', name: 'Beads at Home Program', amount: 'Free' },
  { org: 'Starlight Children\'s Foundation', name: 'happiness to hospitalized kids', amount: 'Free' },
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

console.log('=== Stage 2 Batch 5 Update Results ===');
console.log(`Amount filled: ${amountFilled}`);
if (notFound.length > 0) console.log('Not matched:', notFound);

const updated = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const t = updated.length;
const specific = updated.filter(g => g.amount && g.amount !== '' && g.amount !== 'Varies' && g.amount !== 'N/A' && g.amount !== 'Free' && g.amount !== 'Free service').length;
const varies = updated.filter(g => g.amount === 'Varies').length;
console.log('\nVerification:');
console.log('Specific amounts:', specific + '/' + t, '(' + (100 * specific / t).toFixed(1) + '%)');
console.log('Still Varies:', varies);
