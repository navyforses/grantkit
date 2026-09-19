# GrantKit — სრული სისტემური დიაგნოსტიკა

**თარიღი:** 2026-04-23
**სფერო:** Phase A (DB inventory). Phases B–E დარჩენილია.
**მონაცემთა წყარო:** Railway MySQL production (`mainline.proxy.rlwy.net:59681/railway`), წაკითხული `.env`-დან live query-ებით.

---

## TL;DR — რა უნდა იცოდე ერთი წუთში

1. **ერთი ცოცხალი ბაზაა — Railway MySQL.** Supabase-ი **მკვდარი კოდია**: `.env`-ში ცვლადები ჯდება, მაგრამ `@supabase/supabase-js` SDK წაშლილია Phase R1 cleanup-ის შემდეგ (`.grantkit-redesign/r1-cleanup-report.md`). 3 SQL ფაილი `supabase/` საქაღალდეში ვერასოდეს გაშვებულა.
2. **Schema drift — არ არის.** წინა კონტექსტში მე არასწორად ვთქვი რომ `organization_branches` / `organization_translations` აკლია `drizzle/schema.ts`-ს. რეალურად **არის** — `schema.ts:275` და `schema.ts:296`. CLAUDE.md-ის ოქროს წესი დაცულია.
3. **10 ცხრილი, მაგრამ 5 ცხრილი ცარიელია:** `users`, `saved_grants`, `newsletter_subscribers`, `notification_history`, `organization_translations` — ყველა 0 რიგი. ეს არის legacy scaffolding ფუნქციებისთვის რომლებიც ან არ გაუშვიათ ან არავინ იყენებს.
4. **მონაცემთა დუბლირება orgs ↔ branches ↔ grants-ს შორის.** `grants.latitude/longitude` დუბლირებს `organization_branches.latitude/longitude`-ს (558 დამთხვევა 0.01° რადიუსში). `organizations.latitude/longitude` ასევე ცალცალკე. ერთიდაიგივე წერტილი 3 ადგილას შეიძლება იყოს ჩაწერილი.
5. **Grants↔Organizations linkage მყიფეა.** FK არ არსებობს. კავშირი იქმნება free-text `grants.organization = organizations.name` შედარებით. 4 ორგანიზაციული სახელი დუბლირდება, რაც რიცხვების დამრღვევია.

მომხმარებელმა აირჩია **"ორგ + programs" მოდელი** (consolidation). რეკომენდაცია (იხილე §8): **grants გახდეს programs, FK-ით orgId-ზე, და `organizations` იყოს top-level.**

---

## 1. Database Inventory — Railway MySQL

### 1.1. ცხრილები და რიგების რაოდენობა (live query, 2026-04-23)

| ცხრილი | რიგი | სტატუსი | დანიშნულება |
|---|---:|---|---|
| `organizations` | 538 | ცოცხალი (515 active + 23 inactive) | ორგანიზაციების მასტერი |
| `organization_branches` | 872 | ცოცხალი (790 geocoded) | ფილიალების გეო-მარკერები |
| `organization_translations` | **0** | 🔵 ცარიელი ცხრილი | org-ების თარგმანი (არ გამოიყენება) |
| `grants` | 731 | ცოცხალი (ყველა active) | გრანტი/რესურსი |
| `grant_translations` | 2980 | ცოცხალი (731 × 4 ენა + enrichment) | გრანტების თარგმანი |
| `users` | **0** | 🔵 ცარიელი | auth (არავინ რეგისტრირდება) |
| `saved_grants` | **0** | 🔵 ცარიელი | bookmarks (არავინ ინახავს) |
| `newsletter_subscribers` | **0** | 🔵 ცარიელი | newsletter (არავინ იწერება) |
| `notification_history` | **0** | 🔵 ცარიელი | email campaign log |
| `__drizzle_migrations` | 12 | service | Drizzle ORM tracking |

**სულ 10 ცხრილი, აქედან 5 ცარიელი (50%).**

### 1.2. `drizzle/schema.ts` კოვერიჯი

```
✅ users                    (schema.ts:7)
✅ savedGrants              (schema.ts:57)
✅ newsletterSubscribers    (schema.ts:72)
✅ grants                   (schema.ts:88)
✅ grantTranslations        (schema.ts:145)
✅ notificationHistory      (schema.ts:172)
✅ organizations            (schema.ts:192)
✅ organizationTranslations (schema.ts:275)
✅ organizationBranches     (schema.ts:296)
```

**9/9 business table schema-ში დოკუმენტირებული.** Schema drift = 0. CLAUDE.md-ის migration წესი დაცულია.

### 1.3. Supabase — მკვდარი ხანური ინვენტარი

| ფაილი/ცვლადი | სტატუსი | ქმედება |
|---|---|---|
| `supabase/migration.sql` (493 ხაზი) | არასოდეს გაშვებულა | წაშლა |
| `supabase/smart-search-and-tags.sql` | არასოდეს გაშვებულა | წაშლა |
| `supabase/add-tags.sql` | არასოდეს გაშვებულა | წაშლა |
| `.env` → `VITE_SUPABASE_URL` | ცოცხალი env var, 0 code import | წაშლა |
| `.env` → `VITE_SUPABASE_ANON_KEY` | ცოცხალი env var, 0 code import | წაშლა |
| `@supabase/supabase-js` package | უკვე წაშლილია R1-ში | - |
| `client/src/lib/supabase.ts` | უკვე წაშლილია R1-ში | - |

**წყარო:** `.grantkit-redesign/r1-cleanup-report.md`. `client/src/` 4 ფაილში Supabase მხოლოდ კომენტარებშია (Admin.tsx:1896, constants.ts:35/40, types.ts:900/959, GrantDetailPanel.tsx:380).

---

## 2. Data Quality Findings

### 2.1. Orphan organizations

**63 ორგანიზაცია active მაგრამ არცერთი grant არ აქვს მიბმული** (თავისუფალი-ტექსტური სახელით შეწყვილებისას).

```sql
SELECT COUNT(*) FROM organizations o
WHERE o.isActive = 1
  AND NOT EXISTS (SELECT 1 FROM grants g WHERE g.organization = o.name);
-- 63
```

შესაძლო მიზეზები: (a) ორგ-სახელი `grants.organization`-ში სხვანაირადაა დაწერილი; (b) grants.organization NULL-ია; (c) მართლაც orphan.

### 2.2. Grants-ის linkage

- 731 active grant
- 629 grant-ს აქვს `organization` text ველი შევსებული
- **102 grant-ს საერთოდ არ აქვს orgName (NULL/empty)** — ეს არის yet-another data hole
- join-ზე 637 match ხდება (დუბლიკატი ორგ-სახელების გამო inflated: 629 + 8 extra matches)

### 2.3. დუბლიკატი ორგანიზაციული სახელები

| სახელი | ასლი DB-ში |
|---|---:|
| Special Love for Children with Cancer | 2 |
| Travis Burkhart Foundation | 2 |
| Wheelchairs 4 Kids | 2 |
| Zac Speaks | 2 |

free-text join-ის დროს თითო ასეთი grant ორჯერ ისვლება. მხოლოდ FK-ს შემოღება მოაგვარებს.

### 2.4. გეო-კოორდინატების ფრაგმენტაცია

სამ ცხრილში ცალცალკე inid ინახება ფაქტობრივად ერთი და იგივე წერტილი:

| ცხრილი | lat/lng სვეტები | შევსებული |
|---|---|---:|
| `grants` | `latitude`, `longitude` | ~?/731 (ძველი, დუბლირებული) |
| `organizations` | `latitude`, `longitude` | ~? (HQ) |
| `organization_branches` | `latitude`, `longitude` | 790/872 (canonical — რუკისთვის ეს გამოიყენება) |

**558 grant-ის კოორდინატი ერთიდაიგივეა branch-ის კოორდინატთან 0.01° რადიუსში** (~1.1 კმ). ანუ grants.lat/lng უმრავლესობის შემთხვევაში სხვა არაფერია თუ არა კოპია.

### 2.5. Inactive organizations (23)

```
ORG-0012, 0020, 0032, 0033, 0048, 0051, 0113, 0129, 0130,
0195, 0236, 0270, 0329, 0339, 0518, 0525, 0529, 0530, 0531,
0532, 0534, 0535, 0538
```

ეს არის Phase 7 enrichment-ის შედეგად deactivated orgs (`ENRICHMENT_REPORT.md` — `no_data` რეზულტატის გამო ან duplicate-ები). რუკიდან იმალება, მაგრამ DB-ში რჩება.

### 2.6. Grant translations coverage

`grant_translations`-ს აქვს 2980 რიგი = 731 active grant × **~4.08 ენა average**. ყველა active grant-ს აქვს სრული 4 ენა (FR/ES/RU/KA) + enrichment ველების თარგმანი — 100% coverage.

### 2.7. Organization translations coverage

`organization_translations` — **0 რიგი**. ამ მიმართულებით ჯერ არაფერი გაკეთებულა. თუ consolidation-ის შემდეგ org-ების description-ები გახდება მომხმარებლის ძირითადი წყარო, ამ ცხრილის შევსება 4 ენაზე გახდება Phase 2-ის ხელახალი ვერსია.

---

## 3. Schema — organizations (38 სვეტი)

```
PK:           id, orgId (varchar(16) unique)
Identity:     name (text), description (text)
Geo:          country, state, city, hqAddress, latitude, longitude
Contact:      website, phone, email, contactFormUrl
Counts:       programsCount, branchesCount
Classification:  categories (text), serviceArea, officeHours
Policy:       acceptsUndocumented, acceptsUninsured, serviceCost,
              appointmentPolicy, orgLanguages
Google:       googleRating, googleReviewCount, googlePlaceId
Content:      missionStatement, socialMedia (text JSON?)
Enrichment:   phoneSource, phoneVerifiedAt, emailSource, emailVerifiedAt,
              contactEnrichmentBatch, contactEnrichmentStatus
State:        isActive, createdAt, updatedAt
```

ეს უკვე **თითქმის სრული programs-ის parent entity**-ა. რაც აკლია კონსოლიდაციის შემდეგ: მხოლოდ `programs` / `grants` child table-ის FK relationship.

---

## 4. Schema — grants (33 სვეტი) — მომავალი "programs"

```
PK/UX:        id, itemId (varchar(64) unique — slug)
Identity:     name, organization (text — *FREE TEXT LINK TO ORG*)
Content:      description, eligibility, category, grantType (grant|resource)
Geo:          country, state, city, address, latitude, longitude, geocodedAt
Contact:      website, phone, grantEmail (aliased from "email")
Funding:      amount, fundingType, applicationProcess, deadline
Targeting:    targetDiagnosis, ageRange, geographicScope, documentsRequired,
              b2VisaEligible
Ops:          serviceArea, officeHours, status
State:        isActive, createdAt, updatedAt
```

**მისაქცევი:** `organization` text → უნდა გახდეს `orgId varchar(16)` FK. ადრევე უკვე ქონია grant-ებს itemId-ები (GRANT-XXXX), ორგანიზაციებს — orgId-ები (ORG-XXXX). ყველაფერი მზადაა მიგრაციისთვის.

---

## 5. Critical ობსერვაციები კონსოლიდაციამდე

### 5.1. Duplicate data plane

| ინფო | ცხრილი #1 | ცხრილი #2 | ცხრილი #3 |
|---|---|---|---|
| ორგანიზაციის სახელი | `organizations.name` | `grants.organization` (text) | `organization_translations.name` |
| ქვეყანა | `organizations.country` | `grants.country` | `organization_branches.country` |
| მისამართი | `organizations.hqAddress` | `grants.address` | `organization_branches.address` |
| ტელეფონი | `organizations.phone` | `grants.phone` | `organization_branches.phone` |
| მეილი | `organizations.email` | `grants.grantEmail` | `organization_branches.email` |
| ვებსაიტი | `organizations.website` | `grants.website` | — |
| განედი/გრძედი | `organizations.latitude` | `grants.latitude` | `organization_branches.latitude` |
| სერვისის ზონა | `organizations.serviceArea` | `grants.serviceArea` | — |
| საოფისე საათები | `organizations.officeHours` | `grants.officeHours` | — |

**9 ველი სამჯერ არის დუბლირებული.** ეს არის მთავარი source-of-truth პრობლემა: არ ცხადია რომელი ცხრილია master.

### 5.2. Source-of-truth წესი (არსებული ქცევის ანალიზი)

მხოლოდ კოდის ქცევა აჩვენებს (იხ. `server/db.ts`):
- რუკის marker-ებისთვის: `organization_branches` (1766-1794 ხაზები — `mapPoints` query) = **canonical geo**
- grant detail-ის გვერდისთვის: `grants.*` — **canonical grant metadata**
- org detail-ის გვერდისთვის: `organizations.*` + `organization_branches[]` — **canonical org**

ანუ **`grants.latitude/longitude`, `grants.address`, `grants.phone`, `grants.email` არ კითხულობს არავინ UI-ში** (?). მოითხოვს Phase B გადამოწმებას.

---

## 6. რა უნდა წაიშალოს / გამოიცვალოს

### 6.1. უსაფრთხოდ წასაშლელი (Phase A-ის შედეგი)

1. `supabase/` საქაღალდე (3 ფაილი)
2. `.env`-დან `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
3. `client/src/` კომენტარებიდან "Supabase"-ის ხსენება (4 ფაილი)
4. `organization_translations` ცხრილი — ჯერ დატოვე, Phase 2-ის ხელახლა ვიდრე შევსდება

### 6.2. Schema-ში დასარბენი (Phase 3-ის შემდეგ migration)

- `grants.latitude`, `grants.longitude`, `grants.geocodedAt` — რადგან branch-ს უკვე აქვს
- `grants.address`, `grants.phone`, `grants.email` (→ grantEmail) — რადგან orgs/branches-ს უკვე აქვთ
- `grants.officeHours`, `grants.serviceArea` — რადგან orgs-ს უკვე აქვთ
- `grants.organization` (text) — ჩაანაცვლე `grants.orgId` (varchar(16), FK → organizations.orgId)

რა რჩება grants ცხრილში (ახალი სახელი: `programs`)?
```
PK: id, itemId
FK: orgId → organizations.orgId
Content: name, description, category, grantType, eligibility
Funding: amount, fundingType, applicationProcess, deadline,
         targetDiagnosis, ageRange, geographicScope, documentsRequired,
         b2VisaEligible
Meta: country (can stay if programs span multi-country), status,
      isActive, createdAt, updatedAt
```

~22 სვეტი 33-დან (-11 duplicate).

---

## 7. 790 / 968 / 538 ცხრილი — საბოლოო განმარტება

წინა სესიაზე მომხმარებელი ხედავდა `790 locations` MapStatsBar-ში და ვერ მიხვდა რაზე ელაპარაკება. ამ მომენტის მონაცემებით:

| რიცხვი | რას ნიშნავს |
|---:|---|
| **538** | ორგანიზაციების რაოდენობა (515 active + 23 inactive) |
| **515** | active ორგანიზაციები |
| **731** | active გრანტი |
| **629** | active გრანტი რომელსაც აქვს orgName text |
| **872** | ფილიალი სულ (org_branches) |
| **790** | **geocoded** ფილიალი (რუკაზე ნაჩვენები markers) |
| **968** | ძველი ქეშირებული რიცხვი ბრაუზერში (მიემართებოდა Phase 7-ს წინ სიტუაციას) |

**MapStatsBar-ი ახლა სწორად ხედავს:** ორგ-ები · გრანტები · ფილიალები · ქვეყნები (code committed, Railway-ზე deploy-ი დარჩენილია).

---

## 8. კონსოლიდაციის გეგმა — მაღალ დონეზე (დეტალები Phase E-ში)

**მიზანი:** ერთი master ცხრილი `organizations` (top-level) + child `programs` (ყოფილი `grants`). geo/contact ინფო მხოლოდ `organization_branches`-ში.

### სამი ნაბიჯი

1. **Phase B–D (დარჩენილი audit):** tRPC endpoints, frontend pages, scripts/CRON — ვნახოთ ყველა call site რომელიც duplicate ველებს კითხულობს/წერს.
2. **Migration PR (CLAUDE.md's golden rule):**
   - ცალკე PR schema-ზე: ცალცალკე `grants.orgId` column + backfill SQL
   - Railway-ზე migration გაუშვი
   - მხოლოდ ამის შემდეგ merge კოდს რომელიც FK-ს იყენებს
3. **Drop duplicate columns:** მეორე PR, იმავე წესით (ჯერ კოდი უნდა გაშალო რომ აღარ კითხულობდეს, მერე SQL-ი).

### Migration order (safe)

```
PR1  grants.orgId column + backfill from grants.organization
PR2  server/db.ts queries updated to use grants.orgId
PR3  drop grants.latitude/longitude/address/phone/email/officeHours/
     serviceArea/geocodedAt (code already ignores them)
PR4  rename grants → programs (optional — API-ბრქვი, big blast radius)
```

---

## 9. ღია კითხვები მომხმარებელს (Phase A-დან)

1. **102 grant-ი NULL `organization` ველით.** ესენი ვინ აფინანსებს? (ა) unknown სცენარი კოდში რჩება? (ბ) Phase B/C-ში დავამოწმებ რა მოსდის UI-ს ამ grant-ებისთვის.
2. **63 orphan org-ი.** inactive-ს ვტოვებთ? წავშალოთ? თუ grants უნდა დაემატოთ?
3. **4 დუბლიკატი org name.** ერთი ვერსია (სრული enrichment-ით) დავტოვოთ, მეორე — წავშალოთ. რომელი, დამოკიდებულია completeness score-ზე (Phase E-ს შევრაცხ ცალცალკე).
4. **`grantType: "resource"` vs "grant"** — შვენი consolidation-ის შემდეგ ეს განსხვავება გვინდა? თუ ყველა program უნდა იყოს unified?

---

## 10. შემდეგი ნაბიჯი

Phase A დასრულებულია. გადავდივარ:

- **Phase B (tRPC endpoint → table map).** `server/routers.ts` სრულად წავიკითხო, endpoint-ად endpoint ქათამი ცხრილის მიხედვით დავახარისხო. შედეგი: `.grantkit-redesign/DATA_MAP.md`.
- **Phase C (frontend pages → endpoint map).** `client/src/pages/*.tsx` სრულად, რომელი გვერდი რომელ endpoint-ს ეძახის.
- **Phase D (scripts, CRON, external APIs).** `scripts/*`, `.github/workflows/*`, `.mcp.json` — რა ტრიალებს კულისებში.
- **Phase E (consolidation plan).** 3-PR migration roadmap, backfill script, rollback plan.

