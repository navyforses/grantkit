#!/usr/bin/env node
/**
 * GrantKit Catalog Enrichment Script
 * Deterministic — same input → same output, no AI/API calls
 * Uses pattern matching and heuristics to fill empty fields
 */
const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.resolve(__dirname, '../client/src/data/catalog.json');
const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

// ============================================================
// 1. STATE INFERENCE
// ============================================================
const INSTITUTION_STATE_MAP = {
  'duke': 'NC', 'unc': 'NC', 'wake forest': 'NC', 'nc state': 'NC', 'durham': 'NC', 'raleigh': 'NC', 'chapel hill': 'NC', 'charlotte': 'NC', 'carolina': 'NC',
  'mayo clinic': 'MN', 'boston children': 'MA', 'boston': 'MA', 'massachusetts': 'MA',
  'stanford': 'CA', 'ucla': 'CA', 'ucsf': 'CA', 'california': 'CA', 'los angeles': 'CA', 'san francisco': 'CA', 'san diego': 'CA',
  'johns hopkins': 'MD', 'maryland': 'MD', 'baltimore': 'MD',
  'cleveland clinic': 'OH', 'ohio': 'OH', 'cincinnati': 'OH',
  'houston': 'TX', 'texas': 'TX', 'dallas': 'TX', 'san antonio': 'TX', 'austin': 'TX',
  'seattle': 'WA', 'washington state': 'WA',
  'chicago': 'IL', 'illinois': 'IL',
  'new york': 'NY', 'nyc': 'NY', 'brooklyn': 'NY', 'manhattan': 'NY',
  'philadelphia': 'PA', 'pennsylvania': 'PA', 'pittsburgh': 'PA',
  'atlanta': 'GA', 'georgia': 'GA',
  'miami': 'FL', 'florida': 'FL', 'orlando': 'FL', 'tampa': 'FL',
  'denver': 'CO', 'colorado': 'CO',
  'phoenix': 'AZ', 'arizona': 'AZ', 'tucson': 'AZ', 'tempe': 'AZ',
  'detroit': 'MI', 'michigan': 'MI',
  'minneapolis': 'MN', 'minnesota': 'MN',
  'portland': 'OR', 'oregon': 'OR',
  'nashville': 'TN', 'tennessee': 'TN', 'memphis': 'TN',
  'indianapolis': 'IN', 'indiana': 'IN',
  'milwaukee': 'WI', 'wisconsin': 'WI',
  'oklahoma': 'OK',
  'connecticut': 'CT',
  'new jersey': 'NJ',
  'virginia': 'VA', 'richmond': 'VA',
  'west virginia': 'WV',
  'iowa': 'IA',
  'kansas': 'KS',
  'kentucky': 'KY',
  'louisiana': 'LA', 'new orleans': 'LA',
  'maine': 'ME',
  'missouri': 'MO', 'st. louis': 'MO',
  'montana': 'MT',
  'nebraska': 'NE',
  'nevada': 'NV', 'las vegas': 'NV',
  'new hampshire': 'NH',
  'new mexico': 'NM',
  'north dakota': 'ND',
  'south dakota': 'SD',
  'south carolina': 'SC',
  'rhode island': 'RI',
  'utah': 'UT',
  'vermont': 'VT',
  'alaska': 'AK',
  'hawaii': 'HI',
  'alabama': 'AL',
  'arkansas': 'AR',
  'idaho': 'ID',
  'mississippi': 'MS',
  'wyoming': 'WY',
  'washington dc': 'DC', 'washington d.c.': 'DC',
  'shriners': 'FL', // HQ Tampa
  'ronald mcdonald': 'IL', // HQ Chicago
  'salvation army': 'VA', // HQ Alexandria
  'easter seals': 'IL', // HQ Chicago
};

const INSTITUTION_CITY_MAP = {
  'duke': 'Durham', 'unc': 'Chapel Hill', 'durham': 'Durham', 'raleigh': 'Raleigh', 'chapel hill': 'Chapel Hill', 'charlotte': 'Charlotte',
  'mayo clinic': 'Rochester', 'boston children': 'Boston', 'boston': 'Boston',
  'stanford': 'Stanford', 'ucla': 'Los Angeles', 'ucsf': 'San Francisco',
  'johns hopkins': 'Baltimore',
  'cleveland clinic': 'Cleveland',
  'seattle': 'Seattle', 'houston': 'Houston', 'dallas': 'Dallas', 'chicago': 'Chicago',
  'new york': 'New York', 'nyc': 'New York', 'brooklyn': 'Brooklyn',
  'philadelphia': 'Philadelphia', 'pittsburgh': 'Pittsburgh',
  'atlanta': 'Atlanta', 'miami': 'Miami', 'orlando': 'Orlando', 'tampa': 'Tampa',
  'denver': 'Denver', 'phoenix': 'Phoenix', 'tucson': 'Tucson', 'tempe': 'Tempe',
  'detroit': 'Detroit', 'minneapolis': 'Minneapolis', 'portland': 'Portland',
  'nashville': 'Nashville', 'memphis': 'Memphis', 'indianapolis': 'Indianapolis',
  'milwaukee': 'Milwaukee', 'san diego': 'San Diego', 'san francisco': 'San Francisco',
  'los angeles': 'Los Angeles', 'san antonio': 'San Antonio', 'austin': 'Austin',
  'las vegas': 'Las Vegas', 'new orleans': 'New Orleans', 'st. louis': 'St. Louis',
  'richmond': 'Richmond', 'baltimore': 'Baltimore',
};

function inferState(entry) {
  if (entry.state && entry.state !== '') return entry.state;
  if (entry.country === 'International') return 'International';
  const text = `${entry.name} ${entry.organization} ${entry.description || ''} ${entry.eligibility || ''}`.toLowerCase();
  for (const [key, state] of Object.entries(INSTITUTION_STATE_MAP)) {
    if (text.includes(key)) return state;
  }
  return 'Nationwide';
}

function inferCity(entry, state) {
  if (entry.city && entry.city !== '') return entry.city;
  if (state === 'Nationwide' || state === 'International') return '';
  const text = `${entry.name} ${entry.organization} ${entry.description || ''}`.toLowerCase();
  for (const [key, city] of Object.entries(INSTITUTION_CITY_MAP)) {
    if (text.includes(key)) return city;
  }
  return '';
}

// ============================================================
// 2. DIAGNOSIS INFERENCE
// ============================================================
const DIAGNOSIS_MAP = [
  { keywords: ['cancer', 'oncology', 'tumor', 'leukemia', 'lymphoma'], value: 'Cancer' },
  { keywords: ['autism', 'asd', 'autistic', 'asperger'], value: 'Autism' },
  { keywords: ['cerebral palsy', 'cp', 'hemiplegia'], value: 'Cerebral Palsy' },
  { keywords: ['epilepsy', 'seizure'], value: 'Epilepsy' },
  { keywords: ['down syndrome', 'trisomy 21'], value: 'Down Syndrome' },
  { keywords: ['hearing', 'deaf', 'cochlear'], value: 'Hearing' },
  { keywords: ['vision', 'blind', 'visual impairment', 'low vision'], value: 'Vision' },
  { keywords: ['diabetes', 'diabetic'], value: 'Diabetes' },
  { keywords: ['mental health', 'depression', 'anxiety', 'ptsd', 'psychiatric'], value: 'Mental Health' },
  { keywords: ['spinal cord', 'paralysis', 'quadripleg', 'parapleg', 'spinal injury'], value: 'Spinal' },
  { keywords: ['kidney', 'renal', 'dialysis'], value: 'Kidney' },
  { keywords: ['heart', 'cardiac', 'cardiovascular'], value: 'Heart' },
  { keywords: ['multiple sclerosis', 'ms '], value: 'Multiple Sclerosis' },
  { keywords: ['alzheimer', 'dementia'], value: 'Alzheimer' },
  { keywords: ['rare disease', 'rare disorder', 'orphan disease'], value: 'Rare Disease' },
  { keywords: ['muscular dystrophy', 'mda'], value: 'Rare Disease' },
  { keywords: ['cystic fibrosis', 'cf '], value: 'Rare Disease' },
  { keywords: ['transplant', 'organ transplant', 'bone marrow'], value: 'Transplant' },
  { keywords: ['stroke', 'hie', 'brain injury', 'tbi'], value: 'Brain Injury' },
  { keywords: ['wheelchair', 'mobility', 'adaptive equipment', 'prosthetic'], value: 'Mobility' },
  { keywords: ['speech', 'communication', 'aac'], value: 'Speech' },
  { keywords: ['craniofacial', 'cleft'], value: 'Craniofacial' },
  { keywords: ['neutropenia'], value: 'Rare Disease' },
];

function inferTargetDiagnosis(entry) {
  if (entry.targetDiagnosis && entry.targetDiagnosis !== '') return entry.targetDiagnosis;
  const text = `${entry.name} ${entry.organization} ${entry.description || ''} ${entry.eligibility || ''}`.toLowerCase();
  for (const { keywords, value } of DIAGNOSIS_MAP) {
    if (keywords.some(k => text.includes(k))) return value;
  }
  return 'General';
}

// ============================================================
// 3. FUNDING TYPE INFERENCE
// ============================================================
function inferFundingType(entry) {
  if (entry.fundingType && entry.fundingType !== '') return entry.fundingType;
  const amount = (entry.amount || '').toLowerCase();
  const desc = (entry.description || '').toLowerCase();
  if (entry.type === 'resource') return 'varies';
  if (amount.includes('monthly') || amount.includes('annual') || desc.includes('recurring') || desc.includes('monthly')) return 'recurring';
  if (desc.includes('reimburs')) return 'reimbursement';
  if (amount.match(/\$[\d,]+/) && !amount.includes('varies')) return 'one_time';
  return 'varies';
}

// ============================================================
// 4. B2 VISA INFERENCE
// ============================================================
function inferB2Visa(entry) {
  if (entry.b2VisaEligible && entry.b2VisaEligible !== '') return entry.b2VisaEligible;
  const text = `${entry.eligibility || ''} ${entry.description || ''}`.toLowerCase();
  if (text.includes('us citizen') || text.includes('us resident') || text.includes('ssn required') || text.includes('legal resident')) return 'no';
  if (text.includes('international patient') || text.includes('regardless of immigration') || text.includes('any nationality') || text.includes('b-2 visa')) return 'yes';
  if (text.includes('საერთაშორისო') || text.includes('b-2: 🟢') || text.includes('b-2 visa: ✅')) return 'yes';
  if (text.includes('b-2: 🔴') || text.includes('b-2 visa: ❌')) return 'no';
  return 'uncertain';
}

// ============================================================
// 5. APPLICATION PROCESS
// ============================================================
function generateApplicationProcess(entry) {
  if (entry.applicationProcess && entry.applicationProcess !== '') return entry.applicationProcess;
  const parts = [];
  if (entry.website) parts.push(`Apply online via ${entry.website}`);
  else if (entry.phone) parts.push(`Apply by phone at ${entry.phone}`);
  else parts.push(`Contact ${entry.organization} to apply`);

  const cat = entry.category;
  if (cat === 'medical_treatment') parts.push('Medical documentation may be required.');
  else if (cat === 'scholarships') parts.push('Academic records and essay may be required.');
  else if (cat === 'financial_assistance') parts.push('Proof of financial need may be required.');
  else if (cat === 'housing') parts.push('Proof of medical travel need may be required.');

  return parts.join('. ');
}

// ============================================================
// 6. GEOGRAPHIC SCOPE
// ============================================================
function inferGeographicScope(entry, state) {
  if (entry.geographicScope && entry.geographicScope !== '') return entry.geographicScope;
  if (state === 'International') return 'International';
  if (state === 'Nationwide') return 'National';
  if (entry.city && entry.city !== '') return 'Local';
  return 'State';
}

// ============================================================
// 7. DOCUMENTS REQUIRED
// ============================================================
function inferDocumentsRequired(entry) {
  if (entry.documentsRequired && entry.documentsRequired !== '') return entry.documentsRequired;
  const cat = entry.category;
  if (cat === 'medical_treatment') return 'Medical records, proof of diagnosis, physician letter';
  if (cat === 'financial_assistance') return 'Proof of income, identification, financial need documentation';
  if (cat === 'scholarships') return 'Academic records, essay, proof of enrollment';
  if (cat === 'assistive_technology') return 'Medical prescription, proof of need, identification';
  if (cat === 'housing') return 'Medical referral, proof of treatment, identification';
  if (cat === 'travel_transport') return 'Medical appointment confirmation, physician referral';
  if (cat === 'social_services') return 'Application form, identification documents';
  return 'Application form, identification documents';
}

// ============================================================
// PRINT STATS
// ============================================================
function printStats(label, data) {
  const total = data.length;
  const fields = ['state', 'city', 'targetDiagnosis', 'fundingType', 'b2VisaEligible', 'applicationProcess', 'geographicScope', 'documentsRequired'];
  console.log(`\n=== ${label} ===`);
  for (const f of fields) {
    const filled = data.filter(g => g[f] && g[f] !== '').length;
    console.log(`  ${f.padEnd(22)}: ${filled}/${total} (${(filled/total*100).toFixed(1)}%)`);
  }
}

// ============================================================
// MAIN
// ============================================================
printStats('BEFORE', catalog);

for (const entry of catalog) {
  const state = inferState(entry);
  entry.state = state;
  entry.city = inferCity(entry, state);
  entry.targetDiagnosis = inferTargetDiagnosis(entry);
  entry.fundingType = inferFundingType(entry);
  entry.b2VisaEligible = inferB2Visa(entry);
  entry.applicationProcess = generateApplicationProcess(entry);
  entry.geographicScope = inferGeographicScope(entry, state);
  entry.documentsRequired = inferDocumentsRequired(entry);
}

printStats('AFTER', catalog);

// Sort by category then name
catalog.sort((a, b) => {
  if (a.category !== b.category) return a.category.localeCompare(b.category);
  return a.name.localeCompare(b.name);
});

// Validate — no null/undefined
for (const entry of catalog) {
  for (const [k, v] of Object.entries(entry)) {
    if (v === null || v === undefined) {
      entry[k] = '';
      console.warn(`Fixed null field: ${entry.id}.${k}`);
    }
  }
}

fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));
console.log(`\nWritten ${catalog.length} entries to ${CATALOG_PATH}`);
