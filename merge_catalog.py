import json

# Load data
with open('/home/ubuntu/grantkit/client/src/data/resources.json') as f:
    resources = json.load(f)
with open('/home/ubuntu/grantkit/client/src/data/grants.json') as f:
    grants = json.load(f)
with open('/home/ubuntu/grantkit/remove_ids.json') as f:
    remove_ids = set(json.load(f))

# Load translations
with open('/home/ubuntu/grantkit/client/src/data/resourceTranslations.json') as f:
    res_translations = json.load(f)
with open('/home/ubuntu/grantkit/client/src/data/grantTranslations.json') as f:
    grant_translations = json.load(f)

# Clean resources - remove flagged entries
cleaned_resources = [r for r in resources if r['id'] not in remove_ids]
print(f"Resources: {len(resources)} -> {len(cleaned_resources)} (removed {len(resources) - len(cleaned_resources)})")

# Define unified category mapping
# Map grant categories to unified categories
grant_cat_map = {
    'medical': 'medical_treatment',
    'equipment': 'assistive_technology',
    'financial': 'financial_assistance',
    'services': 'social_services',
    'scholarships': 'scholarships'
}

# Map resource categories to unified categories
res_cat_map = {
    'medical': 'medical_treatment',
    'duke_services': 'medical_treatment',
    'financial': 'financial_assistance',
    'assistive_tech': 'assistive_technology',
    'scholarships': 'scholarships',
    'housing': 'housing',
    'travel': 'travel_transport',
    'international': 'international',
    'social_services': 'social_services',
    'other': 'other'
}

# Build unified catalog
catalog = []
catalog_translations = {}

# Add grants
for g in grants:
    entry = {
        'id': g['id'],  # keep original id like "grant_001"
        'name': g['name'],
        'organization': g.get('organization', ''),
        'description': g.get('description', ''),
        'category': grant_cat_map.get(g.get('category', ''), 'other'),
        'type': 'grant',  # new field to distinguish
        'country': g.get('country', ''),
        'eligibility': g.get('eligibility', ''),
        'website': g.get('website', ''),
        'phone': '',
        'email': '',
        'amount': g.get('amount', ''),
        'status': g.get('status', 'Open')
    }
    catalog.append(entry)
    
    # Copy translations
    if g['id'] in grant_translations:
        catalog_translations[g['id']] = grant_translations[g['id']]

# Add cleaned resources
for r in cleaned_resources:
    entry = {
        'id': r['id'],  # keep original id like "res_001"
        'name': r['name'],
        'organization': r.get('organization', r.get('name', '')),
        'description': r.get('description', ''),
        'category': res_cat_map.get(r.get('category', ''), 'other'),
        'type': 'resource',  # new field to distinguish
        'country': r.get('country', 'US'),
        'eligibility': r.get('eligibility', ''),
        'website': r.get('website', ''),
        'phone': r.get('phone', ''),
        'email': r.get('email', ''),
        'amount': '',
        'status': 'Active'
    }
    catalog.append(entry)
    
    # Copy translations
    if r['id'] in res_translations:
        catalog_translations[r['id']] = res_translations[r['id']]

# Sort by category, then by name
category_order = [
    'medical_treatment', 'financial_assistance', 'assistive_technology',
    'social_services', 'scholarships', 'housing', 'travel_transport',
    'international', 'other'
]
def sort_key(item):
    cat_idx = category_order.index(item['category']) if item['category'] in category_order else 99
    return (cat_idx, item['name'].lower())

catalog.sort(key=sort_key)

# Re-number with unified IDs
for i, entry in enumerate(catalog):
    old_id = entry['id']
    new_id = f"item_{i+1:04d}"
    # Update translations key
    if old_id in catalog_translations:
        catalog_translations[new_id] = catalog_translations.pop(old_id)
    entry['id'] = new_id

print(f"\nUnified catalog: {len(catalog)} entries")
print(f"  From grants: {sum(1 for c in catalog if c['type'] == 'grant')}")
print(f"  From resources: {sum(1 for c in catalog if c['type'] == 'resource')}")

# Category breakdown
cats = {}
for c in catalog:
    cats[c['category']] = cats.get(c['category'], 0) + 1
print("\nCategory breakdown:")
for cat in category_order:
    if cat in cats:
        print(f"  {cat}: {cats[cat]}")

# Country breakdown
countries = {}
for c in catalog:
    countries[c['country']] = countries.get(c['country'], 0) + 1
print("\nCountry breakdown:")
for co, n in sorted(countries.items(), key=lambda x: -x[1]):
    print(f"  {co}: {n}")

# Save
with open('/home/ubuntu/grantkit/client/src/data/catalog.json', 'w') as f:
    json.dump(catalog, f, ensure_ascii=False, indent=2)

with open('/home/ubuntu/grantkit/client/src/data/catalogTranslations.json', 'w') as f:
    json.dump(catalog_translations, f, ensure_ascii=False)

print(f"\nTranslations: {len(catalog_translations)} entries")
print("Files saved: catalog.json, catalogTranslations.json")
