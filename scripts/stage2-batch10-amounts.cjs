#!/usr/bin/env node
/**
 * Stage 2: Batch 10 - Free services + confirmed dollar amounts
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../client/src/data/catalog.json');

const GRANT_AMOUNTS = [
  // Free services (confirmed via research)
  { org: 'Children\'s Hemiplegia and Stroke Association (CHASA)', name: 'Kandu', amount: 'Free' },
  { org: 'Hope Floats Foundation', name: 'Assistance', amount: 'Free' },
  { org: "Enchanted Peach Children's Foundation", name: 'Family Focus Program', amount: 'Free' },
  { org: 'Accessia Health', name: 'Educational Resources', amount: 'Free' },
  // Dollar amounts confirmed by research
  { org: 'Oracle Health Foundation', name: 'Oracle Health Foundation Pediatric Grants', amount: 'Up to $17,000' },
  { org: 'Colorado Fund for Muscular Dystrophy', name: 'Fund for Muscular Dystrophy', amount: 'Up to $1,000' },
  { org: 'Catastrophic Illness in Children Relief Foundation', name: 'Children Relief Fund', amount: 'Up to $100,000' },
  { org: 'Beam', name: 'Black Emotional & Mental Health Collective', amount: 'Up to $10,000' },
  { org: 'Beam', name: 'Southern Healing Support Fund', amount: 'Up to $10,000' },
  // CHASA Let's Play - U+2019 apostrophe in name
  { org: 'Children\'s Hemiplegia and Stroke Association (CHASA)', name: 'Let\u2019s Play! Activity Scholarships', amount: 'Varies' },
];

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

let amountFilled = 0;
const notFound = [];

for (const { org, name, amount } of GRANT_AMOUNTS) {
  // Skip entries that we're intentionally leaving as Varies
  if (amount === 'Varies') continue;

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

console.log('=== Stage 2 Batch 10 Update Results ===');
console.log(`Amount filled: ${amountFilled}`);
if (notFound.length > 0) console.log('Not matched:', notFound);

const updated = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const t = updated.length;
const specific = updated.filter(g => g.amount && g.amount !== '' && g.amount !== 'Varies' && g.amount !== 'N/A' && g.amount !== 'Free' && g.amount !== 'Free service').length;
const varies = updated.filter(g => g.amount === 'Varies').length;
console.log('\nVerification:');
console.log('Specific amounts:', specific + '/' + t, '(' + (100 * specific / t).toFixed(1) + '%)');
console.log('Still Varies:', varies);
