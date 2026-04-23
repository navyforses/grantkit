# GrantKit Phase 2 — Execution Plan (Org-Centric Redesign)

> **კრიტიკული წაკითხვა:** ყოველი აგენტი (ან ახალი ჩატი), ვინც Phase 2-ზე მუშაობს,
> ვალდებულია ეს ფაილი წაიკითხოს **მეორე** — პირველი `ORG-CENTRIC-MEMORY.md` არის.
> ამ ფაილი შეიცავს მომხმარებლის დადასტურებულ გადაწყვეტილებებს და ზუსტ PR-by-PR
> გეგმას. **არაფერი არ იცვლება** სანამ მომხმარებელი ახალ დადასტურებას არ იძლევა.

**შექმნილი:** 2026-04-23
**ავტორიზებული:** შაკო (მომხმარებელი)
**სტატუსი:** 🟢 მომხმარებელი დაამტკიცა სამივე კრიტიკული რეკომენდაცია. Wave 1 გასაშვებად მზადაა.

---

## 1. მომხმარებლის დადასტურებული გადაწყვეტილებები (7/7)

ეს გადაწყვეტილებები **არ იცვლება** ახალი მოლაპარაკების გარეშე. ყოველი PR ამ
ფრეიმვორკში უნდა ჯდებოდეს.

| # | კითხვა | მომხმარებლის პასუხი | ვარიანტი | ეფექტი |
|---|---|---|---|---|
| Q1 | 63 orphan ორგანიზაციას რა ექნება? | შენარჩუნდეს, იმავე 8 ველით (name, contact, description, address, map, rating, branches, docs) | A | ყველა 538 ორგანიზაცია enrichment-ში შედის (Wave 2 / Lila) |
| Q2 | URL-ები გადაერქვას? | **კი**, 301 redirect-ით | **B** | `/catalog` → `/organizations`, `/grant/:id` → `/organization/:id` |
| Q3 | Catalog.tsx frozen exemption | **კი**, ნებართვა გაცემულია | — | ხაზი 508: `catalog.count` → `organizations.count` PR#5-ში |
| Q4 | "grants" → "programs" გადარქმევა | **კი** | — | PR#4-ში ALTER TABLE RENAME |
| Q5 | Resend DNS ვინ დაადენს? | **მომხმარებელი** ხელით, ჩვენი ინსტრუქციით | **A** | Task #45 — ინსტრუქციის მომზადება |
| Q6 | Newsletter scope ცვლილება | **კი**, გადავიდეს org-centric-ზე | — | Wave 2/3-ში გათვალისწინდეს |
| Q7 | 558 coord duplicate cleanup | **ერთად, PR#3-ში** | **A** | PR#3-ში drop columns grants.latitude/longitude/address |

---

## 2. არქიტექტურული ცვლილება — Before / After

### ⬇️ Before (ეხლა)
```
grants (637 rows)
├─ organization: "Caritas France"  ← free-text, არა FK
├─ phone, email, hqAddress         ← დუბლიკატი organizations-ში
├─ latitude, longitude, address    ← დუბლიკატი branches-ში (558x)
└─ ...

organizations (538 rows) ──── organization_branches (790 rows)
                        │          ├─ latitude, longitude
                        │          └─ source: "google_places"
                        │
                        ╰─────── organization_translations (0 rows) ← DEAD
```

### ⬆️ After (Wave 1 დასრულების შემდეგ)
```
organizations (538 rows) ── PK
    ▲                    ╲
    │ FK (NOT NULL)        ╲
    │                        organization_branches (790 rows)
    │                        ├─ latitude, longitude (ერთადერთი წყარო)
    │                        └─ source: "google_places"
    │
programs (637 rows) ← RENAMED from grants
├─ orgId VARCHAR(16) NOT NULL ← ახალი FK
├─ name, description, category, country
├─ [phone, email, hqAddress წაშლილია]
├─ [latitude, longitude, address წაშლილია]
└─ ...

[organization_translations ცხრილი DROPPED]
[catalog.* tRPC namespace DELETED]
```

---

## 3. PR-by-PR მიგრაციის გეგმა

> **CLAUDE.md Golden Rule:** Schema ცვლილება Railway-ზე JER გაშვდეს, მერე merge-ი. PR #145-ის კატასტროფა არ განმეორდეს.

### PR#1 — Add nullable `orgId` column ✅ ფაილები მზადაა (2026-04-23)
**ოწნერი:** Tamar
**მიგრაციის ფაილი:** `drizzle/0017_add_orgid_to_grants.sql`
**Apply სკრიპტი:** `scripts/apply-migration-0017.mjs`
**Schema ცვლილება:** `drizzle/schema.ts` (ხაზი 99: `orgId: varchar("orgId", { length: 16 })` + ხაზი 143: `grants_orgid_idx`)
**ცვლილებები:**
```sql
ALTER TABLE `grants` ADD COLUMN `orgId` varchar(16) NULL;
CREATE INDEX `grants_orgid_idx` ON `grants` (`orgId`);
ALTER TABLE `grants`
  ADD CONSTRAINT `fk_grants_org`
  FOREIGN KEY (`orgId`) REFERENCES `organizations`(`orgId`)
  ON UPDATE CASCADE ON DELETE SET NULL;
```
**⚠️ კრიტიკული შესწორება თავდაპირველი გეგმიდან:** FK უნდა რეფერენს იყოს `organizations.orgId` (VARCHAR slug "ORG-0001"), **არა** `organizations.id` (autoincrement INT). მთელი აპლიკაცია VARCHAR slug-ს იყენებს (`organization_branches.orgId`, ყველა tRPC endpoint) — INT-ზე რეფერენსი data model-ს გატეხდა.
**რისკი:** მინიმალური. NULL-ს ყველაფერი იღებს. არცერთი endpoint-ი არ ტყდება.
**გაგზავნის რიგი:** Railway-ზე apply → verify (`SELECT COUNT(*), SUM(CASE WHEN orgId IS NOT NULL THEN 1 ELSE 0 END) FROM grants`) → merge.
**Verification expected:** total=637, linked=0 (backfill PR#2-ში).
**Rollback:** `ALTER TABLE grants DROP FOREIGN KEY fk_grants_org, DROP COLUMN orgId;`

### PR#2 — Backfill `orgId` via fuzzy match
**ოწნერი:** Tamar
**ცვლილებები:**
- `scripts/backfill-orgid.mjs` ქმნის mapping: `grants.organization` (free-text) → `organizations.id`
- Algorithm: normalize (lowercase, trim, remove special chars) → exact match → Levenshtein distance ≤ 3
- Target: **≥ 85% match rate** (535+/637). 102 orphan-ი report-ში დარჩება.
- Output: `orphan-grants-report.json` (Ezra-სთან დასამუშავებლად)
**რისკი:** არცერთი schema ცვლილება. მონაცემთა update მხოლოდ.
**Rollback:** `UPDATE grants SET orgId = NULL;`

### PR#3 — NOT NULL + drop dup columns + drop org_translations
**ოწნერი:** Tamar
**ცვლილებები:**
```sql
-- Step 1: orphan-ების ორგანიზაციად გადაქცევა (Q1 resolved)
-- 102 orphan grant → 102 ახალი organizations row (auto-generated id ORG-9001..ORG-9102)
-- scripts/convert-orphan-grants-to-orgs.mjs

-- Step 2: NOT NULL
ALTER TABLE grants MODIFY COLUMN orgId VARCHAR(16) NOT NULL;

-- Step 3: Drop duplicate columns
ALTER TABLE grants
  DROP COLUMN organization,
  DROP COLUMN phone,
  DROP COLUMN email,
  DROP COLUMN hqAddress,
  DROP COLUMN latitude,    -- Q7: 558 duplicates resolved
  DROP COLUMN longitude,
  DROP COLUMN address;

-- Step 4: Drop dead table
DROP TABLE organization_translations;
```
**რისკი:** 🟠 საშუალო. ყველაზე აგრესიული migration. Rollback კრიტიკული.
**Pre-merge checklist:**
- [ ] Staging DB-ზე ტესტი გაიარა
- [ ] Drizzle schema განახლდა (lat/lng/address removed from grants)
- [ ] Tests: ყველა tRPC endpoint-ი pass
- [ ] Rollback script მომზადებული
**Rollback:** `ALTER TABLE grants ADD COLUMN ...` + backup-დან restore (RAILWAY backup Wave 1 დასაწყისში გაკეთდება)

### PR#4 — RENAME grants → programs
**ოწნერი:** Tamar
**ცვლილებები:**
```sql
ALTER TABLE grants RENAME TO programs;
ALTER TABLE grant_translations RENAME TO program_translations;
RENAME COLUMN program_translations.grantId TO programId;

-- Backward-compat VIEW (გარდამავალი პერიოდი — PR#5-ში წაიშლება)
CREATE VIEW grants AS SELECT * FROM programs;
```
**Drizzle schema update:**
```ts
export const programs = mysqlTable("programs", { ... });
export const programTranslations = mysqlTable("program_translations", { ... });
```
**რისკი:** 🟡 საშუალოდან დაბალი. VIEW-ი უზრუნველყოფს backward compat. tRPC endpoint-ები ისევ მუშაობენ.
**Rollback:** `ALTER TABLE programs RENAME TO grants; DROP VIEW grants;`

### PR#5 — Delete `catalog.*` namespace + rewire consumers
**ოწნერი:** Tamar + Kwame (collaboration)
**ცვლილებები:**
- `server/routers.ts`: `catalog.*` (9 endpoint) წაიშლება
- Home.tsx, Dashboard.tsx, EntityDetail.tsx: `catalog.preview` → `organizations.preview` და ა.შ.
- Catalog.tsx ხაზი 508 (Q3 resolved): `catalog.count` → `organizations.count`
- `DROP VIEW grants;` (PR#4-ის temporary VIEW)
**რისკი:** 🟢 დაბალი. frontend-ის 4-5 ფაილის refactor.

---

## 4. დროის შეფასება (3 Wave × ~3 დღე = 7-10 დღე)

### Wave 1 (დღე 1-3) — Foundation
- **დღე 1:** Ezra: PRD.md + USER_FLOWS.md draft (8 სთ)
- **დღე 1:** Tamar: PR#1 ship + Railway apply + merge (2 სთ)
- **დღე 2:** Tamar: PR#2 ship + backfill (4 სთ)
- **დღე 3:** Tamar: PR#3 ship + Railway apply + merge (6 სთ, hi risk)

### Wave 2 (დღე 4-7) — Build (parallel)
- **დღე 4-5:** Tamar: PR#4 + PR#5 (4 სთ + 4 სთ)
- **დღე 4-7:** Noa: Google Places integration (16 სთ, rate-limited enrichment)
- **დღე 4-7:** Kwame: OrganizationDetail.tsx rewrite (12 სთ)
- **დღე 4-7:** Lila: 538 orgs × 4 fields × 5 languages enrichment + translation (20 სთ total, mostly AI batch)
- **დღე 5-6:** URL rename + 301 redirects implementation (Q2) (3 სთ)

### Wave 3 (დღე 8-10) — Ship
- **დღე 8:** Ilias: DEPLOYMENT_PLAN.md + smoke tests (8 სთ)
- **დღე 9:** Staging deploy + full QA (4 სთ)
- **დღე 10:** Production rollout + post-deploy validation (2 სთ)

### ჯამში: **~60 dev-hours** განაწილებული 6 persona-ს შორის.

---

## 5. Definition of Done (DoD) — 14 Checkpoints

Phase 2 დასრულებულად ითვლება, როცა **ყველა** შემდეგი checkpoint-ი green-ია:

- [ ] 1. `grants` ცხრილი სახელით `programs` არსებობს
- [ ] 2. `programs.orgId` NOT NULL + FK working
- [ ] 3. `programs.latitude/longitude/address` წაშლილია (Q7)
- [ ] 4. `organization_translations` ცხრილი DROPPED
- [ ] 5. `catalog.*` tRPC namespace DELETED
- [ ] 6. 538/538 ორგანიზაცია 8 სრული ველით (Q1)
- [ ] 7. Google rating + review count 400+/538 ორგანიზაციისთვის
- [ ] 8. branches-ის კლიკი → map jump მუშაობს
- [ ] 9. `/catalog` → `/organizations` redirect 301 (Q2)
- [ ] 10. `FROM_EMAIL=hello@grantkit.com` აქტიურია (Q5)
- [ ] 11. Newsletter org-centric template-ზე გადასულია (Q6)
- [ ] 12. Mobile responsive (iPhone SE 375px → iPad Pro 1024px)
- [ ] 13. Lighthouse score ≥ 90 (Performance, Accessibility, SEO)
- [ ] 14. 5 ენის coverage 100% (EN/FR/ES/RU/KA)

---

## 6. Cross-Cutting Tasks

### Task #45 — Resend DNS Setup (Q5)
**როდის:** Wave 1-ის დროს (paraleli Tamar-ის PR#1-ს)
**ოწნერი:** Claude (ინსტრუქცია) + მომხმარებელი (ცხრ)
**ნაბიჯები:**
1. Claude შედის Resend Dashboard → Domains → Add Domain (grantkit.com)
2. Claude მოჰყვება 4 DNS ჩანაწერის screenshot + step-by-step guide
3. მომხმარებელი ცხრ-ში (GoDaddy/Cloudflare/Namecheap) copy-paste აკეთებს
4. Resend verified → Claude `emailService.ts:FROM_EMAIL="hello@grantkit.com"` შეცვლის
5. Test email გაიგზავნოს → validated

### Task #46 — URL Rename + 301 Redirects (Q2)
**როდის:** Wave 2 (Kwame + infra)
**implementation:**
- Express middleware (server/_core/index.ts):
  ```ts
  app.get("/catalog", (_, res) => res.redirect(301, "/organizations"));
  app.get("/grant/:id", (req, res) => res.redirect(301, `/organization/${req.params.id}`));
  ```
- React Router (client/src/main.tsx): path update
- sitemap.xml re-generation
- Google Search Console: new sitemap submission

---

## 7. რისკების რეგისტრი (PR #145 don't repeat)

| # | რისკი | ლიკვიდაცია | ოწნერი |
|---|---|---|---|
| R1 | Schema migration production-ზე გაიშვა, merge ჯერ მოხდა | PR template-ი ითხოვს "Railway apply ✓" checkbox-ს. CI-ში drizzle-kit check migration drift-ზე. | Tamar |
| R2 | PR#3 drop columns → bug მოუარულად | Pre-merge: staging DB-ზე smoke test 100% pass. Rollback script-ი PR-ში. | Tamar, Ilias |
| R3 | 102 orphan grants დაიკარგება | PR#3 Step 1-ში orphan → new organizations რელიასო (ORG-9001..9102) | Tamar |
| R4 | URL redirect აიშლება, SEO trafik დაიკარგება | Pre-deploy: curl test ძველი URL-ები 301 აბრუნებენ. Google Search Console submit. | Kwame |
| R5 | Resend DNS verification ვერ გაიცა | Fallback: 24 სთ-ში თუ vერ გავიდა, მომხმარებელს ცალკე ticket | Claude |
| R6 | 5 ენის translation drift | `pnpm translate:audit` CI-ში. | Lila |
| R7 | Google Places API overspend | `GOOGLE_PLACES_BUDGET_USD=50` limit + cache. | Noa |
| R8 | Newsletter org-centric transition-ში user-ები დაიბნევიან | 1 გარდამავალი newsletter: "We changed: now we notify you about NEW ORGS, not new grants" | Lila |
| R9 | Catalog.tsx ცვლილებამ სხვა რამ გატეხა | Visual regression test ვიდრე-შემდეგ screenshot. | Kwame |
| R10 | Railway deploy dependency timing | დეპლოის slot-ი reserved + notify #ops channel | Ilias |

---

## 8. Cost Projection

| ხაზი | ერთჯერადი | ყოველთვიური |
|---|---|---|
| Google Places API (538 orgs × ~$0.05 avg) | $27 | $0 |
| OpenRouter/Anthropic (enrichment batch) | $12 | $0 |
| Resend (emails, unchanged) | $0 | $0 |
| Railway (same tier) | $0 | $5 |
| **ჯამში** | **$39** | **$5/month** |

---

## 9. Escalation Points

თუ რომელიმე ამ scenario-ში იმყოფები, **არ გააგრძელო** — მოუწოდე მომხმარებელს:

1. Migration production-ზე ჩაიშალა და rollback აგრძელებს შეცდომებს
2. 102 orphan-ზე მეტი გრანტი აღმოჩნდა (backfill <85%)
3. Google Places API $60+ დახარჯული + ჯერ არც ნახევარი არ არის enriched
4. Translation quality regression (LLM-ი ცუდ ქართულს/ფრანგულს წერს)
5. მომხმარებელი ახალ scope requirement-ს ითხოვს რაც ამ გეგმის გარეთ არის

---

## 10. Next Step Anchor

**ამოცანები (TaskList IDs):**
- #35 (Ezra / PRD) — **ჯერ მზადაა, ახლავე უნდა დაიწყოს**
- #36 (Tamar / PR#1) — **ჯერ მზადაა, ახლავე უნდა დაიწყოს**
- #37..#40 (Tamar / PR#2-5) — blocked by previous PR
- #41 (Noa), #42 (Kwame), #43 (Lila) — blocked by #40
- #44 (Ilias) — blocked by #41, #42, #43
- #45 (DNS instructions) — კვლავ დაიწყოს (parallel to Wave 1)
- #46 (URL redirects) — Wave 2

**აგენტის პირველი ქმედება ახალ ჩატში:**
1. წაიკითხოს `CLAUDE.md` (golden rule)
2. წაიკითხოს `ORG-CENTRIC-MEMORY.md` (master context)
3. წაიკითხოს **ეს ფაილი** (`EXECUTION-PLAN.md`)
4. წაიკითხოს `OPS.md` (secrets + Railway URL)
5. `TaskList` შეიცვალოს შემდეგი pending task-ს (blocked არ უნდა იყოს)
6. თუ ბლოკაა — აგენტმა უნდა დასვას კითხვა მომხმარებელთან

---

## 11. Changelog

- **2026-04-23 (Hana):** ფაილი შეიქმნა. მომხმარებელმა დაამტკიცა სამივე რეკომენდაცია (Q2→B, Q5→A, Q7→A). Wave 1 გასაშვებად მზადაა.

---

*Guardian of this file: ყოველი აგენტი, რომელიც Phase 2-ზე მუშაობს, ვალდებულია
ბოლოში changelog განაახლოს და status-ი TaskList-ში ისახოს.*
