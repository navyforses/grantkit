# Location Data Audit Report

**Generated:** 2026-04-20T00:53:09.225Z
**Total grants audited:** 643

## Summary

| Verdict | Count | % | Action Needed |
|---------|-------|---|---------------|
| ✅ Verified | 518 | 80.6% | None — data is accurate |
| 🔄 Needs update | 10 | 1.6% | Update lat/lng + address with Google's version |
| 🔍 Not found by name | 0 | 0.0% | Manual review — org name may be wrong/incomplete |
| ❓ Ambiguous | 98 | 15.2% | Manual review — multiple possible matches |
| 📭 Missing data | 17 | 2.6% | No stored data AND Google can't find — likely delete |
| ⚠️ Errors | 0 | 0.0% | Retry — API errors during audit |

**Total:** 643 (should equal 643)

## Organizations not found by name (0)

These grants reference an organization that Google Maps cannot locate via
any query strategy. Likely causes: typo in name, org renamed, defunct,
or never was a real grant-giver.

| Grant ID | Organization | Stored Address |
|----------|--------------|----------------|
_(none)_


## Missing data entirely (17)

No stored address, no coordinates, and Google cannot locate. Strong
candidates for deletion or manual enrichment.

| Grant ID | Organization |
|----------|--------------|
| item_0029 | Autism Spectrum Disorder Foundation |
| item_0097 | Enchanted Peach Children's Foundation |
| item_0146 | Joshua Harr Shane Foundation |
| item_0180 | Move for Jenn Foundation |
| item_0196 | Enchanted Peach Children's Foundation |
| item_0251 | The Kyle Pease Foundation |
| item_0314 | Autistic People of Color Fund |
| item_0340 | Surfgimp Foundation |
| item_0391 | THE GOHAWKEYE FOUNDATION |
| item_0393 | Laughing At My Nightmare, Inc. |
| item_0421 | Laughing At My Nightmare, Inc. |
| item_0434 | THE GOHAWKEYE FOUNDATION |
| item_0446 | A Moment of Magic |
| item_0479 | PHARM Dog |
| item_0587 | Bert's Big Adventure |
| item_0626 | Special Wants |
| idexlyon-scholarships | (no organization) |


## Recommendations

1. **10 grants can be auto-updated** — they exist in Google's
   database; their stored address/coords are stale or absent.
   Phase 8.5.A2 will update them with Google's verified coordinates.

2. **0 grants not found by name** — either:
   (a) Organization name needs correction (Phase 8.5.A2 AI enhancement step)
   (b) Organization is defunct — delete

3. **17 grants missing all location data** — strong deletion
   candidates. Confirm with user before Phase 8.5.A2.

4. **98 ambiguous grants** — need human review. Phase 8.5.A2
   will provide an admin queue for these.

5. **0 errors** — rerun the audit for these specific grants.

## Next Steps

Review this report, then proceed to Phase 8.5.A2 (Location Fix + Cleanup).

**Decision gate before Phase 8.5.A2:**
- Are the "verified" numbers acceptable?
- For "not_found_by_name" — AI enhancement attempt first, or direct delete?
- For "missing_data" — confirm deletion is acceptable?
