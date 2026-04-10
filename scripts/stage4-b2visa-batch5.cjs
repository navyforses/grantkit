#!/usr/bin/env node
/**
 * Stage 4: B-2 Visa batch 5
 * More US-only organizations
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../client/src/data/catalog.json');
const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

// B-2 = "no" - US-only organizations
const NO_ORGS = [
  // US equipment/mobility programs (domestic distribution)
  'BraunAbility',               // wheelchair van grants, US residents
  'Kids Mobility Network',      // US mobility equipment for kids
  'Wheelchairs 4 Kids',         // US wheelchair distribution
  'Wheelchairs 4 kids',         // alternate name
  'Ramps.org',                  // US ramp program
  'Computer Banc',              // US computer recycling/donation
  'Healthcare Equipment Recycling',
  'Healthcare Equipment Recycling Organization',
  'Hero Healthcare Equipment Recycling',
  'MagicMobility Vans',         // US van program
  // US disability/medical orgs (serve US residents)
  'Children\'s Hemiplegia and Stroke Association (CHASA)',
  'CHASA (Hemiplegia & Stroke)',
  'Children\'s Hemiplegia & Stroke Assoc.',
  'Cochlear Americas',          // US subsidiary, US residents
  'Believe in Tomorrow',        // US respite housing
  'Lighthouse Guild',           // US vision services
  'Oley Foundation',            // US home nutrition
  'Guide Dogs of America',      // US service dogs
  'Children\'s Flight of Hope', // US medical flights
  'Footprints In The Sky',      // US medical flights
  'New Directions Travel',      // US accessible travel
  'ADI - Assistance Dogs International', // US-based umbrella, domestic programs
  'Joys of Living Assistance Dogs',
  'Children\'s Craniofacial Association', // US families
  'Community Connections Inc.', // US community services
  'The Maryam Parman Foundation For Children', // US-based, serves US injured children
  'Maryam Parman Foundation',   // alternate name
  'Home School Legal Defense',  // US homeschool legal
  'Home School Legal Defense Association',
  'AAHD',                       // American Association on Health and Disability
  'Help America Hear',          // US hearing org
  'RubysRainbow.org',           // US Down syndrome scholarship
  'VSP Vision',                 // US vision insurance
  'IFB Solutions',              // US visual impairment employment
  'Deepwood Foundation',        // US
  'Assoc. for Education & Rehabilitation',
  'Autism Care Today',          // US autism org (requires US insurance)
  'Autistic People of Color Fund', // US-focused
  'Down Syndrome Association of CT', // Connecticut-specific
  'Autismazing.org',            // US autism
  'Acoustics for Autism',       // US
  // US camp/recreation programs (domestic)
  'Camp Accomplish',
  'Double H Ranch',
  'Flying Horse Farms',
  'Catch-A-Dream Foundation',
  'Hunt of a Lifetime Foundation',
  'I GOT LEGS',
  'Spectrum Sailing Holland',   // Holland, Michigan
  'Team Catapult',
  // US-specific financial/assistance orgs
  'Chariots 4 Hope',            // vehicle donations, US-based
  'Autistic People of Color Fund',
  'Joseph Groh Foundation',     // US workers' compensation fund
  'THE GOHAWKEYE FOUNDATION',   // Iowa-based sports equipment
  // US adaptive equipment
  'Triumph Foundation',         // US SCI/rehab org
  'Wolf Pups On Wheels',        // US equipment for kids
  'WolfPups On Wheels, Inc.',   // same
  // Small US regional foundations
  'Alyssa V Phillips Foundation',
  'Addi\'s Faith Foundation',
  'Cora Foundation',
  'Cynthia Solomon Holmes Foundation',
  'Foreseeable Future Foundation',
  'J-Rob Foundation',
  'Joshua Harr Shane Foundation',
  'June and Jessee Memorial Foundation',
  'Kourageous Karter Foundation',
  'Kya\'s Krusade',
  'Light for Levi Foundation',
  'Little Miss Hannah',
  'Living Proof Advocacy',
  'Luca Lisson',
  'Matthew Larson Foundation',
  'McLindon Family Foundation',
  'Mesa Angels Foundation',
  'Mimi\'s Mission',
  'Move for Jenn Foundation',
  'MyGoal',
  'NuPrisma',
  'Online Car Donation',
  'Pervis Jackson Jr Foundation',
  'Ragan\'s Hope',
  'Rising Kites',
  'Ryans Hope AZ',
  'Sophia\'s Voice',
  'Sunshine on a Ranney Day',
  'The Parker Lee Project',
  'The Ray Tye Medical Foundation',
  'The Shannon Foundation',
  'The Special Needs Trust',
  'Travis Burkhart Foundation',
  'Tyler Schrenk Foundation',
  'W.O.B.E',
  // Other US-specific
  'Benefit4Kids',
  'Garage 10',
  'Holton\'s Heroes',
  'Oracle Health Foundation',
  'Varghese Summersett',       // Texas law firm
  'LittleWins',
  'Small Steps in Speech',
  'Lilly\'s Voice',
  '321foundation',
  'Orange Effect Foundation',
  'The Orange Effect Foundation',
  'Orange Effect Foundartion',   // typo variant
  'Askate Foundation',
  'Beam',                       // US mental health (Black community focus)
  'Cameron\'s Crusaders',
  'Crescent Moon Cares Foundation',
  'Crescent Moon Cares',
  'Matt Larson Foundation',
  'Blessed Gates',
  'Blessed Gates (PLEASE CHECK THIS ONE THE FORM ESPECIALLY)',
  'Begin Again Foundation',
  'CC4C',
  'All Kids Are Perfect (AKAP)',
  'A Mother\'s Rest',
  'Athletes Helping Athletes',
  'Family Promise Triangle',
  'Feel Better Friends',
  'Let\'s Build Beds',
  'Miracles in Motion Dance',
  'Nathaniel\'s Hope',
  'Special Needs Resource Project',
  'Special Wants',
  'Zac Speaks',
  'Casey\'s Circle',
  'Deliver the Dream',
  'Jay\'s House Inc',
  'Red Treehouse',
  'My Gym Foundation',
  'Aubrey Rose',
  'Love Them All Foundation',
  'Avery\'s Angels',
  'Hope Floats Foundation',
  'Lion\'s Hope Nonprofit',
  'Share A Vision',
  'THE SIDNEY R. BAER, JR. FOUNDATION',
  'Specialty Kids Fund',
  'Mission Fishin\'',            // US fishing program
  'Cherished Creations',        // US creative grants
  'Music Movement',             // US music therapy
  'Chive Charities',
  'THE GOHAWKEYE FOUNDATION',
  'Chase Warrior Foundation',
  'Gifts of Mobility Foundation',
  'Air Charity Network',
  'HIGH FIVES Foundation',
  'Airana Rye Foundation',
  'ABC Medical',
  'Karman Healthcare Inc.',
  'The Avalon Foundation',
  'Impossible Dream',
  'Grotto of North America',
  'Grottoes of North America',
];

// B-2 = "yes" - international programs
const YES_ORGS = [
  'LifeNets',                   // international disaster relief/aid
  'Vital Options International', // international cancer support
  'Colin Farrell Foundation',   // Irish disability charity, international reach
];

let b2Updated = 0;
const notFound = [];

for (const org of NO_ORGS) {
  const matches = catalog.filter(g => g.organization === org && g.b2VisaEligible === 'uncertain');
  if (matches.length === 0) {
    // Don't report as not found - some orgs might not exist or already classified
  }
  for (const item of matches) {
    item.b2VisaEligible = 'no';
    b2Updated++;
  }
}

for (const org of YES_ORGS) {
  const matches = catalog.filter(g => g.organization === org && g.b2VisaEligible === 'uncertain');
  for (const item of matches) {
    item.b2VisaEligible = 'yes';
    b2Updated++;
  }
}

fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));

console.log('=== Stage 4 B-2 Visa Batch 5 Results ===');
console.log(`B-2 updated: ${b2Updated}`);

const updated = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
const t = updated.length;
console.log('\nVerification:');
console.log('B2 known:', updated.filter(g => g.b2VisaEligible === 'yes' || g.b2VisaEligible === 'no').length + '/' + t);
console.log('B2 yes:', updated.filter(g => g.b2VisaEligible === 'yes').length);
console.log('B2 no:', updated.filter(g => g.b2VisaEligible === 'no').length);
console.log('B2 uncertain:', updated.filter(g => g.b2VisaEligible === 'uncertain').length);

const stillUncertain = updated.filter(g => g.b2VisaEligible === 'uncertain');
const remainingOrgs = [...new Set(stillUncertain.map(g => g.organization))];
console.log('\nRemaining uncertain orgs:', remainingOrgs.length);
remainingOrgs.forEach(o => console.log(' -', o));
