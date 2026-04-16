#!/usr/bin/env node
/**
 * Stage 3: B-2 Visa batch 3 - state-specific programs + international orgs
 * Also fills fundingType where determinable
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../client/src/data/catalog.json');
const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

let b2Updated = 0;
let ftUpdated = 0;

// === B-2 = "yes" (international/open to all) ===
const YES_ORGS = [
  { org: 'Hope Haven International', ft: 'one_time' },
  { org: 'May we help', ft: 'one_time' },
  { org: 'Beads of Courage', ft: 'recurring' }, // ongoing as child goes through treatment
  { org: 'Starlight Children\'s Foundation', ft: 'recurring' }, // ongoing programs for hospitalized kids
  { org: 'Air Care Alliance', ft: 'one_time' }, // serves patients traveling to US for care
  { org: 'Wings of Hope', ft: 'one_time' }, // no citizenship requirement
];

// === B-2 = "no" (state-specific or US-only programs) ===
const NO_ORGS = [
  // State-specific programs (single state = US residents only)
  { org: 'Achieve Tahoe', ft: 'one_time' },
  { org: 'KinActive Kids', ft: 'one_time' },
  { org: 'Circle Tail, Inc.', ft: 'one_time' },
  { org: 'The Ability Center', ft: 'one_time' },
  { org: 'Connecticut Tech Act Project', ft: 'one_time' },
  { org: 'The Arya Foundation', ft: 'one_time' },
  { org: 'The Dane Foundation', ft: 'one_time' },
  { org: 'All Kids are Perfect', ft: 'one_time' },
  // US regional programs
  { org: 'Casey Cares', ft: 'one_time' },
  { org: 'FRIENDS OF KAREN', ft: 'recurring' },
  { org: 'Boomer Esiason Foundation', ft: 'one_time' },
  { org: "Laughing At My Nightmare, Inc.", ft: 'one_time' },
  // US-based copay/medical assistance requiring US insurance
  { org: '180 Medical', ft: 'recurring' },
  { org: 'Lilly Cares Foundation', ft: 'recurring' },
  { org: 'Rx Outreach', ft: 'recurring' },
  // US adaptive sports/equipment (domestic focus)
  { org: 'Adaptx', ft: 'one_time' },
];

for (const { org, ft } of YES_ORGS) {
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

for (const { org, ft } of NO_ORGS) {
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

// Also set fundingType for free service programs without changing b2
const FT_ONLY = [
  { org: 'Canine Assistants', ft: 'one_time' },
  { org: 'Can Do Canines', ft: 'one_time' },
  { org: 'NEADS World Class Service Dogs', ft: 'one_time' },
  { org: 'Miracle Flights', ft: 'one_time' },
  { org: 'Kids Mobility Network', ft: 'one_time' },
  { org: "Children's Hemiplegia and Stroke Association (CHASA)", ft: 'one_time' },
  { org: 'Autism on the Seas Foundation', ft: 'one_time' },
  { org: 'Be An Angel', ft: 'one_time' },
  { org: 'Colin Farrell Foundation', ft: 'one_time' },
  { org: "Mission Fishin'", ft: 'one_time' },
  { org: 'Ronald McDonald House Charities', ft: 'one_time' },
];

for (const { org, ft } of FT_ONLY) {
  const matches = catalog.filter(g => g.organization === org && g.fundingType === 'varies');
  for (const item of matches) {
    item.fundingType = ft;
    ftUpdated++;
  }
}

fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));

console.log('=== Stage 3 B-2 Visa Batch 3 Results ===');
console.log(`B-2 updated: ${b2Updated}`);
console.log(`FundingType updated: ${ftUpdated}`);

const updated = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const t = updated.length;
console.log('\nVerification:');
console.log('B2 known:', updated.filter(g => g.b2VisaEligible === 'yes' || g.b2VisaEligible === 'no').length + '/' + t);
console.log('B2 yes:', updated.filter(g => g.b2VisaEligible === 'yes').length);
console.log('B2 no:', updated.filter(g => g.b2VisaEligible === 'no').length);
console.log('FundType known:', updated.filter(g => g.fundingType && g.fundingType !== 'varies').length + '/' + t);
