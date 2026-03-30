import json, re

with open('/home/ubuntu/grantkit/client/src/data/resources.json') as f:
    resources = json.load(f)

remove_ids = set()

for r in resources:
    rid = r['id']
    name = r.get('name', '').strip()
    desc = r.get('description', '').strip()
    website = r.get('website', '')
    phone = r.get('phone', '')
    email = r.get('email', '')
    
    # 1. Pure financial calculations / numeric entries
    if re.match(r'^[\\d\\$,\\.\\-\\+\\s\\*%]+$', name) and len(name) < 30:
        remove_ids.add(rid)
        continue
    
    # 2. Personal situation notes (Aleksandra-related)
    personal_kw = ['\u10d0\u10da\u10d4\u10e5\u10e1\u10d0\u10dc\u10d3\u10e0\u10d0', 'aleksandra', 'Aleksandra']
    if any(kw.lower() in (name + desc).lower() for kw in personal_kw):
        remove_ids.add(rid)
        continue
    
    # 3. Individual patient case studies (people's names with flags, not organizations)
    patient_names = ['Harris Longbottom', 'Maia Friedlander', 'Jay Shetty', 'Kira Crawford',
                     'Armaan \U0001f1e8\U0001f1e6', 'Declan Rutkowski', 'Noah Gore', 'Grace Rosewood', 
                     'Isaiah Bingham', 'Isabella Barney', 'Ella Schafluetzel', 'Isla \U0001f1ec\U0001f1e7',
                     'Jack Leahy', '\u10d8\u10d0\u10de\u10dd\u10dc\u10e3\u10e0\u10d8 \u10dd\u10ef\u10d0\u10ee\u10d8', 
                     'Jazmynn Allen', '\u10d0\u10e8\u10e8 \u10dd\u10ef\u10d0\u10ee\u10d4\u10d1\u10d8',
                     '\u10d8\u10d0\u10de\u10dd\u10dc\u10d8\u10d0 \U0001f1ef\U0001f1f5', 
                     'Kai \U0001f1fa\U0001f1f8', 'Everett Staruk', 'Nasir Holman',
                     'Len Taing', 'Carson Smith', 'Patrick Twins', 'Sammy \U0001f1ec\U0001f1e7',
                     'Suzie \U0001f1fa\U0001f1f8', 'Avonlea Rose', 'Ayla \U0001f1fa\U0001f1f8', 
                     'Audrey \U0001f1fa\U0001f1f8', 'Mathis']
    if any(pn in name for pn in patient_names):
        remove_ids.add(rid)
        continue
    
    # 4. Status/tracking notes - not organizations
    status_kw = ['EAP \u10e1\u10e2\u10d0\u10e2\u10e3\u10e1\u10d8', 
                 '\u10d0\u10e5\u10e2\u10d8\u10e3\u10e0\u10d8 \u10e1\u10d0\u10d4\u10e0\u10d7\u10d0\u10e8',
                 '\u10d3\u10dd\u10d9\u10e3\u10db\u10d4\u10dc\u10e2. \u10e8\u10d4\u10db\u10d7\u10ee\u10d5\u10d4\u10d5\u10d0',
                 '\u10d9\u10da\u10d8\u10dc. \u10e2\u10e0\u10d0\u10d8\u10da\u10d8', 
                 '\u10d1\u10d0\u10dc\u10d9\u10d4\u10d1\u10d8 \u10d0\u10e5\u10e2\u10d8\u10e3\u10e0\u10d0\u10d3',
                 '\u2705 \u10d3\u10d0\u10d3\u10d0\u10e1\u10e2\u10e3\u10e0\u10d4\u10d1\u10e3\u10da\u10d8',
                 '\u10e1\u10d0\u10e5\u10d0\u10e0\u10d7\u10d5\u10d4\u10da\u10dd\u10e8\u10d8 \u10d9\u10d4\u10e0\u10eb\u10dd CB \u10d1\u10d0\u10dc\u10d9\u10d4\u10d1\u10d8',
                 '7+ \u10dd\u10e0\u10d2\u10d0\u10dc\u10d8\u10d6\u10d0\u10ea\u10d8\u10d0 \u10e3\u10d6\u10e0\u10e3\u10dc\u10d5\u10d4\u10da\u10e7\u10dd\u10e4\u10e1']
    if any(kw in name for kw in status_kw):
        remove_ids.add(rid)
        continue
    
    # 5. Closed/defunct organizations
    if '\u274c' in name or '\u10d3\u10d0\u10d8\u10ee\u10e3\u10e0\u10d0' in name or '\u10d3\u10d0\u10d8\u10ee\u10e3\u10e0\u10d0' in desc:
        remove_ids.add(rid)
        continue
    
    # 6. Empty entries
    if len(name) < 3 and not desc:
        remove_ids.add(rid)
        continue
    
    # 7. Long sentence entries that are notes, not org names (no contact info)
    if len(name) > 80 and not website and not phone and not email:
        remove_ids.add(rid)
        continue

print(f"Total to remove: {len(remove_ids)}")
print(f"Total to keep: {len(resources) - len(remove_ids)}")

# Show what we're removing
for rid in sorted(remove_ids, key=lambda x: int(x.split('_')[1])):
    r = next(x for x in resources if x['id'] == rid)
    print(f"  REMOVE {rid}: '{r['name'][:70]}'")

# Category breakdown of kept
kept = [r for r in resources if r['id'] not in remove_ids]
cats = {}
for r in kept:
    c = r.get('category', 'unknown')
    cats[c] = cats.get(c, 0) + 1
print("\nKept category breakdown:")
for c, n in sorted(cats.items(), key=lambda x: -x[1]):
    print(f"  {c}: {n}")

# Save the remove list
with open('/home/ubuntu/grantkit/remove_ids.json', 'w') as f:
    json.dump(list(remove_ids), f)
