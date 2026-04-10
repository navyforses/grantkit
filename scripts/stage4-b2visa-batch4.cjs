#!/usr/bin/env node
/**
 * Stage 4: B-2 Visa batch 4
 * Classifying remaining uncertain orgs based on org type:
 * - US pharmacy/insurance discount programs → no
 * - US service dog programs → no
 * - US-specific national disease/disability orgs → no
 * - US military/veteran-focused → no
 * - US wish/experience programs (domestic) → no
 * - International programs (global reach) → yes
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../client/src/data/catalog.json');
const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

// B-2 = "no" orgs (US-only by nature)
const NO_ORGS = [
  // US pharmacy discount/patient assistance (require US address/insurance)
  'Good RX',
  'GoodRx + NeedyMeds',
  'Blink Health',
  'HelpRx',
  'Insider Rx',
  'Medicine Assistance Tool',
  'NeedyMeds',
  'Good Days',
  'Novartis Patient Assistance',
  'Merck Helps',
  'GSK',
  // US service dog programs (require US residence for training/placement)
  'Canine Companions',
  'Canine Partners for Life',
  'Dogs4Diabetics',
  'Leader Dogs For The Blind',
  'Little Angels Service Dogs',
  'Service Dog Project',
  'SIT Service Dogs',
  'PHARM Dog',
  'National Institute of Canine Service and Training',
  'New Hope Assistance Dogs Inc',
  'Joys of Living Assistance Dogs',
  'Paws with a Cause',
  'Paws 4 Autism',
  'Canines for Disabled Kids',
  // US national disease/disability orgs (US-centric programs, may require SSN)
  'National Federation of the Blind',
  'National Autism Association',
  'NORD',
  'EveryLife Foundation',
  'CHARGE Syndrome Foundation',
  'Angelman Syndrome Foundation',
  'Child Neurology Foundation',
  'SPARK for Autism',
  'The Asperger Autism Network',
  'Autism Spectrum Disorder Foundation',
  'Association for Autism',
  'Autism Care Today',
  'Autism Community in Action',
  'National Neutropenia Network',
  'Severe Chronic Neutropenia Registry',
  'COTA',
  'Patient AirLift Services',
  'Angel Flight West',
  'Angel Flight East',
  'Patient Advocate Foundation',
  'American Library Association',
  'AMBUCS',
  'Sertoma',
  // US medical supply/retail (not grants, US-only)
  'ABC Medical',
  'AvaCare Medical',
  'Adaptivemall.com',
  // US wish/experience programs (domestic only)
  'Make-A-Wish America',
  'Dreams Come True',
  'Dream Factory Inc',
  'Granted Wish Foundation',
  'Kids Wish Network',
  'Sunshine Foundation',
  "Bert's Big Adventure",
  'Songs of Love Foundation',
  'One Simple Wish',
  "Kidd's Kids",
  'Special Angels Foundation',
  'CAST for Kids Foundation',
  'Team IMPACT',
  'Icing Smiles',
  'Wishers and Dreamers',
  'A Moment of Magic',
  // US military/veteran (domestic)
  'Gary Sinise Foundation',
  'Chive Charities',
  // US financial assistance (domestic)
  'Modest Needs Foundation',
  'Dollar For Organization',
  'Miracles For Kids',
  'Benefit4Kids',
  'Elderly or Disabled Living (EDL)',
  // US specific orgs
  'Family Voices',
  'Family Voices (MA)',
  'Doug Flutie Jr. Foundation',
  'High Fives Foundation',
  'Live Like Jake Foundation',
  'Kyle Pease Foundation',
  'The Kyle Pease Foundation',
  'Making Headway Foundation',
  'SeriousFun Children\'s Network',
  'ABC Law Centers',
  'Bold.org',
  'Access Scholarships',
  'Be Perfect Foundation',
  'PATH-WAY Foundation',
  'Victoria\'s Victory Foundation',
  'The Jared Monroe Foundation',
  'Dental Lifeline Network',
  'Pacific Dental Services',
  'IFB Solutions',
  'GiGi\'s Playhouse',
  'Southwest Human Development',
  'Raising Special Kids',
  'Coalition Against Pediatric Pain',
  'The Coalition Against Pediatric Pain',
  'Beckwith Weidemann Foundation',
  'National Institute of Canine Service and Training',
  'Association of Horizon, Inc',
];

// B-2 = "yes" orgs (international/global programs)
const YES_ORGS = [
  'Wheelchair Foundation',      // distributes wheelchairs globally
  'Whirlwind Wheelchair',       // designs affordable wheelchairs for global use
  'Little Baby Face Foundation', // confirmed international - flies families to NY
  'St. Jude Children\'s Research Hospital', // accepts international patients
  'Joni and Friends',            // international disability ministry
];

let b2Updated = 0;
const notFound = [];

for (const org of NO_ORGS) {
  const matches = catalog.filter(g => g.organization === org && g.b2VisaEligible === 'uncertain');
  if (matches.length === 0) {
    notFound.push(org);
  }
  for (const item of matches) {
    item.b2VisaEligible = 'no';
    b2Updated++;
  }
}

for (const org of YES_ORGS) {
  const matches = catalog.filter(g => g.organization === org && g.b2VisaEligible === 'uncertain');
  if (matches.length === 0) {
    notFound.push(org + ' (yes)');
  }
  for (const item of matches) {
    item.b2VisaEligible = 'yes';
    b2Updated++;
  }
}

fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));

console.log('=== Stage 4 B-2 Visa Batch 4 Results ===');
console.log(`B-2 updated: ${b2Updated}`);
if (notFound.length > 0) console.log('Not found:', notFound);

const updated = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const t = updated.length;
console.log('\nVerification:');
console.log('B2 known:', updated.filter(g => g.b2VisaEligible === 'yes' || g.b2VisaEligible === 'no').length + '/' + t);
console.log('B2 yes:', updated.filter(g => g.b2VisaEligible === 'yes').length);
console.log('B2 no:', updated.filter(g => g.b2VisaEligible === 'no').length);
console.log('B2 uncertain:', updated.filter(g => g.b2VisaEligible === 'uncertain').length);
