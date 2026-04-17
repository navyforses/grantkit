#!/usr/bin/env node
/**
 * Stage 3: B-2 Visa batch 2 - US-only organizations
 * Also sets fundingType where clear
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../client/src/data/catalog.json');
const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

// US-only organizations (require US residency, SSN, or US-specific eligibility)
const US_ONLY_ORGS = [
  // US scholarship programs for US students
  { org: 'Lime Connect', ft: 'one_time' },
  { org: 'Maggie Welby Foundation', ft: 'one_time' },
  { org: 'American Association on Health and Disability', ft: 'one_time' },
  { org: "Children's Brain Tumor Foundation", ft: 'one_time' },
  // US service dog programs (require US residence)
  { org: 'Canine Assistants', ft: 'one_time' },
  { org: 'Can Do Canines', ft: 'one_time' },
  { org: 'NEADS World Class Service Dogs', ft: 'one_time' },
  // US mortgage/financial assistance requiring US property/residency
  { org: 'MBA Opens Doors Foundation', ft: 'one_time' },
  // US adaptive sports (domestic programs)
  { org: 'Surfgimp Foundation', ft: 'one_time' },
  // US-based family support (serve US families only)
  { org: 'Sweet Julia Grace Foundation', ft: 'one_time' },
  { org: 'Mays Mission for the Handicapped', ft: 'one_time' },
  { org: 'Colorado Fund for Muscular Dystrophy', ft: 'one_time' },
  // US family hardship programs
  { org: 'AG Bell', ft: 'one_time' },
  // US medical equipment programs
  { org: 'Ariana Rye Foundation', ft: 'one_time' },
];

let b2Updated = 0;
let ftUpdated = 0;

for (const { org, ft } of US_ONLY_ORGS) {
  const matches = catalog.filter(g => g.organization === org);
  for (const item of matches) {
    if (item.b2VisaEligible === 'uncertain') {
      item.b2VisaEligible = 'no';
      b2Updated++;
    }
    if (ft && item.fundingType === 'varies') {
      item.fundingType = ft;
      ftUpdated++;
    }
  }
}

// Also mark some orgs as "yes" for B-2 (open to all regardless of status)
const OPEN_ORGS = [
  // Free wish/experience programs that don't check immigration status
  { org: 'Autism on the Seas Foundation', ft: 'one_time' },
  { org: 'Holton\u2019s Hero\u2019s', ft: 'one_time' },
  { org: 'Special Spectator', ft: 'one_time' },
  { org: 'Joeys Friends Too', ft: 'one_time' },
  { org: 'Room To Dream Foundation', ft: 'one_time' },
  { org: 'MJB Foundation', ft: 'one_time' },
  { org: "The Children's Dream Fund", ft: 'one_time' },
  { org: 'Miracle Flights', ft: 'one_time' },
];

for (const { org, ft } of OPEN_ORGS) {
  const matches = catalog.filter(g => g.organization === org);
  for (const item of matches) {
    if (item.b2VisaEligible === 'uncertain') {
      item.b2VisaEligible = 'yes';
      b2Updated++;
    }
    if (ft && item.fundingType === 'varies') {
      item.fundingType = ft;
      ftUpdated++;
    }
  }
}

fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));

console.log('=== Stage 3 B-2 Visa Batch 2 Results ===');
console.log(`B-2 updated: ${b2Updated}`);
console.log(`FundingType updated: ${ftUpdated}`);

const updated = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const t = updated.length;
console.log('\nVerification:');
console.log('B2 known:', updated.filter(g => g.b2VisaEligible === 'yes' || g.b2VisaEligible === 'no').length + '/' + t);
console.log('B2 yes:', updated.filter(g => g.b2VisaEligible === 'yes').length);
console.log('B2 no:', updated.filter(g => g.b2VisaEligible === 'no').length);
console.log('FundType known:', updated.filter(g => g.fundingType && g.fundingType !== 'varies').length + '/' + t);
