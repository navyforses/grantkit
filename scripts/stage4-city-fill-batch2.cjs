#!/usr/bin/env node
/**
 * Stage 4: City fill batch 2 - additional and curly-apostrophe fixes
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../client/src/data/catalog.json');
const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

// org name → city (exact match including unicode apostrophes)
const CITY_MAP = {
  // Curly apostrophe U+2019 variants
  'UnitedHealthcare Children\u2019s Foundation': 'Minnetonka',
  'Kidd\u2019s Kids': 'Grapevine',
  'Nathaniel\u2019s Hope': 'Orlando',
  'Sunshine Foundation': 'Southampton',    // PA wish granting org
  // Standard orgs still missing city
  'CHASA (Hemiplegia & Stroke)': 'Dallas',
  'Children\'s Hemiplegia & Stroke Assoc.': 'Dallas',
  'Dream Factory Inc': 'Louisville',
  'Songs of Love Foundation': 'New York',
  'Deepwood Foundation': 'Columbus',
  'Sertoma': 'Kansas City',
  'ABC Medical': 'Twinsburg',
  'Camp Accomplish': 'Reisterstown',
  'Vital Options International': 'Woodland Hills',
  'The Maryam Parman Foundation For Children': 'Los Angeles',
  'Maryam Parman Foundation': 'Los Angeles',
  'Special Love for Children with Cancer': 'Front Royal',
  'Service Dog Project': 'Ipswich',
  'Icing Smiles': 'Gaithersburg',
  'Catch-A-Dream Foundation': 'Houston',  // MS - Houston, Mississippi
  'Deliver the Dream': 'Hollywood',       // FL
  'GSK': 'Durham',                        // GSK US pharma ops at Research Triangle Park
  'Novartis Patient Assistance': 'East Hanover',
  'Pacific Dental Services': 'Brea',
  'Hospitality Homes (ბოსტონი)': 'Boston',
  'Hospitality Homes (ბოსტონში დაფუძნებული მოდელი)': 'Boston',
  'CAST for Kids Foundation': 'Louisville',
  'MBA Opens Doors Foundation': 'Washington',
  'Little Angels Service Dogs': 'Palmyra',
  'New Directions Travel': 'Baltimore',
  'Catholic Charities — რალის ეპარქია (დარემის ოფისი)': 'Durham',
  'Catholic Charities დარემი + რალი': 'Durham',
  'Family Voices (MA)': 'Boston',
  'Help Hope Live — ფისკალური სპონსორობა': 'Blue Bell',
  'Healthcare Hospitality Network': 'Alpharetta',
  'HHN (Healthcare Hospitality Network)': 'Alpharetta',
  'Autism Community in Action': 'Washington',
  'Grey Stone Church — იმედის სახლი': 'Knightdale',
  'Kidd\'s Kids': 'Grapevine',            // straight apostrophe variant
  'Nathaniel\'s Hope': 'Orlando',         // straight apostrophe variant
  // NC local
  'Peace Presbyterian Church — ქერი': 'Cary',
  'Peace Presbyterian — ქერი': 'Cary',
  'The Carying Place — ქერი': 'Cary',
  'NC DHHS / FIF / Arc of NC': 'Raleigh',
  'Safe Families for Children — რალი-დარემი': 'Raleigh',
  'PTCT Family Support (Caroline Sweezy)': 'Durham',
  'Harper\'s Home': 'Raleigh',
  'Harper\'s Home (მშენებარე?)': 'Raleigh',
  // Georgia (US state) orgs
  'Georgian Association in US': 'Atlanta',
  // International / other
  'ქართუ ფონდი (საქართველო)': 'Tbilisi',
  'საქართველოს მთავრობა — რეფერალური სერვისის პროგრამა': 'Tbilisi',
  'ქართული სახელმწიფო საქველმოქმედო ფონდები': 'Tbilisi',
  // More US orgs
  'RubysRainbow.org': 'Austin',
  'Access Scholarships': 'Silver Spring',
  'Help America Hear': 'Scottsdale',
  'Assoc. for Education & Rehabilitation': 'Alexandria',
  'Blink Health': 'New York',
  'CBR / Cord Blood Registry': 'Tucson',
};

let cityUpdated = 0;
const notFound = [];

for (const [org, city] of Object.entries(CITY_MAP)) {
  const matches = catalog.filter(g => g.organization === org && (!g.city || g.city === ''));
  if (matches.length === 0) {
    const existing = catalog.filter(g => g.organization === org);
    if (existing.length === 0) notFound.push(org);
  }
  for (const item of matches) {
    item.city = city;
    cityUpdated++;
  }
}

fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));

console.log('=== Stage 4 City Fill Batch 2 Results ===');
console.log(`City updated: ${cityUpdated}`);
if (notFound.length > 0) {
  console.log('\nNot found in catalog:');
  notFound.forEach(o => console.log(' -', o));
}

const updated = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const t = updated.length;
const hasCity = updated.filter(g => g.city && g.city !== '').length;
console.log('\nVerification:');
console.log(`City filled: ${hasCity}/${t} (${(hasCity/t*100).toFixed(1)}%)`);
console.log(`Still missing city: ${t - hasCity}`);
