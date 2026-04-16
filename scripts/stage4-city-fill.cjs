#!/usr/bin/env node
/**
 * Stage 4: Fill city fields for organizations missing city data
 * Based on known headquarters locations of these organizations
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../client/src/data/catalog.json');
const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

// org name → city (exact match on organization field)
const CITY_MAP = {
  // National disability/disease orgs
  'AAHD': 'Rockville',
  'Angelman Syndrome Foundation': 'Aurora',
  'CHARGE Syndrome Foundation': 'Columbia',
  'EveryLife Foundation': 'Washington',
  'National Autism Association': 'Niantic',
  'NORD': 'Washington',
  'Severe Chronic Neutropenia Registry': 'Seattle',
  'SPARK for Autism': 'New York',
  'The Asperger Autism Network': 'Watertown',
  'UnitedHealthcare Children\'s Foundation': 'Minnetonka',

  // Medical transportation / flight
  'Angel Flight West': 'Van Nuys',
  'Angel Flight Northeast': 'Beverly',
  'Children\'s Flight of Hope — უფასო ავიაბილეთები': 'Rocky Mount',
  'Mercy Medical Angels': 'Virginia Beach',
  'Patient AirLift Services': 'Smithtown',

  // Service dogs
  'Canine Companions': 'Santa Rosa',
  'Canine Partners for Life': 'Cochranville',
  'Dogs4Diabetics': 'Concord',
  'Leader Dogs For The Blind': 'Rochester Hills',

  // Wish / camp programs
  'Bert\'s Big Adventure': 'Atlanta',
  'Double H Ranch': 'Lake Luzerne',
  'Flying Horse Farms': 'Mount Gilead',
  'Hunt of a Lifetime Foundation': 'Fort Worth',
  'SeriousFun Children\'s Network': 'Glastonbury',
  'Spectrum Sailing Holland': 'Holland',
  'Team IMPACT': 'Waltham',

  // Pharmacy / patient assistance
  'Good Days': 'Plano',
  'Merck Helps': 'Rahway',
  'NeedyMeds': 'Gloucester',

  // Transplant / bone marrow
  'American Transplant Foundation': 'Denver',
  'BMT InfoNet — Patient Assistance Fund 🆕': 'Highland Park',
  'Bone Marrow & Cancer Foundation 🆕': 'New York',
  'Children\'s Organ Transplant Association (COTA)': 'Bloomington',
  'COTA': 'Bloomington',
  'National BMT Link — Lifeline Fund': 'Southfield',
  'NMDP (ყოფილი Be The Match)': 'Minneapolis',
  'ViaCord': 'Boston',

  // Equipment / mobility / vision
  'GiGi\'s Playhouse': 'Hoffman Estates',
  'IFB Solutions': 'Winston-Salem',
  'Leader Dogs For The Blind': 'Rochester Hills',
  'VSP Vision': 'Rancho Cordova',

  // Medical advocacy / financial
  'Colin Farrell Foundation': 'Dublin',
  'Dental Lifeline Network': 'Denver',
  'Gary Sinise Foundation': 'Agoura Hills',
  'Global Medical Relief Fund (GMRF) 🆕': 'Staten Island',
  'Healing the Children 🆕': 'Spokane',
  'Hope for HIE': 'Bay Village',
  'IOCC (მართლმადიდ. ქველმოქ.)': 'Baltimore',
  'IOCC (საერთ. მართლმადიდ. საქველმოქმ.) 🆕': 'Baltimore',
  'IOCC (მართლმადიდებ. ქველმოქმ.)': 'Baltimore',
  'Kyle Pease Foundation': 'Atlanta',
  'One Simple Wish': 'Eatontown',
  'Oracle Health Foundation (ყოფილი First Hand Foundation)': 'Kansas City',
  'Patient Advocate Foundation': 'Hampton',
  'Samaritan\'s Purse — ბავშვთა სამედიცინო პროგრამები': 'Boone',
  'Shriners Children\'s — საერთაშორისო პაციენტების პროგრამა': 'Tampa',

  // Family / community support
  'American Friends of Georgia': 'Washington',
  'American Library Association': 'Chicago',
  'Church World Service (CWS)': 'Elkhart',
  'Down Syndrome Association of CT': 'Hartford',
  'Family Promise Triangle': 'Durham',
  'Home School Legal Defense': 'Purcellville',
  'Home School Legal Defense Association': 'Purcellville',
  'Oracle Health Foundation': 'Kansas City',
  'Raising Special Kids': 'Phoenix',
  'Southwest Human Development': 'Phoenix',
  'Triangle Mutual Aid': 'Durham',
  'Varghese Summersett': 'Fort Worth',

  // NC local orgs
  'Children\'s Flight of Hope': 'Rocky Mount',
  'Footprints In The Sky': 'Burlington',
  'RMH WakeMed': 'Raleigh',
  'RMH ჩეპელ ჰილი': 'Chapel Hill',
  'Ronald McDonald House WakeMed-ში': 'Raleigh',
  'Ronald McDonald House ჩეპელ ჰილი': 'Chapel Hill',
  'Ronald McDonald House — Triangle (საცხოვრებლის მხარდაჭერა)': 'Raleigh',
  'Safe Families for Children RDU': 'Raleigh',

  // Online / tech platforms
  'Bold.org': 'San Francisco',
  'GiveSendGo (ქრისტიანული Crowdfunding) 🆕': 'East Wareham',
  'GiveSendGo Charities — GiverArmy 🆕': 'East Wareham',
};

let cityUpdated = 0;
const notFound = [];

for (const [org, city] of Object.entries(CITY_MAP)) {
  const matches = catalog.filter(g => g.organization === org && (!g.city || g.city === ''));
  if (matches.length === 0) {
    // Check if org exists at all (might already have city)
    const existing = catalog.filter(g => g.organization === org);
    if (existing.length === 0) notFound.push(org);
  }
  for (const item of matches) {
    item.city = city;
    cityUpdated++;
  }
}

fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));

console.log('=== Stage 4 City Fill Results ===');
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
