import json
import re

# Load the parallel translation results
with open('/home/ubuntu/translate_grant_batches.json') as f:
    data = json.load(f)

results = data['results']
all_translations = {}  # id -> {fr_name, fr_description, ...}

success_count = 0
fail_count = 0

for i, result in enumerate(results):
    tj_str = result['output']['translated_json']
    
    # Clean up potential markdown code blocks
    tj_str = tj_str.strip()
    if tj_str.startswith('```'):
        tj_str = re.sub(r'^```[a-z]*\n?', '', tj_str)
        tj_str = re.sub(r'\n?```$', '', tj_str)
        tj_str = tj_str.strip()
    
    try:
        batch_translations = json.loads(tj_str)
        for grant_trans in batch_translations:
            gid = grant_trans['id']
            all_translations[gid] = grant_trans
            success_count += 1
    except json.JSONDecodeError as e:
        print(f"ERROR parsing batch {i}: {e}")
        print(f"  First 200 chars: {tj_str[:200]}")
        fail_count += 1

print(f"Successfully parsed: {success_count} grants")
print(f"Failed batches: {fail_count}")

# Now create the final translation file
# Structure: { "grants": { "1": { "fr": { "name": ..., "description": ..., "eligibility": ... }, "es": {...}, "ru": {...}, "ka": {...} } } }
final_translations = {}

for gid, trans in all_translations.items():
    gid_str = str(gid)
    final_translations[gid_str] = {
        "fr": {
            "name": trans.get("fr_name", ""),
            "description": trans.get("fr_description", ""),
            "eligibility": trans.get("fr_eligibility", "")
        },
        "es": {
            "name": trans.get("es_name", ""),
            "description": trans.get("es_description", ""),
            "eligibility": trans.get("es_eligibility", "")
        },
        "ru": {
            "name": trans.get("ru_name", ""),
            "description": trans.get("ru_description", ""),
            "eligibility": trans.get("ru_eligibility", "")
        },
        "ka": {
            "name": trans.get("ka_name", ""),
            "description": trans.get("ka_description", ""),
            "eligibility": trans.get("ka_eligibility", "")
        }
    }

# Save to the client data directory
output_path = '/home/ubuntu/grantkit/client/src/data/grantContentTranslations.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(final_translations, f, ensure_ascii=False, indent=2)

print(f"\nSaved {len(final_translations)} grant translations to {output_path}")

# Verify a sample
sample_id = "1"
if sample_id in final_translations:
    print(f"\nSample (grant {sample_id}):")
    for lang in ['fr', 'es', 'ru', 'ka']:
        name = final_translations[sample_id][lang]['name']
        desc_preview = final_translations[sample_id][lang]['description'][:80]
        print(f"  {lang}: {name}")
        print(f"       {desc_preview}...")
