#!/usr/bin/env node
/**
 * Stage 3: Pattern-based B-2 Visa and Funding Type fills
 * - Military/veteran organizations → b2VisaEligible: "no"
 * - Scholarship entries → fundingType: "one_time"
 * - Annual scholarship ($/year) → fundingType: "recurring"
 * - Copay/medication assistance → fundingType: "reimbursement"
 * - Ongoing medication/service programs → fundingType: "recurring"
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../client/src/data/catalog.json');
const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

let b2Filled = 0;
let ftFilled = 0;

// === B-2 VISA: "no" for military/veteran-only organizations ===
const militaryOnlyOrgs = new Set([
  'Semper FI & America\'s Fund',
  'DAV',
  'Paralyzed Veterans of America',
  'Air & Space Forces Association',
  'Army Women\'s Foundation',
  'United Special Sportsman Alliance',
]);

// B-2 "no" for entries with explicit US-military eligibility in name
const militaryNamePatterns = ['wounded airmen', 'veteran recipient', 'veterans program'];

// === FUNDING TYPE patterns ===
// Scholarships → one_time (unless amount says /year → recurring)
// Copay/insurance/medication → reimbursement or recurring
// One-time grants → one_time

for (const item of catalog) {
  const name = (item.name || '').toLowerCase();
  const org = (item.organization || '');
  const amount = (item.amount || '').toLowerCase();
  const cat = (item.category || '');

  // --- B-2 Visa ---
  if (item.b2VisaEligible === 'uncertain') {
    // Military/vet orgs → no
    if (militaryOnlyOrgs.has(org)) {
      item.b2VisaEligible = 'no';
      b2Filled++;
    }
    // Military patterns in name
    else if (militaryNamePatterns.some(p => name.includes(p))) {
      item.b2VisaEligible = 'no';
      b2Filled++;
    }
  }

  // --- Funding Type ---
  if (item.fundingType === 'varies') {
    // Scholarships: one_time (unless annual)
    if (cat === 'scholarships' || name.includes('scholarship') || name.includes(' award program')) {
      if (amount.includes('/year') || amount.includes('per year') || amount.includes('annual')) {
        item.fundingType = 'recurring';
      } else {
        item.fundingType = 'one_time';
      }
      ftFilled++;
    }
    // Copay/insurance premium assistance → reimbursement
    else if (name.includes('copay') || name.includes('co-pay') ||
             name.includes('insurance premium') || name.includes('health insurance premium')) {
      item.fundingType = 'reimbursement';
      ftFilled++;
    }
    // Ongoing medication assistance → recurring
    else if (name === 'medications' || name.includes('outreach affordable medication') ||
             name.includes('prescription') || name === 'rx outreach') {
      item.fundingType = 'recurring';
      ftFilled++;
    }
    // Housing/transportation single grants → one_time
    else if ((name.includes('housing assistance') || name.includes('transportation assistance') ||
              name.includes('mortgage') || name.includes('rental assistance')) &&
             (amount.includes('up to $') || amount.includes('$'))) {
      item.fundingType = 'one_time';
      ftFilled++;
    }
    // Wish/dream programs → one_time
    else if (name.includes('wish') || name.includes('dream') &&
             (name.includes('grant') || name.includes('program'))) {
      item.fundingType = 'one_time';
      ftFilled++;
    }
  }
}

fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));

console.log('=== Stage 3 Pattern B-2 Visa + Funding Type Results ===');
console.log(`B-2 Visa filled: ${b2Filled}`);
console.log(`Funding Type filled: ${ftFilled}`);

const updated = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const t = updated.length;
console.log('\nVerification:');
console.log('B2 known:', updated.filter(g => g.b2VisaEligible === 'yes' || g.b2VisaEligible === 'no').length + '/' + t);
console.log('B2 yes:', updated.filter(g => g.b2VisaEligible === 'yes').length);
console.log('B2 no:', updated.filter(g => g.b2VisaEligible === 'no').length);
console.log('FundType known:', updated.filter(g => g.fundingType && g.fundingType !== 'varies').length + '/' + t);
const ft = {};
updated.forEach(g => { ft[g.fundingType] = (ft[g.fundingType] || 0) + 1; });
console.log('FundType dist:', ft);
