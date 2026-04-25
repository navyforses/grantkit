# France Emigration Organizations — Import & UI Plan

> შექმნილია: 2026-04-24
> წყარო: `France_Emigration_Organizations_5_Languages.xlsx` (624 ორგანიზაცია, 5 ენა, 30 სვეტი)
> სტატუსი: გეგმა გადახედვისთვის — Wave-style execution

---

## 1. რა არის Excel-ში (ფაქტები, არა ჩემი ვარაუდი)

| მაჩვენებელი | რიცხვი |
|---|---|
| სრული რიგი | 624 ორგ. (ყველა საფრანგეთი) |
| sheets | `ქართული` (30 სვეტი), `English` / `Español` / `Français` / `Русский` (21 სვეტი თითო) |
| ნამდვილი თარგმანი | desc/services/audience: ~80% ნათარგმნია, ~20% ისევ ქართულად დარჩა ყველა ენის sheet-ზე |
| Address | 595/624 (95%) |
| Phone / Email / Website | 511 / 516 / 568 (82–91%) |
| დაარსების წელი | 339/624 (54%), დიაპაზონი 1229–2024 |
| Housing-სპეციფიკური ველები | 102/624 (მხოლოდ მკურნალობა-დაკავშირებული თავშესაფრები) |
| Cities — უნიკალური | 150 (Paris-ში 222, Reims 25, Lyon 20, …) |
| ერთი რიგი ჩამოთვლის 31 ქალაქს — ეროვნული ორგებია (54 ასეთი რიგი) |

### Excel-ის სვეტები (30 სრული, Georgian sheet-ზე)

ძირითადი (1–20): #, name, abbreviation, orgType, address, phone, email, website, description,
servicesOffered, targetAudience, category, emigrationPurpose, serviceLanguages, cost,
coverageArea, foundedYear, legalStatus, mainCategory, cities, isNational

Housing-სპეციფიკური (21–29): housingType, housingDescription, registrationProcess,
costDetails, maxStayDuration, capacity, childrenFriendly, disabledAccessible, relevance

---

## 2. Schema gap — რა გვაქვს vs რა გვჭირდება

### ✅ უკვე არსებობს `organizations` ცხრილში
`name`, `description`, `country`, `state`, `city`, `hqAddress`, `website`, `phone`, `email`,
`categories`, `serviceArea`, `languages` (orgLanguages CSV), `serviceCost` enum, `missionStatement`,
`googleRating/Count/PlaceId`, contact provenance ველები.

### ❌ ახალი სვეტები — საჭიროა Migration 0017

| სვეტი | ტიპი | წყარო (Excel col) | შენიშვნა |
|---|---|---|---|
| `abbreviation` | varchar(32) | col 2 | „AER", „CADA", … |
| `organizationType` | enum | col 3 | NGO / association / government / private (4 distinct value) |
| `servicesOffered` | text | col 9 | bullet-friendly სია |
| `targetAudience` | text | col 10 | „მიგრანტები, ლტოლვილები..." |
| `emigrationPurpose` | varchar(32) CSV | col 12 | all / study / medical / work (CSV-კომბინაცია) |
| `foundedYear` | int | col 16 | nullable, 1229–2024 |
| `legalStatus` | varchar(255) | col 17 | „ასოციაცია loi 1901", … (free-text, ბევრი variant) |
| `mainCategory` | varchar(64) | col 18 | 9 distinct value — განსხვავდება `categories`-სგან |
| `isNational` | boolean | col 20 | Yes/No |

### ❌ ცალკე ცხრილი — `organization_housing` (102 რიგი მხოლოდ)

102 ორგანიზაცია არის **მკურნალობასთან დაკავშირებული თავშესაფარი** — არ აქვს აზრი ეს ცხრად სვეტებად ჩავტანოთ ყველა 790 ორგზე. ცალკე ცხრილი:

| სვეტი | ტიპი | წყარო (col) |
|---|---|---|
| `orgId` (FK) | varchar(16) | — |
| `housingType` | enum | 21 — parents_house / shelter / social / temporary / hotel / apartment / other |
| `description` | text | 22 |
| `registrationProcess` | text | 23 |
| `costDetails` | text | 24 |
| `maxStayDuration` | varchar(64) | 25 |
| `capacity` | varchar(64) | 26 |
| `childrenFriendly` | enum | 27 — yes/no/unknown |
| `disabledAccessible` | enum | 28 — yes/no/unknown |
| `relevanceNotes` | text | 29 (medical-context relevance) |

### ❌ თარგმანები → `organization_translations`-ში
დამატებითი ნათარგმნი ველები (description, servicesOffered, targetAudience, missionStatement) უნდა დაემატოს `organization_translations`-ს. **სქემაში უკვე არსებობს description და missionStatement** — გვჭირდება დავამატოთ `servicesOffered` და `targetAudience` text სვეტები.

---

## 3. Translation gap — გასაკვირი აღმოჩენა

> ⚠️ Excel-ის "ნათარგმნი" sheet-ები **არ არიან სრულად ნათარგმნი**.

ყველა sheet-ზე (English/Español/Français/Русский):
- Description: 18–19% ისევ ქართულად
- Services Offered: 19% ქართულად
- Target Audience: 19% ქართულად

**რატომ მნიშვნელოვანია:** თუ ეს მონაცემები პირდაპირ შევუშვით თარგმანების ცხრილში, მომხმარებელი ფრანგ მომხმარებელი დაინახავს ქართულ ტექსტს — UX bug.

**გამოსავალი:** import-ის დროს გაშვებული უნდა იქნას ენის-ვალიდაციის ფილტრი — თუ ცელი ქართულად დარჩა ფრანგულის sheet-ზე, ცელი NULL-ს დავტოვოთ და მერე translate-pipeline-მა შეავსოს (Forge / Gemini API უკვე გვაქვს `translate-missing.ts`-ში).

---

## 4. De-duplication — ფრთხილად

DB-ში უკვე არის **790 ორგანიზაცია** (აქედან რამდენიმე საფრანგეთიდან, აშკარად). ახალი 624 პირდაპირ რომ ჩავსვათ:
- შესაძლოა დუბლიკატები შეიქმნას (იგივე name + city)
- შესაძლოა იგივე ორგანიზაცია სხვა `orgId`-ით ჩაჯდეს

**Match-სტრატეგია:**
1. ძირითადი key: `LOWER(TRIM(name))` + `country='FR'`
2. fallback: website domain match
3. fallback: phone match (E.164 normalized)

თუ match არ ნახდა → ახალი `ORG-XXXX` ID. თუ match ნახდა → UPDATE (ცარიელ ცელებს ავსებს, დასახელებულებს არ ცვლის).

---

## 5. UI ცვლილებები — `OrganizationDetail.tsx`

ახალი ცარდები რომ უნდა გაჩნდეს (გვერდი უკვე გრიდულია — მარჯვენა სვეტი):

### Left column-ში
1. **Org overview chip-row გადახალისება** — დავამატოთ `foundedYear` ბეჯი ("est. 1954"), `organizationType` ბეჯი ("NGO" / "Government"), `isNational` ბეჯი ("National coverage")
2. **Services Offered card** — bullet სია (ცალკე mission-ისგან)
3. **Target Audience card** — ვინ შეიძლება მიმართოს

### Right column-ში
4. **Housing card** (renders მხოლოდ თუ `organization_housing` row არსებობს) — type, capacity, max stay, children/disabled accessibility, registration process, cost details, relevance notes
5. **Legal Status row** contact card-ში (small text)

### i18n
ახალი ენის ჩასართი: 5 ენაში — `organizations.detail.foundedYear`, `housing.type.shelter` (enum labels), `housing.childrenFriendly`, etc.

---

## 6. Execution Plan — Wave-style

თითოეული Wave = ერთი PR. Migration golden rule (ჯერ DB, მერე code) გამოიყენება მე-2 Wave-ზე.

### 🌊 Wave 1 — Schema + Import infrastructure (Claude Code, IDE)
**PR1.1:** `drizzle/0017_org_extensions_and_housing.sql`
  - ALTER TABLE organizations ADD: abbreviation, organizationType, servicesOffered, targetAudience, emigrationPurpose, foundedYear, legalStatus, mainCategory, isNational
  - ALTER TABLE organization_translations ADD: servicesOffered, targetAudience
  - CREATE TABLE organization_housing
  - `scripts/apply-migration-0017.mjs`
  - schema.ts განახლება

**PR1.2:** Import script — `scripts/import-france-orgs.ts`
  - Excel parser (openpyxl-style)
  - De-dup matcher (name+country, website-domain, phone)
  - Translation language validation (drop Georgian-leftover from non-KA sheets)
  - Cost normalizer (89 distinct → 6 enum values)
  - Cities multi-row split → branches
  - Dry-run mode default; `--apply` flag for write
  - Batch ID `france-2026-04-24` for rollback

### 🌊 Wave 2 — Apply to Railway (Cowork — me + you together)
1. **Cowork (me):** `node scripts/apply-migration-0017.mjs` Railway-ზე
2. **Cowork (me):** `SELECT` შემოწმება რომ სვეტები დაემატა
3. **Cowork (me):** `pnpm tsx scripts/import-france-orgs.ts --dry-run` — შეფასება (რამდენი match, რამდენი ახალი)
4. **მომხმარებელი (შენ):** გადახედვა და approve dry-run output-ის
5. **Cowork (me):** `pnpm tsx scripts/import-france-orgs.ts --apply --notify`
6. **Cowork (me):** verify counts on production

### 🌊 Wave 3 — UI (Claude Code, IDE)
**PR3.1:** OrganizationDetail.tsx-ში დაამატე
  - new chips (foundedYear, orgType, isNational badge)
  - ServicesOfferedCard, TargetAudienceCard კომპონენტები
  - HousingCard კომპონენტი (conditional render)
  - i18n keys 5 ენაში

**PR3.2:** tRPC `organizations.detail` extend — დაბრუნოს housing payload (LEFT JOIN organization_housing)

### 🌊 Wave 4 — Translations cleanup (Cowork)
**Cowork (me):** `pnpm tsx scripts/translate-missing.ts --table=organizations --batch=france-2026-04-24`
  - Forge API → შეავსოს NULL-ები 4 ენაში
  - Verify არცერთი row არ რჩება ცარიელი-ენით

### 🌊 Wave 5 — QA + Docs (Cowork + you)
- **Cowork (me):** PROJECT_MAP.md-ის "Last migration" + Session Log update
- **Cowork (me):** smoke test 5 random France ორგანიზაციაზე — gallery, housing card, translations
- **შენ (manual):** UAT 3 ენაში (KA/EN/FR), screenshot share

---

## 7. Work distribution — ვინ რას აკეთებს

| ნაბიჯი | ვინ | რატომ |
|---|---|---|
| Excel parsing & gap analysis | ✅ Cowork (გაკეთდა) | ერთჯერადი ანალიზი, OneDrive-ში სრულდება |
| `drizzle/0017_*.sql` წერა | **Claude Code (IDE)** | TypeScript schema sync + tsc check საჭიროა; OneDrive sandbox truncation issue (memory) |
| `scripts/apply-migration-0017.mjs` | **Claude Code (IDE)** | template უკვე არსებობს `apply-migration-0016.mjs`-ში |
| `scripts/import-france-orgs.ts` წერა | **Claude Code (IDE)** | რთული, 300+ line script — IDE უმჯობესია |
| Migration apply Railway-ზე | **Cowork (me)** | მე მაქვს DATABASE_URL წვდომა და Railway CLI |
| Dry-run import + review | **Cowork (me) + შენ** | მე გავუშვებ, შენ approve |
| Production import (--apply) | **Cowork (me)** | ცოცხალი DB write |
| UI კომპონენტები (HousingCard etc.) | **Claude Code (IDE)** | React + Tailwind + i18n changes — IDE-ში სუფთა |
| i18n keys 5 ენაში | **Claude Code (IDE)** | 5 ფაილში სინქრო update |
| Translation pipeline run | **Cowork (me)** | Forge API call, არ სჭირდება IDE |
| PR review + merge | **შენ (manual)** | მმართველი გადაწყვეტილება |
| PROJECT_MAP.md update | **Cowork (me)** | სესიის დასრულებისას |

---

## 8. ✅ FIXED DECISIONS (2026-04-24, შაკოს მიერ)

| # | გადაწყვეტილება | არჩევანი |
|---|---|---|
| 1 | **De-dup conflict** | **NEW (Excel) ცვლის OLD-ს**. თუ ორგანიზაცია უკვე გვაქვს და Excel-ი იგივე ცელს გვაძლევს — Excel-ის value ჩაწერდება არსებულზე. Source provenance: `france-2026-04-24` batch ID. |
| 2 | **Cost field** | 6 enum (`free / sliding_scale / paid / insurance / mixed / unknown`) + **სრული mapping ცხრილი** (იხ. ქვემოთ). გაუგებარი ფრაზები ხელით კატეგორიზდა. |
| 3 | **Multi-city** (54 ორგ × 31 ქალაქი) | **ჰიბრიდი:** `isNational=true` ბეჯი + ერთი HQ წერტილი + UI-ში "See all 31 cities" link რომელიც on-demand შლის სიას. **არ ვუქმნით** 1,674 ცარიელ branch-ს. |
| 4 | **Translation gaps** (~20% ცელი ქართულად) | **AI ავტო-თარგმანი** Forge/Gemini-ით. Import-ი დატოვებს NULL-ს იმ ცელებში, `translate-missing.ts` batch შემდეგ შეავსებს 4 ენაში. |
| 5 | **Housing-relevance ცელი** (col 29, 72/102 housing org-ში) | **ცალკე ყვითელი ბანერი** Housing card-ის ბოლოს: header `Why this matters` + ტექსტი. რენდერდება მხოლოდ თუ ცელი არსებობს. |

### Cost mapping ცხრილი — Import script-ში constant-ად

```
free           ← უფასო, უფასო (მიგრანტებისთვის), უფასო (სამონტაჟოებისთვის),
                  სერვისები უფასოა საჭიროების შემთხვევაში
paid           ← ფასიანი, გადახდილი, გადახდადი, გადასახადი, გადასახადიანი
sliding_scale  ← სუბსიდირებული, უფასო/სუბსიდირებული (ყველა ვარიანტი),
                  დაფინანსებული, საბაზისო დაფინანსება, საფინანსო მხარდაჭერით,
                  შემწეობილი, წახალისებული, შემცირებული
insurance      ← გადახდილი (ჩვეულებრივ ინსტიტუტების მიერ),
                  სუბსიდირებული / ინსტიტუტების მიერ გადახდილი,
                  ფასიანი (კერძო პროფესიონალები)
mixed          ← უფასო / ფასიანი, ფასიანი/სუბსიდირებული, გადის / სუბსიდირებული,
                  უფასო / წევრობის საფასური (ყველა ვარიანტი),
                  წევრობის საფასური, გაწევრიანების საკრედიტო გადასახადი,
                  დაახლოებით 10 ევრო ღამეში, უფასო კონსულტაცია
unknown        ← დამტვირთველი, საპროგრამო, საგზავნო, პუნქტუირებული, საპროცენტო,
                  საბიუჯეტო, საშემოსავლო, საშუალოდ + 48 long-tail (1 რიგი თითო)
```

წესი: TRIM + LOWER კომპარისონი. რომელიც ცხრილში არ არის → `unknown`.

---

## 9. Time estimate

| Wave | სამუშაო | დრო |
|---|---|---|
| 1 | Schema + import script (Claude Code) | 2–3 სთ |
| 2 | Migration apply + dry-run + import (Cowork) | 30 წთ |
| 3 | UI components + i18n (Claude Code) | 3–4 სთ |
| 4 | Translation pipeline | 1 სთ (LLM batch) |
| 5 | QA + docs | 30 წთ |
| **სულ** | | **7–9 სთ active work** |
