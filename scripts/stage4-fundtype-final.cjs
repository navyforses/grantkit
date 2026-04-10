#!/usr/bin/env node
/**
 * Stage 4: Final FundingType fills for remaining 34 varies entries
 * Researched individually: most are one_time grants/assistance
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../client/src/data/catalog.json');
const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

let ftUpdated = 0;

// ONE_TIME: one-time grants, equipment, financial assistance, travel per trip
const ONE_TIME_ENTRIES = [
  { org: 'Chase Warrior Foundation', name: 'Adaptive Equipment Application' },
  { org: 'Love Them All Foundation', name: 'Annual charity' },
  { org: "Semper FI & America's Fund", name: 'Bedside Financial Support' },
  { org: 'BraunAbility', name: 'Fundraising for a Handicap Van' },
  { org: 'BraunAbility', name: 'National Funding & Wheelchair Van Grants for Accessible Vehicles' },
  { org: 'Share A Vision', name: 'Share vision recreational fund' },
  { org: 'THE SIDNEY R. BAER, JR. FOUNDATION', name: 'Sidney R. Baer, Jr. Foundation \u2013 Reintegration Grants' },
  { org: "Semper FI & America's Fund", name: 'Specialized & Adaptive Equipment (The Fund)' },
  { org: 'BraunAbility', name: 'Wheelchair Accessible Vehicle Grants for Nonprofits' },
  { org: 'DAV', name: 'DAV Charitable Service Trust \u2013 Service & Assistance Animal Support' },
  { org: 'Air & Space Forces Association', name: 'AFA Wounded Airmen & Guardians Program' },
  { org: 'Air & Space Forces Association', name: 'AFA Wounded Airmen & Guardians Travel Assistance Grants' },
  { org: 'Orange Effect Foundartion', name: 'APPLY FOR FUNDING' },
  { org: 'BraunAbility', name: 'Automotive Discounts and Mobility Rebate Programs' },
  { org: 'Begin Again Foundation', name: "Begin Again Foundation's Butterfly Blessings" },
  { org: "Cameron's Crusaders", name: "Cameron's Crusaders Financial Assistance" },
  { org: 'Crescent Moon Cares Foundation', name: 'Crescent Moon Cares Foundation SPRING 2025 GRANT' },
  { org: 'Matthew Larson Foundation', name: 'FAMILY ASSISTANCE PROGRAM APPLICATION INSTRUCTIONS' },
  { org: "Sophia's Voice", name: 'Financial assistance for medical purpose' },
  { org: 'Aubrey Rose', name: 'Financial Assitance' },
  { org: 'Friends of Man', name: 'Friends of Man National Assistance' },
  { org: 'Wolf Pups On Wheels', name: 'Grants for Kids with Disabilities' },
  { org: "Lion's Hope Nonprofit", name: "Lion's Hope Financial Assistance Program" },
  { org: 'Wheels of Happiness', name: 'Medical Financial Aid Program' },
  { org: 'Wheels of Happiness', name: 'Quality of Life Program' },
  { org: 'The Ray Tye Medical Foundation', name: 'Ray Tye Medical Aid Foundation' },
  { org: 'Travis Burkhart foundation', name: 'Request Assistance' },
  { org: 'The Shannon Foundation', name: 'The Shannon Foundation' },
  { org: 'BraunAbility', name: 'Wheelchair Van Grants by State' },
  { org: 'WolfPups On Wheels, Inc.', name: 'WolfPups on Wheels Grant Program' },
  { org: 'Computer Banc', name: 'Computer Banc Purchase Program' },
];

// RECURRING: renewal/ongoing programs
const RECURRING_ENTRIES = [
  { org: 'Patient Access Network Foundation (PAN Foundation)', name: 'Additional funding and renewal grants' },
  { org: 'Community Connections Inc.', name: 'Life Skills Program' },
];

for (const { org, name } of ONE_TIME_ENTRIES) {
  const matches = catalog.filter(g => g.organization === org && g.name === name && g.fundingType === 'varies');
  for (const item of matches) {
    item.fundingType = 'one_time';
    ftUpdated++;
  }
}

for (const { org, name } of RECURRING_ENTRIES) {
  const matches = catalog.filter(g => g.organization === org && g.name === name && g.fundingType === 'varies');
  for (const item of matches) {
    item.fundingType = 'recurring';
    ftUpdated++;
  }
}

fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));

console.log('=== Stage 4 FundingType Final Results ===');
console.log(`FundingType updated: ${ftUpdated}`);

const updated = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const t = updated.length;
console.log('\nVerification:');
console.log('FundType known:', updated.filter(g => g.fundingType && g.fundingType !== 'varies').length + '/' + t);
console.log('FundType varies remaining:', updated.filter(g => g.fundingType === 'varies').length);
const ft = {};
updated.forEach(g => { ft[g.fundingType] = (ft[g.fundingType] || 0) + 1; });
console.log('FundType dist:', ft);

// Show what's still varies
const stillVaries = updated.filter(g => g.fundingType === 'varies');
if (stillVaries.length > 0) {
  console.log('\nStill varies:');
  stillVaries.forEach(g => console.log(' -', g.organization, '|', g.name, '|', g.amount));
}
