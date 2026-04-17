#!/usr/bin/env node
/**
 * Stage 4: Pattern Matching
 * - Resources with amount="Varies" → "Free service"
 * - Short description (<30 chars) → expand with template
 * - Website/Phone "N/A" → ""
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '../client/src/data/catalog.json');

const CATEGORY_DESC = {
  medical_treatment: 'Medical treatment and healthcare support.',
  financial_assistance: 'Financial aid and support services.',
  scholarships: 'Educational scholarship opportunity.',
  housing: 'Housing and accommodation support.',
  assistive_technology: 'Assistive technology and adaptive equipment.',
  social_services: 'Social services and community support.',
  travel_transport: 'Travel and transportation assistance.',
  international: 'International program and support.',
  other: 'Program and support services.',
};

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

let changedAmount = 0;
let changedDesc = 0;
let changedWebsite = 0;
let changedPhone = 0;
let changedEmail = 0;

for (const item of catalog) {
  // 1. Resources: Varies → Free service
  if (item.type === 'resource' && item.amount && item.amount.toLowerCase() === 'varies') {
    item.amount = 'Free service';
    changedAmount++;
  }

  // 2. Short description (<30 chars) → expand with template
  if (!item.description || item.description.length < 30) {
    const catDesc = CATEGORY_DESC[item.category] || 'Support and assistance services.';
    const orgName = item.organization && item.organization !== item.name
      ? item.organization
      : (item.organization || item.name || 'this organization');

    // Skip if name/org looks like placeholder data
    if (orgName === '~30' || orgName === 'N/A') continue;

    const shortDesc = item.description && item.description.trim() ? item.description.trim() : item.name;
    item.description = `${shortDesc} — provided by ${orgName}. ${catDesc}`;
    changedDesc++;
  }

  // 3. Website "N/A" → ""
  if (item.website === 'N/A') {
    item.website = '';
    changedWebsite++;
  }

  // 4. Phone "N/A" → ""
  if (item.phone === 'N/A') {
    item.phone = '';
    changedPhone++;
  }

  // 5. Email "N/A" → ""
  if (item.email === 'N/A') {
    item.email = '';
    changedEmail++;
  }
}

fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));

console.log('=== Stage 4 Pattern Match Results ===');
console.log(`Amount (resource→Free service): ${changedAmount}`);
console.log(`Description expanded: ${changedDesc}`);
console.log(`Website N/A→"": ${changedWebsite}`);
console.log(`Phone N/A→"": ${changedPhone}`);
console.log(`Email N/A→"": ${changedEmail}`);
console.log('Done!');
