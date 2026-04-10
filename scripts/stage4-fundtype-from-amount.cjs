#!/usr/bin/env node
/**
 * Stage 4: Fill fundingType based on amount field
 * - amount = "Free" or "Free service" → one_time
 * - amount = specific dollar amount (Up to $X, Over $X, $X) → one_time
 * - amount = "Reduced cost" or "Free or reduced rate" → one_time
 * - amount = "Varies (travel costs covered)" → one_time
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../client/src/data/catalog.json');
const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

let ftUpdated = 0;

for (const item of catalog) {
  if (item.fundingType !== 'varies') continue;

  const amount = (item.amount || '').trim();

  // Free services → one_time
  if (amount === 'Free' || amount === 'Free service') {
    item.fundingType = 'one_time';
    ftUpdated++;
    continue;
  }

  // Specific dollar amounts → one_time
  if (
    amount.startsWith('Up to $') ||
    amount.startsWith('Over $') ||
    amount.startsWith('$') ||
    amount === 'Reduced cost' ||
    amount === 'Free or reduced rate' ||
    amount === 'Varies (travel costs covered)'
  ) {
    item.fundingType = 'one_time';
    ftUpdated++;
    continue;
  }
}

fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));

console.log('=== Stage 4 FundingType from Amount Results ===');
console.log(`FundingType updated: ${ftUpdated}`);

const updated = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const t = updated.length;
console.log('\nVerification:');
console.log('FundType known:', updated.filter(g => g.fundingType && g.fundingType !== 'varies').length + '/' + t);
console.log('FundType varies remaining:', updated.filter(g => g.fundingType === 'varies').length);
const ft = {};
updated.forEach(g => { ft[g.fundingType] = (ft[g.fundingType] || 0) + 1; });
console.log('FundType dist:', ft);
