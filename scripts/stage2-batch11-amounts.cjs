#!/usr/bin/env node
/**
 * Stage 2: Batch 11 - Final free service entries
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../client/src/data/catalog.json');

const GRANT_AMOUNTS = [
  // Maryam Parman Foundation - free services for injured/disabled children
  { org: 'The Maryam Parman Foundation For Children', name: 'Handicap Accessibilities', amount: 'Free' },
  { org: 'The Maryam Parman Foundation For Children', name: 'In-Home Nursing', amount: 'Free' },
  { org: 'The Maryam Parman Foundation For Children', name: 'Legal Services Assistance Program', amount: 'Free' },
  { org: 'The Maryam Parman Foundation For Children', name: 'Medical Devices for injured children', amount: 'Free' },
  { org: 'The Maryam Parman Foundation For Children', name: 'Therapy Funding', amount: 'Free' },
  // Enchanted Peach - free in-kind programs for critically ill children
  { org: "Enchanted Peach Children's Foundation", name: 'Orchard Program', amount: 'Free' },
  // Achieve Tahoe - free resource list (no cost to access)
  { org: 'Achieve Tahoe', name: 'Accessible Lodging Resource List (Tahoe Area, ADA Included)', amount: 'Free' },
  // CHASA - free support and resources for families
  { org: 'Children\'s Hemiplegia and Stroke Association (CHASA)', name: 'CHASA- helping kids with Hemiplegia', amount: 'Free' },
  // Easter Seals - free early intervention under IDEA
  { org: 'Easter Seals', name: 'Early Childhood Education', amount: 'Free' },
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

console.log('=== Stage 2 Batch 11 Update Results ===');
console.log(`Amount filled: ${amountFilled}`);
if (notFound.length > 0) console.log('Not matched:', notFound);

const updated = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const t = updated.length;
const specific = updated.filter(g => g.amount && g.amount !== '' && g.amount !== 'Varies' && g.amount !== 'N/A' && g.amount !== 'Free' && g.amount !== 'Free service').length;
const varies = updated.filter(g => g.amount === 'Varies').length;
console.log('\nVerification:');
console.log('Specific amounts:', specific + '/' + t, '(' + (100 * specific / t).toFixed(1) + '%)');
console.log('Still Varies:', varies);
