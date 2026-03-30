import json

with open("/home/ubuntu/grantkit/extracted_resources.json", "r", encoding="utf-8") as f:
    resources = json.load(f)

# Consolidate categories for the website
FINAL_CATEGORIES = {
    "Medical & Treatment": "medical",
    "Financial Assistance": "financial",
    "Housing & Accommodation": "housing",
    "Duke University Services": "duke_services",
    "Assistive Technology & Communication": "assistive_tech",
    "Scholarships & Education": "scholarships",
    "Travel & Transportation": "travel",
    "International Foundations": "international",
    "Social Services & Support": "social_services",
    "Other Services": "other",
    "Legal & Immigration": "legal"
}

final_resources = []
for r in resources:
    cat_key = FINAL_CATEGORIES.get(r["category"], "other")
    
    # Build a clean description
    desc = r["description"]
    if not desc or len(desc) < 10:
        desc = r["notes"] if r["notes"] else r["eligibility"]
    
    # Clean up description - remove excessive pipes and formatting
    desc = desc.replace(" | ", ". ").replace("|", ". ")
    if len(desc) > 500:
        desc = desc[:497] + "..."
    
    # Build contact info
    contact = {}
    if r["website"]:
        web = r["website"]
        if not web.startswith("http"):
            web = "https://" + web
        contact["website"] = web
    if r["email"]:
        contact["email"] = r["email"]
    if r["phone"]:
        contact["phone"] = r["phone"]
    if r["location"]:
        contact["location"] = r["location"]
    
    final_resources.append({
        "id": r["id"],
        "name": r["organization"],
        "category": cat_key,
        "description": desc,
        "eligibility": r["eligibility"] if r["eligibility"] != desc else "",
        "contact": contact,
        "source": r["source"]
    })

# Sort by category
category_order = ["medical", "financial", "housing", "duke_services", "assistive_tech", 
                  "scholarships", "travel", "international", "social_services", "other", "legal"]
final_resources.sort(key=lambda x: category_order.index(x["category"]) if x["category"] in category_order else 99)

# Re-assign IDs
for i, r in enumerate(final_resources):
    r["id"] = f"res_{i+1:03d}"

print(f"Total resources: {len(final_resources)}")
print(f"\nCategories:")
cats = {}
for r in final_resources:
    cats[r["category"]] = cats.get(r["category"], 0) + 1
for c, count in sorted(cats.items(), key=lambda x: -x[1]):
    print(f"  {c}: {count}")

# Save for the website
with open("/home/ubuntu/grantkit/client/src/data/resources.json", "w", encoding="utf-8") as f:
    json.dump(final_resources, f, ensure_ascii=False, indent=2)

print(f"\nSaved to client/src/data/resources.json")

# Also save for translation
with open("/home/ubuntu/grantkit/resources_for_translation.json", "w", encoding="utf-8") as f:
    json.dump(final_resources, f, ensure_ascii=False, indent=2)
