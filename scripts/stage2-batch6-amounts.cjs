#!/usr/bin/env node
/**
 * Stage 2: Batch 6 - Fill "Free" for confirmed free service programs
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../client/src/data/catalog.json');

const GRANT_AMOUNTS = [
  // Semper Fi free support programs
  { org: "Semper FI & America's Fund", name: 'Visiting Nurse Program (The Fund)', amount: 'Free' },
  { org: "Semper FI & America's Fund", name: 'Annette Conway Caregiver Retreats', amount: 'Free' },
  // Circle Tail free facility dogs (to organizations)
  { org: 'Circle Tail, Inc.', name: 'Facility Dogs Program', amount: 'Free' },
  // Friends of Karen - free family support services
  { org: 'FRIENDS OF KAREN', name: 'Family Support Program - Bereavement Support', amount: 'Free' },
  { org: 'FRIENDS OF KAREN', name: 'Family Support Program - Advocacy Support', amount: 'Free' },
  { org: 'FRIENDS OF KAREN', name: 'Family Support Program - Emotional Assistance', amount: 'Free' },
  // Free counseling/support services
  { org: 'Austin Hatcher Foundation', name: 'Counseling', amount: 'Free' },
  { org: 'Family Voices', name: 'Resources for families', amount: 'Free' },
  // Free wish/event programs
  { org: 'Room To Dream Foundation', name: 'Dream room renovation', amount: 'Free' },
  { org: 'MJB Foundation', name: 'Events by MJBF Foundation', amount: 'Free' },
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

console.log('=== Stage 2 Batch 6 Update Results ===');
console.log(`Amount filled: ${amountFilled}`);
if (notFound.length > 0) console.log('Not matched:', notFound);

const updated = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const t = updated.length;
const specific = updated.filter(g => g.amount && g.amount !== '' && g.amount !== 'Varies' && g.amount !== 'N/A' && g.amount !== 'Free' && g.amount !== 'Free service').length;
const varies = updated.filter(g => g.amount === 'Varies').length;
console.log('\nVerification:');
console.log('Specific amounts:', specific + '/' + t, '(' + (100 * specific / t).toFixed(1) + '%)');
console.log('Still Varies:', varies);
