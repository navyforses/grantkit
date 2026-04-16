#!/usr/bin/env node
/**
 * Stage 3: B-2 Visa batch 1 - researched via WebSearch
 * Also sets fundingType where determinable
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../client/src/data/catalog.json');
const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

// B-2 Visa updates: [org, name_pattern_or_null, b2value, fundingType_or_null]
// name_pattern: null = apply to all entries for this org
const UPDATES = [
  // YES - accept international patients/athletes
  { org: 'Challenged Athletes Foundation', b2: 'yes', ft: 'one_time' },
  { org: 'Shriners Hospitals for Children', b2: 'yes', ft: null },

  // NO - require US citizenship/residency/SSN
  { org: 'Kelly Brush Foundation', b2: 'no', ft: 'one_time' },
  { org: 'UnitedHealthcare Children\'s Foundation', b2: 'no', ft: 'one_time' },
  { org: 'Show Hope', b2: 'no', ft: 'one_time' },
  { org: 'Patient Access Network Foundation', b2: 'no', ft: null },
  { org: 'Patient Access Network Foundation (PAN Foundation)', b2: 'no', ft: null },
  { org: 'Accessia Health', b2: 'no', ft: null },
  { org: 'The Assistance Fund', b2: 'no', ft: null },
  { org: 'National Children\'s Cancer Society', b2: 'no', ft: 'one_time' },
];

let b2Updated = 0;
let ftUpdated = 0;
let notFound = [];

for (const { org, b2, ft } of UPDATES) {
  const matches = catalog.filter(g => g.organization === org);
  if (matches.length === 0) {
    notFound.push(org);
    continue;
  }
  for (const item of matches) {
    if (item.b2VisaEligible === 'uncertain' && b2) {
      item.b2VisaEligible = b2;
      b2Updated++;
    }
    if (ft && item.fundingType === 'varies') {
      item.fundingType = ft;
      ftUpdated++;
    }
  }
}

fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));

console.log('=== Stage 3 B-2 Visa Batch 1 Results ===');
console.log(`B-2 updated: ${b2Updated}`);
console.log(`FundingType updated: ${ftUpdated}`);
if (notFound.length > 0) console.log('Not found orgs:', notFound);

const updated = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const t = updated.length;
console.log('\nVerification:');
console.log('B2 known:', updated.filter(g => g.b2VisaEligible === 'yes' || g.b2VisaEligible === 'no').length + '/' + t);
console.log('B2 yes:', updated.filter(g => g.b2VisaEligible === 'yes').length);
console.log('B2 no:', updated.filter(g => g.b2VisaEligible === 'no').length);
console.log('FundType known:', updated.filter(g => g.fundingType && g.fundingType !== 'varies').length + '/' + t);
