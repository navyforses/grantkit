# Phase 3b — Commit checklist (Windows PowerShell)

Sandbox-იდან git commit შეზღუდვა — OneDrive truncation-ის გამო უნდა
გაუშვა Windows PowerShell-იდან repo root-ში.

## 1. Branch verify

```powershell
cd "$env:USERPROFILE\OneDrive\სამუშაო დაფა\გრანდკიტი\grantkit-main"
git status
git branch --show-current
# უნდა იყოს: data/organizations-export-2026-04-20
```

## 2. Files to commit

```powershell
git add data/organizations-2026-04-20.xlsx `
        data/organizations-2026-04-20.bak.xlsx `
        data/orgs-phase3b.json `
        data/orgs-phase3b.checkpoint.json `
        scripts/enrich-branches-places.py `
        scripts/merge-branches-to-excel.py `
        .grantkit-redesign/PHASE-6-IMPORT-PROMPT.md `
        .grantkit-redesign/PHASE-3B-COMMIT.md

git status    # დადასტურება
```

## 3. Commit + push

```powershell
git commit -m "feat(data): Phase 3b — enrich org branches via Google Places API

- scripts/enrich-branches-places.py: Text Search query for 538 orgs
  (fuzzy name match, country biasing, physical-place filtering)
- scripts/merge-branches-to-excel.py: merge Places results into xlsx
- data/orgs-phase3b.json: 538 records, 335 HQ match (62.3%), 334 branches
- data/organizations-2026-04-20.xlsx: Branches sheet rebuilt
  (872 rows = 538 HQ + 334 real branches, 90.6% geocoded)
- .grantkit-redesign/PHASE-6-IMPORT-PROMPT.md: Claude Code prompt
  for DB import + map UI (next phase)
"

git push origin data/organizations-export-2026-04-20
```

## 4. (Optional) API key rotation

OPS.md-ის მიხედვით server key უნდა როტაცია-გაუკეთო bulk operator
session-ის შემდეგ:

https://console.cloud.google.com/apis/credentials
→ `grantkit-server-geocoding-v2` → **Regenerate key**

ძველი key უკვე შენი chat history-ში გაცნდა, ასე რომ rotation რეკომენდებულია.

## 5. Final Phase 3b stats

| მეტრიკა | მნიშვნელობა |
|---------|-------------|
| Organizations | 538 |
| HQ rows | 538 (440 DB + 16 Places + 82 not found) |
| Branch rows | 334 (Google Places) |
| Total Branches sheet rows | 872 |
| Rows with coordinates | 790 (90.6%) |
| Organizations with lat/lng | 456/538 (84.8%) |
| HQ match rate | 335/538 (62.3%) |
| Formula errors | 0 |
| Top multi-location orgs | FareShare, Community Connections, RMH WakeMed (9 each) |
