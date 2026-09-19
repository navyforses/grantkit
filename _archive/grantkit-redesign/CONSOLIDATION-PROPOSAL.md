# CONSOLIDATION-PROPOSAL.md — Phase E

> **Phase:** E (Org + Programs Consolidation Proposal)
> **Author:** Hana (diagnostic session 2026-04-23)
> **Status:** Proposal for user review → Tamar/Ezra execution
> **Prerequisites:** `DIAGNOSTIC-2026-04-23.md`, `DATA_MAP.md`, `FRONTEND_MAP.md`, `INFRASTRUCTURE_MAP.md`, `ORG-CENTRIC-MEMORY.md`

---

## 1. 🎯 Executive Summary

**პრობლემა:** GrantKit ამჟამად გრანტ-ცენტრული სტრუქტურაა. ძირითადი ცხრილი `grants` შეიცავს ველებს რომლებიც **არ ეკუთვნის** გრანტს (phone, email, hqAddress, mission), ხოლო `organizations` ცხრილში უკვე არსებობს ეს ველები 538 რიგისთვის. **99% დუბლიკაცია** არსებობს `catalog.*` და `organizations.*` tRPC namespace-ებს შორის.

**გადაწყვეტილება:** Single source of truth **`organizations`** ცხრილი (parent), ხოლო `grants` ხდება **"programs"** — ორგანიზაციის შვილი ცხრილი სუფთა FK-ბმით. კოდი იწმინდება 50%-ით, UI ემიგრანტ-ცენტრულ ფოკუსს აძლიერებს.

**ბოლო სცენარი:**
- 538 ორგანიზაცია → full profile (mission, branches, Google reviews, docs)
- 637 გრანტი → programs attached to organizations (ephemeral ephemeral, monitored)
- Catalog URL stays alive (backward-compat wrapper) → SEO preservation
- `catalog.*` namespace deprecated → deleted in final PR

---

## 2. 🗄️ Data Model — Before / After

### 2.1. ❌ Before (current)

```
┌──────────────────┐        ┌──────────────────────────┐
│   grants (637)   │        │  organizations (538)     │
├──────────────────┤        ├──────────────────────────┤
│ id               │        │ id, orgId                │
│ itemId           │        │ name, description        │
│ name             │        │ mission, website         │
│ organization ○──┤ ← string free-text, no FK         │
│ description      │        │ phone, email, hqAddress  │
│ country, state   │        │ latitude, longitude      │
│ city, address    │        │ googlePlaceId            │
│ phone*           │        │ googleRating             │
│ email*           │        │ branchesCount            │
│ website*         │        │ isActive                 │
│ latitude*        │        └──────────────────────────┘
│ longitude*       │                    │
│ category         │                    │
│ amount, deadline │                    ▼
│ eligibility      │        ┌──────────────────────────┐
│ fundingType      │        │ organization_branches    │
│ docsRequired     │        │  (790 rows)              │
│ isActive         │        ├──────────────────────────┤
└──────────────────┘        │ orgId (FK)               │
        │                   │ branchType (HQ/Branch)   │
        │                   │ country, state, city     │
        ▼                   │ address, phone, email    │
┌──────────────────┐        │ lat, lng, googlePlaceId  │
│ grant_translations│        └──────────────────────────┘
│  (~2500 rows)    │
│ grantItemId (FK) │        ┌──────────────────────────┐
│ language         │        │ organization_translations│
│ name, desc,      │        │  (0 rows) ⚠️ UNUSED     │
│ eligibility      │        └──────────────────────────┘
└──────────────────┘

* = DUPLICATE data (also in organizations/branches)
○ = string "organization" field — no FK, 102 orphans
```

### 2.2. ✅ After (proposed)

```
┌──────────────────────────┐
│  organizations (538)     │ ← primary entity
├──────────────────────────┤
│ id, orgId                │
│ name                     │
│ mission                  │  ◀── ENRICHED by Lila
│ description              │  ◀── ENRICHED by Lila (what they do)
│ activitiesSummary        │  ◀── NEW FIELD: short list of services
│ documentsRequired        │  ◀── NEW FIELD: moved from grants
│ country, state, city     │
│ hqAddress                │
│ website, phone, email    │
│ latitude, longitude      │
│ googlePlaceId            │
│ googleRating             │
│ googleReviewCount        │  ◀── backfilled by Noa
│ categories               │  ◀── aggregate from child programs
│ branchesCount            │
│ programsCount            │
│ isActive                 │
└───────┬──────────────────┘
        │
        ├────▶ ┌──────────────────────────┐
        │     │ programs (NEW name, 637) │ ← renamed from "grants"
        │     ├──────────────────────────┤
        │     │ id, programId (NEW)      │ ← "PRG-0001"
        │     │ orgId (FK, NOT NULL)     │ ◀── REAL FK, no more strings
        │     │ name                     │
        │     │ type (grant/resource)    │
        │     │ description              │
        │     │ category                 │
        │     │ amount                   │
        │     │ deadline                 │
        │     │ eligibility              │
        │     │ applicationProcess       │
        │     │ fundingType              │
        │     │ targetDiagnosis          │
        │     │ ageRange                 │
        │     │ geographicScope          │
        │     │ status                   │
        │     │ isActive                 │
        │     └──────────────────────────┘
        │
        ├────▶ ┌──────────────────────────┐
        │     │ organization_branches    │ ← unchanged
        │     │  (790 rows)              │
        │     └──────────────────────────┘
        │
        └────▶ ┌──────────────────────────┐
              │ organization_content     │ ← REPLACES org_translations
              │ (NEW, multilingual)      │
              ├──────────────────────────┤
              │ orgId (FK)               │
              │ language (5-lang)        │
              │ name, description        │
              │ mission, activities      │
              │ documentsRequired        │
              └──────────────────────────┘

┌──────────────────────────┐
│ program_translations     │ ← renamed from grant_translations
│  (~2500 rows)            │
├──────────────────────────┤
│ programItemId (FK)       │
│ language                 │
│ name, description        │
│ eligibility              │
└──────────────────────────┘

REMOVED:
  ✗ grants.organization (string — replaced with FK orgId)
  ✗ grants.phone, email, website, hqAddress (duplicate of orgs)
  ✗ grants.latitude, longitude, address (duplicate of branches)
  ✗ organization_translations (replaced by organization_content)

ADDED:
  + organizations.mission (was null for 400+ rows)
  + organizations.activitiesSummary
  + organizations.documentsRequired (moved from grants)
  + programs.orgId (NOT NULL FK)
  + organization_content (5-lang × 4 fields × 538 orgs)
```

---

## 3. 📐 Migration Sequence — 5 PR Plan

> **Tamar-ის Golden Rule:** ყოველი PR-ისთვის schema ცვლილება **ჯერ** migration SQL-ი Railway-ზე, **მერე** merge main-ში. PR #145 ისევ არ მოხდება.

### PR #1 — Add Organizations Columns + Nullable programs.orgId

**Scope:** non-breaking ADD-ონლი migration.

**SQL:**
```sql
-- organizations: new required fields
ALTER TABLE organizations
  ADD COLUMN missionStatement TEXT,               -- if not already via enrichment PR
  ADD COLUMN activitiesSummary TEXT,
  ADD COLUMN documentsRequired TEXT;

-- grants: add nullable FK (denormalized backfill, validated in PR#2)
ALTER TABLE grants
  ADD COLUMN orgId VARCHAR(16),
  ADD INDEX grants_org_idx (orgId);
```

**Code changes:** schema.ts ცვლილება, **zero consumer code**.

**Rollback:** `ALTER TABLE ... DROP COLUMN` (instant).

**Owner:** Tamar.

---

### PR #2 — Backfill grants.orgId from free-text organization string

**Scope:** data-only, no schema.

**Script:** `scripts/backfill-grants-orgid.ts`
- Fuzzy match `grants.organization` string → `organizations.name` (Levenshtein distance ≤ 3)
- For 4 duplicate org names — consolidate (Ezra-ს rule-ი)
- For 102 orphan grants:
  - Auto-create `organizations` row if grant has distinct website/phone
  - Else mark `grants.isActive = false` (orphans without host org = dead grants)
- Report CSV: `backfill-report-YYYY-MM-DD.csv` for manual review

**Expected result:** 102 orphans → ~70 auto-created orgs + ~32 deactivated.

**Verification:** `SELECT COUNT(*) FROM grants WHERE orgId IS NULL AND isActive = 1` must = 0.

**Rollback:** script-ი reversible-ია — backup grants ცხრილი ჯერ, backfill მერე.

**Owner:** Tamar + Ezra (manual review on fuzzy-match edge cases).

---

### PR #3 — Make grants.orgId NOT NULL + drop duplicate columns

**Scope:** breaking — requires PR#2 complete first.

**SQL:**
```sql
-- Enforce FK
ALTER TABLE grants
  MODIFY COLUMN orgId VARCHAR(16) NOT NULL;

-- Drop duplicates (data already in organizations/branches)
ALTER TABLE grants
  DROP COLUMN organization,         -- free-text, replaced by orgId
  DROP COLUMN phone,
  DROP COLUMN email,
  DROP COLUMN hqAddress,
  DROP COLUMN latitude,
  DROP COLUMN longitude,
  DROP COLUMN address;

-- Drop unused table
DROP TABLE organization_translations;
```

**Code changes:**
- `server/db.ts` — remove duplicate field handling
- `server/routers.ts` — `organizations.*` already the source; `catalog.*` endpoints **stay** temporarily (wrapper to programs table)
- `drizzle/schema.ts` — reflect drops

**558 coord duplicates automatically resolved.**

**Rollback:** `drizzle/*-rollback.sql` pre-prepared.

**Owner:** Tamar + Ilias (staging-first, then prod).

---

### PR #4 — Rename grants → programs (backward-compat view)

**Scope:** table rename + backward-compat SQL view.

**SQL:**
```sql
RENAME TABLE grants TO programs;
RENAME TABLE grant_translations TO program_translations;
ALTER TABLE program_translations
  CHANGE COLUMN grantItemId programItemId VARCHAR(64) NOT NULL;

-- Backward-compat: old code that still reads "grants" keeps working
CREATE VIEW grants AS SELECT * FROM programs;
```

**Code changes:**
- `drizzle/schema.ts` — `grants` → `programs` exports
- `server/routers.ts` — `catalog.*` namespace-ს (ჯერ არ deprecate) point to `programs` table via schema
- Catalog.tsx **FROZEN — არ შეეხო**. Backward-compat view უზრუნველყოფს რომ `catalog.count` ისევ მუშაობს

**Rollback:** rename back, drop view.

**Owner:** Tamar + Kwame.

---

### PR #5 — Deprecate `catalog.*` namespace + cleanup

**Scope:** code-only, no schema changes.

**Code changes:**
- `server/routers.ts` — delete 9 duplicate `catalog.*` endpoints
- Rewire live consumers:
  - `Home.tsx` lines 63, 67: `trpc.catalog.*` → `trpc.organizations.*`
  - `Dashboard.tsx` lines 53, 58: same
  - `EntityDetail.tsx` line 83: → `trpc.organizations.detail` with program fetch
  - `Catalog.tsx` line 508 (ONLY `catalog.count` remaining): → `trpc.organizations.count` **requires user exemption** (file is frozen)
- Drop backward-compat `grants` VIEW (created in PR#4)

**Test coverage:**
- Ilias writes Playwright smoke tests for: Home, Dashboard, EntityDetail, Catalog
- vitest endpoint tests for new `organizations.programs(orgId)` endpoint

**Rollback:** git revert + `organizations.*` endpoints already exist, so safe.

**Owner:** Kwame + Ilias.

---

## 4. 📱 UI Consolidation Plan

### 4.1. OrganizationDetail — new primary page (Kwame, Wave 2)

**Layout (mobile-first, migrant-focused):**

```
[Hero: Org name + logo + country flag]
[Quick facts row: category chips | branches count | rating stars]

[Section 1: რას აკეთებს?]                   ← mission + activitiesSummary
[Section 2: საკონტაქტო]                      ← phone, email, website (verified badge)
[Section 3: ფილიალები და რუკა]              ← 790 branches, clickable markers
   └─ [Interactive map with all branches]
[Section 4: საბუთები რომლებიც საჭიროა]       ← documentsRequired
[Section 5: ხელმისაწვდომი პროგრამები]        ← programs linked to this org
   └─ [cards: grant name, amount, deadline]
[Section 6: Google Reviews]                  ← rating + top 3 reviews
[Section 7: სოციალური ქსელები]                ← icons row
[Section 8: წყარო + ბოლო განახლება]           ← transparency footer
```

**Performance budget:**
- LCP < 2.0s
- CLS < 0.1
- Map lazy-loads (IntersectionObserver)

### 4.2. Catalog → Organizations list (rename)

- URL `/catalog` → `/organizations` (301 redirect for SEO)
- Filter bar: country, category, services, languages spoken
- Card shows: name, country, branches count, categories, Google rating
- **NOT:** individual grants in list (that's ambiguous UX for immigrants)
- Legacy `/grant/:itemId` routes → redirect to `/organization/:orgId?program=:itemId`

### 4.3. Home page

- Hero CTA: "მოძებნე ორგანიზაცია რომელიც დაგეხმარება"
- Featured orgs (top-rated, curated weekly by Lila)
- Search bar: smart search (already exists, points to `organizations.smartSearch`)

### 4.4. EntityDetail (backward-compat)

**Not delete**, but convert to wrapper:
```tsx
// EntityDetail.tsx (backward-compat for old grant URLs)
export default function EntityDetail({ params }) {
  const { data: program } = trpc.programs.byItemId.useQuery(params.itemId);
  if (!program) return <NotFound />;

  // Redirect to new URL
  useEffect(() => {
    navigate(`/organization/${program.orgId}?program=${params.itemId}`, { replace: true });
  }, [program]);

  return null;
}
```

---

## 5. 🗓️ Timeline — 3-Wave Rollout (7-10 working days)

### Wave 1 — Foundation (Days 1-3)

| Day | Ezra | Tamar |
|---|---|---|
| 1 | PRD draft + user flows | Schema diff-ი (PR#1 migration SQL) |
| 2 | Sitemap + URL structure | PR#1 merged + applied on Railway |
| 3 | Content model finalized | Backfill script drafted (PR#2 prep) |

**Deliverables:** `PRD.md`, `USER_FLOWS.md`, `drizzle/0017_add_org_columns.sql`, `scripts/backfill-grants-orgid.ts`.

### Wave 2 — Build (Days 4-7)

| Day | Noa | Kwame | Lila |
|---|---|---|---|
| 4 | Google Places client (server/placesClient.ts) | Scaffold OrganizationDetail.tsx | Enrichment script draft (missions) |
| 5 | Backfill place_id 538 orgs | Build hero + mission + contact sections | Translate 538 missions × 5 lang |
| 6 | Backfill reviews (~538 calls) | Build branches map + docs section | Activities summary enrichment |
| 7 | Map integration + marker clicks | Programs section + reviews section | QA content quality |

**Parallel:** Tamar executes PR#2 (backfill) → PR#3 (drop dupes) → PR#4 (rename).

**Deliverables:** `server/placesClient.ts`, `OrganizationDetail.tsx`, all migration PRs applied.

### Wave 3 — Ship (Days 8-10)

| Day | Ilias | Team |
|---|---|---|
| 8 | Pre-deploy smoke tests (Playwright) | All agents: bug bash |
| 9 | Staging deploy + QA | Fix blockers |
| 10 | Production rollout + monitoring | Post-deploy validation |

**Deliverables:** `DEPLOYMENT_PLAN.md`, `ROLLBACK_RUNBOOK.md`, prod deployed.

---

## 6. 🚨 Risk Register + Mitigations

| # | რისკი | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| 1 | Fuzzy match 102 orphans — false positives | Medium | Medium | Manual review of flagged rows before PR#3 | Ezra |
| 2 | Catalog.tsx frozen — PR#5-ში შეხება საჭიროა | High | Low | User exemption request before merge | Kwame |
| 3 | SEO loss from URL rename | Medium | High | 301 redirects + sitemap.xml update | Ilias |
| 4 | Google Places quota during backfill | Medium | Medium | Throttle to 10 req/sec + cache place_id | Noa |
| 5 | Translation cost overrun | Low | Low | Batch prompts, gemini-flash is ~$0.30/1M out | Lila |
| 6 | Railway migration downtime | Medium | High | Apply in off-peak + `/healthz` gate | Ilias |
| 7 | grant_translations rename breaking live queries | High | High | Backward-compat VIEW in PR#4 | Tamar |
| 8 | Mobile performance regression on OrganizationDetail | Medium | Medium | Lighthouse CI gate at 85+ | Kwame |
| 9 | Resend sender domain not verified in prod | High | High | Priority fix before notifications enabled | Ilias |
| 10 | Backup strategy untested for migration | Medium | Critical | Manual Railway backup before each PR | Tamar |

---

## 7. 💰 Cost Projection

| Component | Initial | Recurring |
|---|---|---|
| Google Places backfill (place_id + reviews × 538 orgs) | ~$9 | — |
| Google Places weekly refresh (538 × 0.25/week avg) | — | ~$1.30/week |
| Lila content enrichment (mission + activities × 538) | ~$15 LLM | — |
| Translation (4 ველი × 5 ენა × 538 rows = 10,760 calls) | ~$20 LLM | — |
| Resend (verified domain) — no cost difference, just re-verify | — | — |
| Railway MySQL — no change | — | — |
| Developer time | ~60 hours (6 personas × 10h avg) | — |
| **Total initial** | **~$44 + 60 dev-hours** | **~$5/month** |

---

## 8. ✅ Definition of Done

- [ ] `organizations` ცხრილი 538/538 სრული (mission + activities + docs ველები შევსებული)
- [ ] `programs` ცხრილი 637/637 ცოცხალი FK-ით `organizations`-ზე
- [ ] 0 orphan programs (`programs.orgId IS NULL` = 0)
- [ ] `catalog.*` namespace deleted ✅ (ან migrated to programs.*)
- [ ] `organization_translations` dropped ✅
- [ ] `grants` → `programs` rename with VIEW compat ✅
- [ ] 790 branches clickable on map → jump to coord
- [ ] Google ratings visible (where available)
- [ ] OrganizationDetail.tsx Lighthouse ≥ 85 mobile
- [ ] 5-language coverage: en/fr/es/ru/ka ყველა ორგ. ველზე
- [ ] 301 redirects live: `/catalog` → `/organizations`, `/grant/:itemId` → `/organization/:orgId?program=:itemId`
- [ ] Resend domain verified: `mail.grantkit.io`
- [ ] Pre-deploy hook დაემატა: `.github/workflows/pre-deploy-check.yml`
- [ ] Rollback runbook tested on staging

---

## 9. ⏸️ Open Questions — user-ისთვის

1. **Orphan orgs (63)** — 63 ორგანიზაციას არცერთი გრანტი არ აქვს. Phase 2-ში კვლავ გინდა ნახო წარმოდგენილი? (იქნებ სასარგებლო რესურსებია).
2. **SEO URL rename** — `/catalog` → `/organizations`. Google Search Console ხელახალი submit საჭიროა. დათანხმდი?
3. **`Catalog.tsx` frozen exemption** — PR#5-ში 1 ხაზი (`catalog.count` → `organizations.count`). ცალსახა ნებართვა?
4. **`programs` naming** — "programs" მოგწონს, თუ სხვა (activities, initiatives, resources)?
5. **Resend sender domain** — `mail.grantkit.io` DNS records საჭიროა. გაქვს წვდომა DNS-ზე?
6. **Newsletter daily notifications** — PR#5-ის შემდეგ subscription base ვე აღარ იქნება მხოლოდ grant-about. "ახალი ორგანიზაცია რეგიონში" notification-ები დაემატოს?
7. **Phase 1 legacy data** — 558 coord duplicates grants-branches-ში. PR#3-ის შემდეგ `grants.latitude` dropped. დატოვო თუ შენ ხელით გადააფარო რამდენიმე რიგი (manual audit).

---

## 10. 🔚 შემდეგი ნაბიჯი

1. ✅ ეს ფაილი (CONSOLIDATION-PROPOSAL.md) მომხმარებლის review-სთვის
2. მომხმარებლის პასუხები §9-ის ღია კითხვებზე
3. Ezra-ს PRD.md + USER_FLOWS.md (Wave 1 start)
4. Tamar-ის PR#1 (Add columns + nullable orgId)
5. `ORG-CENTRIC-MEMORY.md` §6 update — ამ ფაილის შექმნის ფაქტი

---

*შექმნილი 2026-04-23, Hana. Final Phase E deliverable. Consolidates: Phase A (DB inventory) + Phase B (tRPC map) + Phase C (Frontend map) + Phase D (Infrastructure map).*
