#!/usr/bin/env node
/**
 * Stage 2: Batch 7 - Free wish/experience/camp programs + Cherished Creations amounts
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../client/src/data/catalog.json');

const GRANT_AMOUNTS = [
  // Free wish/experience programs
  { org: 'Autism on the Seas Foundation', name: 'Dreams Come True', amount: 'Free' },
  { org: 'Be An Angel', name: 'Camp Be An Angel', amount: 'Free' },
  { org: 'Colin Farrell Foundation', name: 'Camp Solas', amount: 'Free' },
  { org: "Mission Fishin'", name: "Mission Fishin' Marine Experiences", amount: 'Free' },
  { org: 'Special Love for children with cancer', name: 'VOICE (Virtual Online In-home Camp Experience) by Special Love', amount: 'Free' },
  { org: "Children's Craniofacial Association", name: 'Care package after Craniofacial Surgery', amount: 'Free' },
  { org: 'Paralyzed Veterans of America', name: 'Sports & Recreation Program', amount: 'Free' },
  { org: 'Joeys Friends Too', name: 'Joeys Friends Too - Application', amount: 'Free' },
  // Cherished Creations - amount implied by entry name
  { org: 'Cherished Creations', name: 'Cherished Creations Special Requests Under $500', amount: 'Up to $500' },
  { org: 'Cherished Creations', name: 'Cherished Creations Special Requests Over $500', amount: 'Over $500' },
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

console.log('=== Stage 2 Batch 7 Update Results ===');
console.log(`Amount filled: ${amountFilled}`);
if (notFound.length > 0) console.log('Not matched:', notFound);

const updated = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const t = updated.length;
const specific = updated.filter(g => g.amount && g.amount !== '' && g.amount !== 'Varies' && g.amount !== 'N/A' && g.amount !== 'Free' && g.amount !== 'Free service').length;
const varies = updated.filter(g => g.amount === 'Varies').length;
console.log('\nVerification:');
console.log('Specific amounts:', specific + '/' + t, '(' + (100 * specific / t).toFixed(1) + '%)');
console.log('Still Varies:', varies);
