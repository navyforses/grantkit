# 00 — MASTER PLAN: GrantKit → ემიგრანტების ინტეგრაციის მხარდაჭერის პლატფორმა

> **ავტორი:** Tamar (Head of Product & Program Director) · **თარიღი:** 2026-09-18
> **წყაროები:** `01-integration-needs.md` (Ezra), `02-competitors.md` (Nino), `03-tech-diagnostic.md` (Arash), `04-product-ux-data.md` (Priya) + რეპოს ფაილები (`CLAUDE.md`, `.grantkit-redesign/*`, `audit-reports/*`, `drizzle/schema.ts`, `server/routers.ts`).
> **მეთოდი:** ოთხივე ანგარიში სრულად წაკითხული; ყველა რიცხვი, რომელიც ქვემოთ დგას, ან ანგარიშიდანაა (`[E]` Ezra, `[N]` Nino, `[A]` Arash, `[P]` Priya) ან რეპოს ფაილიდან, რომელიც ამ სესიაში თავად გადავამოწმე (`[✓]`). სადაც ანგარიშები ერთმანეთს ეწინააღმდეგება — §10-ში ორივე პოზიციაა და ჩემი გადაწყვეტა. Arash-ის ბრძანებების output-ი და `audit-reports/` ძველ დოკუმენტებზე მაღლა დგას.
> **სფერო:** გეგმა, არა კოდი. რეპოში არაფერი შეცვლილა. საიდუმლო მნიშვნელობები (პაროლი, გასაღები, connection string) ამ დოკუმენტში **არ არის** — მხოლოდ ადგილმდებარეობაა აღწერილი.

---

## 0. TL;DR

1. **განმარტება ერთ წინადადებაში:** GrantKit-ისთვის „ემიგრანტების ინტეგრაციის მხარდაჭერა" ნიშნავს ახალჩამოსულის **ძიებისა და ორიენტაციის ხარჯის შემცირებას** — მის ენაზე, მისი სტატუსისა და ეტაპის მიხედვით ვუთხრათ *ვინ* დაეხმარება, *სად*, *რა პირობით*, *რა საბუთით* და *როგორ მიაღწიოს იქამდე*; არა თავად დახმარების გაწევა.
2. **პოზიციონირება:** „ინტეგრაციის ნავიგატორი ქართველი და რუსულენოვანი ემიგრანტებისთვის" — ენა-first, სტატუს-first, სიღრმე > სიგანე. საფრანგეთი = ვალიდაციისა და reference implementation-ის ქვეყანა, არა შემოსავლის. აშშ-ს სამედიცინო კატალოგი რჩება როგორც „ჯანდაცვის" ვერტიკალი იმავე ტაქსონომიაში — არა ცალკე პროდუქტი.
3. **ბიზნეს-მოდელი:** ემიგრანტისთვის **უფასო**. $9/თვე B2C paywall იხსნება (ის ისედაც არაფერს იცავს — API საჯაროა `[A]`). შემოსავალი: Helper Pro (სოცმუშაკები/მოხალისეები) + პლატფორმის გრანტები (AMIF/Google.org) პირველ 6 თვეში; B2B2C ლიცენზია 6–18 თვეში `[N]`.
4. **Finding #1 — P0 უსაფრთხოება:** production MySQL root პაროლი და proxy host ჩაწერილია commit-ებულ დოკუმენტში (`.grantkit-redesign/AUDIT-CONTINUATION-2026-05-03.md`, „Pending Operator Actions" ბლოკი; host `OPS.md`-შიც) `[A][✓]`; Google Maps ორივე გასაღები ჩატში გაჟონილი 2026-05-04-დან, rotation არ მომხდარა.
5. **Finding #2 — გადახდის გზა მკვდარია:** webhook production-ში fail-closed (503, თუ `PADDLE_WEBHOOK_SECRET` არ არის) `[✓]`, secret Railway-ის დოკუმენტირებულ სიაში არ ფიგურირებს, migration `0020` დაუდასტურებელია `[A]`. კარგი ამბავი: `subscription.activate` bypass (audit #12 CRITICAL) **უკვე ამოღებულია** 2026-05-12-ს `[✓]` — Nino/Priya-ს ეს პუნქტი მოძველებულია.
6. **Finding #3 — ნდობა გამოგონილია:** „500+ Active members" (`en.ts:106`), „538 დადასტურებული ორგანიზაცია" (`ka.ts:985`), „640+", „29 ქვეყანა" — DB-ში users = 0, verification = 0/1,110, ქვეყანა რეალურად 9 `[P][✓]`. მოწყვლადი აუდიტორიისთვის ეს P0-ია, არა copy-fix.
7. **Finding #4 — მონაცემთა მოდელი გრანტ-ცენტრულია:** „სერვისი" და „პროცედურა" entity-ები არ არსებობს; 1,110/1,110 ორგ. `contactEnrichmentStatus=pending`, 779 ტელეფონი provenance-ის გარეშე, 350 orphan grant, ~30 ორგ. Excel-header სახელით; enrichment cron 130/130 ჩავარდა და გათიშულია `[A][✓]`.
8. **Finding #5 — პროექტი 4 თვეა მიძინებული, CI არ არსებობს:** commit/თვე 65 · 119 · 3 · 2 · 2 · 4 `[✓]`; მაისის 12-დან სექტემბრამდე მხოლოდ Copilot-ის pnpm fix-ები; `pnpm check/test/build` მწვანეა (0 TS error, 201/202 test, build 17 წმ) `[A]`, მაგრამ PR-ზე არ ეშვება.
9. **Finding #6 — ბაზარი 100% უფასოა და ქართული არავის აქვს:** Réfugiés.info (8 ენა), Soliguide (27,600 სტრუქტურა), Integreat, USAHello — სახელმწიფო/EU/ფონდების ფულით `[N]`; არცერთს ka არ აქვს — ეს დადასტურებული white space-ია.
10. **ფაზები:** Phase 0 ჰიგიენა + P0 (კვირა 1–2) → Phase 1 ვალიდაცია + რეპოზიციონირება (კვირა 2–4) → Phase 2 საფრანგეთის კონტენტ-მოდელი (კვირა 5–10) → Phase 3 journey + retention (კვირა 11–16) → Phase 4 მასშტაბი (თვე 5+, KPI-gate-ით).
11. **სქემა იცვლება მხოლოდ Phase 2-ში** (migration `0021`), ცალკე PR-ით, migration Railway-ზე merge-მდე — golden rule. Phase 0–1 სქემას არ ეხება.
12. **გუნდი:** 6 persona + მენეჯერი; Phase 0-ში 3 ნაკადი პარალელურად (უსაფრთხოება/CI · copy/ნდობა · docs/data), Phase 1-ში 4.
13. **პირველი მოქმედება:** ოპერატორი აბრუნებს MySQL root პაროლს Railway-ზე და ორივე Google Maps გასაღებს GCP-ში; Claude სესია ასუფთავებს დოკუმენტებს — done when `git grep` → 0 და ძველი credential-ით connect → access denied.
14. **მეორე მოქმედება:** მფლობელი პასუხობს D1 (paywall) და D2 (billing pause vs repair) — ამის გარეშე hero, catalog და Paddle სამუშაო დაბლოკილია.
15. **მესამე მოქმედება:** `.github/workflows/ci.yml` (check + test + build PR-ზე) + branch protection — ყოველი შემდეგი PR ამის უკან გადის.

---

## 1. განმარტება: რას ნიშნავს ემიგრანტების ინტეგრაციის მხარდაჭერა GrantKit-ისთვის

### 1.1. პროდუქტული განმარტება (მიღებული Ezra-ს §1-დან, ადაპტირებული)

Ezra-ს ჩარჩო (Ager & Strang 2008; UK Indicators of Integration 2019; EU CBP; IOM) ერთხმად ამბობს: ინტეგრაცია = *ორმხრივი* პროცესი, რომელიც მოიცავს დასაქმებას, საცხოვრებელს, განათლებას, ჯანმრთელობას, სოციალურ კავშირებს, ენას, უსაფრთხოებას და უფლებებს; ინტეგრაცია ≠ ასიმილაცია და ≠ ჰუმანიტარული relief `[E §1.1–1.2]`. ციფრულ პლატფორმას ამ პროცესის მხოლოდ ერთი ნაწილი შეუძლია — „information landscape"-ში ნავიგაცია და „information precarity"-ს შემცირება `[E §1.3]`.

**GrantKit-ის განმარტება:**

> GrantKit ემიგრანტს ეხმარება ინტეგრაციაში იმით, რომ **ამცირებს მისი ძიების, ორიენტაციისა და ნდობის ხარჯს**: მის ენაზე, მისი ლეგალური სტატუსისა და ჩამოსვლის ეტაპის მიხედვით აჩვენებს (ა) რომელი ორგანიზაცია მიიღებს მას *რეალურად* — უსტატუსოდ, დაუზღვევლად, უფასოდ, ჩაწერით თუ უჩაწერისად, რომელ ენაზე; (ბ) როგორ გაიაროს კონკრეტული პროცედურა — რა წინაპირობა, რა საბუთი, სად, რა ვადაში, ვინ დაეხმარება; (გ) რას გააკეთოს პირველ 30 დღეში. პლატფორმა ამბობს „*ვინ დაგეხმარება და როგორ მიხვიდე მასთან*", არა „ჩვენ დაგეხმარებით".

### 1.2. საზღვარი — რას აკეთებს და რას არა

| პლატფორმა **აკეთებს** | პლატფორმა **არ აკეთებს** (ადამიანი/ინსტიტუტი სჭირდება) |
|---|---|
| ორიენტაცია სტატუსი × ეტაპის მიხედვით (3 კითხვა → „პირველი 30 დღე") | იურიდიული რჩევა, წარმომადგენლობა, საქმის მართვა (case management) |
| სანდო ორგანიზაციების დირექტორია წვდომის სიგნალებით (`acceptsUndocumented`, `acceptsUninsured`, `serviceCost`, `appointmentPolicy`, `languages`) + provenance („ბოლოს შემოწმდა") | თერაპია, ენის სწავლება, ბინის მინიჭება, ოფიციალური თარგმანი |
| ნაბიჯ-ნაბიჯ პროცედურები ქართულად/რუსულად (AME, PUMa, CIR, ENIC-NARIC, arraigo…), ორგანიზაციებთან დაკავშირებული | „უფლებამოსილების გარანტია" — მხოლოდ „სავარაუდოდ გაქვს/არ გაქვს + ვისთან გადაამოწმო" |
| „ვინ ლაპარაკობს ჩემს ენაზე" ფილტრი პირველ ადგილას | ინდივიდუალური AI-რჩევა იურიდიულ/სამედიცინო კითხვებზე ადამიანური escalation-ის გარეშე |
| Link-out Soliguide/Réfugiés.info/service-public-ზე, სადაც ისინი უკეთესია | გრანტების აგრეგატორობა ინდივიდებისთვის მთავარ ღირებულებად (მფლობელმა დახურა 2026-04-23, `ORG-CENTRIC-MEMORY.md §1`) |
| გაზიარებადი მარშრუტი (WhatsApp/Viber/Telegram ბმული) + ბეჭდვადი A4 | 29 ქვეყნის ზედაპირული დაფარვა — სიღრმე > სიგანე |

### 1.3. ინტეგრაციის დომენების ტაქსონომია — საბოლოო სია

ვიღებ Ezra-ს 11 დომენს (`[E §6d]`) და Priya-ს mapping-ს (`[P §4.3]`) ვამატებ. **სად ვშორდები სპეციალისტებს:** Priya-ს „საბაზისო საჭიროებები" და „ადმინ./ციფრული წვდომა" ცალკე დომენებად არ შემომაქვს — 13+ დომენი card sort-ში ვერ გაივლის; საკვები → `money_benefits.food_aid`, ბანკი → `money_benefits.banking`, ტელეფონი/საბუთები → `daily_life`. Priya `mental_health`-ს ჯანდაცვაში აერთიანებს — ვტოვებ ცალკე, როგორც Ezra-სთან: WHO-ს ევიდენსი `[E §3]` და ლტოლვილთა ტრავმა ცალკე შესვლას ითხოვს. `grants.category` ცალკე ტაქსონომიას არ ინარჩუნებს — გრანტი = პროგრამა ორგანიზაციის ქვეშ, იმავე დომენში.

| # | domain (key) | ქვედომენები | Ager&Strang | mapping ← დღევანდელი `category` (`constants.ts`, 17) / France `mainCategory` (9) / onboarding `Need` |
|---|---|---|---|---|
| 1 | `legal_status` | asylum, residence_permit, regularization, citizenship, legal_aid, consular | Foundation | ახალი; `individual` (ნაწილი); Need `VISA`, `LEGAL` |
| 2 | `housing` | emergency_shelter, temporary, social_housing, rental_support, medical_stay | Markers | `housing` (48); `organization_housing` 102 რიგი; Need `HOUSING` |
| 3 | `health` | primary_care, free_clinic, insurance_access, hospital_specialist, dental, maternity, disability, medication | Markers | `medical_treatment` (288), `assistive_technology` (36); დიაგნოზი/B-2 ვიზა → **ქვეფილტრი მხოლოდ აქ** |
| 4 | `mental_health` | psych_support, trauma, addiction, peer_support | Markers/Facilitator | ახალი; PurposeDetail `mental_health` |
| 5 | `language_education` | language_course, civic_training, adult_education, digital_skills, higher_education | Facilitator | `educational`, `scholarships` (24), `research`; Need `LANGUAGE`; Purpose `EDUCATION` |
| 6 | `work_income` | job_search, qualification_recognition, vocational_training, entrepreneurship, labour_rights | Markers | `startup`, `business_funding`; Purpose `BUSINESS` |
| 7 | `money_benefits` | allowances, banking, food_aid, emergency_cash, debt | Markers | `financial_assistance` (110), `food_basic_needs`; Need `FOOD`, `BANKING` |
| 8 | `family_children` | school_enrollment, childcare, minors, family_reunification, women_gbv | Markers/Foundation | ახალი; PurposeDetail `child_school`, `child_treatment` |
| 9 | `community_social` | diaspora_org, faith, sport_culture, volunteering, mentoring | Social Connection | `community`, `social_services` (43, ნაწილი) |
| 10 | `safety_rights` | anti_discrimination, violence, trafficking, detention_return | Facilitator/Foundation | ახალი |
| 11 | `daily_life` | transport, phone_internet, translation_interpreting, documents | Facilitator | `travel_transport` (13); Need `TRANSPORT` |
| — | მოიხსნება | | | `international` (6) → `country`/`isNational`; `other` (61 = 10%, `[P]`) → LLM-კლასიფიკაცია + review; `all` → UI-only |

**იმპლემენტაციის წესი (Simplicity First):** Phase 1-ში ტაქსონომია **mapping ცხრილია კოდში** (`shared/domains.ts`: category→domain, mainCategory→domain), სქემა არ იცვლება; Phase 2-ში `services.domain` ხდება პირველი კლასის ველი. France-ის 9 `mainCategory` მნიშვნელობა ერთ ცხრილში დამაპდება (Ezra-ს რეკომენდაცია `[E §6d]`).

---

## 2. სტრატეგიული პოზიციონირება და ბიზნეს-მოდელი

### 2.1. Beachhead

| სეგმენტი | როლი | რატომ (ფაქტები) | რატომ არა შემოსავლის beachhead |
|---|---|---|---|
| **ქართველები საფრანგეთში** (ka) | **ვალიდაცია + reference implementation** | ტოპ-5 თავშესაფრის ეროვნება FR-ში (8,099 პირველი განაცხადი 2022) `[N][E]`; მოტივი დომინანტურად სამედიცინო = GrantKit-ის ისტორიული ძალა; **არცერთ პლატფორმას ka არ აქვს** `[N §2D]`; 493 FR ორგ. DB-ში `[✓ audit §10]`; დამფუძნებელი ენობრივი insider | ADA ≈ €6.8/დღე; recognition ~4% → დროებითობა, churn; WTP ≈ 0 `[E §5.1]` |
| **რუსულენოვანი არა-რუსული ემიგრაცია** FR/ES (ru) | TAM-ის გაფართოება იმავე კოდით | ru UI უკვე არის; Kovcheg პოლიტიკურად პოზიციონირებულია — არაპოლიტიკური ინსტრუმენტის ადგილი ცარიელია `[N §7]` | გადატვირთული Telegram-ბაზარი |
| **შუამავლები** (სოცმუშაკები, დიასპორის მოხალისეები, ასოციაციები, CCAS) | **შემოსავლის ჰიპოთეზა** | Lloyd et al.: პროვაიდერები = ნავიგატორები `[E §4]`; ერთი კლიენტი = ასობით ბენეფიციარი; ბიუჯეტი (AMIF) არსებობს | გრძელი sales cycle — solo founder-ისთვის მე-2 წელი |
| აშშ სამედიცინო (არსებული 500 US ორგ.) | **მეორე ვერტიკალი, არა მეორე პროდუქტი** | მონაცემი უკვე არის; ქართველი პაციენტი აშშ-ში — Priya-ს J3 ლეგიტიმური journey-ა | ახალ ინვესტიციას არ იღებს Phase 4-მდე |

### 2.2. პოზიციონირების განაცხადი

> **ვისთვის:** ქართველი და რუსულენოვანი ემიგრანტისთვის, რომელიც ახლახან ჩავიდა საფრანგეთში (შემდეგ — ES/DE/US) და არ იცის, ვინ მიიღებს მას საბუთების/დაზღვევის/ფულის გარეშე.
> **რა:** ინტეგრაციის ნავიგატორი — ორგანიზაციები „შემიძლია თუ არა?" სიგნალებით + პროცედურები + „პირველი 30 დღე" ჩეკლისტი, მის ენაზე.
> **განსხვავებით:** Réfugiés.info/Soliguide-ისგან (უფასო, ღრმა, მაგრამ ka არა, სტატუს-სიგნალი ნაწილობრივ, ერთი ქვეყანა) და Facebook ჯგუფებისგან (ka, მაგრამ არასტრუქტურირებული, არავერიფიცირებული).
> **დამცავი ზღუდე:** ენა × სტატუს-სიგნალი × მრავალქვეყნიანი ერთგვაროვანი სქემა × ინსაიდერული დისტრიბუცია (FB ჯგუფები, ეკლესია, gda.ge-ს დიასპორული სია) — ეროვნული პლატფორმა ენას მოცულობით ამატებს, ქართველები „საკმარისად დიდი რომ არსებობდეს, ძალიან პატარა რომ DIAIR-მა თარგმნოს" `[N §6.1]`.

Tagline-ის draft (Nino): „სად მიმიღებენ საბუთების გარეშე — ქართულად". Landing-ის მინიმალური ცვლილება: „640+ grants" → „ორგანიზაციები, რომლებიც მიგიღებენ — სტატუსის მიუხედავად"; „Get Access — $9/month" → „უფასოა ემიგრანტისთვის"; testimonials და „500+ members" — ამოღება `[N §7]`.

### 2.3. ბიზნეს-მოდელი — რეკომენდაცია და ორი ალტერნატივა

| | **რეკომენდაცია: Free core + Helper Pro + გრანტები → B2B2C** | ალტერნატივა 1: დარჩეს $9/თვე B2C | ალტერნატივა 2: Sponsorship/affiliate-first |
|---|---|---|---|
| ვინ იხდის | 0–6 თვე: არავინ B2C-ში; Helper Pro ($9–29/თვე ან €99/წ) სოცმუშაკებს/მოხალისეებს/ოჯახს სამშობლოში; AMIF / Google.org / DIAIR inclusion numérique / MFA დიასპორული გრანტი. 6–18 თვე: 3 pilot ლიცენზია (დიასპორული ორგ., NGO, CCAS) €2–10k/წ `[N §5.3]` | ემიგრანტი | ბანკი/remittance/დაზღვევა/თარგმანი |
| პრეცედენტი | Turn2us (უფასო ინდივიდისთვის, £100+VAT adviser licence); Integreat €4–15k/კომუნა; Réfugiés.info „aidants" `[N]` | GrantWatch $49/თვე — მაგრამ **ინსტიტუციებზე** `[N §2C]` | Arrive/RBC, Expatica `[N]` |
| რატომ არა | — | Substitute უფასო და სახელმწიფო-ბრენდირებული; მყიდველს ფული არ აქვს; პროდუქტი დღესაც უფასოა — `organizations.list/detail/mapPoints` `publicProcedure` `[A F3][✓]`; ეთიკური რისკი გადაუდებელი სამედიცინო ინფოს paywall-ზე; DGCCRF/loi Toubon ფასის რეკლამაზე, რომელიც არ იყიდება (annual $79 — `[A F6]`) | ინტერესთა კონფლიქტი მოწყვლად აუდიტორიაზე; GDPR ad-tracking; ადვოკატის referral რეგულირებულია (FR loi 1971, UK IAA) `[N R3]`; ნდობის ეროზია |

**Paywall-ის გადაწყვეტილება (მფლობელისთვის, D1/D2 §8):** ჩემი რეკომენდაციაა **ახლავე მოიხსნას B2C paywall** და გამოცხადდეს: „დირექტორია და გზამკვლევები უფასოა ემიგრანტისთვის". Paddle ინფრასტრუქტურა (webhook, `subscription` router, 33 ტესტი) **არ იშლება, არამედ „პაუზდება"**: checkout-ის შესასვლელი წერტილები (PricingCTA, Home pricing სექცია, `Catalog.tsx` PREVIEW gating) იხსნება, სერვერული კოდი უცვლელი რჩება Helper Pro-ს გადაწყვეტილებამდე (Phase 3 gate). ეს ყველაზე პატარა diff-ია (Karpathy §3) და არ ხურავს კარს.

**პატიოსანი დაძაბულობა:** მფლობელს სჭირდება შემოსავალი; ყველა ევიდენსი ამბობს, რომ ის *ამ* აუდიტორიიდან არ მოვა. „ვინ იხდის" = „ვისაც referral-ის შედეგი უღირს" (Findhelp-ის ლოგიკა `[N §2B]`). თუ მფლობელი მაინც B2C-ს ირჩევს — paywall უნდა იყოს *ერთი* ცხადი ბანერი სრულ სიაზე + server-side gate (არა 3 ჩანაწერი ახსნის გარეშე), და პირველ 6 თვეში ვერ ვიმეტრიკავთ „ვინ არ დარეგისტრირდა ფასის გამო" — ეს ვალიდაციას აზიანებს.

---

## 3. დიაგნოსტიკის შეჯამება — საიტის დღევანდელი მდგომარეობა

### 3.1. ჯანმრთელობის ფაქტები (გადამოწმებული)

| ფაქტი | მნიშვნელობა | წყარო |
|---|---|---|
| `pnpm check` | 0 TS error, 12.2 წმ; `scripts/` **არ მოწმდება** (tsconfig include-ის გარეთ) | `[A §2.1]` |
| `pnpm test` | 14 ფაილი / 201 pass, 1 skipped (202); `organizations.*`, `ai.*`, `onboarding.*`, client — 0 ტესტი | `[A §2.1, §4.4]` |
| `pnpm build` | exit 0, 17 წმ; main chunk 562.91 kB; 448 asset, 23.6 MB JS (AIChatBox 909 kB, `vendor-csc` 8.7 MB) | `[A §2.2]` |
| `pnpm audit --prod` | 57 vuln: 6 low · 36 moderate · 15 high · 0 critical (`drizzle-orm`, `mysql2`, `nanoid` პირდაპირი) | `[A §2.1]` |
| commit/თვე 2026 | აპრ 65 · მაი 119 · ივნ 3 · ივლ 2 · აგვ 2 · სექ 4 | `[✓ git log]` |
| ბოლო არსებითი სამუშაო | 2026-05-12 (PR #233–#241 batch); შემდეგ მხოლოდ Copilot pnpm-version fix ×3 + Dockerfile pin 09-18 | `[✓ git log]` |
| CI | არცერთი workflow არ უშვებს check/test/build; `.github/workflows/` = 2 data-cron | `[A F7][✓]` |
| Railway build | გატეხილი 2026-08-12 → 09-18 (Alpine pnpm), pin-ით გასწორდა `6e52a50` | `[A][✓]` |
| Lighthouse mobile | `/` 38 · `/catalog` 26 (TBT 4.2 წმ, 10.5 MB) · `/organizations/:id` 39 (LCP 9.1 წმ) | `audit-reports/09-lighthouse-after-3-4.md` `[P]` |
| DB (2026-05-02 live) | users **0** · grants 1,113 (1,102 active) · orgs 1,110 · branches 1,324 · grant_translations 1,080/ენა · `contactEnrichmentStatus=pending` 1,110 · phone აკლია 331, email 436, languages 653 | `[✓ audit-reports/04-db-content.md]` |
| ქვეყნები DB-ში | US 500 · FR 493 · GB 47 · CA 42 · DE 18 · Intl 6 · GE 2 · „Canada" 1 · PL 1 = **9**, არა 29 | `[✓ 04-db-content §10]` |
| Orphan grants / ნაგავი org | 350 (968-დან) / ~30 („დეტალები", „მგზავრობა" Excel header-ები) | `[✓ 04b]` |
| Enrichment cron | 130/130 failed, schedule გათიშული `3ff413f` 2026-09-18 — `GOOGLE_MAPS_API_KEY` secret არასდროს დაემატა | `[✓ contact-enrichment.yml]` |
| Migrations | journal `0013`-ზე მთავრდება; `0014–0020` ხელით SQL; `0020` prod-ზე დაუდასტურებელი; `schema.ts` უკვე შეიცავს `processed_webhook_events` | `[A F8][✓ drizzle/]` |

### 3.2. კონსოლიდირებული პრობლემების ცხრილი (Arash + Priya, დედუპლიცირებული)

> Effort: **S** ≤ 2 დღე · **M** ≤ 1 კვირა · **L** > 1 კვირა. ფაზა = სად წყდება (§5).

| ID | პრიორიტეტი | პრობლემა | მტკიცებულება | ზეგავლენა ინტეგრაციის მიზანზე | Effort | ფაზა |
|---|---|---|---|---|---|---|
| **I1** | **P0** | Production MySQL root პაროლი + public proxy host:port commit-ებულ დოკუმენტში; Google Maps browser + server key ჩატში გაჟონილი (05-04), rotation არ მომხდარა | `.grantkit-redesign/AUDIT-CONTINUATION-2026-05-03.md` „Pending Operator Actions" (PowerShell `$pw =` ხაზი, 1 match); host `OPS.md`-შიც (1 match); `PROJECT_MAP.md` Session Log 05-04 `[A F1][✓]` | ვინც რეპოს ხედავს — სრული DB, სადაც მომხმარებლის health/visa `needs` ინახება. მოწყვლადი აუდიტორიის პლატფორმას ეს არ შეუძლია | S | 0 |
| **I2** | **P0** | Billing გზა მკვდარია: webhook fail-closed (503) secret-ის გარეშე; `PADDLE_WEBHOOK_SECRET` Railway-ის დოკუმენტირებულ სიაში არ არის; `processed_webhook_events` (0020) დაუყენებელი → ყოველი checkout 503/SQL error | `server/paddleWebhook.ts:317-321` `[✓]`; `OPS.md` env სია (მხოლოდ `DATABASE_URL, ANTHROPIC_API_KEY, NODE_ENV, PORT, VITE_*`) `[✓]`; `drizzle/0020_*.sql` `[A F2]` | ვინც გადაიხდის — ვერაფერს იღებს. **შენიშვნა:** `subscription.activate` bypass (audit #12 #1) უკვე ამოღებულია `[✓ routers.ts: subscription = status, cancel]` | S | 0 (D2) |
| **I3** | **P0** | ყალბი/მოძველებული ნდობის სიგნალები: „500+ Active members", 3 testimonial, „640+", „29+ countries", „538 verified organizations", „Manus account", „$79/yr" რომელიც არ იყიდება | `en.ts:18-32,73-76,92-94,106-110,125,152-181`; `ka.ts:985` `[✓]`; users = 0, verification 0/1,110 `[P #1,#3][N R2][A F6,F18]` | უსტატუსო მომხმარებელი „verified"-ს ენდობა და მიდის დაკეტილ კართან; DGCCRF/loi Toubon რისკი FR აუდიტორიაზე | S | 0 |
| **I4** | P1 | CI არ არსებობს; `scripts/` არ ტიპდება; `scripts/create-temp-admin.ts:24-25` ორჯერ აცხადებს `const password` და არ კომპილირდება | `.github/workflows/` `[✓]`; `tsconfig.json` include `[A F7]` | ყოველი merge „ბრმაა" — მაისის 3 fire-drill ამის შედეგია (`PROJECT_MAP` Session Log 04-24) | S | 0 |
| **I5** | P1 | Paywall მხოლოდ client-side: Catalog არა-გამომწერს 3 ჩანაწერს აჩვენებს (`PREVIEW_ITEMS = 3`), მაგრამ `organizations.list/detail/mapPoints` და `catalog.*` `publicProcedure`; `memberBanner` ნათარგმნია, არსად რენდერდება | `Catalog.tsx:53,175` `[✓]`; `routers.ts:293,380,1330,1368,1382` `[✓]` `[A F3][P #2]` | მომხმარებელი ხედავს ცარიელ სიას ახსნის გარეშე; ღირებულების საზღვარი არ არსებობს | S | 0 (D1) |
| **I6** | P1 | არაავთენტიფიცირებული LLM ხარჯი: `smartSearch` ორივე namespace-ში public, ყოველ query-ზე Haiku, cache 0; ლიმიტი 100/min/IP | `routers.ts:546,1462` `[✓]`; `queryExpander.ts:50-57` `[A F4]` | 6,000 call/სთ ერთი IP-დან; ბიუჯეტის რისკი | S | 0 |
| **I7** | P1 | Migration მექანიზმი ორთავიანია: Dockerfile CMD ყოველ boot-ზე უშვებს drizzle migrator-ს journal-ით `0013`-მდე; `0014–0020` ხელით; `PROJECT_MAP` „pending: none" | `Dockerfile`, `drizzle/meta/_journal.json`, `PROJECT_MAP.md:16-17` `[A F8]` | შემდეგი `drizzle-kit generate` არასწორ diff-ს გააკეთებს; PR #145-ის outage-ის რეცეპტი; **ბლოკავს 0021-ს** | M | 0→1 |
| **I8** | P1 | მონაცემთა ვალი: 1,110 pending enrichment; 779/674 phone/email provenance-ის გარეშე; 350 orphan grant; ~30 ნაგავი org; cron გათიშული; FR 493 DB-ში vs 624 Excel-ში (131-რიგიანი გაურკვევლობა) | `04-db-content §8-9`, `04b`, `contact-enrichment.yml` `[✓]`; `PLAN-france-orgs-import.md:4` `[✓]` `[A F9][P §4.4]` | „ბოლოს შემოწმდა" badge ვერცერთ ორგანიზაციაზე ვერ გამოჩნდება — ნდობა ვერ აშენდება | M | 0–1 |
| **I9** | P1 | ორგანიზაციის კონტენტი არ ილოკალიზდება: `organizations.translations` JSON იწერება France import-ით, არავინ კითხულობს; UI raw `description`-ს აჩვენებს | `scripts/import-france-orgs.ts`, `OrganizationDetail.tsx:145,170` `[A F12][P #6,#8]` | 5-ენოვანი საიტი, რომლის მთავარი entity ერთენოვანია — ka მომხმარებელი ფრანგულ აღწერას ხედავს | M (Phase 1: read JSON) / L (Phase 2: entity_translations) | 1→2 |
| **I10** | P1 | France-ის ველები UI-ში არ ჩანს: `servicesOffered`, `targetAudience`, `emigrationPurpose`, `isNational`, `organization_housing` (102) — სქემაშია, არ რენდერდება, housing არ JOIN-დება | `schema.ts:269-274,300` `[✓]`; `OrganizationDetail.tsx` grep = 0 `[P #6]` | სწორედ pivot-ის სეგმენტი ვერ იღებს ღირებულებას | S–M | 1 |
| **I11** | P1 | Onboarding-ის პასუხები არსად გამოიყენება; `purpose` სავალდებულოა (თავშესაფრის მაძიებელს არცერთი არ ერგება); **სტატუსის კითხვა აკლია**; ორი პარალელური onboarding | `Dashboard.tsx:235-254`, `StepPurpose.tsx:101`, `shared/profileTypes.ts` `[✓]` `[P #4][E §6a.1]` | 3 ნაბიჯი → ცარიელი dashboard; პერსონალიზაცია ილუზიაა | S–M | 1 |
| **I12** | P1 | ტაქსონომია/ფილტრები სამედიცინო გრანტისთვისაა: 17 კატეგორია (9 გამოყენებული), ფილტრები დიაგნოზი/B-2/deadline; API-ში არ არის ფილტრი ენაზე, ფასზე, სტატუსზე, საათებზე; Need `VISA/LEGAL/LANGUAGE/BANKING` ↔ კატეგორია: არცერთი | `constants.ts:50-85` `[✓]`; `routers.ts:1330-1348` `[P #5]` | „ვინ მიმიღებს უსაბუთოდ, რუსულად, უფასოდ, ჩემს ქალაქში?" — ვერ იკითხება | M | 1 |
| **I13** | P1 | კონფიდენციალურობა: `needs` (LEGAL, `medical_visa`…) ინახება `users`-ში ელფოსტასთან consent-ის გარეშე; cookie consent 0; Privacy page „analytics cookies" როცა analytics გათიშულია; `sameSite: "none"`; account deletion endpoint 0; retention policy 0 | `OnboardingFlow.tsx:52-58`, `db.ts:499-518`, `Privacy.tsx:68,80`, `index.html:31` `[✓]`, `cookies.ts:45` `[P #10][A F17, cap14][N R6]` | Art. 9 special category (სტატუსი + ჯანმრთელობა) მოწყვლად ადამიანზე; CNIL რისკი FR launch-ამდე | S (sameSite, copy) / M (deletion, consent) | 0–1 / 3 |
| **I14** | P1 | Sitemap 404-ს აცხადებს (`/organizations` list route არ არსებობს); 3 sitemap წყარო; `/grant/:id` legacy; Q2 (301) აპრილიდან შეუსრულებელი | `seoRoutes.ts:14`, `App.tsx:57,69`, `client/public/sitemap.xml` `[A F10]`; `DIAGNOSTIC-2026-04-25.md §5` | Crawl budget; ორგანული აღმოჩენადობა — ka სეგმენტისთვის SEO ერთადერთი უფასო არხია FB-ის გარდა | S | 1 |
| **I15** | P1 | დოკუმენტაცია 5 ურთიერთსაწინააღმდეგო წყაროა: გრანტები 624/637/640/643/1,102/3,650; orgs 538/790/1,110; `STATE.md` „ALL PHASES COMPLETE"; `todo.md` Phase 1 ცარიელი; `CLAUDE.md` tRPC სია `subscription.activate`-ს ინახავს (აღარ არსებობს) | `[A §5][✓]` | ყოველი ახალი სესია არასწორ რიცხვებზე გეგმავს — ეს გეგმაც კი ამის მსხვერპლი იქნებოდა | S | 0 |
| I16 | P2 | ემაილები `onboarding@resend.dev`-იდან; admin notification იმავე მისამართზე → არავინ იღებს (Q5 აპრილიდან ღია) | `emailService.ts:69,367` `[✓]` `[A F11]` | verification/reset spam-ში; ახალი გამომწერი იკარგება | S + DNS (ოპერატორი) | 1 |
| I17 | P2 | ორგ. გვერდზე არ არის „რას მივიღებ", „რა მოვიტანო", საათები, **დარეკვა/მარშრუტი** sticky bar; error state „Grant Not Found" ქსელის შეცდომაზეც; კატეგორია raw slug; ქვეყანა „FR" raw | `OrganizationDetail.tsx:124-141,261,556-580`, `LanguageContext.tsx:73-76` `[P #7,#8]` | ტელეფონით მდგარი ადამიანი ორგანიზაციის კართან — #1 მობილური ქმედება არ არსებობს | S | 1 |
| I18 | P2 | Mobile perf: `streamdown` → shiki+mermaid+katex (909 kB, 200+ chunk); `catalog.json` 670 kB + `catalogTranslations` 1.1 MB აპრილის სნეპშოტი bundle-ში; `PageFallback` ცარიელი div; marker-ები pagination-ის გარეშე (10.5 MB) | `AIChatBox.tsx:7`, `client/src/data/*`, `App.tsx:42-44` `[A F13,F14][P #9]` | prepaid ინტერნეტით — თეთრი ეკრანი წამებით; Lighthouse 26–39 | S–M | 1–2 |
| I19 | P2 | AI ასისტენტი გრანტ-ცენტრულია: 7 tool ყველა `*grants*`, prompt „640-grant DB", org-კონტექსტი client-ზე იწყობა (prompt injection by design), disclaimer 0, per-user ქვოტა 0, enrichment ველები კონტექსტში არ არის | `toolboxClient.ts:141-231`, `grantAssistant.ts:101-128`, `orgFocusContext.ts` `[A F15][P §6, B][N R3,R4]` | „უსაბუთოდ მიმიღებენ?"-ზე მოდელი ვარაუდობს; იურიდიული რჩევა = რეგულირებული (FR loi 1971) | M | 2 |
| I20 | P2 | ka copy-ში 3 აზრობრივი შეცდომა (`usResidentsOnly` „მოქალაქეები" ≠ რეზიდენტი; „538 დადასტურებული"; „ფონდირებულია {year}-იდან") + ~8 კალკა; ლექსიკა ფონდ-მაძიებლის, არა ემიგრანტის | `ka.ts:249,985,1163` `[✓][P დანართი A]` | ქართველი მკითხველი ფიქრობს, რომ არ ერგება | S | 0 (3 შეცდომა) / 1 (ლექსიკა) |
| I21 | P2 | 57 prod CVE (15 high) — `drizzle-orm`, `mysql2`, `nanoid`, `lodash` | `[A F19]` | — | S–M | 1 |
| I22 | P2 | Manus scaffolding + one-off ნაგავი: `server/_core/{imageGeneration,voiceTranscription,dataApi,map,llm}.ts` 1,091 ხაზი არსად იმპორტირდება; `users.openId`; 13 `server/*.mjs\|cjs`; 35 `stage*.cjs`; `pending-imports/` 60 ფაილი | `[A F16]` | Onboarding ხმაური ყოველი agent-ისთვის; audit surface | S | 0 (archive) |
| I23 | P2 | `subscription.cancel` Paddle-ს არ ატყობინებს (ბარათი იჭრება); annual plan რეკლამირდება, checkout ყოველთვის monthly `PADDLE_PRICE_ID`; client token hardcoded | `routers.ts:253-271`, `usePaddle.ts:10,13,107` `[✓]` `[A F5,F6]` | ფინანსური/სამართლებრივი — **moot, თუ D2 = pause** | S | 3 (თუ Helper Pro) |
| I24 | P2 | `Analytics.tsx` აპრილის სტატიკურ სნეპშოტზეა (629 item) როცა DB-ში 1,102; telemetry 0 (`index.html` analytics გათიშულია env var-ის გარეშე) | `Analytics.tsx:6,38`, `index.html:31` `[✓]` `[A F13, cap12]` | „did the user find help" ვერ იზომება — ვერცერთი KPI (§7) | S | 1 (Umami) / 3 (outcome events) |
| I25 | P2 | Feedback loop 0: „ეს ინფორმაცია სწორია?" / „ნომერი აღარ მუშაობს" არ არსებობს; org save გამორთულია (`saved_grants` მხოლოდ) | `OrganizationDetail.tsx:16-17,236`, `useSaveEntity.ts` `[A cap9][P #12, §4.2]` | ყველაზე იაფი verification-წყარო არ გამოიყენება; retention loop 0 | S–M | 1 (mailto) / 3 (entity) |
| I26 | P2 | Search = `LIKE '%term%'` 5 სვეტზე, FULLTEXT 0; `organization_housing` `uniqueIndex(orgId)` → 1 housing/org; `languages`/`categories` CSV | `db.ts:1489-1497`, `schema.ts:315` `[✓]` `[A F23,F24]` | 1k row-ზე OK; housing რეალობა ≠ 1:1 | M | 2 |

---

## 4. Gap analysis — capability matrix

> Arash-ის 14 capability (`[A §6]`) + Priya-ს კონტენტ-ხვრელები (`[P §4.2]`) = 20. სტატუსი დღეს: **exists 1 · partial 8 · missing 11**. „missing" სვეტი = pivot-ის ახალი ბირთვი, ანუ pivot არის *build*, არა *refactor* `[A]`.

| # | Capability | დღეს | რა არსებობს / რა გამოვიყენოთ | სამიზნისთვის საჭირო | ფაზა |
|---|---|---|---|---|---|
| 1 | Org directory + accessibility signals | **exists** (ხარისხი partial) | `organizations` + `organization_branches` + enum ველები `schema.ts:226-233` + `WhoWeHelpCard`, `TrustPanel`, `OrganizationsMap`, `organizations.*` API — **pivot-ის ყველაზე ღირებული აქტივი** | მონაცემი: enrichment 0→FR 100%; provenance UI; 30 ნაგავი org → 0 | 0–1 |
| 2 | Services as first-class entity | missing | `servicesOffered` TEXT, `categories` CSV, `grants` (=programs) `orgId`-ით 68% | `services` ცხრილი (orgId, domain, eligibleStatuses, cost, languages, documents, howToAccess, lastVerifiedAt, source) + LLM-კლასიფიკაცია 1,102 grant-ისა (526/629 „Free service" = სერვისია `[P]`) | 2 |
| 3 | Country procedures / guides (versioned, 5 ენა) | missing | `applicationProcess/documentsRequired` TEXT (LLM-შაბლონი, 616/629 canned) | Markdown გიდები frontmatter-ით (`lastVerifiedAt`, `sources`, `status[]`, `country`) + rendering + org ბმა; 10 FR გიდი ka-first | 2 |
| 4 | Stage-based checklists / journey state | partial | Onboarding 3-step → `users.targetCountry/purposes/needs`; Dashboard flag+emoji; `saved_grants` | სტატუსი × ეტაპი → „პირველი 30 დღე" ჩეკლისტი (Phase 2 სტატიკური, Phase 3 `user_journey` progress) | 2→3 |
| 5 | Multilingual pipeline (AI + review) | partial | UI 100% typed (1,105 key); grants 1,080/1,102 × 4; `translate-missing.ts`; org JSON dead | ერთი მექანიზმი `entity_translations(entityType, entityId, lang, field, text, source, reviewedAt)`; ka/ru native review pass | 1 (read JSON) → 2 |
| 6 | Language-aware URLs + SEO (hreflang, prerender) | missing | `SEO.tsx`, `JsonLd.tsx`, dynamic sitemap; `/:lang` 0; hreflang 0; SSR 0; sitemap 404 | Phase 1: `/organizations` list + 301 + sitemap fix; Phase 4: `/:lang` + hreflang + crawler prerender | 1 / 4 |
| 7 | Need-based search | partial | `smartSearch` (Haiku → LIKE), 5-ენოვანი detection; AI grant tools | Phase 1: cache + limit + domain/city/language/cost/status ფილტრები; Phase 2: org/service/guide tools; FULLTEXT — მოგვიანებით | 0–2 |
| 8 | Notifications / alerts | partial | `newsletter_subscribers`, `sendBatchNewGrantNotifications`, Resend 5 ენა, sandbox sender | brand sender (DNS); Phase 3: profile-based alert (დომენი × ქალაქი × ენა) | 1 / 3 |
| 9 | Community / feedback loop | missing | — | Phase 1: „შეცდომის შეტყობინება" mailto + disclaimer; Phase 3: `content_feedback` + admin სია | 1 / 3 |
| 10 | Freshness + provenance UI | partial | სქემა მზადაა (`*Source/*VerifiedAt`, `geocodedAt`, `updatedAt`); UI 0; მონაცემი 0 | „ბოლოს შემოწმდა {date} · წყარო" / „დაუდასტურებელია — დარეკეთ"; `lastVerifiedAt` org-დონეზე (Phase 2) | 1 (UI) / 2 (data) |
| 11 | Admin / editor CMS non-dev-ისთვის | partial (grants only) | `Admin.tsx` 2,209 ხაზი: grants CRUD + translations + import; org/branch/housing/service editing 0 | ცალკე მცირე `AdminContent` (org accessibility ველები + service edit + review queue) — არა Admin.tsx-ის გაფართოება; გიდები = Markdown PR-ით | 2 |
| 12 | Analytics / telemetry | missing | analytics გათიშულია env-ით; `admin.stats` | Phase 1: cookieless Umami (env var უკვე გათვალისწინებულია `index.html:31`); Phase 3: 5 outcome event | 1 / 3 |
| 13 | Mobile / PWA / offline | partial | responsive, bottom nav, pull-to-refresh, manifest 1 icon; SW 0 | Phase 1: sticky call/directions bar, skeleton; Phase 4: Workbox precache გიდებისთვის | 1 / 4 |
| 14 | Trust & safety / privacy | partial | helmet/CSP, rate-limit, bcrypt, lockout, self-hosted fonts | `sameSite: lax`; სტატუსი client-only; Privacy page rewrite; `auth.deleteAccount` + consent record; AI disclaimer; secrets out of repo | 0–1 / 3 |
| 15 | EligibilityByStatus (სერვისზე) | missing | `acceptsUndocumented` ბინარული | `services.eligibleStatuses` enum CSV (asylum_seeker, refugee, undocumented, student, worker, family, temporary_protection, any) `[E §6c]` | 2 |
| 16 | Document ლექსიკონი | missing | canned სტრინგები | `documents` (code, name×5, whereToGet) — გიდებში/სერვისებში ბმით | 2 |
| 17 | OpeningHours სტრუქტურირებული / „ღიაა ახლა" | missing | `officeHours` varchar 0/538 | Google Places `regularOpeningHours` enrichment-იდან; ფილტრი | 2–3 |
| 18 | Claim-your-listing / community editors | missing | — | Réfugiés.info/Findhelp მოდელი — ერთადერთი გზა 1,110 ჩანაწერის ცოცხლად შენარჩუნებისთვის `[N §4]` | 4 |
| 19 | გაზიარებადი + ბეჭდვადი ჩეკლისტი | missing | — | share-ბმული (WhatsApp/Viber/Telegram) + print CSS A4 `[E §6a.6-7]` | 2 |
| 20 | ქვეყანა/ქალაქი-first landing (`/fr`, `/fr/lyon`) | missing | Home hero „worldwide" | Phase 1: hero „საფრანგეთში ხართ?" + ქალაქის არჩევა; Phase 4: `/:country` landing-ები | 1 / 4 |

---

## 5. Roadmap ფაზებად

> **წესები ყველა ფაზისთვის:** (1) სქემის ცვლილება = ცალკე PR, migration Railway-ზე merge-მდე, `SELECT <col>` ვერიფიკაცია, მერე merge (`CLAUDE.md` golden rule); (2) ყოველი item უნდა მიდიოდეს §3-ის ID-მდე ან მფლობელის ფორმულირებულ მიზნამდე — სპეკულატიური feature არ არის; (3) ყოველ PR-ს CI მწვანე + `PROJECT_MAP.md` Session Log-ის 3 ხაზი; (4) „done when" = ბრძანება ან დაკვირვება, რომელიც ან გადის ან არა.
> **Effort:** დღე = ერთი Claude Code სესია-დღე (~4–6 სთ ფოკუსირებული სამუშაო) ან ოპერატორის საათები, სადაც მითითებულია. **ვინ:** OP = ოპერატორი/მფლობელი ხელით · CC = Claude Code სესია (persona §6) · EXT = გარე/ადამიანური.

### Phase 0 — ჰიგიენა და P0 (კვირა 1–2 · ~8 CC-დღე + ~4 OP-სთ)

| | |
|---|---|
| **მიზანი** | საიტი უსაფრთხო, პატიოსანი და მერჯ-ვადი ხდება. არცერთი ახალი feature. |
| **Scope IN** | I1, I2, I3, I4, I5, I6, I7 (დაწყება), I8 (ნაწილი), I13 (S-ნაწილი), I15, I20 (3 შეცდომა), I22 (archive) |
| **Scope OUT** | სქემის ცვლილება; UI redesign; ახალი კონტენტი; France ველების რენდერი (Phase 1) |
| **დამოკიდებულებები** | D1, D2, D3 (§8) — 0.2 და 0.4-ის ნაწილი დაბლოკილია პასუხამდე; ოპერატორის წვდომა Railway/GCP/GitHub Settings-ზე |
| **რისკები** | ოპერატორი rotation-ს ისევ გადადებს (მაისიდან ასეა) → ყველა სხვა სამუშაო secret-ის ჩრდილში რჩება; history rewrite fork-ებს გატეხავს (D3) |

| # | Deliverable | ვინ | Effort | Done when |
|---|---|---|---|---|
| 0.1 | **Secrets rotation + purge:** Railway MySQL root პაროლი reset; Google Maps browser + server key regenerate GCP-ში; `AUDIT-CONTINUATION-2026-05-03.md` „Pending Operator Actions" ბლოკი და `OPS.md`-ის host ხაზი წაშლილი; `OPS.md` §Credentials-ში Railway env სახელების **სრული** სია (`PADDLE_WEBHOOK_SECRET`, `JWT_SECRET`, `RESEND_API_KEY`, `PADDLE_API_KEY`, `BUILT_IN_FORGE_*` ჩათვლით — სახელები, არა მნიშვნელობები) | OP (rotation, 1 სთ) + CC-Mira (purge PR) | S | `git grep -n "proxy.rlwy.net\|<pw-assignment pattern>"` → 0 ხაზი; ძველი credential-ით `mysql` connect → `Access denied`; ძველი Maps key-ით Places request → 403; `OPS.md` env ცხრილში 9 სახელი; D3-ის მიხედვით `git filter-repo` შესრულებული ან ცხადად უარყოფილი |
| 0.2 | **Billing გადაწყვეტილების იმპლემენტაცია** (D2). **(a) pause [რეკომენდაცია]:** Home pricing სექცია + `PricingCTA` + „$9/month" CTA-ები 5 ენაზე ამოღებული; `Catalog.tsx` `PREVIEW_ITEMS` gating ამოღებული (სრული სია ყველასთვის); `/refund` გვერდი „ამჟამად ფასიანი გეგმა არ არის"; `subscription` router + webhook უცვლელი. **(b) repair:** `PADDLE_WEBHOOK_SECRET` Railway-ზე; `node scripts/apply-migration-0020.mjs`; `cancel` → Paddle API; annual price ან toggle-ის წაშლა; server-side gate | CC-Kwame + Lila (a) / OP + CC-Mira (b) | S | (a): `grep -rn "\$9\|9/month\|79/yr" client/src/i18n/*.ts` → 0; ანონიმური `/catalog` → სრული სია, `mapPoints` და list ერთსა და იმავე რიცხვს აჩვენებს; `pnpm test` მწვანე (33 Paddle ტესტი უცვლელი). (b): `node scripts/check-migration-0020.mjs` → table exists; sandbox checkout → `users.subscriptionStatus='active'` ≤ 30 წმ; cancel → Paddle dashboard `canceled` |
| 0.3 | **CI:** `.github/workflows/ci.yml` — `pnpm install --frozen-lockfile && pnpm check && pnpm test && pnpm build` PR-ზე და `main`-ზე; `tsconfig.scripts.json` (ან include) `scripts/`-ისთვის; `scripts/create-temp-admin.ts` fix ან წაშლა (fallback პაროლი ხაზი 25 — წაშლა); branch protection `main`-ზე (required check) | CC-Mira + OP (branch protection, 5 წთ) | S | PR წითელი check-ით ვერ merge-დება (ტესტი: PR შეგნებული TS error-ით → blocked); `pnpm check` scripts/-ის ჩათვლით 0 error; `esbuild scripts/create-temp-admin.ts` exit 0 ან ფაილი არ არსებობს |
| 0.4 | **სიმართლე copy-ში (5 ენა):** testimonials + „500+ Active members" ამოღება; „640+"/„29+"/„538" → `organizations.count` + `organizations.countries` live რენდერი (ერთი `useStats` hook); „Manus account" → „email"; „verified" → „ბოლო განახლება {date}" ან ამოღება; ka 3 აზრობრივი fix (`ka.ts:249,985,1163`); `MobileBottomNav` „AI" → i18n | CC-Kwame + CC-Lila | S | `grep -rn "500+\|Manus\|640+\|29+\|538" client/src/i18n/*.ts client/src/lib/constants.ts client/public/manifest.json client/index.html` → 0; Home-ზე რიცხვები = `SELECT COUNT(*) FROM organizations WHERE isActive=1` და `COUNT(DISTINCT country)`; `ka.ts:249` = „მხოლოდ აშშ-ს რეზიდენტებისთვის"; 5-ივე ლექსიკონი `pnpm check`-ს გადის (typed parity) |
| 0.5 | **ხარჯი და gating:** `smartSearch` → LRU cache (normalized query, 24 სთ; `lru-cache` უკვე dep-ია) + 10/min/IP; `sameSite: "lax"`; `express.json` 2 MB გლობალურად (import route ცალკე 50 MB) | CC-Mira | S | იგივე query ×2 → 1 Anthropic call (server log); ანონიმური მე-11 smartSearch/წთ → 429; `cookies.ts` `sameSite: "lax"`; import ტესტი (25 ტესტი) მწვანე |
| 0.6 | **Docs — ერთი წყარო:** `PROJECT_MAP.md` = SSOT + სექცია „Numbers" `STATUS.json`-იდან (`scripts/audit-db-content.ts` output, თარიღით); `CLAUDE.md` = მხოლოდ წესები (golden rule, pnpm, `/api/trpc`, i18n ×5, soft delete, Karpathy) + პოინტერები, რიცხვები/phase progress/მოძველებული tRPC სია წაშლილი; `PIVOT.md` = `ORG-CENTRIC-MEMORY.md §1` + ამ გეგმის §1–§2; `_archive/`-ში: `STATE.md`, `todo.md`, `MASTER-ROADMAP-2026-04-25.md`, `DIAGNOSTIC-2026-04-23/25.md`, `EXECUTION-PLAN.md`, `HANDOFF-*.md`, `PLAN-france-orgs-import.md`, `ideas.md`, `LAUNCH-REPORT.md`, `audit-phase7.md`, `*.pptx`, `location-audit-report.json`; `deferred-issues.md` → GitHub Issues; `TEAM_ROSTER.md` განახლდება §6-ით (არა archive) | CC-Ilias | S | `.grantkit-redesign/*.md` (non-archive) ≤ 6 ფაილი (`PROJECT_MAP`, `OPS`, `PIVOT`, `KARPATHY_GUIDELINES`, `TEAM_ROSTER`, `WORKFLOW`); `grep -rn "640+\|643\|3,650\|subscription.activate\|~960" .grantkit-redesign/*.md CLAUDE.md` → 0; PROJECT_MAP „Migrations" ცხრილი = `ls drizzle/*.sql` |
| 0.7 | **მონაცემთა გაწმენდა I:** `GOOGLE_MAPS_API_KEY` GitHub Secrets-ში → `contact-enrichment.yml` schedule დაბრუნება (ჯერ `workflow_dispatch --limit=10 --dry-run`); ~30 ნაგავი org (`^(დეტალები\|მგზავრობა\|…)$`) `merge-org-duplicates.ts`/deactivate; FR 493 vs 624 რეკონსილიაცია (ანგარიში: რა მოხდა 131 რიგთან — merge, სხვა ქვეყანა, import fail?); `STATUS.json` პირველი commit | OP (secret, 5 წთ; script-ების გაშვება) + CC-Noa (workflow) + CC-Ilias (ანგარიში) | M (11 დღე batch background) | workflow run green 3 დღე ზედიზედ; `STATUS.json`: orgs ნაგავი-სახელით = 0; `contactEnrichmentStatus='pending'` < 1,000 (კლებადი); რეკონსილიაციის ანგარიში `.grantkit-redesign/reports/fr-count-reconciliation.md` ერთი ცხრილით |
| 0.8 | **Dead code archive (მხოლოდ გადატანა):** `server/_core/{imageGeneration,voiceTranscription,dataApi,map,llm}.ts`, `server/*.mjs\|cjs` (13), `pending-imports/` (60) → `_archive/` ან წაშლა; `stage*.cjs` **არ ეხება** (`CLAUDE.md` წესი 8) | CC-Ilias | S | `pnpm check && pnpm build` მწვანე; `grep -rn "imageGeneration\|voiceTranscription" server/` → 0 import |
| 0.9 | **Migration მექანიზმი — ერთი (I7):** ADR `.grantkit-redesign/adr/0001-migrations.md`; journal/snapshots რეგენერაცია `0014–0020`-ით; Dockerfile CMD-დან `migrate.js` ამოღება; apply მხოლოდ `scripts/apply-migration-XXXX.mjs`-ით golden rule-ის დაცვით; `0020` prod სტატუსის ვერიფიკაცია | CC-Mira + CC-Dmitri; OP (check script Railway-ზე) | M | `drizzle-kit check` clean; fresh DB-ზე `drizzle-kit migrate` → `0000–0020` ყველა; `Dockerfile` CMD = `node dist/index.js`; `node scripts/check-migration-0020.mjs` output ჩაწერილი PROJECT_MAP-ში. **Gate: 0021 არ იწერება, სანამ ეს არ დასრულდება** |

**Phase 0 done when (ჯამური):** ყველა 9 done-when ✓; CI 5 PR-ზე ზედიზედ მწვანე; `STATUS.json` არსებობს; მფლობელმა D1–D3 დაწერა `PIVOT.md`-ში.

### Phase 1 — ვალიდაცია + რეპოზიციონირება (კვირა 2–4 · ~12 CC-დღე + ~10 EXT-სთ)

| | |
|---|---|
| **მიზანი** | საიტი სწორ ადამიანს სწორ რამეს ეუბნება, და ჩვენ ვიგებთ — ეს რეალურად სჭირდება თუ არა ვინმეს. სქემა არ იცვლება. |
| **Scope IN** | I9 (JSON read), I10, I11, I12 (mapping + API ფილტრები), I13 (copy/privacy page), I14, I16, I17, I18 (S-ნაწილი), I20 (ლექსიკა), I21, I24 (Umami), I25 (mailto); Ezra §7 ვალიდაცია |
| **Scope OUT** | `services`/`guides` entity; `/:lang` route; AI retool; retention |
| **დამოკიდებულებები** | Phase 0.3 (CI), 0.4 (copy base), D5, D6, D7, D8, D14, D15, D17, D18 |
| **რისკები** | ინტერვიუების რეკრუტინგი ვერ მოხერხდა 2 კვირაში → Phase 2 კონტენტი ვარაუდზე დაიწერება (mitigation: fake-door + cold-call მაინც გაკეთდეს); onboarding-ის სტატუსის კითხვა ნდობას შეარყევს (mitigation: client-only, „გამოტოვება" პირველი ღილაკი) |

| # | Deliverable | ვინ | Effort | Done when |
|---|---|---|---|---|
| 1.1 | **ვალიდაცია (Ezra §7):** 5–8 ინტერვიუ (3 ქართველი ეტაპ 1–2 FR, 2 რუსულენოვანი, 2–3 სოცმუშაკი/მოხალისე); card sort 11 დომენზე ka-ში (5 ადამიანი); fake-door 2 FB ჯგუფში („უფასო ქართულენოვანი გზამკვლევი — პირველი 30 დღე საფრანგეთში", Google Form + PDF); 5 ორგანიზაციის cold-call ბაზიდან; WTP landing მხოლოდ ru-relocant პერსონაზე (0/€5/€15) | EXT (მფლობელი + CC-Ezra გაიდი/სინთეზი) | ~10 სთ, 2–3 კვირა, ≤ €300 | `reports/05-validation.md`: ≥5 ინტერვიუს ტრანსკრიპტ-სინთეზი; card sort — 11 დომენიდან ≥9 სწორად დაჯგუფებული ≥4/5 მონაწილესთან; fake-door sign-up ≥ 30 ან „<30 — სეგმენტი ცივია" ცხადად ჩაწერილი; cold-call: 5/5 შედეგი (პასუხობს? ინფო ემთხვევა?) — ეს არის სიახლის baseline |
| 1.2 | **Hero + copy v2 (5 ენა):** ქვეყანა-first შესვლა („საფრანგეთში ხართ? {n} ორგანიზაცია, რომელიც დაგეხმარებათ — სტატუსის მიუხედავად"), ქალაქის არჩევა (Paris 222 / Reims 25 / Lyon 20 `[P]`), „უფასოა ემიგრანტისთვის"; FAQ გადაწერა ინტეგრაციულ კითხვებზე; ka/ru ლექსიკის native pass (ბინადრობა, თავშესაფარი, სოცმუშაკი, ჩაწერა, მოიტანეთ); D17: არა „სამედიცინო ქართველები", არამედ ენა + სტატუსი | CC-Lila (copy) + CC-Kwame (Home) | M | Home hero-ში სიტყვები „grant/გრანტი" 0-ჯერ, „ორგანიზაცია/სტატუსი/უფასო" ≥1; `t.hero.*` 5 ენაზე parity (`pnpm check`); Priya-ს დანართი A-ს 22 სტრინგიდან ⚠︎/✘ → ✔︎ ≥ 18 |
| 1.3 | **Onboarding v2:** ქვეყანა → ქალაქი → ენა → **სტატუსი (optional, client-only — `localStorage`, სერვერზე არასდროს)** → საჭიროებები = 11 დომენი; `purpose` არასავალდებულო; ნაბიჯ 3-ზე კონფიდენციალურობის ხაზი + „გამოტოვება"; `OnboardingModal` და `/onboarding` → ერთი flow; Dashboard = `organizations.list` გაფილტრული `country` + domain mapping-ით | CC-Kwame + CC-Dmitri (API) | M | ახალი user: 4 ნაბიჯი → Dashboard-ზე ≥1 ორგანიზაცია მისი ქვეყნიდან/დომენიდან; `SELECT needs FROM users` არასდროს შეიცავს სტატუსს (test); `StepPurpose` „გამოტოვება"-ით გადის; `grep OnboardingModal client/src` → 0 |
| 1.4 | **ტაქსონომია → დომენები (mapping, სქემის გარეშე):** `shared/domains.ts` (category→domain, mainCategory→domain, Need→domain); `organizations.list` ფილტრები: `domain`, `city`, `language`, `serviceCost`, `acceptsUndocumented`, `acceptsUninsured`, `appointmentPolicy`; UI ფილტრები დომენი × ქალაქი × ენა × ფასი × სტატუსი; დიაგნოზი/B-2 ვიზა მხოლოდ `health` ქვეფილტრად | CC-Dmitri (API) + CC-Kwame (FilterBar) + CC-Lila (11 დომენის label ×5) | M | `curl organizations.list?domain=health&language=ka&serviceCost=free&country=FR` → მხოლოდ შესაბამისი რიგები (ტესტი `organizations.test.ts` — პირველი org ტესტი); ყველა 1,110 org-ს ≥1 დომენი mapping-ით; `other` ≤ 3% |
| 1.5 | **Provenance + ნდობა UI:** contact card-ში „ბოლოს შემოწმდა {phoneVerifiedAt} · წყარო {phoneSource}" / „დაუდასტურებელია — დარეკეთ"; WhoWeHelpCard მხოლოდ ცნობილი რიგები + ერთი muted ხაზი; ერთხაზიანი disclaimer ყოველ org გვერდზე + „შეცდომის შეტყობინება" (`mailto:` subject-ით `orgId`); TrustPanel rating-ის გარეშეც რენდერდება (D7/D8 წესებით) | CC-Kwame + CC-Lila | S | org გვერდზე provenance ხაზი ჩანს 100% ორგანიზაციაზე (თარიღით ან „დაუდასტურებელია"); `acceptsUndocumented='unknown'` → რიგი არ ჩანს „unconfirmed"-ად (screenshot diff); disclaimer 5 ენაზე |
| 1.6 | **France ველები + org ლოკალიზაცია (read-only):** `ServicesOfferedCard`, `TargetAudienceCard`, `HousingCard` (housing JOIN `getOrganizationDetail`-ში), `emigrationPurpose` badge, `isNational`; `translations[lang]` fallback `pickLocalized`-ით (`localizeEntity.ts` უკვე არსებობს) | CC-Kwame + CC-Dmitri (JOIN) | M | `/organizations/<FR org with housing>` ka-ზე: აღწერა ქართულად (თუ JSON-ში არის), HousingCard ტევადობით/ხანგრძლივობით; 102/102 housing org-ზე card ჩანს; e2e smoke ტესტი 1 FR org-ზე ka/fr |
| 1.7 | **Mobile ქმედება + სისწორე:** sticky bar **დარეკვა (tel:) · მარშრუტი (maps) · საიტი**; error state offline vs 404, „Grant" → „ორგანიზაცია"; კატეგორიის ჩიპები `tCategory`, ქვეყანა `t.country[code]`; `navigator.language` autodetect პირველ ვიზიტზე; `PageFallback` skeleton; `streamdown` → `react-markdown` + `remark-gfm` | CC-Kwame | S | 390 px screenshot: 3 ღილაკი sticky; backend-ის გარეშე `/organizations/ORG-0001` → „კავშირი არ არის — სცადეთ თავიდან" (არა „Grant Not Found"); `dist/public/assets` < 150 ფაილი; ka ბრაუზერი → პირველი ვიზიტი ka-ზე |
| 1.8 | **Routes + SEO ჰიგიენა (Q2):** `/organizations` list route; Express 301 `/catalog`→`/organizations`, `/grant/:id`→`/organizations/:orgId` (orgId-ით დაკავშირებული 752-ისთვის; დანარჩენი → `/organizations`); `client/public/sitemap.xml` წაშლა (dynamic ერთადერთი); org JSON-LD | CC-Kwame + CC-Mira (Express) | S | sitemap-ის ყოველი URL → 200 (script `scripts/check-sitemap.ts`); `curl -I /catalog` → 301; Search Console 404 = 0 (OP ამოწმებს 2 კვირაში) |
| 1.9 | **Telemetry (cookieless) + email sender:** Umami (self-host Railway ან cloud, D18) `VITE_ANALYTICS_*` env-ით; pageview + 3 event (`org_call_click`, `org_directions_click`, `org_site_click`); Privacy page rewrite (legal basis, retention, „cookies არ გამოიყენება"); Resend DNS (4 record) + `FROM_EMAIL=hello@<domain>`, admin notify მფლობელის მისამართზე | OP (DNS, Umami) + CC-Mira | S | Umami-ში 24 სთ-ში ≥1 `org_call_click`; `Privacy.tsx`-ში „analytics cookies" 0; verification email inbox-ში (არა spam) 3 პროვაიდერზე |
| 1.10 | **Deps:** `pnpm audit --prod` high-ების განახლება (`drizzle-orm`, `mysql2`, `nanoid`, `lodash`) | CC-Mira | S | `pnpm audit --prod` high = 0 ან ცხადი ADR თითო დარჩენილზე; `pnpm test` მწვანე |

**Phase 1 done when:** 1.1 ანგარიში არსებობს და **go/no-go გადაწყვეტილება Phase 2-ზე ჩაწერილია** (no-go = სეგმენტი ცივია → D5 გადახედვა); ყველა 1.2–1.10 ✓; Lighthouse mobile `/organizations/:id` ≥ 50 (39-დან); PROJECT_MAP Session Log-ში Phase 1 closeout.

### Phase 2 — კონტენტ-მოდელი საფრანგეთისთვის (კვირა 5–10 · ~25 CC-დღე + ~15 EXT-სთ)

| | |
|---|---|
| **მიზანი** | დირექტორია „სად"-ს გარდა „როგორ"-საც ამბობს: სერვისები, პროცედურები, „პირველი 30 დღე" — ქართულად/რუსულად, provenance-ით. ერთადერთი სქემის ცვლილება ამ გეგმაში. |
| **Scope IN** | I9 (entity_translations), I19, I26, cap 2, 3, 4 (სტატიკური), 5, 11, 15, 16, 19; 10 FR გიდი; grants → programs/services |
| **Scope OUT** | user journey state (Phase 3); feedback entity (Phase 3); `/:lang`; ახალი ქვეყანა; headless CMS |
| **დამოკიდებულებები** | Phase 0.9 (migration მექანიზმი); Phase 1 go; D9 (რედაქციული რესურსი), D10 (გრანტების ბედი), D13 (AI სფერო) |
| **რისკები** | Migration 0021 = ერთადერთი outage-რისკი გეგმაში → ცალკე PR, migration ჯერ, code მერე, rollback SQL PR-ში; გიდების იურიდიული სიზუსტე → extract-only ოფიციალური წყაროდან (service-public, OFII, ameli) + `lastVerifiedAt` + disclaimer; solo-founder bandwidth → 10 გიდი, არა 40 |

| # | Deliverable | ვინ | Effort | Done when |
|---|---|---|---|---|
| 2.1 | **ADR + migration 0021 (ცალკე schema PR):** `services` (orgId FK, domain enum, subdomain, title, description, eligibleStatuses CSV, serviceCost, languages CSV, documents JSON, howToAccess, branchIds CSV, lastVerifiedAt, verifiedBy, source, isActive); `documents` (code, whereToGet, isActive); `entity_translations` (entityType, entityId, lang, field, text, source, reviewedAt); `organization_housing` `org_housing_idx` unique → non-unique; `organizations.lastVerifiedAt/verifiedBy`; rollback SQL | CC-Dmitri; OP (apply Railway-ზე) | M | PR = schema + SQL + apply + rollback + ADR; `node scripts/apply-migration-0021.mjs` Railway-ზე **merge-მდე**; `SELECT lastVerifiedAt FROM organizations LIMIT 1` ✓; `drizzle-kit check` clean; მხოლოდ ამის შემდეგ merge; Railway deploy-ის შემდეგ `/healthz` 200 და `/organizations/ORG-0001` 200 |
| 2.2 | **grants → programs/services კლასიფიკაცია:** LLM extract-only (`PROJECT_MAP` anti-hallucination წესი) 1,102 რიგზე: `service` (526/629 „Free service" ტიპი) vs `program` (რეალური გრანტი) vs `archive`; `services` INSERT org-თან ბმით; 350 orphan → D10 (soft delete `isActive=0`); LLM-შაბლონური `documentsRequired/applicationProcess` UI-დან ამოღება სანამ წყარო არ აქვს | CC-Noa (script) + OP (review sample 50) + CC-Dmitri | M | `SELECT COUNT(*) FROM services` ≥ 500; review sample 50-დან ≥ 45 სწორი კლასი; `grants.isActive=0` = orphan-ების რიცხვი D10-ის მიხედვით; org გვერდზე „პროგრამები" ბლოკი მხოლოდ program-ტიპზე |
| 2.3 | **10 საწყისი FR გიდი (ka-first, შემდეგ fr/ru/en/es):** Markdown `content/guides/fr/<slug>.md` frontmatter-ით (`title`, `country`, `domain`, `statuses[]`, `lastVerifiedAt`, `sources[]`, `linkedOrgs[]`); სია: GUDA/OFPRA თავშესაფრის განაცხადი; préfecture/ANEF titre განახლება; PUMa; AME; CAF/ADA; domiciliation; ბავშვის სკოლაში ჩარიცხვა; CIR + უფასო ფრანგული; ENIC-NARIC დიპლომი; ბანკის ანგარიში récépissé-ით. რენდერი `/guides/:slug` `react-markdown`-ით; ყოველი გიდი → 2–3 ორგანიზაცია | CC-Lila (extract-only ოფიციალური წყაროდან; `french-admin-etiquette` skill) + EXT (მფლობელი review ka; 1 ფრანგი სოცმუშაკი review fr, თუ 1.1-დან ხელმისაწვდომია) | L (10 × ~0.5 დღე + review) | 10 გიდი `content/guides/fr/`; ყოველს `lastVerifiedAt` ≤ 30 დღე და ≥1 ოფიციალური წყარო; `/guides/puma` ka/fr/ru → 200; ყოველი გიდიდან ≥2 org ბმული 200-ს აბრუნებს; Ezra-ს კრიტერიუმი #2: 5 ტესტერიდან ≥4 სწორად ასახელებს AME-ს 3 საბუთს გიდის წაკითხვის შემდეგ |
| 2.4 | **„პირველი 30 დღე საფრანგეთში" ჩეკლისტი × სტატუსი:** სტატიკური JSON (`content/checklists/fr.json`) 5 სტატუსზე (asylum_seeker, refugee, worker, student, undocumented) × ეტაპი 1; თითო item = გიდი + ორგანიზაციები ქალაქის მიხედვით; share-ბმული (URL state) + print CSS A4 | CC-Lila (შინაარსი) + CC-Kwame (რენდერი) | M | `/first-30-days?country=FR&status=asylum_seeker&city=Lyon` → ≥8 item, ყოველი ბმულით; ბეჭდვა → 1–2 A4 გვერდი (print preview screenshot); share ღილაკი WhatsApp/Telegram/Viber deep-link-ით |
| 2.5 | **Multilingual pipeline v2:** `translate-missing.ts --entity=organization\|service\|guide` → `entity_translations` (`source=machine`, `reviewedAt=null`); `organizations.translations` JSON → `entity_translations` მიგრაცია (493 FR × 4 ენა); `grant_translations` რჩება, ახალი კოდი მხოლოდ `entity_translations`; ka/ru review queue (admin სია `reviewedAt IS NULL`) | CC-Lila + CC-Dmitri; OP (script run) | M | `SELECT COUNT(*) FROM entity_translations WHERE entityType='organization'` ≥ 493×4; `organizations.detail` ენის მიხედვით `entity_translations` → JSON → raw fallback; `organizations.translations` JSON-ის 0 reader კოდში (grep); 10 გიდი ka+fr+ru reviewed (`reviewedAt` not null) |
| 2.6 | **მინიმალური content editor:** `client/src/pages/AdminContent.tsx` (ცალკე, ≤ 500 ხაზი): org accessibility 5 ველი + `lastVerifiedAt/verifiedBy` + services CRUD + translation review queue; `admin.organizations.*` procedures; `Admin.tsx` არ იზრდება | CC-Kwame + CC-Dmitri | M | ადმინი ბრაუზერიდან org-ზე `acceptsUndocumented=yes` + `verifiedBy=<name>` ინახავს → org გვერდზე „ბოლოს შემოწმდა დღეს · {name}"; `Admin.tsx` diff = 0 ხაზი; 5 ტესტი `admin.organizations.*` auth boundary-ზე |
| 2.7 | **AI ასისტენტი retool (D13):** tools → `search_organizations`, `get_organization`, `search_services`, `get_guide` (grant tools + `search_funders` ამოღება end-user-ისთვის); org-კონტექსტი სერვერზე იწყობა (`orgId` input → server fetch), არა client-ზე; system prompt: „ინფორმაცია, არა რჩევა; unknown → უთხარი დაურეკოს; მიმართე {org}"; disclaimer პირველ შეტყობინებაში; per-user დღიური ქვოტა 20; suggested prompts ინტეგრაციულ კითხვებზე | CC-Noa | M | eval set 20 კითხვა ka/ru (მაგ. „უსაბუთოდ მიმიღებენ?" org-ზე, სადაც `unknown`) → 20/20 პასუხი შეიცავს „დაუდასტურებელია — დარეკეთ" ან DB-ფაქტს წყაროთი, 0 გამოგონილი ორგანიზაცია; 21-ე შეტყობინება/დღე → 429; `orgFocusContext.ts` client-ზე prompt-ს აღარ აწყობს |
| 2.8 | **Perf II:** marker server-side pagination/clustering (`mapPoints` bbox + limit); org map below fold lazy; `client/src/data/*.json` + server static fallback + `Analytics.tsx` retire | CC-Kwame + CC-Dmitri | M | `/catalog` mobile transfer < 2 MB (10.5-დან); Lighthouse mobile `/organizations/:id` ≥ 60; `client/src/data/` არ არსებობს; `pnpm build` მწვანე |

**Phase 2 done when:** migration 0021 live golden rule-ით (PROJECT_MAP Session Log-ში apply → verify → merge თარიღებით); 10 გიდი + 5 ჩეკლისტი ka/fr/ru; ≥ 500 service; org გვერდი 493 FR org-ზე ლოკალიზებული; AI eval 20/20; Ezra-ს კრიტერიუმი #1 მოდერირებულ ტესტში (≥80% პოულობს უფასო კლინიკას ≤5 წთ, 5 მონაწილე).

### Phase 3 — Journey, retention, feedback, telemetry (კვირა 11–16 · ~15 CC-დღე)

| | |
|---|---|
| **მიზანი** | მომხმარებელი ბრუნდება და ხდება verification-ის წყარო; ჩვენ ვზომავთ „იპოვა თუ არა დახმარება". |
| **Scope IN** | cap 4 (journey state), 8, 9, 12 (outcome events), 14 (deletion/consent); I23 მხოლოდ თუ Helper Pro = yes; I25 |
| **Scope OUT** | ახალი ქვეყანა/ენა; B2B multi-tenant; PWA offline |
| **დამოკიდებულებები** | Phase 2 done; migration 0022 (golden rule); Umami (1.9); **Helper Pro gate (D1 გადახედვა Phase 2 KPI-ებით)** |
| **რისკები** | retention ბენჩმარკი არ არსებობს → პირველი კოჰორტით ვადგენთ; feedback spam → rate-limit + admin review |

| # | Deliverable | ვინ | Effort | Done when |
|---|---|---|---|---|
| 3.1 | **Migration 0022 (ცალკე PR):** `user_journey` (userId, countryCode, city, stage, checklist JSON, updatedAt); `saved_entities` (userId, entityType, entityId) ← `saved_grants` მიგრაცია; `content_feedback` (entityType, entityId, verdict, note, lang, createdAt, ip hash); `users.consentAt`, `consentVersion` | CC-Dmitri; OP (apply) | M | apply Railway-ზე merge-მდე; `SELECT stage FROM user_journey LIMIT 1` ✓; `saved_grants` რიგები 100% `saved_entities`-ში |
| 3.2 | **Dashboard = ჩემი გეგმა:** ეტაპის view; ჩეკლისტის პროგრესი (2.4-ის JSON → `user_journey.checklist`); org/service/guide save; login ითხოვება **მხოლოდ** save-ზე | CC-Kwame | M | ახალი user: onboarding → stage 1 ჩეკლისტი → item ✓ → reload-ზე რჩება; ანონიმური მთელ საიტს ხედავს, save → login prompt |
| 3.3 | **Feedback loop:** „ეს ინფორმაცია სწორია? ✓/✗ + შენიშვნა" org/service/guide-ზე → `content_feedback`; admin სია `AdminContent`-ში; ✗ ≥ 3 → org-ზე „გადამოწმება მიმდინარეობს" badge | CC-Kwame + CC-Noa | S–M | feedback INSERT ჩანს admin-ში ≤ 1 წთ; 10/min/IP ლიმიტი; badge ლოგიკის ტესტი |
| 3.4 | **Alerts პროფილზე:** კვირეული digest „ახალი ორგანიზაცია/სერვისი {city}-ში, {language}-ზე, {domain}"; unsubscribe; brand sender | CC-Noa | M | ტესტ-user-ს Lyon/ru/health პროფილით 7 დღეში ≥1 digest მხოლოდ შესაბამისი ჩანაწერებით; `notification_history` რიგი |
| 3.5 | **Outcome telemetry:** 5 event (`org_contact_clicked`, `guide_step_done`, `checklist_shared`, `feedback_sent`, `search_no_results`) Umami-ში; KPI dashboard (§7) `admin.stats`-ში live DB-დან | CC-Mira | S | Umami-ში 5-ივე event 7 დღეში ≥1; `admin.stats` აბრუნებს §7-ის 10 KPI-ს |
| 3.6 | **Privacy II:** `auth.deleteAccount` (user + journey + saved + feedback rows); consent record onboarding-ში; retention policy (inactive 24 თვე → anonymize) ADR; AI chat → Anthropic დისკლოზერი Privacy-ში | CC-Mira | M | `auth.deleteAccount` → 4 ცხრილში 0 რიგი (ტესტი); Privacy page-ში consent version; ADR ფაილი |
| 3.7 | **Helper Pro (მხოლოდ თუ D1 gate = yes):** Paddle repair (I2b, I23): secret, 0020, cancel API, annual price; Pro features: case list (რამდენიმე ბენეფიციარის გეგმა), print pack, CSV export, AI ქვოტა 200/დღე | CC-Mira + CC-Kwame; OP | M | sandbox purchase → `active` ≤ 30 წმ; Pro user → case list; free user → ყველა Phase 0–3 feature უცვლელი (**ემიგრანტისთვის არაფერი იკეტება** — ტესტი) |

**Phase 3 done when:** 3.1–3.6 ✓; D30 retention პირველი კოჰორტისთვის გაზომილი (რიცხვი, არა მიზანი); „wrong info" reports < 5% org views-ზე; §7 KPI dashboard live.

### Phase 4 — მასშტაბი (თვე 5+ · gate: Phase 3 KPI-ები)

| | |
|---|---|
| **მიზანი** | reference implementation (FR × ka/ru × 1 journey) კოპირდება მეორე ქვეყანაზე და მეორე ენაზე; შემოსავლის მე-2 ხაზი (B2B2C) იტესტება. |
| **Gate (ყველა სამი):** | WAU ≥ 200 (ka+ru ≥ 60%); Ezra #3: ვერიფიცირებული კონტაქტი ≥ 90% FR org-ზე; ≥ 3 შუამავალი (სოცმუშაკი/მოხალისე) თვისებრივად ადასტურებს „1 ვიზიტი დავუზოგე" |
| **Scope (გადაწყვეტილებები D11, D12, D16):** | (a) მეორე ქვეყანა — ES (arraigo 2 წ. JTBD + ~25k ქართველი + ru; `[E §5.1 B]`) vs DE (Integreat-ზე დაშენება, `[N §6.2]`): 30 org სიღრმით + 10 გიდი, არა 500 ზედაპირულად; (b) მეორე ენა — uk (TP სეგმენტი 4.43 მლნ) vs ar/fa (FR ნაკადი) — D11; (c) B2B2C 3 pilot: 1 ქართული დიასპორული ორგ. FR-ში, 1 NGO, 1 CCAS — embed widget + ka/ru ფენა €2–10k/წ `[N M2]`; (d) claim-your-listing ორგანიზაციებისთვის (cap 18); (e) PWA: Workbox precache გიდები + ჩეკლისტი offline (cap 13); (f) `/:lang` prefix + hreflang + crawler prerender org/guide გვერდებზე (cap 6); (g) გრანტების განაცხადი პლატფორმისთვის (AMIF national call / Google.org / DIAIR inclusion numérique) — `[N M4]` |
| **Effort** | L (თვე 5–8); ყოველი ქვე-item ცალკე done-when Phase 3-ის ბოლოს იწერება — ახლა სპეკულაცია იქნებოდა |
| **რისკები** | „ეთნიკური" ბრენდი ზღუდავს (mitigation: ენა = პარამეტრი, ბრენდი ნეიტრალური — D4); B2B sales solo founder-ისთვის (mitigation: pilot = უფასო 3 თვე, მერე ფასი); საელჩოსთან პარტნიორობა რეპუტაციულად სენსიტიური `[N R9]` — ჯერ NGO/დიასპორა, არა სახელმწიფო |

---

## 6. გუნდი და აგენტები შესრულებისთვის (Phase 0–2)

> კონვენცია: `TEAM_ROSTER.md` (persona = სახელი + ექსპერტიზა + ფილოსოფია + skills + ფაზა). სახელები, სადაც შესაძლებელია, არსებული roster-იდანაა (Mira, Dmitri, Kwame, Lila, Noa, Ilias, Ezra) — ისტორიული უწყვეტობისთვის. **`MASTER-ROADMAP-2026-04-25.md`-ის გაფრთხილება ძალაშია:** ესენი Claude Code სესიების პერსონებია, არა ადამიანები; ყოველი „პარალელური ნაკადი" = ცალკე სესია ცალკე branch-ზე, რომელსაც მფლობელი უშვებს.

### 6.1. Persona-ები

| Persona | ექსპერტიზა / skills | ნაკადი (Phase) | **ფლობს** (ფაილები/სფეროები) | **არ ეხება** |
|---|---|---|---|---|
| 🛡️ **Mira** — Security & Platform Ops | secrets, CI/CD, migrations mechanics, rate-limit, RGPD ტექნიკური; skills: `security-review`, `update-config`, `session-start-hook` | 0.1, 0.3, 0.5, 0.9 (Dmitri-სთან), 1.8 (Express), 1.9, 1.10, 3.5, 3.6, 3.7 | `.github/workflows/*`, `server/_core/*`, `server/paddleWebhook.ts`, `drizzle/meta/*`, `Dockerfile`, `scripts/apply-migration-*.mjs`, `OPS.md` §Credentials/§Secret rotation | UI copy, i18n, `drizzle/schema.ts` ცხრილების შინაარსი, კონტენტი |
| 🚀 **Ilias** — Release, Docs SSOT & Data Ops | docs consolidation, `STATUS.json`, archive, data-cleanup script-ების კოორდინაცია, PR review gate; skills: `code-review`, `simplify` | 0.6, 0.7 (ანგარიში), 0.8; ყოველი ფაზის closeout | `.grantkit-redesign/*` (გარდა OPS secrets), `scripts/audit-db-content.ts`, `scripts/merge-org-duplicates.ts`, `_archive/` | `client/`, `server/` ლოგიკა |
| 🎨 **Kwame** — Frontend | React 19, Tailwind 4, mobile, conversion; skills: `responsive-polish`, `conversion-craft` | 0.2(a), 0.4 (Home), 1.2 (Home), 1.3, 1.4 (FilterBar), 1.5, 1.6, 1.7, 1.8 (routes), 2.4 (render), 2.6, 2.8, 3.2, 3.3 | `client/src/pages/*`, `client/src/components/*`, `client/src/hooks/*`, `client/src/lib/*` (გარდა `constants.ts` ტაქსონომია) | `drizzle/`, `server/db.ts` (read-only გამოძახება), i18n **მნიშვნელობები** (მხოლოდ key-ების დამატება Lila-სთან შეთანხმებით), `stage*.cjs` |
| ✍️ **Lila** — Content & i18n (5 ენა) | native ka/ru, fr ადმინისტრაციული ენა, extract-only რედაქცია; skills: `native-translator`, `french-admin-etiquette`, `text-humanizer`, `france-market-compliance` | 0.2(a) copy, 0.4, 1.2, 1.4 (labels), 1.5 (disclaimer), 2.3, 2.4 (შინაარსი), 2.5 | `client/src/i18n/*.ts`, `content/guides/**`, `content/checklists/*`, `scripts/translate-*.ts`, `scripts/audit-translations.ts` | სერვერული ლოგიკა, სქემა, კომპონენტების სტრუქტურა |
| 🗄️ **Dmitri** — Data Architect | MySQL + Drizzle, migration safety, golden rule custodian; skills: `mvp-architect`, `structured-output-designer` | 0.9 (Mira-სთან), 1.3/1.4/1.6 (API + JOIN), 2.1, 2.2 (Noa-სთან), 2.5, 2.6 (procedures), 2.8 (mapPoints), 3.1 | `drizzle/schema.ts`, `drizzle/00XX_*.sql` + rollback, `server/db.ts`, `server/routers.ts` (`organizations.*`, `admin.organizations.*`), `shared/domains.ts`, `shared/profileTypes.ts` | `client/`; **არასდროს merge-ავს schema PR-ს migration-ის Railway-ზე გაშვებამდე**; `grants` hard delete |
| 🔗 **Noa** — Data Pipelines & AI | Google Places, enrichment, provenance, LLM extract-only, agentic tools; skills: `agent-builder`, `ai-product-patterns`, `prompt-engineer`, `claude-api` | 0.7 (workflow), 2.2 (script), 2.7, 3.3 (badge), 3.4 | `scripts/enrich-*.ts`, `scripts/geocode-*.ts`, `scripts/daily-discovery.ts`, `scripts/import-new-grants.ts`, `server/grantAssistant.ts`, `server/toolboxClient.ts`, `server/queryExpander.ts`, `server/smartSearch.ts`, `server/emailService.ts` | სქემა, UI, `stage*.cjs`, `pending-imports/` (archive-ის შემდეგ) |
| 🎯 **Ezra** — Research & Validation | JTBD, ინტერვიუ, card sort, fake-door; skills: `customer-research-team`, `persona-forge`, `market-validator` | 1.1; Phase 2.3 review (მომხმარებლის თვალით); Phase 3 კოჰორტის ანალიზი | `scratchpad/reports/05-validation.md`, ინტერვიუს გაიდი, Google Form | რეპოს კოდი/დოკუმენტები |
| 🧭 **Tamar** — მენეჯერი (ეს დოკუმენტი) | merge, კონფლიქტი, პრიორიტეტი, escalation | ყველა | `00-MASTER-PLAN.md`, `PIVOT.md` (Ilias-თან), `PROJECT_MAP` Session Log-ის ფაზის closeout ხაზი | კოდი |

### 6.2. პარალელიზაციის გეგმა

| ფაზა | პარალელური ნაკადები (თითო = ცალკე სესია/branch) | თანმიმდევრული (რატომ) |
|---|---|---|
| **0** | **A** Mira: 0.1 → 0.3 → 0.5 ‖ **B** Kwame+Lila: 0.4 (+0.2a, როცა D1/D2 მოვა) ‖ **C** Ilias: 0.6 → 0.8; Noa: 0.7 workflow | 0.9 (Mira+Dmitri) **0.3-ის შემდეგ** (CI უნდა არსებობდეს journal-ის PR-ისთვის) და **Phase 2.1-მდე** — gate; 0.2 D2-ის შემდეგ |
| **1** | **A** Ezra: 1.1 (მთელი ფაზა, EXT) ‖ **B** Lila: 1.2 copy → 1.4 labels → 1.5 disclaimer ‖ **C** Dmitri: 1.4 API → 1.3 API → 1.6 JOIN ‖ **D** Kwame: 1.7 → 1.8 → 1.5 → (1.4 UI, 1.3, 1.6 როცა C მზადაა) ‖ **E** Mira: 1.9 → 1.10 | 1.3 onboarding **1.4 mapping-ის შემდეგ** (დომენები); 1.6 UI **1.6 JOIN-ის შემდეგ**; go/no-go **1.1-ის შემდეგ** — Phase 2 კონტენტი (2.3) შეიძლება დაიწყოს 1.1-ის პარალელურად მხოლოდ draft-ად, არა publish-ად |
| **2** | **A** Dmitri: 2.1 (პირველი, gate) → 2.5 → 2.6 procedures ‖ **B** Lila: 2.3 გიდები (Markdown — სქემისგან დამოუკიდებელი, **შეიძლება 2.1-მდე დაიწყოს**) → 2.4 → 2.5 review ‖ **C** Noa: 2.7 AI (სქემისგან დამოუკიდებელი tools-ის ნაწილი) → 2.2 (2.1-ის შემდეგ) ‖ **D** Kwame: 2.8 perf (დამოუკიდებელი) → 2.4 render → 2.6 UI | 2.2, 2.5, 2.6 **2.1 live-ის შემდეგ** (services/entity_translations ცხრილები); `/guides` render-ს სქემა არ სჭირდება |

**ტემპი:** ერთდროულად ≤ 3 ღია PR — მაისის 3 fire-drill (`PROJECT_MAP` Session Log 04-24: restore branch + deletion merge) იმის შედეგი იყო, რომ 8 PR ერთ დღეში იმერჯებოდა review-ს გარეშე.

### 6.3. მენეჯერის პროტოკოლი

| წესი | როგორ |
|---|---|
| **ანგარიშების merge** | ყოველი persona ფაზის ბოლოს წერს ≤ 1 გვერდიან closeout-ს `scratchpad/reports/` ან PR body-ში: ფაქტი `[✓]`/`[შეფასება]` მარკერით, done-when სტატუსი (✓/✗ + ბრძანების output), რა ვერ გადამოწმდა. მენეჯერი აერთიანებს `PROJECT_MAP.md` Session Log-ის 3 ხაზში + `PIVOT.md` სტატუსში |
| **კონფლიქტის გადაწყვეტა** | ევიდენსის რიგი: (1) ამ სესიის ბრძანების output > (2) `audit-reports/*` + live DB query > (3) კოდის კითხვა ხაზით > (4) `PROJECT_MAP`/`OPS` > (5) სხვა `.grantkit-redesign/*.md` > (6) მეხსიერება/ვარაუდი. ორი persona-ს კონფლიქტი კოდზე → ფაილის მფლობელი (§6.1) იგებს; პროდუქტულ კითხვაზე → მენეჯერი 24 სთ-ში; თუ ვერ — მფლობელს |
| **მფლობელთან escalation (მხოლოდ ესენი)** | ფული/ფასი; ბრენდი/სახელი; იურიდიული ექსპოზიცია (სტატუსის მონაცემი, AI რჩევა, „verified" claim); სქემიდან სვეტის/ცხრილის წაშლა; მონაცემის hard delete ან >100 რიგის deactivate; history rewrite; ახალი ქვეყანა/ენა; გარე ხარჯი > €100 |
| **Review gates** | `server/_core/*`, workflows, Dockerfile → Mira review სავალდებულო; `db.ts`/`schema.ts`/`routers.ts` → Dmitri; `i18n/*` → Lila (5-ენა parity + ka native); `client/src/pages/*` → Kwame; ყველა PR → Ilias release checklist (CI მწვანე, done-when output PR-ში, Session Log ხაზი) |
| **PR ზომა** | ≤ 300 შეცვლილი ხაზი (i18n ლექსიკონები და generated ფაილები არ ითვლება); ერთი concern; schema PR **ყოველთვის ცალკე** და **ყოველთვის** migration-ის შემდეგ merge; „refactor while here" აკრძალულია (Karpathy §3) |
| **STATE/PROJECT_MAP** | `STATE.md` archive-ში (0.6); ერთადერთი ლოგი = `PROJECT_MAP.md` Session Log (append-only, 3 ხაზი/სესია) + „Numbers" `STATUS.json`-იდან; `WORKFLOW.md` განახლდება: „STATE.md" → „PROJECT_MAP.md", „No parallel phases" → „No parallel PRs on the same file owner" |
| **სესიის დასაწყისი** | `KARPATHY_GUIDELINES.md` → `CLAUDE.md` → `PROJECT_MAP.md` → `OPS.md` → `PIVOT.md` → `TEAM_ROSTER.md` (persona) → ამ გეგმის ფაზის ცხრილი |

---

## 7. წარმატების მეტრიკები

**North-star:** **„დახმარებული კონტაქტი კვირაში"** = უნიკალური მომხმარებელი, რომელმაც კვირაში ≥1 კონტაქტ-ქმედება (დარეკვა / მარშრუტი / საიტი) გააკეთა ისეთ ორგანიზაციაზე, რომლის `lastVerifiedAt` ≤ 90 დღეა, საკუთარ ენაზე. ეს ერთდროულად ზომავს მოთხოვნას (მოვიდა), ხარისხს (ვერიფიცირებული) და პოზიციონირებას (ენა). **Baseline დღეს: 0** (users = 0, telemetry = 0, verified = 0) `[✓]`.

| # | KPI | Baseline (2026-09) | Phase 1 (კვ. 4) | Phase 2 (კვ. 10) | Phase 3 (კვ. 16) | როგორ იზომება (რა უნდა არსებობდეს ჯერ) |
|---|---|---|---|---|---|---|
| 1 | ვერიფიცირებული ორგანიზაცია FR (`lastVerifiedAt` ≤ 90 დ.) | 0 / 493 | 100 (enrichment cron + cold-call) | 493 (100% FR) | 493 + US ტოპ-100 | `STATUS.json` (0.7); `lastVerifiedAt` სვეტი (2.1) |
| 2 | Provenance დაფარვა — ტელეფონი წყაროთი | 331 org ტელეფონის გარეშე; 779 no-provenance | no-provenance < 400 | < 100 | < 50 | `audit-db-content.ts` §8-9 |
| 3 | ნაგავი/orphan ვალი | ~30 org · 350 grant | 0 · 350 (D10 გადაწყვეტილი) | 0 · 0 (services/archive) | 0 · 0 | `STATUS.json` |
| 4 | Task success მოდერირებულ ტესტში („უფასო კლინიკა დაზღვევის გარეშე, ჩემს ქალაქში, ≤5 წთ") | — | გაზომილი 1.1-ში (რიცხვი) | ≥ 80% (5 მონაწილე) `[E #1]` | ≥ 80% (ხელახლა, 5 ახალი) | 1.1 ინტერვიუ/ტესტი (EXT) |
| 5 | WAU · მათგან ka+ru წილი | 0 | 50 (fake-door + FB) | 200 · ≥ 60% | 500 · ≥ 60% | Umami (1.9), ენა = `localStorage` → event property |
| 6 | კონტაქტ-ქმედების rate (org გვერდის ვიზიტიდან) | — | გაზომილი (baseline) | ≥ 25% | ≥ 30% | Umami 3 event (1.9) |
| 7 | ჩეკლისტის share-rate (share / ჩეკლისტის გახსნა) | — | — | ≥ 15% `[E #4]` | ≥ 15% | `checklist_shared` event (3.5) — Phase 2-ში proxy: share ღილაკის click Umami-ში |
| 8 | „არასწორი ინფო" რეპორტი / org ვიზიტი | — | mailto რაოდენობა (baseline) | < 5% `[E #3]` | < 5% + ✗ → გადამოწმება ≤ 7 დღე | mailto (1.5) → `content_feedback` (3.1) |
| 9 | D30 retention (ეტაპ 1–2 მომხმარებელი) | — | — | გაზომილი პირველ კოჰორტაზე `[E #5]` | ≥ პირველი კოჰორტა + 20% | `user_journey.updatedAt` (3.1) + Umami |
| 10 | გიდები FR ka+fr+ru reviewed | 0 | 0 | 10 | 20 | `content/guides/fr/` + `entity_translations.reviewedAt` |
| 11 | შუამავლის დადასტურება („1 ვიზიტი დავუზოგე") | 0 | 2–3 ინტერვიუ | ≥ 3 თვისებრივი `[E #6]` | 1 pilot შეთანხმება (Phase 4 gate) | 1.1 + Phase 2 follow-up ზარები (EXT) |
| 12 | ოპერაციული ჯანმრთელობა | CI 0; cron 130/130 fail; Lighthouse mobile 26–39; 15 high CVE | CI 100% PR; cron 7 დ. green; ≥ 50; high = 0 | ≥ 60 org გვერდი | ≥ 60; secret rotation ≤ 90 დღე | GitHub Actions, `pnpm audit --prod`, Lighthouse CI (1× თვეში, OP) |

---

## 8. გადაწყვეტილებები მფლობელისგან

> ოთხივე ანგარიშის ღია კითხვები (Ezra §8: 9 · Priya §7: 10 · Nino §5/§7 · Arash §8 #2) გაერთიანებული და დედუპლიცირებული 18-ად. **⛔ = ბლოკავს Phase 0/1-ს — პასუხი 7 დღეში.**

| ID | გადაწყვეტილება | ვარიანტები | **ჩემი რეკომენდაცია** | რა არის დაბლოკილი პასუხამდე |
|---|---|---|---|---|
| **D1 ⛔** | მისია vs შემოსავალი: paywall ემიგრანტისთვის? (E1, P1, N§5, A#2) | (a) უფასო B2C + Helper Pro/B2B/გრანტები; (b) $9/თვე რჩება server-side gate-ით; (c) freemium — დირექტორია უფასო, გიდები ფასიანი | **(a)** — ევიდენსი §2.3; (c) გიდები = ნდობის ბირთვი, მათი paywall = information precarity | 0.2, 0.4 hero copy, 1.2, Paddle-ის ყველა სამუშაო |
| **D2 ⛔** | Billing ახლა: pause vs repair (A F2/F5/F6) | (a) pause — checkout წერტილები იხსნება, სერვერი უცვლელი; (b) repair — secret + 0020 + cancel API + annual | **(a)**; repair Phase 3.7-ში მხოლოდ Helper Pro-ს yes-ზე | 0.2 |
| **D3 ⛔** | Secrets: history rewrite (`git filter-repo`) თუ მხოლოდ purge + rotation? (A F1) | (a) rewrite (fork-ები/clone-ები იტეხება; collaborator-ები re-clone); (b) purge + rotation, history რჩება | **(a) თუ რეპო private-ია და collaborator ≤ 3; სხვაგვარად (b)** — rotation ორივეში სავალდებულოა, ის არის რეალური დაცვა | 0.1 დასრულების კრიტერიუმი |
| D4 | ბრენდი: „GrantKit" სახელი გრანტებზე მიუთითებს (E2) | (a) სახელი რჩება, tagline იცვლება; (b) ახალი პროდუქტული სახელი/domain ვალიდაციის შემდეგ | **(a) Phase 0–2; (b) განიხილება Phase 3-ის ბოლოს 1.1-ის ინტერვიუების ენით** | არაფერი ახლა |
| **D5 ⛔** | Beachhead დადასტურება: ქართველები FR ka/ru = ვალიდაცია; US medical = ვერტიკალი, არა პროდუქტი; ახალი ქვეყანა Phase 4-მდე არა (E5.1, P2/3, N§7) | (a) როგორც რეკომენდაციაშია; (b) ორი ცალკე landing/პროდუქტი; (c) ES/DE ახლავე | **(a)** | 1.2 hero, 1.3, 2.3 გიდების ქვეყანა |
| **D6 ⛔** | სტატუსის კითხვა onboarding-ში და მისი შენახვა (E3, P4/10, N R6) | (a) ვკითხავთ, client-only, არასდროს სერვერზე, „გამოტოვება" პირველი; (b) ვინახავთ პროფილში consent-ით; (c) არ ვკითხავთ | **(a)** — პერსონალიზაცია სტატუსის გარეშე უსარგებლოა `[E §2]`, შენახვა Art. 9 რისკია | 1.3 |
| **D7** | „უსაბუთოებს იღებს" გამოქვეყნება ორგანიზაციის დასტურის გარეშე (P4, N R7) | (a) მხოლოდ provenance-ით (org-ის საიტიდან extract ან ტელეფონით დადასტურებული) — სხვა შემთხვევაში `unknown`; (b) LLM-შეფასებაც | **(a)**; ფორმულირება = „ორგანიზაციის საჯარო პოლიტიკა" + წყარო | 1.5, 2.6 |
| **D8** | „Verified" განმარტება/SLA (P5) | 90 დღე (audit §8 უკვე ამას იყენებს) / 180 დღე | **90 დღე**; badge = თარიღი + წყარო + ვინ; ვადაგასული → „გადასამოწმებელია" | 1.5 |
| **D9** | ვინ აახლებს მონაცემებს/გიდებს — რედაქციული რესურსი (E4, P6, N R1) | (a) მფლობელი ~4 სთ/კვ review + Lila-სესიები extract-only + cron + community report; (b) ფრილანსერი ka/fr; (c) მოხალისე ამბასადორები (Soliguide მოდელი) | **(a) Phase 2; (c) Phase 4 claim-listing-თან ერთად** — მფლობელის დროის commitment ცხადად | 2.3, 2.5 review |
| **D10** | გრანტების ბედი: 350 orphan; LLM-შაბლონური ველები (P9, ORG-CENTRIC Q4) | (a) orphan → `isActive=0` review-ის შემდეგ, დანარჩენი → services/programs; შაბლონები UI-დან ამოღება; (b) ყველაფერი რჩება | **(a)** — soft delete, არა hard (`CLAUDE.md` წესი 6) | 2.2 |
| D11 | ენების რიგი: uk? ar/fa? (E7, P7) | (a) ka #1, ru #2, fr host, en/es რჩება; uk Phase 4 gate-ზე; (b) uk ახლავე | **(a)** — TP სეგმენტს სახელმწიფო 4 ენაზე ემსახურება `[N §6.2]` | არაფერი Phase 4-მდე |
| D12 | მეორე ქვეყანა: ES vs DE vs GR (E6, N§6.2) | ES (arraigo, ru, 25k) / DE (Integreat-ზე დაშენება, 50k) / GR (200k, ენა არ გვაქვს) | **ES, გადაწყვეტილება Phase 4 gate-ზე 1.1-ის მონაცემით** | არაფერი Phase 4-მდე |
| **D13** | AI ასისტენტის სფერო (E8, P8, N R3/R4) | (a) ინფორმაციული, org/guide-grounded, disclaimer, ქვოტა, ინდივიდუალურ საქმეზე არა; (b) ამჟამინდელი grant-advisor რჩება; (c) გამორთვა Phase 2-მდე | **(a); Phase 0–1-ში (c)-ს ნაცვლად მხოლოდ disclaimer + Q8 enrichment ველები** | 2.7 |
| D14 | Resend DNS (Q5 აპრილიდან) — ოპერატორი | domain + 4 DNS record | **ახლავე, Phase 1.9** | verification email-ები, digest 3.4 |
| D15 | RGPD posture (P10, N R6) | (a) cookieless Umami (banner არ სჭირდება) + Privacy rewrite + consent Phase 3 + Railway რეგიონის შემოწმება; (b) DPO/DPIA ფორმალურად ახლავე | **(a); DPIA ერთგვერდიანი Phase 3-ში** | 1.9 |
| D16 | ბეჭდური/offline დისტრიბუცია — ვინ ავრცელებს (E9) | ასოციაციები / ეკლესია / სოცმუშაკები | Phase 4; Phase 2-ში მხოლოდ print CSS | არაფერი |
| D17 | სამედიცინო-მოტივიანი ქართველები ღიად სამიზნე? (E5, N R7) | (a) არა — ენა + სტატუსით ვმარკეტინგობთ, ჯანდაცვა ერთ-ერთი დომენია; (b) კი | **(a)** — France24 „AME abuse" ნარატივი `[E 36]` რეპუტაციული რისკია | 1.2 copy |
| D18 | Telemetry პროვაიდერი (A cap12) | Umami self-host Railway (≈ +1 სერვისი) / Umami cloud / Plausible | **Umami cloud Phase 1 (0 ops), self-host Phase 3-ში თუ ხარჯი > €20/თვე** | 1.9, §7 KPI 5–8 |

---

## 9. უახლოესი 7 დღე

| დღე | # | ვინ | რა | Done when |
|---|---|---|---|---|
| 1 | 1 | **OP** | Railway → MySQL plugin → root პაროლის reset; GCP „My Project 30040" → ორივე Maps key regenerate (browser key referrer-restricted რჩება; server key `grantkit-server-geocoding-v2` → ახალი); Railway `VITE_GOOGLE_MAPS_BROWSER_KEY` განახლება + redeploy | ძველი credential-ით `mysql` → `Access denied`; ძველი key-ით Places → 403; production რუკა იტვირთება |
| 1 | 2 | **CC-Mira** | PR `chore(security): purge credentials from tracked docs` — `AUDIT-CONTINUATION-2026-05-03.md` ბლოკი + `OPS.md` host ხაზი; `OPS.md` §Credentials-ში Railway env სახელების სრული სია (9 სახელი); D3-ის მიხედვით `git filter-repo` ინსტრუქცია `OPS.md`-ში | `git grep -n "proxy.rlwy.net\|<pw-assignment pattern>"` → 0; CI (ჯერ არ არის) — review Ilias |
| 1 | 3 | **მფლობელი** | D1, D2, D3, D5, D6 პასუხები — 5 ხაზი `PIVOT.md`-ის „Decisions" სექციაში (Ilias ქმნის ფაილს დღე 3-ზე; მანამდე — ჩატში) | 5 ID-ს თითო პასუხი |
| 2 | 4 | **CC-Mira** | PR `ci: check/test/build on PR + scripts typecheck` — `.github/workflows/ci.yml`, `tsconfig.scripts.json`, `create-temp-admin.ts` წაშლა (fallback პაროლი ხაზი 25) | PR-ზე 3 job მწვანე; OP: branch protection `main` ← required check `ci` |
| 2–3 | 5 | **CC-Kwame + CC-Lila** | PR `feat(copy): truth in numbers` — testimonials/„500+" ამოღება; `useStats` hook (`organizations.count` + countries); „Manus" → „email"; ka 3 fix (`ka.ts:249,985,1163`); `MobileBottomNav` „AI" i18n; **თუ D1=a:** `PREVIEW_ITEMS` gating + pricing სექცია + `PricingCTA` ამოღება 5 ენაზე | `grep -rn "500+\|Manus\|640+\|29+\|538" client/src/i18n client/src/lib/constants.ts client/public/manifest.json client/index.html` → 0; `pnpm check` (typed parity) მწვანე; ანონიმური `/catalog` → სრული სია |
| 3 | 6 | **CC-Mira** | PR `perf(cost): smartSearch LRU cache + 10/min, sameSite lax, json 2MB` | იგივე query ×2 → 1 Anthropic call (log); მე-11/წთ → 429; 25 import ტესტი მწვანე |
| 3–4 | 7 | **CC-Ilias** | PR `docs: single source of truth` — `PIVOT.md` (ORG-CENTRIC §1 + ამ გეგმის §1–2 + Decisions), `CLAUDE.md` მხოლოდ წესები, `PROJECT_MAP` „Numbers" ← `STATUS.json`, 13 ფაილი `_archive/`, `TEAM_ROSTER.md` ← §6.1, `WORKFLOW.md` ← §6.3 | non-archive `.md` ≤ 6; `grep -rn "640+\|643\|3,650\|subscription.activate" .grantkit-redesign/*.md CLAUDE.md` → 0 |
| 4 | 8 | **OP + CC-Noa** | `GOOGLE_MAPS_API_KEY` (ახალი server key) → GitHub Secrets; `contact-enrichment.yml` `workflow_dispatch --limit=10 --dry-run` → შემდეგ `--limit=10` → schedule დაბრუნება | 1 green run; `contactEnrichmentStatus='enriched'` ≥ 10 რიგი Railway-ზე |
| 5 | 9 | **OP + CC-Ilias** | `scripts/audit-db-content.ts` გაშვება → `STATUS.json` commit; ნაგავი org სია (~30) → `merge-org-duplicates.ts` dry-run → apply; FR 493 vs 624 რეკონსილიაციის ანგარიში | `STATUS.json` არსებობს თარიღით; ნაგავი-სახელი = 0; `reports/fr-count-reconciliation.md` 1 ცხრილი |
| 5–6 | 10 | **მფლობელი + CC-Ezra** | ინტერვიუს გაიდი (30 დღის „ძიების ეპიზოდი"); რეკრუტინგის პოსტი 2 FB ჯგუფში + ეკლესია პარიზში; fake-door Google Form + PDF draft („პირველი 30 დღე საფრანგეთში" — 1 გვერდი ka) | გაიდი `reports/05-validation.md`-ში; ≥ 5 ინტერვიუ დაგეგმილი კალენდარში; Form live |
| 6–7 | 11 | **CC-Mira + CC-Dmitri** | ADR 0001 migrations + journal რეგენერაციის PR (draft, **არ merge-დება** Railway-ზე `check-migration-0020.mjs`-ის output-მდე); OP უშვებს check script-ს | `drizzle-kit check` clean draft-ში; 0020 სტატუსი ჩაწერილი PROJECT_MAP-ში |
| 7 | 12 | **Tamar** | Phase 0 review: 9 done-when სტატუსი, Session Log ხაზი, go/no-go Phase 1-ზე; ღია D-ები მფლობელს ერთ შეტყობინებაში | `PROJECT_MAP` Session Log 2026-09-25 ჩანაწერი; Phase 1 kickoff ან blocker-ების სია |

---

## 10. შეუთანხმებლობები და გადაწყვეტა

| # | თემა | პოზიცია A | პოზიცია B | **გადაწყვეტა + მიზეზი** |
|---|---|---|---|---|
| 1 | ორგანიზაციების/გრანტების რიცხვი | 538 org / 637 grant (`ORG-CENTRIC-MEMORY §2.2`, `schema.ts` კომენტარი, `CLAUDE.md`) · 790 org (`PROJECT_MAP` ცხრილი) · 3,650 (`todo.md`) | 1,110 org / 1,113 grant (1,102 active) / 1,324 branches (`audit-reports/04-db-content.md` 2026-05-02 live `[A][✓]`) | **B.** live query > ხელით ჩაწერილი რიცხვი; 790 = branches-ის რიცხვი აპრილში (`location-audit-report.md` „790 vs 538 mystery"), არა orgs; 538/637 = France import-ამდე. ყველა დოკუმენტში 0.6-ით ჩანაცვლდება `STATUS.json`-ით |
| 2 | France ორგანიზაციები | 624 (Ezra, Nino — Excel წყარო `PLAN-france-orgs-import.md:4` `[✓]`) | 493 DB-ში (Priya — `04-db-content §10` `[✓]`) | **493 = ცოცხალი რიცხვი, 624 = წყაროს რიგები.** 131-რიგიანი სხვაობა (dedup? სხვა country code? import fail?) **ვერ გადავამოწმე** → Phase 0.7 რეკონსილიაციის ანგარიში; მანამდე UI-ში `organizations.count` live |
| 3 | `subscription.activate` bypass CRITICAL | Nino R8, Priya #2/S1 (`audit-reports/12-subscription-funnel.md` 2026-05-04) | Arash: `subscription` router = 2 protected procedure (status, cancel) | **B — მოძველებული finding.** `grep activate server/routers.ts` → 0 procedure `[✓]`; ამოღებულია 2026-05-12 PR batch-ში. `CLAUDE.md`-ის tRPC სია და audit #12 stale. **ასევე** Nino R8 „webhook fail-open" → დღეს fail-closed (`paddleWebhook.ts:317-321` `[✓]`) — ეს ქმნის I2-ს, არა bypass-ს |
| 4 | Beachhead და შემოსავალი | Ezra: ქართველები FR = ვალიდაცია, არა შემოსავალი; შემოსავალი ჯერ E (B2B) და C (ru relocants) · Nino: A (ka+ru) ახლა, C 12 თვეში, Helper Pro · Priya: US medical vs FR — ორი პროდუქტი? | — | **სინთეზი:** FR × ka/ru = ვალიდაცია + reference implementation (ორივე თანხმდება); შემოსავალი = Helper Pro + გრანტები (Nino) Phase 3 gate-ით, B2B2C pilot Phase 4 (Ezra E); ru-relocant WTP ტესტი დაშვებულია 1.1-ში როგორც იაფი ექსპერიმენტი, roadmap-ს არ მართავს; US medical = `health` ვერტიკალი, **არა მეორე პროდუქტი** (Priya-ს კითხვაზე პასუხი — ერთი ტაქსონომია, ერთი landing ქვეყნის არჩევით) |
| 5 | Paywall | Ezra: 3 ვარიანტი (B2B / freemium გიდები / დონორი) · Nino: მოხსნა ახლავე · Priya: დირექტორია უფასო, ფასიანი alerts/AI/plan ან B2B · Arash: „decide first; recommend open" | — | **ღია ახლავე, სრულად, ემიგრანტისთვის Phase 0–3-ში არაფერი იკეტება.** Priya-ს „alerts/AI ფასიანი" უარვყავი: alerts = retention-ის ერთადერთი მექანიზმი, AI ქვოტა ხარჯს აკონტროლებს paywall-ის გარეშე. Ezra-ს freemium-გიდები უარვყავი: გიდები = ნდობის ბირთვი |
| 6 | გიდების საცავი | Arash: headless CMS (Payload/Directus) განსახილველი; `Admin.tsx`-ის გაფართოება ჩიხია | Priya S4: „რედაქტორი" | **Markdown რეპოში frontmatter-ით (Phase 2), review = PR.** Simplicity First: ერთი ოპერატორი, 10 გიდი, CI-ში ვალიდაცია; CMS მხოლოდ თუ > 30 გიდი ან non-dev რედაქტორი შემოვა (Phase 4). Admin.tsx არ ფართოვდება — ორივესთან თანხმობა |
| 7 | ტაქსონომია | Ezra: 11 დომენი | Priya: ~15 (საბაზისო საჭიროებები, ადმინ/ციფრული, ბავშვები ცალკე; mental_health ჯანდაცვაში) | **Ezra-ს 11, Priya-ს mapping-ით** (§1.3): 13+ card sort-ში ვერ გაივლის; `mental_health` ცალკე (WHO ევიდენსი); საკვები/ბანკი → `money_benefits`; ტელეფონი/საბუთები → `daily_life` |
| 8 | სტატუსის ველი | Ezra: `eligibleStatuses` ორგ./სერვისზე (მონაცემი) + კითხვა onboarding-ში | Priya: სტატუსი მხოლოდ client-side ფილტრად, პროფილში არასდროს | **ორივე სწორია სხვადასხვა ობიექტზე:** `services.eligibleStatuses` = მონაცემი ორგანიზაციაზე (2.1); მომხმარებლის სტატუსი = client-only, არასდროს `users`-ში (1.3, D6) |
| 9 | Branches A/B „24K ხაზი unmerged" | `MASTER-ROADMAP-2026-04-25.md` | `DIAGNOSTIC-2026-04-25.md`: ორივე 0 ahead; Arash: `git branch -r` = მხოლოდ `main` | **მხოლოდ `main` არსებობს** `[✓ git branch]`; MASTER-ROADMAP archive-ში (0.6). აპრილის 4 „ცოცხალი მიმართულებიდან" შესრულდა 2 (France import, enrichment script), არ შესრულდა 2 (Q5 DNS, Q2 redirects) — ორივე ამ გეგმის 1.8/1.9-შია |
| 10 | Migration სტატუსი | `PROJECT_MAP`: „pending none; schema in sync; 0000–0016 applied" | Arash: journal `0013`; `0014–0020` ხელით; `0020` unverified; `0017–0019` ირიბად applied | **B.** `ls drizzle/*.sql` → 0020 არსებობს `[✓]`; `schema.ts:358` `processedWebhookEvents` `[✓]`. 0.9 + check script Railway-ზე; PROJECT_MAP ცხრილი = `ls drizzle/` |
| 11 | Analytics | Priya: გათიშულია; Privacy page „cookies" მცდარია | Arash cap 12: missing | **თანხმობა**, არა კონფლიქტი: `index.html:31` env-ით ჩართვადია `[✓]` → Umami cookieless 1.9; Privacy rewrite იმავე PR-ში |
| 12 | Phase 0+1 ვადა | Arash: კრიტიკული გზა 1→2→3→5→8 (secrets → billing → CI → migration → domain model) | დავალება: Phase 0+1 ~2–3 კვირაში | **Arash-ის რიგი დაცულია, მაგრამ domain model (მისი #8) Phase 2-შია** — 3 კვირაში სქემის ცვლილება ვალიდაციამდე Karpathy §1-ს არღვევს („ნუ ივარაუდებ"); Phase 0.9 (migration მექანიზმი) Phase 1-ის პარალელურად სრულდება, რომ 2.1 არ დაბლოკოს |

---

## 11. დანართი

### 11.1. ანგარიშების ინდექსი

| ფაილი | ავტორი | 3-ხაზიანი შეჯამება |
|---|---|---|
| `01-integration-needs.md` | Ezra | 9 ინტეგრაციის ჩარჩო (Ager & Strang → MIPEX 2025: საფრანგეთი 56/100 „temporary integration"); 8 სტატუსი × EU/US უფლებები; 5-ეტაპიანი journey; 15 ევიდენს-პუნქტი (word of mouth > Facebook > სახელმწიფო; ციფრული ინსტრუმენტი ადამიანის გარეშე საკმარისი არაა). 5 პერსონა (ნინო, გიორგი, ოლენა, დმიტრი, სოფი); ქართველები FR = ვალიდაციის beachhead, არა შემოსავლის; 11-დომენიანი ტაქსონომია + საჭიროება→მონაცემი mapping; 6 წარმატების კრიტერიუმი; €0–300 ვალიდაციის გეგმა; 9 კითხვა მფლობელს. |
| `02-competitors.md` | Nino | 22 პლატფორმა 4 ჯგუფად (public/NGO, დირექტორიები, grant-SaaS, ka/ru რესურსები); feature matrix 16 სვეტით — GrantKit უნიკალურია „შემიძლია?" სიგნალი × მრავალქვეყანა × ka-ში, ხვრელი = პროცედურები ✗ და რედაქტორის CMS ✗. ბაზარი 100% უფასოა (სახელმწიფო/AMIF/ფონდები); $9 B2C არასიცოცხლისუნარიანია; 4 მოდელი (Helper Pro, B2B2C, sponsorship, გრანტები). პოზიციონირება A („ინტეგრაციის ნავიგატორი ka/ru") ახლა, C 12 თვეში, B არა; 10 რისკი. |
| `03-tech-diagnostic.md` | Arash | check/test/build მწვანე (0 TS error, 201/202, 17 წმ), 57 prod CVE; პროექტი 4 თვე მიძინებული; 2 P0 (secrets რეპოში; billing fail-closed + 0020), 8 P1, 9 P2, 6 P3, ყველა file:line-ით. მონაცემთა მოდელი org+programs-ისთვის კოჰერენტულია, org+services+procedures-ისთვის არა; 5 ურთიერთსაწინააღმდეგო დოკ-წყარო; 14-capability pivot-readiness (1/8/5); reuse-vs-rebuild; top-10 ნაბიჯი done-when-ით. |
| `04-product-ux-data.md` | Priya | 12-განზომილებიანი scorecard საშუალო 1.9/5; „ორი პროდუქტი ერთ ინტერფეისში" (US medical UI vs FR org-centric სქემა); top-10: არასწორი copy არასწორ ადამიანს, paywall არაფერს იცავს, ნდობა გამოგონილია, onboarding არსად მუშაობს, ტაქსონომია სამედიცინოა, FR ველები UI-ში არ ჩანს, org გვერდზე „დარეკვა" არ არის, ka შეცდომები, mobile 26–39, privacy. 13 quick win + 12 სტრუქტურული; 3 journey; ka copy spot-check 22 სტრინგი. |

### 11.2. ვარაუდები, რომლებიც გავაკეთე

1. მფლობელს **~4–6 სთ/კვირა** აქვს ოპერატორული სამუშაოსთვის (rotation, secrets, script-ების გაშვება, review, ინტერვიუები) — ამის გარეშე Phase 0 3 კვირას გადასცდება.
2. „კვირა" = 5 CC-სესია-დღე; ერთი persona = ერთი სესია ერთდროულად; მფლობელი ერთდროულად ≤ 3 სესიას უშვებს.
3. Railway-ის env var-ების რეალური მდგომარეობა = `OPS.md`-ის სია (7 სახელი); თუ `PADDLE_WEBHOOK_SECRET` სინამდვილეში დაყენებულია, I2 P0-დან P1-ზე ჩამოდის, D2 უცვლელი რჩება.
4. Phase 1.1-ის რეკრუტინგი FB ჯგუფებიდან/ეკლესიიდან შესაძლებელია 2 კვირაში — თუ არა, fake-door + cold-call მაინც გაკეთდება და go/no-go ამ ორზე დაიდება.
5. France Excel-ის `mainCategory` 9 მნიშვნელობა 11 დომენზე ერთი ცხრილით დამაპდება (Ezra-ს ვარაუდი; შემოწმდება 1.4-ში).
6. `wc -w` ამ ფაილზე ცხრილის გამყოფებსაც ითვლის — რეალური პროზაული მოცულობა ~30%-ით ნაკლებია ნაჩვენებზე.

### 11.3. რაც ვერ გადავამოწმე (მემკვიდრეობით Arash §B + ჩემი)

- Railway env var-ების ცოცხალი სია (`PADDLE_WEBHOOK_SECRET`, `JWT_SECRET`, `RESEND_API_KEY`) — I2 ამიტომაა „სავარაუდოდ".
- Migration `0017–0020` production სტატუსი — 0017–0019 ირიბად applied (Task 2.2 script-ები მუშაობდნენ), 0020 უცნობი.
- GitHub Actions run history (`daily-discovery` მაისის შემდეგ მუშაობს თუ არა; `pending-imports/` ბოლო კვალი 2026-05-12).
- Live DB-ის დღევანდელი რიცხვები — ყველა 2026-05-02/04-ისაა; FR 493 vs 624 სხვაობის მიზეზი.
- Production URL-ის ქცევა (sandbox proxy 403); Paddle live/sandbox მდგომარეობა.
- Google Maps გასაღებების rotation მოხდა თუ არა მაისის შემდეგ Railway-ს გარეთ (OPS §Secret rotation ამბობს „post-launch").
- OFPRA 2024/25 ქართველების ზუსტი რიცხვები (Ezra-მ ვერ გადაამოწმა პირველწყაროდან); MFA-ს „35k ქართველი FR-ში" vs Wikipedia „~15k 2017" — ორივე ციტირებულია, არცერთი არ არის გადამწყვეტი.
- Nino-ს ბაზრის რიცხვები (Soliguide 27,600, Réfugiés.info 1M+, Handbook Germany €9M) — მეორადი წყაროებიდან, სამიზნე საიტები proxy-ით დაბლოკილი იყო.

---
*Tamar · 2026-09-18 · შემდეგი განახლება: Phase 0 closeout (დღე 7, §9 #12).*
