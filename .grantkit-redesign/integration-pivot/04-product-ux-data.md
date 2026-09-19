# 04 — პროდუქტი / UX / კონტენტი / მონაცემთა შესაბამისობა (Priya — Principal Product Designer)

> **მეთოდი:** production მიუწვდომელია (proxy 403), DB არ არის. დიაგნოზი ეყრდნობა კოდს, copy-ს (`client/src/i18n/*`), არსებულ audit-რეპორტებს (`audit-reports/04-db-content.md` 2026-05-03, `04b`, `09`, `11`, `12`) და სტატიკურ მონაცემებს (`client/src/data/catalog.json`, `data/orgs-phase2.json`, `data/orgs-phase3b.json`). ლოკალური Vite render + headless Chromium screenshot-ები (4 გვერდი, 390 px) გაკეთდა — §8.
> **ლინზა:** ახლადჩამოსული ემიგრანტი ტელეფონით, საშუალო ენობრივი ცოდნით — სჭირდება საბუთები/სტატუსი, საცხოვრებელი, ჯანდაცვა, ენის კურსი, სამუშაო, ბავშვის სკოლა, ფული/შემწეობა, სოციალური კავშირი, უსაფრთხოება.

---

## 1. Executive summary

GrantKit დღეს არის **ორი სხვადასხვა პროდუქტი ერთ ინტერფეისში**: (a) აშშ-ს სამედიცინო/დისაბილითი გრანტების კატალოგი, რომელზეც აგებულია მთელი landing, pricing, ფილტრები და AI-ს პრომპტები, და (b) ორგანიზაცია-ცენტრული, ემიგრანტზე ორიენტირებული დირექტორია (`ORG-CENTRIC-MEMORY.md §1`, საფრანგეთის 624 ორგანიზაცია), რომელიც სქემაში უკვე არსებობს, მაგრამ UI-ში თითქმის არ ჩანს. მომხმარებელი ხედავს (a)-ს, მფლობელი აშენებს (b)-ს.

მთავარი დასკვნები:

1. **ღირებულების წინადადება არ ემთხვევა აუდიტორიას.** Hero ამბობს "Find Grants, Funding & Support Services — Worldwide / Get Access — $9/month" (`en.ts:19-22`). ახლადჩამოსული ლტოლვილი ან უსაბუთო ადამიანი არ ეძებს "grants worldwide" და არ იხდის $9-ს სანამ არ დაინახავს, რომ საიტმა კონკრეტული, მისი ქალაქის, მისი ენის ორგანიზაცია იცის. კატალოგი არა-გამომწერს **3 ჩანაწერს** აჩვენებს (`Catalog.tsx:53,174-175`), ახსნის გარეშე — `t.catalog.memberBanner` ნათარგმნია 5 ენაზე, მაგრამ არსად არ რენდერდება.
2. **ნდობის სიგნალები ფაქტობრივად ცარიელია ან გამოგონილი.** "500+ Active members" (`en.ts:106`) — DB-ში `users = 0` (`04-db-content §1`). "538 verified organizations" (`en.ts:985`) — `contactEnrichmentStatus = pending` 1110/1110, `googlePlaceId` აკლია 1110/1110, `missionStatement` 1110/1110 (`04-db-content §2, §9`). TrustPanel (`TrustPanel.tsx:32`) რეიტინგის გარეშე საერთოდ არ ჩანს; WhoWeHelpCard ყველა ორგანიზაციაზე 5 რიგს "დასადასტურებელია" აჩვენებს.
3. **მონაცემები არის აშშ-სამედიცინო, არა ინტეგრაციული.** `catalog.json`: 618/629 US, 288/629 `medical_treatment`, 526/629 "Free / Free service" (ე.ი. 84% *სერვისია*, არა გრანტი), 481/629 eligibility შაბლონური სტრინგი, 629/629 `applicationProcess` = "Apply online via …". Onboarding-ის საჭიროებებს (VISA, LEGAL, LANGUAGE, BANKING — `shared/profileTypes.ts:14-16`) კატალოგში **არცერთი კატეგორია არ შეესაბამება**.
4. **Onboarding-ის პასუხები არსად გამოიყენება.** Dashboard მხოლოდ დროშასა და ემოჯებს აჩვენებს (`Dashboard.tsx:235-254`); `fundingSection`/`needsSection` i18n-გასაღებები არცერთ კომპონენტში არ არის.
5. **საფრანგეთის მონაცემები (493 org DB-ში, `04-db-content §10`) UI-ში არ იხსნება.** `servicesOffered`, `targetAudience`, `emigrationPurpose`, `organizationHousing`, `isNational` — სქემაში არის (`schema.ts:262-290`), `OrganizationDetail.tsx`-ში არცერთი არ რენდერდება; `organizations.translations` JSON კლიენტში არასოდეს იკითხება → ორგანიზაციის აღწერა მონოლინგვურია.

მოკლედ: **სქემა სწორი მიმართულებით მიდის, UI და copy — ძველ პროდუქტში დარჩა, მონაცემები — ცარიელი.** ყველაზე დიდი ბერკეტი არა ახალი feature-ია, არამედ: (1) აუდიტორიის და paywall-ის გადაწყვეტა, (2) 5 accessibility ველის რეალური შევსება პროვენანსით, (3) ტაქსონომიის გადატანა ინტეგრაციულ დომენებზე.

---

## 2. Scorecard (12 განზომილება)

| # | განზომილება | ქულა (1–5) | ერთხაზიანი მტკიცებულება |
|---|---|---|---|
| 1 | პირველი ვიზიტის სიცხადე | **2** | Hero: "Find Grants, Funding & Support Services — Worldwide", CTA "$9/month" (`en.ts:19-22`); სტატისტიკა "150+ Housing Aid" — `catalog.json`-ში housing = 48; "Manus account" (`en.ts:92`) — auth email/password-ია. |
| 2 | ღირებულება & pricing vs. მოწყვლადი აუდიტორია | **1** | Paywall = კატალოგის სია (3 ჩანაწერი, `Catalog.tsx:53`), მაგრამ `organizations.detail` საჯაროა (`routers.ts:1368`) და რუკის ყველა მარკერი უფასოა (`Catalog.tsx:460-462`) — ე.ი. paywall გვერდის ავლა ტრივიალურია, ხოლო ღირებული (მისამართი, ტელეფონი) ისედაც უფასოა. `subscription.activate` client-trusted (`12-subscription-funnel #1`). |
| 3 | Onboarding | **2** | 3 ნაბიჯი: 16 ქვეყანა / EDUCATION-MEDICAL-BUSINESS / 7 need (`profileTypes.ts`); "purpose" სავალდებულოა (`StepPurpose.tsx:101`) — თავშესაფრის მაძიებელს არცერთი არ ერგება; პასუხები Dashboard-ზე არ ფილტრავს არაფერს. |
| 4 | Discovery (ტაქსონომია, ფილტრები, რუკა) | **2** | 17 კატეგორია (`constants.ts:44-80`), 9 გამოყენებული; ფილტრები: B-2 ვიზა, დიაგნოზი, დაფინანსების ტიპი (`en.ts:195-266`); API-ში (`routers.ts:1330-1348`) არ არსებობს ფილტრი ენაზე, ფასზე, სტატუსზე, საათებზე. |
| 5 | ორგანიზაციის გვერდი | **2** | სტრუქტურა კარგია (TrustPanel, WhoWeHelpCard, branches, map), მაგრამ: rating 0/1110, languages აკლია 653/1110, phone 331, email 436 (`04-db-content §2`); `officeHours`/`serviceArea` 0/538 (`orgs-phase2.json`); პროვენანსი UI-ში არ ჩანს; error state = "Grant Not Found" (`OrganizationDetail.tsx:128-131`, screenshot). |
| 6 | AI ასისტენტი | **3** | Haiku 4.5, 8 iteration, tools DB+website+GrantedAI (`grantAssistant.ts:67-72,127-128`); protected + 20/min rate limit (`routers.ts:1301`, `bootstrap.ts:134`); პრომპტი "grant advisor … viewing a specific grant detail page" (`grantAssistant.ts:101`) გამოიყენება ზოგად `/ai-assistant` გვერდზეც (`AiAssistant.tsx:45`); org-კონტექსტში enrichment ველები არ გადაეცემა (`orgFocusContext.ts:15-27`). |
| 7 | ენობრივი UX | **3** | 5 ენა, localStorage persistence (`LanguageContext.tsx:90-98`), browser-lang autodetect არ არის; grant თარგმანი 1080/1102 (`04 §7`); org content 0% ლოკალიზებული (`translations` JSON არ იკითხება); ka ხარისხი საშუალო — "US Residents Only" → "მხოლოდ აშშ-ს მოქალაქეები" (`ka.ts:249`) ემიგრანტისთვის კრიტიკული შეცდომაა. უკრაინული/არაბული/ფარსი — არა. |
| 8 | Mobile & performance | **2** | Lighthouse mobile: `/` 38, `/catalog` 26 (TBT 4.2 s, 10.5 MB), `/organizations/:id` 39 (LCP 9.1 s) (`09-lighthouse-after-3-4`). Bottom nav 5 tab, "AI" label უთარგმნელი (`MobileBottomNav.tsx:43`); sticky CTA მხოლოდ "Visit website" — "დარეკვა" არ არის (`OrganizationDetail.tsx:556-580`). |
| 9 | ნდობა & უსაფრთხოება | **1** | გამოგონილი testimonials/"500+ members" (`en.ts:98-111` vs users=0); "verified" claim-ები vs 0 verification; cookie consent არ არის; Privacy ამბობს "analytics cookies" (`Privacy.tsx:68`) როცა analytics გამორთულია (`index.html:31`); onboarding ინახავს ვიზის ტიპს/LEGAL საჭიროებას ელფოსტასთან ერთად ყოველგვარი შენიშვნის გარეშე; disclaimer მხოლოდ `/terms`-ზე (`en.ts:713-714`). |
| 10 | კონტენტის ხარვეზები | **1** | არც ერთი გზამკვლევი/პროცედურა/ჩეკლისტი; documentsRequired = 6 შაბლონური სტრინგი 616/629-ზე; საათები 0; newsletter = "N new grants added" (`emailService.ts:279-307`), subscribers = 0. |
| 11 | მონაცემთა მოდელის შესაბამისობა | **3** | სწორი ველები არსებობს (`orgLanguages`, `acceptsUndocumented`, `serviceCost`, `appointmentPolicy`, `organizationHousing`, `emigrationPurpose`, provenance სვეტები — `schema.ts:213-290`), მაგრამ 0% შევსებულია; არ არსებობს Service, Procedure, EligibilityByStatus, OpeningHours, Document ერთეულები; 350 გრანტი დაუკავშირებელი, ~30 ორგ. ნაგავი-სახელით (`04b`). |
| 12 | Retention loop | **1** | მხოლოდ saved *grants* (`useSaveEntity.ts` → `grants.toggleSave`), ორგანიზაციის შენახვა გამორთულია (`OrganizationDetail.tsx:16-17,236`); saved ბმულები legacy `/grant/:id`-ზე (`Dashboard.tsx:310`); alerts პროფილზე მიბმული არ არის; saved_grants=0, subscribers=0, notification_history=0 (`04 §1,§14,§15`). |

**საშუალო: 1.9 / 5.**

---

## 3. Top 10 პრობლემა (მომხმარებლის ზეგავლენით დალაგებული)

### #1 — პროდუქტი ეუბნება არასწორ ადამიანს არასწორ რამეს
- **მტკიცებულება:** `en.ts:17-33` (hero: grants, $9/month, "29+ countries"), `en.ts:78-86` FAQ ("cancer, autism, cerebral palsy…"), `en.ts:45-68` "What you get" — 5-ვე კატეგორია სამედიცინო/დისაბილითი. Copy-ში სიტყვები "immigrant / newcomer / asylum / residence permit" hero-ში არ არსებობს. DB: ქვეყნების რეალური რაოდენობა **9** (`04-db-content §10` — top-15 მოთხოვნაზე 9 რიგი დაბრუნდა), არა 29.
- **ვინ ზარალდება:** ყველა ახალი ვიზიტორი ემიგრანტული სეგმენტიდან — bounce პირველ ეკრანზე; ქართველი ოჯახი ლიონში hero-დან ვერ ხვდება, რომ საიტს 493 ფრანგული ორგანიზაცია აქვს.
- **მიმართულება:** ქვეყანა/ქალაქი-first landing ("ახლახან ჩამოხვედით საფრანგეთში? აი 493 ორგანიზაცია, რომელიც დაგეხმარებათ"), რეალური რიცხვები DB-დან (`organizations.count`, countries), "Manus" copy-ს ამოღება.

### #2 — Paywall არასწორ ადგილას დგას და არაფერს იცავს
- **მტკიცებულება:** `Catalog.tsx:53` `PREVIEW_ITEMS = 3`; `:174-175` page=1/pageSize=3 არა-გამომწერისთვის; `:460-462` `mapPoints` გამომწერობას არ ამოწმებს → რუკაზე ყველა 1,324 branch ჩანს, კლიკი → `/organizations/:orgId` საჯარო (`routers.ts:1368-1372`). არავითარი "3 of 1,110 — subscribe" ბანერი (`t.catalog.memberBanner` unused). `12-subscription-funnel #1`: `subscription.activate` ტრივიალურად bypass-ადია.
- **ვინ ზარალდება:** ორივე მხარე — მომხმარებელი ხედავს ცარიელ სიას ახსნის გარეშე (screenshot: "List (0)", "0 · 0"), მფლობელი — არც შემოსავალი, არც ნდობა.
- **მიმართულება:** დირექტორია უფასო (ეს საზოგადოებრივი სიკეთეა და SEO-ს წყარო), ფასიანი — პერსონალური alert-ები / AI / "ჩემი გეგმა" ან B2B (NGO/სოცმუშაკი). თუ paywall რჩება — ერთი ცხადი ბანერი + სრული სია blur-ით, არა 3 ჩანაწერი.

### #3 — ნდობის სიგნალები ცარიელია ან გამოგონილი
- **მტკიცებულება:** `en.ts:98-111` testimonials ("Sarah M.", "500+ Active members") vs `users = 0`; `en.ts:47` "researched, verified"; `en.ts:985` "538 verified organizations" vs `contactEnrichmentStatus` pending 1110/1110, `phone_no_provenance` 779, `email_no_provenance` 674 (`04 §8-9`); `googleRating` null → TrustPanel არ რენდერდება (`TrustPanel.tsx:32`); WhoWeHelpCard 5 რიგი "unconfirmed" პრაქტიკულად ყველა ორგ.-ზე (`orgs-phase3b.json`: `acceptsUndocumented` null 538/538; DB default "unknown", `schema.ts:216-223`).
- **ვინ ზარალდება:** უსაბუთო/დაუზღვეველი მომხმარებელი — მისთვის "სტატუსის წესი დასადასტურებელია" ნიშნავს "ვერ წავალ".
- **მიმართულება:** testimonials ამოღება სანამ რეალური არ არის; "verified" → "last checked {date}" პროვენანსით (სვეტები უკვე არსებობს: `phoneSource`, `phoneVerifiedAt`, `updatedAt`); WhoWeHelpCard — მხოლოდ ცნობილი რიგები + ერთი ხაზი "დანარჩენი დაუდასტურებელია, დარეკეთ".

### #4 — Onboarding-ის პასუხები არსად არ მუშაობს
- **მტკიცებულება:** `OnboardingFlow.tsx:52-58` ინახავს `targetCountry/purposes/needs`; `Dashboard.tsx:235-254` აჩვენებს მხოლოდ დროშას + ემოჯებს; `grep fundingSection|needsSection|noFundingResults` კომპონენტებში = 0 შედეგი; `Dashboard.tsx:53-56` `catalog.list` მხოლოდ saved-ისთვის. ორი პარალელური onboarding (`OnboardingModal.tsx` welcome-modal + `/onboarding` flow) — მომხმარებელი ორჯერ "იწყებს".
- **ვინ ზარალდება:** ყველა რეგისტრირებული — 3 ნაბიჯი ვნებისთვის, შედეგი "ვნახო ჩემი შედეგები" (`ka.ts:410`) → ცარიელი dashboard.
- **მიმართულება:** Dashboard = `organizations.list` გაფილტრული `country=targetCountry` + need→domain mapping; "purpose" არასავალდებულო; onboarding-ში ქალაქი + ენა + სტატუსი (არა ვიზის ქვეტიპი).

### #5 — ტაქსონომია და ფილტრები სამედიცინო გრანტისთვისაა, არა ინტეგრაციისთვის
- **მტკიცებულება:** `constants.ts:44-80` 17 კატეგორია, `catalog.json`-ში 9 გამოყენებული (medical 288, financial 110, other 61, housing 48, social 43, assistive 36, scholarships 24, travel 13, international 6); ფილტრები `en.ts:195-266`: დიაგნოზი (16 მნიშვნელობა), B-2 ვიზა, დაფინანსების ტიპი, deadline; `REGIONS` = US/EU/GB (`constants.ts:96-100`); API `organizations.list` (`routers.ts:1330-1348`) — არც ენა, არც ფასი, არც სტატუსი, არც "ღიაა ახლა". Onboarding needs VISA/LEGAL/LANGUAGE/BANKING ↔ კატეგორია: არცერთი.
- **ვინ ზარალდება:** რუსულენოვანი თავშესაფრის მაძიებელი ესპანეთში ვერ ეკითხება საიტს ერთადერთ საჭირო კითხვას: "ვინ მიმიღებს უსაბუთოდ, რუსულად, უფასოდ, ჩემს ქალაქში?"
- **მიმართულება:** §4 ტაქსონომია; ფილტრები: დომენი × ქალაქი × ენა × ფასი × სტატუსი × ღიაა-დღეს; დიაგნოზი/B-2 → მხოლოდ "ჯანდაცვა" დომენის ქვეფილტრი.

### #6 — საფრანგეთის მდიდარი მონაცემები UI-ში არ იხსნება
- **მტკიცებულება:** `schema.ts:262-290` (`servicesOffered`, `targetAudience`, `emigrationPurpose`, `isNational`, `organizationHousing` 102 რიგი); `drizzle/0018_france_schema_and_drop_org_translations.sql` არსებობს; DB-ში FR = 493 (`04 §10`); `grep` კლიენტში: `OrganizationDetail.tsx` არცერთს არ რენდერებს; `db.ts` `organizationHousing`-ს არ JOIN-ავს; `organizations.translations` JSON არასოდეს იკითხება → ფრანგი/ქართველი მომხმარებელი ორგანიზაციის აღწერას ერთ ენაზე ხედავს. PLAN §3: ~19% უჯრა ქართულად დარჩა არა-KA sheet-ებზე — validation ფილტრი გეგმაშია, არა კოდში (ვერ დავადასტურე import-ის შედეგი).
- **ვინ ზარალდება:** საფრანგეთის სეგმენტი — სწორედ ის, ვისთვისაც pivot გაკეთდა.
- **მიმართულება:** PLAN §5 Wave 3 (ServicesOfferedCard, TargetAudienceCard, HousingCard) + `translations[lang]` fallback chain (`pickLocalized` უკვე არსებობს `localizeEntity.ts`).

### #7 — ორგანიზაციის გვერდზე "რას მივიღებ აქ" და "როგორ მივიდე" არ არის
- **მტკიცებულება:** `OrganizationDetail.tsx` სექციები: badges (raw category slug, `:261` `{cat}` უთარგმნელი), title, stat strip (Branches/Programs/Categories — ემიგრანტისთვის უსარგებლო რიცხვები), TrustPanel, description, WhoWeHelp, serviceArea (0/538 შევსებული), Visit website/PDF, map, contact (`officeHours` 0/538), social, branches. არ არის: "რა სერვისს იძლევა", "რა უნდა მოიტანო", "როგორ ჩავეწერო", "დღეს ღიაა?", directions ბმული (`t.detail.getDirections` არსებობს `ka.ts:1127`, org გვერდზე არ გამოიყენება). Error state: `t.grantDetail.notFound` ("Grant Not Found") ქსელის შეცდომაზეც (screenshot).
- **ვინ ზარალდება:** ტელეფონით მდგარი ადამიანი ორგანიზაციის კართან.
- **მიმართულება:** Mobile sticky bar: **დარეკვა · მარშრუტი · საიტი**; "მოიტანეთ" ბლოკი; საათები სტრუქტურირებული; error state განცალკევება (offline vs 404).

### #8 — ენა: ორგანიზაციის კონტენტი მონოლინგვურია, ქართული copy-ში სახიფათო შეცდომები
- **მტკიცებულება:** `LanguageContext.tsx:73-76` `COUNTRY_LABELS` მხოლოდ US/International → org გვერდზე "FR", "GB" raw; `tCatalogContent` მხოლოდ grants-ისთვის; ka spot-check (დანართი A): `ka.ts:249` "მხოლოდ აშშ-ს მოქალაქეები" (EN "US Residents Only" — რეზიდენტი ≠ მოქალაქე; ru/fr სწორია); `ka.ts:171` "მოძებნეთ … მდგომარეობით" (ambiguous); "&" ქართულ სათაურებში (`ka.ts:19`); `MobileBottomNav.tsx:43` "AI" hardcoded; ავტო-detect არ არის (`LanguageContext.tsx:92` default "en"). უკრაინული/არაბული/ფარსი/თურქული — არ არის, თუმცა FR/ES ლტოლვილთა ნაკადებში ეს ენები დომინირებს.
- **ვინ ზარალდება:** ქართველი მკითხველი, რომელიც "მოქალაქეები"-ს გამო ფიქრობს, რომ არ ერგება.
- **მიმართულება:** 6 კონკრეტული ka fix (§5 quick wins), org translations pipeline, `navigator.language` autodetect პირველ ვიზიტზე.

### #9 — მობილურზე ნელი და ბლანკი ეკრანები
- **მტკიცებულება:** `09-lighthouse-after-3-4`: mobile `/catalog` score 26, TBT 4,196 ms, 10.5 MB; `/organizations/:id` LCP 9.1 s; `App.tsx:42-44` `PageFallback` = ცარიელი div (Slow 4G-ზე რამდენიმე წამი თეთრი ეკრანი lazy route-ებზე); `MobileBottomNav.tsx:49` Dashboard tab ანონიმურს login-ზე აგზავნის სრული reload-ით.
- **ვინ ზარალდება:** ყველა ტელეფონის მომხმარებელი prepaid ინტერნეტით.
- **მიმართულება:** skeleton fallback; list-first, map on demand (უკვე ასეა), მარკერების server-side pagination/clustering (10 MB → <2 MB); org გვერდზე map lazy below fold.

### #10 — კონფიდენციალურობა მოწყვლადი მომხმარებლისთვის
- **მტკიცებულება:** onboarding ინახავს `needs` (LEGAL, VISA ქვეტიპით: `medical_visa`, `nomad_visa`…) `users` ცხრილში ელფოსტასთან ერთად (`OnboardingFlow.tsx:52-58`, `db.ts:499-518`) — ნაბიჯებზე კონფიდენციალურობის არც ერთი სიტყვა; cookie consent არ არსებობს (`grep CookieBanner` = 0); `Privacy.tsx:68` "We may also use analytics cookies" (analytics გამორთულია, `index.html:31`); "Depending on your location, you may have the right to" (`Privacy.tsx:80`) — RGPD-სთვის არასაკმარისი (legal basis, DPO, retention არ არის); `sameSite: "none"` (`11-security-review`). Terms disclaimer "may change without notice — verify" (`en.ts:714`) org გვერდზე არ ჩანს.
- **ვინ ზარალდება:** უსაბუთო/თავშესაფრის მაძიებელი — მისი სტატუსური ინფორმაცია DB-ში ინახება explicit consent-ის გარეშე.
- **მიმართულება:** onboarding-ში "ამ პასუხებს არ ვინახავთ სახელთან ერთად / შეგიძლიათ გამოტოვოთ"; სტატუსის ველი მხოლოდ ფილტრად (client-side), არა პროფილში; per-page "ინფორმაცია შეიძლება მოძველდეს — გადაამოწმეთ" + "შეცდომის შეტყობინება".

---

## 4. მონაცემთა მოდელის შესაბამისობა

### 4.1 რომელი არსებული ველი ემსახურება ინტეგრაციას

| ველი (`drizzle/schema.ts`) | ინტეგრაციული კითხვა | რეალური დაფარვა |
|---|---|---|
| `organizations.languages` (`orgLanguages`, :214) | "ჩემს ენაზე მელაპარაკებიან?" | აკლია 653/1110 (`04 §2`) |
| `acceptsUndocumented` (:215) | "უსაბუთოდ მიმიღებენ?" | 0 ცნობილი (sample 538/538 null → default `unknown`) |
| `acceptsUninsured` (:217) | "დაზღვევის გარეშე?" | 0 ცნობილი |
| `serviceCost` (:219) | "უფასოა?" | 0 ცნობილი (France import-მა უნდა შეავსოს 624-ზე — ვერ დავადასტურე) |
| `appointmentPolicy` (:221) | "უბრალოდ მივიდე?" | 0 ცნობილი |
| `officeHours` (:210, varchar 255) | "ახლა ღიაა?" | 0/538 (`orgs-phase2.json`) |
| `serviceArea` (:209) | "ჩემს რაიონს ემსახურება?" | 0/538 |
| `hqAddress`, branches lat/lng | "სად არის?" | 1,245/1,324 branch geocoded (94%, `04b`) — **საუკეთესო ველი** |
| `phone` / `email` / `website` | "როგორ დავუკავშირდე?" | აკლია 331 / 436 / 257 (`04 §2`) |
| `phoneSource`, `phoneVerifiedAt`, `emailSource`, `emailVerifiedAt` (:238-241) | "სანდოა?" | პროვენანსი არ აქვს 779 / 674 |
| `googleRating`, `googleReviewCount`, `googlePlaceId` (:225-227) | "სხვები რას ამბობენ?" | 0/1110 |
| `servicesOffered`, `targetAudience` (:277-278) | "რას იძლევა / ვისთვის?" | 624 FR (Excel 100%/100% — PLAN §1), UI არ აჩვენებს |
| `emigrationPurpose` (:279) | all/study/medical/work | 624 FR, არ იფილტრება |
| `organizationHousing` (:299-315) | თავშესაფარი, ტევადობა, ბავშვები, ხანგრძლივობა | 102 რიგი, არ JOIN-დება |
| `isNational` (:283) | "ეროვნული თუ ადგილობრივი?" | 54 FR |
| `translations` JSON (:270) | 5 ენა | ინახება, არ იკითხება |
| `grants.*` enrichment (`deadline`, `documentsRequired`, `targetDiagnosis`, `b2VisaEligible`) | გრანტის კითხვები | 100% შევსებული, მაგრამ LLM-შაბლონური (documentsRequired 6 სტრინგი = 616/629) |

### 4.2 რაც აკლია (ერთეულები)

| აკლია | რატომ არის კრიტიკული | მინიმალური ფორმა |
|---|---|---|
| **Service** (org 1:N) | ერთ ორგანიზაციას (მაგ. France terre d'asile) აქვს 5 სხვადასხვა სერვისი სხვადასხვა პირობებით | `serviceId, orgId, domain, title, description, eligibilityStatus[], cost, languages[], documents[], howToAccess, branchIds[]` |
| **EligibilityByStatus** | "ლტოლვილი/თავშესაფრის მაძიებელი/უსაბუთო/სტუდენტი/მუშა/EU citizen" — ბინარული `acceptsUndocumented` არასაკმარისია | enum სია service-ზე |
| **Procedure / Guide** | "პირველი 30 დღე", "როგორ ავიღო titre de séjour", "CAF-ში რეგისტრაცია" — ეს არის რაც ემიგრანტი რეალურად კითხულობს | markdown + steps[] + linked services + country + lastReviewed |
| **Document** (ლექსიკონი) | "récépissé", "attestation d'hébergement" — ერთხელ ახსნილი, ყველგან მიბმული | `code, name×5, whereToGet` |
| **OpeningHours** (სტრუქტურირებული) | "ღიაა ახლა" ფილტრი; varchar 255 არ იფილტრება | branch-ზე `weekday, open, close` ან Google `regularOpeningHours` |
| **Capacity / waitlist / lastKnownAvailability** | თავშესაფრებზე მთავარი კითხვა "ადგილი აქვთ?" | `organizationHousing.capacity` არსებობს (varchar) — + `availabilityCheckedAt` |
| **VerificationLog** | "last verified" ორგ. დონეზე, არა მხოლოდ phone/email | `orgId, field, source, verifiedAt, verifiedBy` |
| **UserFeedback / report** | "ეს ნომერი აღარ მუშაობს" — ყველაზე იაფი verification | `orgId, type, note, createdAt` |

### 4.3 ტაქსონომია: მიმდინარე კატეგორია → ინტეგრაციული დომენი

| მიმდინარე `category` (`constants.ts`) | catalog.json n | შემოთავაზებული დომენი | კომენტარი |
|---|---|---|---|
| `medical_treatment` | 288 | **ჯანდაცვა** (ექიმი, PASS/PUMa, ფსიქიკური ჯანმრთელობა, მედიკამენტი) | დიაგნოზი → ქვეფილტრი |
| `assistive_technology` | 36 | **ჯანდაცვა › შშმ / დამხმარე საშუალებები** | |
| `financial_assistance` | 110 | **ფული & შემწეობები** (CAF, RSA, ერთჯერადი დახმარება) | |
| `food_basic_needs` | 0 (snapshot) | **საბაზისო საჭიროებები** (საკვები, ტანსაცმელი, ჰიგიენა) | |
| `housing` | 48 | **საცხოვრებელი** (თავშესაფარი, სოციალური ბინა, DALO) | + `organizationHousing` |
| `social_services` | 43 | **სოციალური მხარდაჭერა & თანხლება** (სოცმუშაკი, ორიენტაცია) | |
| `community` | 0 | **საზოგადოება & კავშირი** (დიასპორა, ეკლესია, კლუბები) | |
| `scholarships`, `educational`, `research` | 24 / 0 / 0 | **განათლება** (ზრდასრულთა კურსები, სტიპენდია) | |
| — | — | **ბავშვები & სკოლა** (ჩარიცხვა, PMI, კრეშები) | ახალი |
| — | — | **ენა** (FLE/OFII კურსები, თარჯიმანი) | ახალი; onboarding `LANGUAGE` |
| `startup`, `business_funding`, `individual` | 0 | **სამუშაო & შემოსავალი** (France Travail, დიპლომის აღიარება, სამუშაო ნებართვა) | onboarding `BUSINESS` |
| `travel_transport` | 13 | **მობილობა** | |
| — | — | **საბუთები & სტატუსი** (préfecture, OFPRA, ადვოკატი, ANEF) | ახალი; onboarding `VISA`, `LEGAL` |
| — | — | **უსაფრთხოება & უფლებები** (ძალადობა, დისკრიმინაცია, hotline) | ახალი |
| — | — | **ადმინ./ციფრული წვდომა** (ბანკის ანგარიში, France Connect, ტელეფონი) | onboarding `BANKING` |
| `international`, `other` | 6 / 61 | გადასანაწილებელი | `other` 61 = 10% — ცუდი სიგნალი |

France Excel-ის `mainCategory` (9 მნიშვნელობა, PLAN §2) სავარაუდოდ ამ დომენებს უკვე ეხმიანება — import-ის შემდეგ mapping ცხრილი ამ სიაზე უნდა გაკეთდეს, არა 17-კატეგორიან `constants.ts`-ზე.

### 4.4 მონაცემთა ხარისხის ვალი, რომელიც ნდობას ბლოკავს

| პრობლემა | რიცხვი | წყარო |
|---|---|---|
| გრანტი ორგანიზაციის გარეშე (დაუკავშირებელი) | 350 / 1,102 | `04b` Sub-task B |
| ორგანიზაცია ნაგავი-სახელით (ქართული header-ები: "დეტალები", "მგზავრობა") | ~30 | `04b` Future work |
| branch კოორდინატის გარეშე | 79 / 1,324 | `04b` Sub-task C |
| org `description` მოკლე/გენერიკული | `orgs-phase2.json` ნიმუში: "The ALS Society of Canada provides an equipment loan program…" (1 წინადადება) | sample |
| grants `eligibility` შაბლონი "Ages X-Y; …; Location: …" | 481 / 629 | `catalog.json` |
| grants `applicationProcess` = "Apply online via <url>" | 629 / 629 | `catalog.json` |
| grants `documentsRequired` 6 canned სტრინგი | 616 / 629 | `catalog.json` |
| grants `targetDiagnosis = General` | 431 / 629 | `catalog.json` |
| grants `state = Nationwide` | 503 / 629 | `catalog.json` — "near me" შეუძლებელია |
| grants "amount" = Free/Free service | 526 / 629 | ე.ი. ესენი სერვისებია, არა გრანტები |
| grant translations აკლია | 22 / 1,102 თითო ენაზე | `04 §7` |
| org translations | 0 UI-ში | grep |
| contact enrichment | 0 / 1,110 დაწყებული | `04 §9`; cron პაუზაზეა (`git log 3ff413f`) |

---

## 5. Quick wins (≤2 დღე თითო) vs. სტრუქტურული ცვლილებები

### Quick wins

| # | ცვლილება | ფაილი | ეფექტი |
|---|---|---|---|
| Q1 | Hero/სოციალური მტკიცებულების copy: "500+ members" ამოღება, "29 countries" → live count, "Manus account" → "email", "150+ Housing Aid" → რეალური | `en/fr/es/ru/ka.ts` hero/testimonials/howItWorks | ნდობა, სიმართლე |
| Q2 | Org გვერდის error state: offline vs. not-found, "Grant" → "ორგანიზაცია" | `OrganizationDetail.tsx:124-141` | mobile fail-state |
| Q3 | კატეგორიის ჩიპები `tCategory(cat)`, ქვეყანა `t.country[code]` fallback | `OrganizationDetail.tsx:256-262`, `LanguageContext.tsx:73-76` | 4 ენაზე raw slug-ების გაქრობა |
| Q4 | "ბოლოს შემოწმდა {date} · წყარო: {source}" ხაზი contact card-ში არსებული სვეტებიდან; თუ ცარიელია — "დაუდასტურებელი, დარეკეთ" | `OrganizationDetail.tsx:406-455` | პროვენანსი ხილული |
| Q5 | Mobile sticky bar: **დარეკვა (tel:) · მარშრუტი (maps) · საიტი** | `OrganizationDetail.tsx:556-580` | #1 მობილური ქმედება |
| Q6 | არა-გამომწერს: `t.catalog.memberBanner` ბანერი + "3 / {total}" — ან paywall მოხსნა (გადაწყვეტილება #2) | `Catalog.tsx` | გაუგებარი ცარიელი სია |
| Q7 | ka fix-ები: `usResidentsOnly` → "მხოლოდ აშშ-ს რეზიდენტებისთვის"; `searchPlaceholder` "მდგომარეობით" → "დიაგნოზით"; "&" → "და" სათაურებში; `placeholderTbd` "ჯერ არ არის შეყვანილი" → "დასადასტურებელია"; `MobileBottomNav` "AI" → i18n | `ka.ts:19,171,249,1204`, `MobileBottomNav.tsx:43` | ქართული სანდოობა |
| Q8 | `orgFocusContext`-ში enrichment ველების გადაცემა (languages, cost, status, appointment, hours) + პრომპტში "თუ unknown — უთხარი, რომ დაურეკოს" | `orgFocusContext.ts:15-27,113-125` | AI პასუხობს რეალურ კითხვებს |
| Q9 | ServicesOffered / TargetAudience / Housing ბარათები + `translations[lang]` fallback (PLAN §5, ველები DB-ში უკვე არის) | `OrganizationDetail.tsx`, `db.ts getOrganizationDetail` (+ housing JOIN) | 493 FR org სასარგებლო ხდება |
| Q10 | ორგ. გვერდზე ერთხაზიანი disclaimer (`termsDisclaimerText` re-use) + "შეცდომის შეტყობინება" mailto | `OrganizationDetail.tsx` | ნდობა/უსაფრთხოება |
| Q11 | Onboarding: purpose არასავალდებულო; ნაბიჯ 3-ზე კონფიდენციალურობის ხაზი + "გამოტოვება" (`t.profile.skip` არსებობს) | `StepPurpose.tsx:101`, `StepNeeds.tsx` | inclusion, GDPR |
| Q12 | WhoWeHelpCard: მხოლოდ ცნობილი რიგები; ყველა unknown → ერთი muted ხაზი | `WhoWeHelpCard.tsx:53-84` | 5 "unconfirmed" რიგის ეფექტის მოხსნა |
| Q13 | `navigator.language` → საწყისი ენა პირველ ვიზიტზე | `LanguageContext.tsx:90-93` | ka/ru მომხმარებელი პირდაპირ თავის ენაზე |

### სტრუქტურული (კვირები, გადაწყვეტილებას ითხოვს)

| # | ცვლილება | დამოკიდებულება |
|---|---|---|
| S1 | **აუდიტორია & მონეტიზაცია:** დირექტორია უფასო; ფასიანი — alerts/AI/plan, ან B2B (NGO, სოცმუშაკი, დიასპორული ორგანიზაცია). `subscription.activate` წაშლა (`12 #1`). | მფლობელის გადაწყვეტილება |
| S2 | **ტაქსონომია → ინტეგრაციული დომენები** (§4.3) + `mainCategory` mapping; ფილტრები: დომენი × ქალაქი × ენა × ფასი × სტატუსი × ღიაა | migration + UI + i18n |
| S3 | **Service ერთეული + EligibilityByStatus + Document ლექსიკონი** (§4.2) | Tamar-ის wave; migration golden rule |
| S4 | **Procedure/Guide კონტენტის ტიპი** + 10 საწყისი გზამკვლევი FR-ისთვის (Georgian-first: OFPRA, préfecture, CAF, PUMa, სკოლა) | რედაქტორი; `french-admin-etiquette` skill არსებობს |
| S5 | **ქვეყანა/ქალაქი-first IA:** `/fr`, `/fr/lyon` landing-ები, hero DB რიცხვებით | SEO + i18n routes |
| S6 | **Onboarding v2:** ქვეყანა → ქალაქი → ენა → სტატუსი (optional, client-only) → საჭიროებები (დომენები) → პერსონალიზებული სია + "ჩემი გეგმა" | S2 |
| S7 | **Enrichment backfill** 5 accessibility ველზე პროვენანსით (Google Places + org site extract-only, PROJECT_MAP anti-hallucination rule); cron-ის ჩართვა | `GOOGLE_MAPS_API_KEY` secret (`3ff413f`) |
| S8 | **Org localization pipeline:** `translations` JSON → UI; `translate-missing.ts --table=organizations` | Lila-ს wave |
| S9 | **Retention:** org save (`savedGrants` → `savedEntities`), profile-based alerts ("ახალი ორგანიზაცია ლიონში, რუსულად"), journey checklist | S3, S6 |
| S10 | **Data cleanup:** 350 დაუკავშირებელი grant → programs ან archive; 30 ნაგავი org წაშლა; grants LLM-შაბლონები → NULL სადაც არ არის წყარო | სკრიპტი |
| S11 | **Perf:** marker pagination/clustering server-side; skeleton fallbacks; org map below fold | Arash |
| S12 | **ენების გაფართოება:** uk/ar (RTL) მინიმუმ UI + org descriptions FR-ისთვის | გადაწყვეტილება |

---

## 6. შემოთავაზებული მომხმარებლის ჟურნეები (ინტეგრაციული ვერსია)

### J1 — ქართველი ოჯახი, ახლახან ჩამოვიდა ლიონში (საცხოვრებელი, სკოლა, ენა)
1. Google/დიასპორის ჯგუფიდან შედის `/fr` (ქართულად, autodetect): "საფრანგეთში ახლახან ჩამოხვედით? 493 ორგანიზაცია, რომელიც დაგეხმარებათ."
2. ირჩევს ქალაქს (Lyon) — ან geolocation "ჩემთან ახლოს".
3. ხედავს "პირველი 30 დღე" ჩეკლისტს: Préfecture/ANEF → CAF → PUMa → სკოლაში ჩარიცხვა → ენის კურსი. თითო პუნქტი = გზამკვლევი + 2-3 ორგანიზაცია ლიონში.
4. ხსნის "საცხოვრებელი" დომენს → ფილტრი: უფასო · ბავშვებით · ენა ka/ru/en → HousingCard-ით (ტევადობა, ხანგრძლივობა, რეგისტრაციის პროცესი).
5. ორგანიზაციის გვერდზე: "რას მიიღებთ აქ" (servicesOffered), "მოიტანეთ" (documents), საათები, **დარეკვა / მარშრუტი**, "ბოლოს შემოწმდა 2026-05-04".
6. ინახავს 3 ორგანიზაციას "ჩემს გეგმაში" (login მხოლოდ აქ ითხოვება); ჩეკლისტის პროგრესი ინახება.
7. კვირაში ერთხელ alert: "ახალი: ენის უფასო კურსი ლიონში, ჯგუფი რუსულენოვანთათვის".

### J2 — რუსულენოვანი თავშესაფრის მაძიებელი ესპანეთში (სტატუსი, იურიდიული, თავშესაფარი)
1. `/es` რუსულად; hero-ს ქვეშ status-first შესვლა: "ჩემი მდგომარეობა: თავშესაფარი ვითხოვე / ჯერ არ მითხოვია / უსაბუთო ვარ" — **არ ინახება სერვერზე**, მხოლოდ ფილტრია.
2. სია ავტომატურად: `eligibilityStatus ∋ asylum_seeker` · ენა ru · ფასი free · ქალაქი.
3. პირველი დომენი "საბუთები & სტატუსი": გზამკვლევი "თავშესაფრის პროცედურა ესპანეთში 5 ნაბიჯად" + CEAR/ACCEM-ტიპის ორგანიზაციები, "მიღება ჩაწერით" ბეჯით.
4. AI ასისტენტი org-კონტექსტში: "ხვალ შემიძლია მივიდე?" → პასუხობს appointmentPolicy/hours-დან ან ამბობს "დაუდასტურებელია — დარეკეთ" წყაროს ბმულით.
5. "შეცდომის შეტყობინება" ღილაკი — მომხმარებელი ხდება verification-ის წყარო.

### J3 — ქართველი პაციენტი, აშშ-ში მკურნალობას ეძებს (არსებული სამედიცინო პერსონა)
1. `/us` ქართულად → დომენი "ჯანდაცვა" → ქვეფილტრი დიაგნოზი + "B-2 ვიზით შესაძლებელი" (არსებული ველი, აქ ლეგიტიმურია).
2. შედეგები: charity care პროგრამები + ტრანსპორტი + `hospital_nearby` საცხოვრებელი (Ronald McDonald-ტიპი) ერთ სიაში.
3. Org გვერდი: "მოიტანეთ: სამედიცინო ჩანაწერები, დიაგნოზის დადასტურება, ექიმის წერილი" (documents ლექსიკონი, არა canned სტრინგი), განაცხადის ბმული, "ბოლოს შემოწმდა".
4. AI: "ეს ორგანიზაცია უცხოელ პაციენტს იღებს?" → `fetch_org_website` + ციტატა.
5. ინახავს გეგმაში; alert deadline-ზე (აქ `deadline` ველი აზრიანია).

---

## 7. ღია კითხვები მფლობელისთვის

1. **ვინ იხდის?** ახლადჩამოსული ($9/თვე მისთვის ხშირად შეუძლებელია) თუ NGO/სოცმუშაკი/დიასპორული ორგანიზაცია (B2B)? პასუხი განსაზღვრავს paywall-ის ადგილს (#2, S1).
2. **ორი პროდუქტი თუ ერთი?** აშშ-ს სამედიცინო გრანტების კატალოგი (618/629 US, 288 medical) და საფრანგეთის ემიგრანტული დირექტორია (493 FR) — რჩება ორივე? თუ კი, ცალკე landing-ები სჭირდება.
3. **პრიორიტეტული ქვეყანა და ქალაქები?** FR (Paris 222, Reims 25, Lyon 20 — PLAN §1) vs. US. ქართული დიასპორა პირველი სეგმენტია?
4. **სტატუსის მონაცემი:** გვსურს გამოვაქვეყნოთ "უსაბუთოებს იღებს" ორგანიზაციის დასტურის გარეშე? რა არის verification-ის წესი და ვინ პასუხობს შეცდომაზე?
5. **"Verified"-ის განმარტება:** რა SLA-ა (90 დღე? — `04 §8` უკვე ამ ზღვარს იყენებს), ვინ ამოწმებს, რა ჩანს UI-ში?
6. **რედაქციული რესურსი:** ვინ წერს/ამოწმებს გზამკვლევებს (S4)? წყაროები (service-public.fr, OFII, CAF) — extract-only წესი აქაც ვრცელდება?
7. **ენები:** უკრაინული/არაბული/ფარსი დაემატოს? ქართული და რუსული — რომელია პირველადი ქართველი დიასპორისთვის საფრანგეთში?
8. **AI-ს ფარგლები:** ინფორმაციული მხოლოდ? იურიდიული/სამედიცინო disclaimer? per-user ქვოტა (ახლა 20/min/IP, per-user ლიმიტი არა)?
9. **გრანტების ბედი:** 350 დაუკავშირებელი grant — programs-ად გადაიქცევა (ORG-CENTRIC Q4) თუ archive? LLM-შაბლონური enrichment ველები (documentsRequired, applicationProcess) UI-დან ამოვიღოთ სანამ წყარო არ ექნება?
10. **RGPD posture:** cookie/consent, DPO, legal basis — საფრანგეთის აუდიტორიისთვის ეს აუცილებელია launch-ამდე (`france-market-compliance` skill გამოსადეგია).

---

## 8. Screenshot-ები

ლოკალური Vite (`npx vite --port 5173`) + headless Chromium (`/opt/pw-browsers/chromium-1194`), 390 px სიგანე, backend-ის გარეშე (tRPC ვერ პასუხობს — ეს თავად არის finding):

- `./screens/mobile-home.png` — hero რენდერდება სტატიკურად: "Get Access — $9/month" პირველი ღილაკია, სტატისტიკა "640+ / 29+ / 270+ / 150+ Housing Aid", "Sign up … with your Manus account". Bottom nav: Home · Grants & Resources · AI · Dashboard.
- `…/mobile-catalog.png` — API-ს გარეშე: "List (0)", stats "0 · 0", ცარიელი ეკრანი, არც error, არც static fallback (`StaticModeBanner` არსად არ არის mount-ებული — grep = 0).
- `…/mobile-onboarding.png` — progress bar ("Where are you going? / Why are you going? / What will you need…") ჩანს, ნაბიჯის კონტენტი headless virtual-time-ში არ დაიხატა (framer-motion) — არ არის საიმედო finding, მხოლოდ შენიშვნა.
- `…/mobile-org.png` — `/organizations/ORG-0001` backend-ის გარეშე: **"Grant Not Found — The grant you're looking for doesn't exist."** — ქსელის შეცდომა 404-ად და "grant"-ად არის ნაჩვენები (`OrganizationDetail.tsx:124-141`).

Desktop screenshot-ები და ავთენტიფიცირებული მდგომარეობები არ გადაღებულა (დროის ლიმიტი, backend არ არის).

---

## დანართი A — ქართული copy-ს spot-check (22 სტრინგი)

ლეგენდა: ✔︎ ბუნებრივი · ⚠︎ კალკა/ჟარგონი · ✘ აზრობრივი შეცდომა

| # | გასაღები (`client/src/i18n/ka.ts`) | ქართული | EN წყარო | ვერდიქტი |
|---|---|---|---|---|
| 1 | `hero.title` :19 | "იპოვეთ გრანტები, დაფინანსება & მხარდაჭერის სერვისები" | Find Grants, Funding & Support Services | ⚠︎ "&" ქართულში უცხოა → "და"; ტერმინი "გრანტი" ემიგრანტისთვის არარელევანტური |
| 2 | `hero.subtitle` :21 | "…კურირებული ბაზა… შესაბამისობის მიხედვით" | curated … eligibility | ⚠︎ "კურირებული" კალკაა → "შერჩეული"; "შესაბამისობა" გაუგებარია → "ვის ეხება" |
| 3 | `hero.cta` :22 | "წვდომის მიღება — $9/თვე" | Get Access — $9/month | ⚠︎ მექანიკური; "მიიღეთ წვდომა"; ვალუტა $ ფრანგული აუდიტორიისთვის უცხოა |
| 4 | `nav.catalog` :6 | "გრანტები & რესურსები" | Grants & Resources | ⚠︎ "&" |
| 5 | `nav.dashboard` :10 | "პანელი" | Dashboard | ⚠︎ ორაზროვანი (control panel?) → "ჩემი სივრცე" |
| 6 | `profile.stepCountry` :341 | "სად მიდიხართ?" | Where are you going? | ✔︎ ბუნებრივი — მაგრამ hint ":342 სადაც ემიგრაციას გეგმავთ" გულისხმობს, რომ ჯერ არ ჩამოსულხართ (პროდუქტული შეზღუდვა) |
| 7 | `profile.stepPurpose` :343 | "რატომ მიდიხართ?" | Why are you going? | ✔︎ |
| 8 | `profile.stepNeeds` :345 | "რა დაგჭირდებათ გზაში?" | What will you need along the way? | ✔︎ იდიომატური |
| 9 | `profile.certification` :353 | "პროფესიული სერტიფიკაცია / ნოსტრიფიკაცია" | Professional certification / Nostrification | ⚠︎ "ნოსტრიფიკაცია" ჟარგონია → "დიპლომის აღიარება" |
| 10 | `profile.needVisa` :372 | "ვიზა / ბინადრობის ნებართვა" | Visa / Residence permit | ✔︎ |
| 11 | `profile.needLanguage` :377 | "ენა / თარჯიმანი" | Language / Interpreter | ✔︎ |
| 12 | `filters.usResidentsOnly` :249 | "მხოლოდ აშშ-ს მოქალაქეები" | US Residents Only | ✘ **რეზიდენტი ≠ მოქალაქე** — ემიგრანტი ფიქრობს, რომ არ ერგება; ru/fr სწორია |
| 13 | `filters.condition` :206 | "დიაგნოზი" | Condition | ✔︎ EN-ზე უკეთესია |
| 14 | `catalog.searchPlaceholder` :171 | "მოძებნეთ სახელით, ორგანიზაციით ან მდგომარეობით..." | …or condition | ⚠︎ "მდგომარეობით" = state/situation → "დიაგნოზით" |
| 15 | `orgEnrichment.status.yes` :1207 | "ყველას იღებენ, სტატუსის მიუხედავად" | Accepts all, regardless of status | ✔︎ ზუსტი და თბილი |
| 16 | `orgEnrichment.status.no` :1208 | "მხოლოდ ლეგალური რეზიდენტებისთვის" | Legal residents only | ✔︎ (აქ "რეზიდენტი" სწორად არის — #12-თან შეუსაბამობა) |
| 17 | `orgEnrichment.cost.sliding_scale` :1220 | "მოქნილი ტარიფი" | Sliding scale | ⚠︎ გაუგებარი → "შემოსავლის მიხედვით" |
| 18 | `orgEnrichment.appointment.walk_in` :1227 | "მისვლა ნებისმიერ დროს" | Walk-ins welcome | ✔︎ |
| 19 | `orgEnrichment.placeholderTbd` :1204 | "ჯერ არ არის შეყვანილი" | To be confirmed | ⚠︎ ადმინის ენა მომხმარებელს → "დასადასტურებელია — დარეკეთ" |
| 20 | `organizations.subtitle` :985 | "538 დადასტურებული ორგანიზაცია" | 538 verified organizations | ✘ რიცხვი მოძველებული (1,110), "დადასტურებული" — ფაქტობრივად მცდარი |
| 21 | `detail.foundedSince` :1163 | "ფონდირებულია {year}-იდან" | Founded since {year} | ✘ "ფონდირებული" = დაფინანსებული → "დაარსდა {year}-ში" |
| 22 | `aiAssistant.subtitle` :837 | "MCP Toolbox · ცოცხალი ბაზის ძებნა" | MCP Toolbox · Live database search | ⚠︎ ტექნიკური ჟარგონი user-facing copy-ში (EN-შიც) |

**ჯამური ვერდიქტი ქართულზე:** გრამატიკულად კომპეტენტური, script-ი სუფთა (Noto Sans Georgian self-hosted, `index.html:22`), onboarding-ის კითხვები საუკეთესო ნაწილია. პრობლემები: 3 აზრობრივი შეცდომა (#12, #20, #21), ~8 კალკა/ჟარგონი, და მთავარი — ტერმინოლოგია ("გრანტი", "შესაბამისობა", "კურირებული") არის ფონდ-მაძიებლის, არა ემიგრანტის ლექსიკა. რეკომენდაცია: ერთი native review pass ka-ზე ემიგრანტული ლექსიკით (ბინადრობა, თავშესაფარი, სოცმუშაკი, უფასო, ჩაწერა, მოიტანეთ), შემდეგ იგივე ru-ზე (ru მომხმარებელი FR/ES-ში ხშირად უკრაინელი/ბელარუსია — ნეიტრალური ლექსიკა).

## დანართი B — AI ასისტენტის ხარჯი/რისკი (მოკლედ)

- **მოდელი/ციკლი:** `claude-haiku-4-5`, `MAX_ITERATIONS = 8`, `max_tokens = 4096`, 20 message history (`grantAssistant.ts:127-128,149`, `routers.ts:1305-1315`). ერთი კითხვა შეიძლება 8 LLM call-ს + `fetch_org_website` (Jina, ~8k სიმბოლო) + GrantedAI call-ებს გამოიწვევდეს — ხარჯი per-message ცვლადია და ზედა ზღვარი არ აქვს per-user (მხოლოდ 20/min/IP, `bootstrap.ts:134`).
- **სკოპი:** პრომპტი "grant advisor" (`grantAssistant.ts:101-121`) — არ იცის, რომ მომხმარებელი შეიძლება ლტოლვილი იყოს; არ აქვს იურიდიული/სამედიცინო disclaimer; `search_funders` (133k აშშ ფონდი) ემიგრანტისთვის ხმაურია.
- **ჰალუცინაცია:** "Do NOT invent facts" + ციტირების წესი კარგია; მაგრამ org-კონტექსტი (`orgFocusContext.ts:113-125`) არ შეიცავს enrichment ველებს, ამიტომ "უსაბუთოდ მიმიღებენ?"-ზე მოდელი ან საიტს კითხულობს (შეიძლება ვერ იპოვოს) ან ვარაუდობს.
- **რეკომენდაცია:** per-user დღიური ქვოტა (მაგ. 20), org-კონტექსტში 5 accessibility ველი + hours, ერთი ხაზი "ეს ინფორმაციული რჩევაა, არა იურიდიული", და suggested prompts ინტეგრაციულ კითხვებზე ("რა საბუთი მივიტანო?", "რუსულად ლაპარაკობენ?", "დღეს ღიაა?").
