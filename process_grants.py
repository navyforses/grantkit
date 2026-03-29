#!/usr/bin/env python3
"""
Process scraped grants data into the format needed for GrantKit website.
Maps the supportnow.org categories to our GrantKit categories and creates
a clean JSON file for the frontend.
"""
import json
import re

# Load scraped data
with open('/home/ubuntu/grantkit/scraped_grants_v2.json') as f:
    raw_grants = json.load(f)

# Map supportnow types to our broader categories
TYPE_TO_CATEGORY = {
    # Medical Treatment
    'Treatments': 'Medical Treatment',
    'Pharmaceutical': 'Medical Treatment',
    'Physical Therapy': 'Medical Treatment',
    'Occupational Therapy': 'Medical Treatment',
    'Speech Therapy': 'Medical Treatment',
    'Swallow/Feeding Therapy': 'Medical Treatment',
    'Other Therapies': 'Medical Treatment',
    'Therapies': 'Medical Treatment',
    
    # Equipment & Assistive Technology
    'Equipment': 'Equipment & Assistive Technology',
    'AAC (ipad or Communication Device)': 'Equipment & Assistive Technology',
    'Prosthetics': 'Equipment & Assistive Technology',
    'Wheelchair': 'Equipment & Assistive Technology',
    'Adaptive Sports Chairs': 'Equipment & Assistive Technology',
    'Lifts': 'Equipment & Assistive Technology',
    'Ramps': 'Equipment & Assistive Technology',
    'Home Modifications': 'Equipment & Assistive Technology',
    'Modifications': 'Equipment & Assistive Technology',
    
    # Financial Assistance
    'Financial': 'Financial Assistance',
    'Grants': 'Financial Assistance',
    'Transportation': 'Financial Assistance',
    
    # Services & Support
    'Services': 'Services & Support',
    'Respite': 'Services & Support',
    'Camp': 'Services & Support',
    'Animal': 'Services & Support',
    'Bereavement': 'Services & Support',
    'Content': 'Services & Support',
    'Events': 'Services & Support',
    'Other': 'Services & Support',
    
    # Academic Scholarships
    'Academic Scholarships': 'Academic Scholarships',
}

# Map situations to readable labels
SITUATION_LABELS = {
    'Diagnosis': 'General Diagnosis',
    'Military': 'Military/Veterans',
    'Cancer': 'Cancer',
    'Brain Tumour': 'Brain Tumor',
    'Autism': 'Autism',
    'Cerebral Palsy': 'Cerebral Palsy',
    'Down Syndrome': 'Down Syndrome',
    'Epilepsy': 'Epilepsy',
    'Blind': 'Visual Impairment',
    'Amputee': 'Amputee',
    'Spinal Cord Injury': 'Spinal Cord Injury',
    'Terminal Illness': 'Terminal Illness',
    'Transplant': 'Transplant',
    'Rare Diagnosis': 'Rare Disease',
    'Type 1 Diabetes': 'Type 1 Diabetes',
    'Multiple Sclerosis': 'Multiple Sclerosis',
    'Stroke': 'Stroke',
    'NICU': 'NICU',
    'Caregiver': 'Caregiver',
    'Foster / Adoptive': 'Foster/Adoptive',
    'Financial / Homeless': 'Financial Hardship',
    'Loss of Loved One': 'Bereavement',
    'Natural Disaster': 'Natural Disaster',
    'Emergency or Major Accident': 'Emergency',
    'Survivor': 'Survivor',
    'Other': 'Other',
}

def determine_category(grant):
    """Determine the primary category for a grant based on its types"""
    types = grant.get('types', [])
    if not types:
        return 'Services & Support'
    
    # Map each type and pick the most common category
    categories = []
    for t in types:
        cat = TYPE_TO_CATEGORY.get(t, 'Services & Support')
        categories.append(cat)
    
    # Return the first mapped category (priority order)
    priority = ['Medical Treatment', 'Equipment & Assistive Technology', 'Financial Assistance', 'Academic Scholarships', 'Services & Support']
    for p in priority:
        if p in categories:
            return p
    return categories[0] if categories else 'Services & Support'

def determine_country(grant):
    """Determine the primary country/location for a grant"""
    locations = grant.get('locations', [])
    if not locations:
        return 'USA'
    
    if 'International' in locations:
        return 'International'
    if 'Canada' in locations and 'USA' not in locations:
        return 'Canada'
    if 'USA' in locations:
        return 'USA'
    
    # If only state names, it's USA
    us_states = {'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 
                 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 
                 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 
                 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 
                 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 
                 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 
                 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 
                 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 
                 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 
                 'West Virginia', 'Wisconsin', 'Wyoming'}
    
    for loc in locations:
        if loc in us_states:
            return 'USA'
    
    return locations[0] if locations else 'USA'

def clean_description(desc):
    """Clean up description text"""
    if not desc:
        return ''
    # Remove excessive whitespace
    desc = re.sub(r'\s+', ' ', desc).strip()
    # Truncate very long descriptions
    if len(desc) > 500:
        desc = desc[:497] + '...'
    return desc

def determine_eligibility(grant):
    """Create a readable eligibility string"""
    parts = []
    
    if grant.get('minAge') is not None or grant.get('maxAge') is not None:
        min_a = grant.get('minAge', 0)
        max_a = grant.get('maxAge')
        if max_a:
            parts.append(f"Ages {min_a}-{max_a}")
        elif min_a > 0:
            parts.append(f"Ages {min_a}+")
    
    situations = grant.get('situations', [])
    if situations:
        mapped = [SITUATION_LABELS.get(s, s) for s in situations[:3]]
        parts.append(', '.join(mapped))
    
    locations = grant.get('locations', [])
    if locations and len(locations) <= 3:
        parts.append('Location: ' + ', '.join(locations))
    
    return '; '.join(parts) if parts else 'Open to eligible applicants'

# Process all grants
processed = []
seen_names = set()

for g in raw_grants:
    name = g.get('name', '').strip()
    if not name or name in seen_names:
        continue
    seen_names.add(name)
    
    category = determine_category(g)
    country = determine_country(g)
    
    processed_grant = {
        'id': len(processed) + 1,
        'name': name,
        'organization': g.get('organization', ''),
        'category': category,
        'country': country,
        'locations': g.get('locations', []),
        'types': g.get('types', []),
        'situations': g.get('situations', []),
        'description': clean_description(g.get('description', '') or g.get('awardDescription', '')),
        'awardDescription': clean_description(g.get('awardDescription', '')),
        'eligibility': determine_eligibility(g),
        'applicationUrl': g.get('applicationUrl', ''),
        'contactEmail': g.get('contactEmail', ''),
        'sourceUrl': f"https://grants.supportnow.org/opportunities/{g.get('slug', '')}",
        'lastUpdated': g.get('lastUpdated', ''),
        'minAge': g.get('minAge'),
        'maxAge': g.get('maxAge'),
    }
    
    processed.append(processed_grant)

# Sort by category then name
processed.sort(key=lambda x: (x['category'], x['name']))

# Re-assign IDs after sorting
for i, g in enumerate(processed):
    g['id'] = i + 1

# Save processed data
with open('/home/ubuntu/grantkit/processed_grants.json', 'w') as f:
    json.dump(processed, f, indent=2, ensure_ascii=False)

# Print stats
print(f"Total processed grants: {len(processed)}")
cats = {}
for g in processed:
    cats[g['category']] = cats.get(g['category'], 0) + 1
print(f"\nBy category:")
for cat, count in sorted(cats.items()):
    print(f"  {cat}: {count}")

countries = {}
for g in processed:
    countries[g['country']] = countries.get(g['country'], 0) + 1
print(f"\nBy country:")
for c, count in sorted(countries.items(), key=lambda x: -x[1]):
    print(f"  {c}: {count}")
