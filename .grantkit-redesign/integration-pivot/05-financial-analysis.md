# 05 — ფინანსური ანალიზი: არის თუ არა GrantKit მომგებიანი და როგორი იქნებოდა მომგებიანი ვერსია

> **ავტორი:** Nika (Financial Analyst / unit-economics) · **თარიღი:** 2026-09-19
> **წყაროები:** `PIVOT.md`, `00-MASTER-PLAN.md` §0/§2/§5/§7/§8, `02-competitors.md` §5, `01-integration-needs.md` §5/§8, `03-tech-diagnostic.md` §3–4, `audit-reports/12-subscription-funnel.md`, `OPS.md`, `client/src/i18n/en.ts:15-120`, `package.json`, `.github/workflows/*.yml`, კოდი (`server/queryExpander.ts`, `server/grantAssistant.ts`, `scripts/enrich-metadata.ts`) + საჯარო ფასები და სტატისტიკა (§9).
> **მარკირება:** `[fact]` = რეპოს ფაილი ან საჯარო ფასი, წყაროთი · `[benchmark]` = ინდუსტრიის საორიენტაციო რიცხვი, წყაროთი · `[assumption]` = ჩემი დაშვება, რომელიც უნდა გადამოწმდეს. ყოველი რიცხვი ერთ-ერთით არის მონიშნული. კურსი: $1 = €0.92, 1 GEL = €0.33 `[assumption]`.
> **სფერო:** ანალიზი, არა კოდი. რეპოში არაფერი შეცვლილა.

---

## 1. Executive verdict

1. **დღეს GrantKit მომგებიანი არ არის და შემოსავალიც არ აქვს:** users = 0, subscribers = 0 `[fact — audit 04-db-content, 2026-05-02]`; Paddle webhook production-ში fail-closed-ია (503 secret-ის გარეშე) და migration `0020` დაუდასტურებელია `[fact — 03-tech F2]` — ანუ 2026-05-12-დან თუ ვინმე გადაიხდიდა, ვერაფერს მიიღებდა. ბოლო 4 თვის შემოსავალი: €0; ხარჯი: ინფრა ≈ $30/თვე + მფლობელის დრო.
2. **მიმდინარე $9/თვე B2C მოდელი (M0) სტრუქტურულად ვერ იქნება მომგებიანი:** სამიზნე იხდის ADA ≈ €6.8/დღე `[benchmark — 02-competitors §5.2]`, substitute-ები (Réfugiés.info, Soliguide) უფასოა და სახელმწიფო-ბრენდირებული, პროდუქტი დღესაც უფასოა (API `publicProcedure`) `[fact — 03-tech F3]`, და Paddle-ის $0.50 ფიქსირებული საკომისიო $9-ზე 10.6%-ს ჭამს `[fact — Paddle pricing]`.
3. **შეუძლია თუ არა მომგებიანობა?** — კი, მაგრამ მხოლოდ **ვიწრო განმარტებით**: ინფრასტრუქტურის (≈ €50–100/თვე) დაფარვა მიღწევადია 6–9 თვეში ნებისმიერი გონივრული მოდელით. **მფლობელის დროის** დაფარვა (≈ €2,250/თვე 90 სთ/თვეზე, €25/სთ `[assumption]`) base სცენარშიც კი მე-3 წლამდე არ ხდება, კონსერვატიულში — არასდროს.
4. **რომელი მოდელით?** რისკ-შეწონილი საუკეთესო კომბინაცია: **M2 (B2B2C ლიცენზია) + M4 (პლატფორმის გრანტები)** როგორც ხერხემალი, **M5 (სამედიცინო ნავიგაცია ოჯახებისთვის — ერთადერთი სეგმენტი, სადაც ფული უკვე მოძრაობს)** როგორც ადრეული cash, **M1 (Helper Pro)** როგორც სუსტი დანამატი. M0 იხსნება, M3 (sponsorship) მხოლოდ კონტექსტური, tracking-ის გარეშე, M6 — არა შემოსავლის ხაზი.
5. **როდის?** პირველი ფული (M5 / MFA დიასპორული მიკროგრანტი): 3–6 თვე. პირველი ლიცენზია: 9–15 თვე (public/NGO sales cycle 6–12 თვე `[benchmark]`). AMIF-მასშტაბის გრანტი: 18–30 თვე და მხოლოდ ფრანგული/EU იურიდიული პირით (association loi 1901) ან NGO-ს პარტნიორად.
6. **რა დასჭირდება:** (ა) Phase 0–3 ≈ 60 CC-დღე + ≈ 350 მფლობელის საათი `[fact — MASTER-PLAN §5 + assumption §2.4]` = ≈ €9k დროის ღირებულება + ≈ €1k cash; (ბ) იურიდიული პირი EU-ში; (გ) 3 უფასო pilot 6–12 თვეში; (დ) telemetry, რომ „დახმარებული კონტაქტი" გაიზომოს — ამის გარეშე არცერთ დონორს/მყიდველს ვერაფერს ვაჩვენებთ.
7. **3-წლიანი base სცენარი:** შემოსავალი €8k → €35k → €90k; ხარჯი (cash + დრო) ≈ €29k/წ. ანუ **cash-ზე მე-2 წლიდან დადებითი, სრულად (დროის ჩათვლით) მე-3 წელს ± ნული.** Optimistic: €200k მე-3 წელს AMIF-ით — მაშინ ეს უკვე 2–3-კაციანი ასოციაციაა, არა solo ბიზნესი.
8. **ყველაზე დიდი ფინანსური რისკი დღეს არ არის შემოსავლის არქონა, არამედ არაკონტროლირებადი ხარჯი:** `smartSearch` საჯაროა, cache-ის გარეშე, 100 req/min/IP `[fact — 03-tech F4]` → ერთი IP-დან თეორიულად $144/დღე Haiku-ზე (§2.2). ეს Phase 0-ის ერთადერთი წმინდად ფინანსური P0-ია.
9. **პატიოსანი პასუხი მფლობელის კითხვაზე:** ეს არის **მისიის/გრანტ-დაფინანსებული პროდუქტი**, არა venture-ტიპის მოგებაზე ორიენტირებული ბიზნესი. ბაზარზე ყველა შესადარებელი პლატფორმა (Réfugiés.info, Soliguide, Integreat, Handbook Germany, USAHello, Turn2us) სახელმწიფოს, EU-ს, ფონდების ან შემოწირულობების ფულით ცხოვრობს `[fact — 02-competitors §5.1]`. მომგებიანი „ბიზნესის" ერთადერთი კომერციული პრეცედენტი (Findhelp, $304M VC) ჯანდაცვის სისტემებს ყიდის, არა ემიგრანტს.
10. **რას ნიშნავს ეს პრაქტიკულად:** მიზანი უნდა იყოს არა „profit", არამედ **„self-sustaining + founder-salary"**: €3–5k/თვე შემოსავალი 24–30 თვეში, 60–70% გრანტი/ლიცენზია, 30–40% M5/M1/M3. თუ მფლობელს ესეც არ აწყობს — უფრო პატიოსანია პროექტი €50/თვე-ზე „ცოცხლად" შენარჩუნება (M5-ით თვითდაფინანსებული) და ახალ საქმეზე გადასვლა, ვიდრე 350 საათის დახარჯვა შემოსავლის ილუზიით.

---

## 2. ხარჯების ბაზა — დღეს და ფაზების მიხედვით

### 2.1. ერთეულის ფასები (ყველა `[fact]`, საჯარო ფასები 2026-09)

| ერთეული | ფასი | წყარო |
|---|---|---|
| Railway Hobby | $5/თვე ($5 usage credit-ით) | railway.com/pricing |
| Railway vCPU / RAM / volume / egress | $20/vCPU-თვე · $10/GB-თვე · $0.15/GB · $0.05/GB | railway.com/pricing; DB იმავე ტარიფით |
| Anthropic Haiku 4.5 | $1 / $5 per MTok (in/out); batch −50%; cache read ≈ 0.1× | claude-api skill, cached 2026-06 |
| Gemini 2.0 Flash (OpenRouter, enrichment/translation სკრიპტები) | ≈ $0.10 / $0.40 per MTok | `[benchmark]` OpenRouter ტარიფი; `scripts/enrich-metadata.ts:70-73` `[fact]` |
| Google Maps: Dynamic Maps (Essentials) | 10,000 უფასო load/თვე, შემდეგ ≈ $7/1,000 | developers.google.com/maps/billing; woosmap breakdown |
| Google Places Text Search Pro | 5,000 უფასო/თვე | developers.google.com/maps/billing-and-pricing/faq |
| Google Geocoding | 10,000 უფასო/თვე | იგივე |
| Resend | Free 3,000/თვე → Pro $20 (50k) | resend.com/pricing |
| Umami Cloud | Hobby უფასო 100k event/თვე → Pro $20 | umami.is/pricing |
| Paddle (MoR) | 5% + $0.50 / ტრანზაქცია (+FX) | paddle.com; dodopayments breakdown |
| GitHub Actions (2 cron) | ≈ 5–8 წთ/დღე ≈ 200 წთ/თვე — უფასო ლიმიტში | `.github/workflows/*.yml` `[fact]` |
| Domain | ≈ €15/წ (დღეს Railway subdomain — €0) | `OPS.md` `[fact]` |
| Claude Code (Max 20×) | $200/თვე (Max 5× — $100) | claude.com/pricing |
| მფლობელის დრო | **€25/სთ** | `[assumption]` — FR junior dev ხელფასის ≈ €22/სთ და freelance €300–500/დღე შორის; sensitivity §6-ში €15 და €50-ზე |

### 2.2. Anthropic API — call-ის ერთეულური ხარჯი (ფორმულები)

| Call | ტოკენები (in / out) | ხარჯი | ფორმულა/წყარო |
|---|---|---|---|
| `catalog.smartSearch` (Haiku, `max_tokens: 300`, cache 0) | ≈ 350 / ≈ 80 | **≈ $0.00075 ≈ $0.001** | `queryExpander.ts:53-54` `[fact]`; 350×$1/M + 80×$5/M |
| `ai.grantChat` (Haiku, ≤ 8 iteration, `max_tokens: 4096`, history 20×5k char) | ≈ 4 iteration × (4,000 / 400) = 16k / 1.6k | **≈ $0.024 ≈ $0.03 / საუბარი** | `grantAssistant.ts:128-149` `[fact]`; iteration-ების რაოდენობა `[assumption]` |
| ორგ. კონტენტის ერთჯერადი თარგმანი 1,110 org × 4 ენა | ≈ 1M / 2M | Haiku ≈ $11; Gemini Flash ≈ $1 | `[assumption]` 450 out-token/org/ენა |
| 10 გიდი × 5 ენა (LLM draft) | ≈ 50k / 130k | < $1 | `[assumption]` 2,000 სიტყვა/გიდი |
| daily-discovery cron (Gemini Flash, 2 კატეგორია/დღე) | — | ≈ $1–3/თვე | `daily-discovery.yml` `[fact]`; მოცულობა `[assumption]` |
| **Abuse worst case:** `smartSearch` საჯარო, 100 req/min/IP | 144,000 call/დღე | **$144/დღე ≈ $4,300/თვე ერთი IP-დან** | `bootstrap.ts:136` limit `[fact — 03-tech F4]` × $0.001 |

> **დასკვნა:** ნორმალური გამოყენებისას AI ხარჯი უმნიშვნელოა ($5–100/თვე ყველა ფაზაში). ერთადერთი რეალური ფინანსური ექსპოზიცია abuse-ია — LRU cache + 10/min ლიმიტი (Phase 0 deliverable, effort S) ამ რისკს $4,300/თვე-დან < $50-მდე ჩამოიყვანს. ეს უფრო მნიშვნელოვანი ფინანსური მოქმედებაა, ვიდრე ნებისმიერი ფასების ცვლილება.

### 2.3. Google Maps — სად გახდება ხარჯი

Catalog გვერდი ყოველ ჩატვირთვაზე Dynamic Map-ს ტვირთავს `[fact — Catalog.tsx / OrganizationsMap]`. ფორმულა: MAU × loads/user − 10,000 უფასო × $7/1,000.

| ეტაპი | MAU `[assumption]` | Map loads (×5) | ხარჯი |
|---|---|---|---|
| დღეს | ≈ 0 | ≈ 0 | $0 |
| Phase 2–3 (WAU 200–500) | 600–1,500 | 3,000–7,500 | $0 |
| Phase 4 (WAU 2,000) | 6,000 | 30,000 | **≈ $140/თვე** |
| Phase 4+ (WAU 5,000) | 15,000 | 75,000 | ≈ $455/თვე |

Places Text Search Pro (contact enrichment 50 org/დღე = 1,500/თვე) და Geocoding — უფასო ლიმიტში ყველა ფაზაში `[fact — 5k/10k free]`. **რეკომენდაცია:** Phase 4-მდე map lazy-load (მხოლოდ „რუკა" ტაბზე) ან MapLibre + OSM ($0) — სხვაგვარად Maps ხდება ყველაზე დიდი ინფრა-ხაზი, AI-ზე დიდი.

### 2.4. მფლობელის დრო ფაზების მიხედვით

MASTER-PLAN §5 effort `[fact]` + ჩემი კონვერსია საათებში `[assumption]`: 1 CC-დღე = 3 სთ მფლობელის ზედამხედველობა/review (არა 4–6 — ამდენი Claude-ს სესიაა, არა ადამიანის); OP/EXT სთ პირდაპირ.

| ფაზა | CC-დღე | OP/EXT სთ | კონტენტი/მონაცემი (ცალკე) | **სულ სთ** | ხანგრძლივობა | **სთ/თვე** |
|---|---|---|---|---|---|---|
| Phase 0 | 8 | 4 | — | 28 | 2 კვ | 56 |
| Phase 1 | 12 | 10 (ინტერვიუები) | — | 46 | 2–3 კვ | 74 |
| Phase 2 | 25 | 15 | 10 გიდი: ka+ru native review 10×2×3 სთ = 60; fr/en/es light 20; **493 FR org ვერიფიკაციის ზარი × 6 წთ ≈ 50 სთ** | **220** | 6 კვ | 150 |
| Phase 3 | 15 | — | მიმდინარე review 4 სთ/კვ (D9) = 24 | 69 | 6 კვ | 47 |
| Phase 4 | L | B2B sales ≈ 10 სთ/კვ; AMIF განაცხადი 80–120 სთ ერთჯერადად | review 4 სთ/კვ | — | თვე 5+ | 90–120 |
| **Phase 0–3 ჯამი** | **60** | | | **≈ 363 სთ ≈ €9,100** | 16 კვ | ≈ 91 |

### 2.5. თვიური run-rate ცხრილი

| ხაზი | **დღეს (dormant)** | **Phase 0–1** (თვე 1) | **Phase 2–3** (თვე 2–4) | **Phase 4** (თვე 5+) |
|---|---|---|---|---|
| Railway service (≈0.5 vCPU, 0.5–1 GB) `[assumption]` | $15 | $15 | $18 | $30 |
| Railway MySQL (≈0.25 vCPU, 0.5 GB, 1 GB vol) `[assumption]` | $10 | $10 | $10 | $15 |
| Railway plan (credit-ის გამოკლებით) | $0 | $0 | $0 | $0 |
| Anthropic (smartSearch + grantChat, §2.2) | ≈ $0 | $5 | $25 | $100 |
| Enrichment/translation LLM (Gemini via OpenRouter) | $2 | $2 | $15 (ერთჯერადი $12 ამორტ.) | $5 |
| Google Maps (§2.3) | $0 | $0 | $0 | $140 (ან $0 lazy-load-ით) |
| Resend | $0 | $0 | $0 | $20 |
| Umami | — | $0 | $0 | $0–20 |
| Domain (ამორტ.) | $0 | $1.5 | $1.5 | $1.5 |
| Paddle fees | $0 | $0 (pause) | $0 | 5% + $0.50 / txn (ცვლადი) |
| **Infra cash ჯამი** | **≈ $27 ≈ €25** | **≈ $34 ≈ €31** | **≈ $70 ≈ €64** | **≈ $310 ≈ €285** (lazy-load-ით ≈ €160) |
| Claude Code Max 20× | $0 | $200 | $200 | $100–200 |
| **Cash ჯამი** | **≈ €25** | **≈ €215** | **≈ €250** | **≈ €380–470** |
| მფლობელის დრო (§2.4 × €25) | 2 სთ = €50 | 74 სთ = €1,850 | ≈ 97 სთ = €2,425 | ≈ 100 სთ = €2,500 |
| **სრული ხარჯი / თვე** | **≈ €75** | **≈ €2,065** | **≈ €2,675** | **≈ €2,900–3,000** |

**Phase 0–3 სრული ხარჯი (4 თვე):** cash ≈ €1,000 + დრო ≈ €9,100 = **≈ €10,100**. კონტენტის სამუშაო ამაში: გიდები 80 სთ (€2,000) + ვერიფიკაციის ზარები 50 სთ (€1,250) = €3,250 — ანუ pivot-ის ხარჯის მესამედი **კონტენტია, არა კოდი**.

---

## 3. ბაზრის ზომა (TAM / SAM / SOM)

### 3.1. სეგმენტები

| სეგმენტი | TAM (ადამიანი/ორგ.) | SAM (რასაც პლატფორმა Phase 4-მდე წვდება) | SOM (36 თვე, base) | წყარო |
|---|---|---|---|---|
| **(a) ქართულენოვანი ემიგრანტები FR/ES/DE/IT/US** | FR 35k · ES 25k · DE 50k (Destatis 2024: 40,885) · IT 50k · US 120k ეთნიკური (30k იმიგრანტი ACS) = **≈ 280k** (MFA) / ≈ 180k კონსერვატიული | **საფრანგეთი: 35k stock + ≈ 8k/წ ახალი თავშესაფრის განაცხადი** (2022: 8,099 პირველი განაცხადი; 2025 ტოპ-10 წარმოშობის ქვეყანა) = ≈ 45k | WAU 500 (Phase 3 KPI) → 2,000 (Phase 4) ≈ 4% SAM | `[fact]` MFA 2025 შეფასება (Wikipedia/Civil.ge), Destatis, ACS; `[fact — 01-needs §5.1, 00-MASTER §2.1]` OFPRA 2022 |
| **(b) რუსულენოვანი არა-რუსული ემიგრანტები FR/ES** | უკრაინელები TP (FR ≈ 70k, ES ≈ 200k `[assumption — Eurostat TP 2025 რიგი]`) + პოსტ-2022 რუსეთის მოქალაქეები (ES 16k `[fact — The Bell]`, FR ≈ 10–15k `[assumption]`) + ბელარუსი/სომხეთი/ყაზახეთი = **≈ 300k**, აქედან ru-first და არა-uk-სერვისებით დაუფარავი ≈ 60k `[assumption]` | ≈ 60k; მაღალი WTP მხოლოდ IT-რელოკანტებში (≈ 10k FR+ES `[assumption]`) | WAU 300 (Phase 4) | `[fact]` intellinews/The Bell 666k; `[fact — 01-needs §5]` პერსონა „დმიტრი" WTP მაღალი |
| **(c) შუამავლები** (სოცმუშაკები, დიასპორის ორგ., NGO, CCAS, საელჩო) | FR: Soliguide 27,600 სტრუქტურა `[fact — 02-comp]`; CCAS ≈ 8,000 `[assumption]`; ქართული დიასპორული ორგ. FR ≈ 20–40 `[assumption]`; საკონსულო 5 | სტრუქტურები ka/ru ბენეფიციარებით: ≈ 200 FR (რეიმსი, პარიზი, ლიონი, სტრასბურგი — თავშესაფრის ცენტრები + ასოციაციები) `[assumption]` + 30 ES | **3 pilot (წ. 1) → 8 გადამხდელი (წ. 3)** = 4% SAM | 02-competitors §5.3 M2 |
| **(d) სამედიცინო მკურნალობა საზღვარგარეთ** (ქართული ოჯახები FR/US) | საფრანგეთის ქართული თავშესაფრის ნაკადის დომინანტური მოტივი სამედიცინოა `[fact — 01-needs §5.1 [36]]`; ≈ 8k განაცხადი/წ × ≈ 30% სამედიცინო `[assumption]` ≈ 2,400 ოჯახი/წ FR + US/DE/TR ≈ 500 `[assumption]` = **≈ 3,000 ოჯახი/წ** | **ფონდრაიზინგ-აქტიური ოჯახები** (FB/TikTok/კომერციული ბანკის ანგარიშით) ≈ 1,000/წ `[assumption — ვერ ვერიფიცირდა, სტატისტიკა არ არსებობს]` | 20 (წ. 1) → 100 (წ. 3) გადამხდელი ოჯახი | ფული აქ **უკვე მოძრაობს**: ტიპური raise €5–50k `[assumption]` |

### 3.2. Funnel (სეგმენტი a+b, საფრანგეთი, base)

| საფეხური | კონვერსია | რიცხვი (წ. 1) | რიცხვი (წ. 3) | ბენჩმარკი |
|---|---|---|---|---|
| მოსახლეობა SAM | — | 45,000 | 45,000 (+8k/წ ნაკადი) | §3.1 |
| Online (smartphone/FB) | 80% | 36,000 | 36,000 | `[assumption]`; მიგრანტების smartphone penetration > 80% `[benchmark — Ezra §4 Lloyd et al.]` |
| Reach (FB ჯგუფები, ეკლესია, gda.ge სია, SEO ka) | 10% წ. 1 → 25% წ. 3 | 3,600 | 9,000 | `[assumption]` insider-დისტრიბუცია; SEO ka = ნულოვანი კონკურენცია `[fact — 02-comp §6.1]` |
| Activation (≥1 კონტაქტ-ქმედება) | 30% | 1,080 | 2,700 | `[assumption]`; MASTER-PLAN KPI 6: ≥ 25–30% `[fact]` |
| **Paying (B2C, თუ paywall)** | 1–3% | 11–32 | 27–81 | `[benchmark]` freemium→paid 2–5% ზოგადად (ProductLed/FirstPageSage), მაგრამ ADA-ზე მცხოვრებისთვის ქვედა ზღვარი ან ნაკლები |
| **Donating (თუ donation მოდელი)** | 1.6% ვიზიტორიდან, $1.33/ვიზიტორი | ≈ $4,800/წ | ≈ $12,000/წ | `[benchmark — M+R 2025]`; ლტოლვილთა აუდიტორია ვერ იქნება დონორი — დონორი დიასპორაა |

**B2B funnel (სეგმენტი c):** 200 SAM → outreach 60/წ → საუბარი 20 → უფასო pilot 3–5 → **გადამხდელი 30%** (sales-assisted trial median 55% `[benchmark — Pulseahead/GrowthSpree]`, public/NGO სექტორისთვის ½ `[assumption]`) → 1–2 ლიცენზია წ. 1 ბოლოს/წ. 2 დასაწყისში.

---

## 4. შემოსავლის მოდელი კანდიდატების მიხედვით

### 4.1. მოდელების შედარება

| მოდელი | ARPU | ვინ იხდის | churn | CAC | Gross margin | პირველი შემოსავალი | პრეცედენტი |
|---|---|---|---|---|---|---|---|
| **M0** $9/თვე, $79/წ B2C | $9 გამოცხადებული; **net ≈ €5.9** (VAT 20% MoR-ის შიგნით: $9/1.2 = $7.5; −Paddle $0.875 = $6.6 ≈ €6.1; −FX 1–2%) `[fact — en.ts:94; Paddle]` | ემიგრანტი | 25%/თვე `[assumption]` — დროებითობა, accelerated procedure | ≈ €0 (organic) მაგრამ ვალიდაცია ზარალდება `[fact — MASTER §2.3]` | 95% | 0 (billing გატეხილია) | GrantWatch $49/თვე — ინსტიტუციებზე `[fact — 02-comp]` |
| **M1** Helper Pro €99/წ (ან €9–29/თვე) | €99/წ → net ≈ €76 (VAT −€16.5, Paddle −€4.6, FX) | სოცმუშაკი, დიასპორის მოხალისე, ოჯახი საქართველოში | 30%/წ `[assumption]` | ≈ €50 (დრო: 2 სთ/კლიენტი outreach) `[assumption]` | 90% | 6–9 თვე (Phase 3 gate) | **სუსტი:** Turn2us adviser account **უფასოა** `[fact — turn2us.org.uk, 2026]` — 02-competitors-ის „£100+VAT" მოძველებულია; Réfugiés.info aidants უფასო |
| **M2** B2B2C ლიცენზია €2–10k/წ | €5k/წ საშუალო (Integreat €4–15k/კომუნა `[fact — 02-comp]`) | დიასპორის ორგ., NGO, CCAS, საელჩო | 20%/წ `[assumption]` | ≈ €800 (30 სთ sales/pilot + pilot-ის უფასო 3 თვე) `[assumption]` | 85% (onboarding + ka/ru ფენა) | **12–15 თვე** | Integreat, Soliguide widget/API, Turn2us embed `[fact — 02-comp]` |
| **M3** Sponsorship / affiliate / lead-gen | CPA: remittance €10–30, ბანკი €20–50, SIM €5–15, ენის სკოლა €20–50, თარგმანი €10 `[benchmark — affiliate ბაზრის ტიპური; assumption]` | Wise/Remitly, mutuelle, თარგმანი, სკოლა (ადვოკატი — **არა**, loi 1971) | — | 0 | 100% | 6–12 თვე (მოცულობა სჭირდება) | Arrive/RBC, Expatica `[fact — 02-comp]` |
| **M4** პლატფორმის გრანტები | იხ. 4.3 | AMIF/DGEF, DIAIR, Google.org, Fondation de France, Crédit Mutuel, MFA GE | ერთჯერადი | 80–120 სთ/განაცხადი | 70% (reporting 30%) | 4–8 თვე (მიკრო) / 18–30 (AMIF) | Handbook Germany AMIF €9M, Integreat Google.org €250k, Soliguide Crédit Mutuel €10k/ტერიტორია `[fact — 02-comp §5.1]` |
| **M5** სამედიცინო ნავიგაცია ოჯახებისთვის | პაკეტი €200–400 (ჩეკლისტი, საავადმყოფოს კონტაქტები, საბუთები, საცხოვრებელი საავადმყოფოსთან, B-2/ვიზა) | ოჯახი/ფონდრაიზერი (raise-ის 1–3%) | ერთჯერადი | ≈ €30 (FB ჯგუფები) `[assumption]` | **40–60%** — 3–5 სთ ადამიანური სამუშაო/ოჯახი `[assumption]`; პროდუქტიზაციით 80% | **1–3 თვე** (მონაცემი უკვე არის: 102 სამედიცინო თავშესაფარი, 288 medical grant `[fact — MASTER §1.3]`) | — (პრეცედენტი: კომერციული medical-tourism სააგენტოები; ეთიკურად სენსიტიური, §7) |
| **M6** Data / API ლიცენზია | €1–5k ერთჯერადი dataset | მკვლევარი, NGO, health system | — | — | 95% | 12+ თვე | Findhelp (მაგრამ 1,110 org vs Soliguide-ის 27,600 უფასო `[fact]`) — **არა შემოსავლის ხაზი, პარტნიორობის ვალუტა** |

### 4.2. 3-წლიანი პროექცია მოდელების მიხედვით (€, წლიური, net Paddle/VAT-ის შემდეგ)

დაშვებები base სცენარისთვის `[assumption]`: FR launch Phase 2 ბოლოს (თვე 3); WAU 500 თვე 4, 2,000 თვე 12, 5,000 თვე 36; ES დამატება წ. 2; იურიდიული პირი (association) წ. 1 ბოლოს.

| მოდელი | სცენარი | წ. 1 | წ. 2 | წ. 3 | მთავარი დაშვება |
|---|---|---|---|---|---|
| **M0** B2C $9 | კონს. / base / opt. | 0 / 1.5k / 3k | 0 / 4k / 10k | 0 / 6k / 20k | base: 3,600 reach × 30% act × 2% × €5.9 × 6 თვე საშ. სიცოცხლე; opt: 3% + ES |
| **M1** Helper Pro | კონს. / base / opt. | 0 / 0.8k / 2k | 0.5k / 3k / 8k | 1k / 7.6k / 23k | base: 10 → 40 → 100 გადამხდელი × €76 |
| **M2** B2B2C | კონს. / base / opt. | 0 / 0 / 4k | 4k / 10k / 25k | 8k / 35k / 90k | base: 0 → 2 → 7 ლიცენზია × €5k; opt: 15 × €6k |
| **M3** Sponsorship | კონს. / base / opt. | 0 / 0 / 1k | 0.5k / 3k / 8k | 1k / 8k / 25k | base: MAU 6,000 × 1.5% click→conv × €20 × 12 ≈ €21k თეორიული, ×40% (მხოლოდ არა-სენსიტიური კატეგორიები, tracking-ის გარეშე) |
| **M4** გრანტები (EV = თანხა × ალბათობა) | კონს. / base / opt. | 0 / 5k / 15k | 3k / 15k / 60k | 5k / 30k / 150k | base წ.1: MFA დიასპორული მიკროგრანტი (≈ 20k GEL ≈ €6.6k × 40%) + Fondation/Crédit Mutuel (€10k × 30%); წ.2: DIAIR/რეგიონული (€40k × 30%) + განმეორება; წ.3: AMIF sub-partner (€100k × 25%) + სხვა |
| **M5** სამედიცინო ნავიგაცია | კონს. / base / opt. | 1k / 5k / 10k | 2k / 12k / 25k | 3k / 20k / 40k | base: 20 → 40 → 65 ოჯახი × €300 (net ≈ €280); opt: 130 ოჯახი |
| **M6** Data | ყველა | 0 | 0 / 1k / 3k | 0 / 2k / 5k | 1 dataset ლიცენზია/წ |
| **ჯამი (M0 გამორიცხულია რეკომენდაციაში)** | **კონსერვატიული** | **€1k** | **€10k** | **€18k** | |
| | **Base** | **€11k** | **€44k** | **€103k** | |
| | **Optimistic** | **€32k** | **€129k** | **€333k** | AMIF + 15 ლიცენზია = 2–3 FTE ორგანიზაცია |

> **Time-to-first-revenue:** M5 — 1–3 თვე (ერთადერთი, სადაც მყიდველს ფული უკვე აქვს და მოტივირებულია); M4 მიკრო — 4–8 თვე; M1 — 6–9; M2 — 12–15; M3 — 12+ (მოცულობა); M4 AMIF — 18–30.

### 4.3. M4 — გრანტების რეალური ზომები და ციკლები

| დონორი | თანხა | ციკლი | წინაპირობა | GrantKit-ის fit | წყარო |
|---|---|---|---|---|---|
| AMIF/FAMI საფრანგეთი (DGEF) | 2025 ეროვნული calls: €34M ჯამური; პროექტები ტიპურად €100k–500k; **75% co-financing** (25% საკუთარი/სხვა წყარო) | წელიწადში 1–2 call, 2–3-წლიანი პროექტები; კალენდარი ≥ 3×/წ ახლდება | FR იურიდიული პირი, ფინანსური ისტორია, reporting | **მხოლოდ პარტნიორად** ჩამოყალიბებული NGO-სთან (Comede, France Terre d'Asile, Forum réfugiés) — არა lead-ად | `[fact]` immigration.interieur.gouv.fr; ofpra.gouv.fr FAMI |
| DIAIR „inclusion numérique" | ≈ €500k პროგრამა | არარეგულარული | FR ასოციაცია | კარგი — ზუსტად „digital newcomer info" | `[fact — 02-comp [28]]` |
| Google.org Impact Challenge | 2026: $500k–3M (AI for Science, AI for Government); Tech for Social Good $2M | წლიური | დარეგისტრირებული nonprofit, ხშირად თანამშრომლობით | სუსტი — AI-ცენტრული calls, დიდი ორგანიზაციები; Integreat-ის €250k იყო 2019-ის ლოკალური challenge | `[fact]` grantedai.com listings; `[fact — 02-comp [5]]` |
| Tech for Refugees (Milner) | მრავალმილიონიანი, **მოწვევით** (Spotify, Flexport, IRC, Welcome.US) | — | — | არა — ღია კონკურსი არ არსებობს | `[fact]` techforrefugees.org |
| MFA საქართველო „დიასპორული ინიციატივების ხელშეწყობა" | თანხა **ვერ ვერიფიცირდა** (gda.ge მიუწვდომელი სესიიდან); შესადარებელი ქართული სახელმწიფო პროგრამების ჭერი 30,000 GEL/პროექტი | წლიური კონკურსი | საზღვარგარეთ მცხოვრები მოქალაქე/დიასპორული ორგ. | **ერთადერთი, სადაც solo founder პირდაპირ eligible-ია**; რეპუტაციული რისკი (MASTER R9 — საელჩოსთან თანამშრომლობა სენსიტიური) | `[fact]` mfa.gov.ge განცხადებები; ჭერი `[benchmark — იუსტიციის სამინისტროს პროგრამა 30k GEL]` |
| Fondation de France / Crédit Mutuel / რეგიონული ფონდები | €5–15k | მუდმივი | FR ასოციაცია | კარგი პირველი ნაბიჯი (Soliguide-ის პრეცედენტი €10k/ტერიტორია) | `[fact — 02-comp [29]]` |
| სახელმწიფოს unit-economics ბენჩმარკი | „€0.60 თითო ინფორმირებული" | — | — | ეს არის ფასი, რომლითაც სახელმწიფო „ინფორმირებას" ყიდულობს: 10,000 დახმარებული კონტაქტი ≈ €6,000 „ღირებულება" — ამას უნდა ვაჩვენებდეთ დონორს | `[fact — 02-comp §5.1]` |

---

## 5. Break-even და cash

### 5.1. Burn vs შემოსავალი სცენარების მიხედვით (€/თვე)

| | წ. 1 საშ. | წ. 2 საშ. | წ. 3 საშ. |
|---|---|---|---|
| **Cash burn** (infra + Claude Max, §2.5) | €250–400 | €400 | €470 |
| **Cash + დრო burn** (90–100 სთ × €25) | €2,700 | €2,900 | €3,000 |
| შემოსავალი — კონსერვატიული | €80 | €830 | €1,500 |
| შემოსავალი — base | €920 | €3,670 | €8,580 |
| შემოსავალი — optimistic | €2,670 | €10,750 | €27,750 |

### 5.2. Break-even-ის თვეები

| ზღვარი | თანხა/თვე | კონსერვატიული | Base | Optimistic |
|---|---|---|---|---|
| **Infra მხოლოდ** (€30–160) | €100 | თვე ≈ 14 | **თვე ≈ 4–6** (პირველი M5 ოჯახი ფარავს) | თვე 2–3 |
| **Infra + Claude Max** | €260–400 | თვე ≈ 20 | თვე ≈ 8–10 | თვე 4–5 |
| **Infra + tooling + მფლობელის დრო** | €2,700–3,000 | **არასდროს** | **თვე ≈ 30–34** (წ. 3 ბოლო) | თვე ≈ 14–16 |
| Cumulative cash (დროის გარეშე) 36 თვე | | −€5k | **+€110k** | +€480k |
| Cumulative სრული (დროით) 36 თვე | | −€110k | **−€5k ≈ 0** | +€380k |

### 5.3. რა სჭირდება €1k / €5k / €20k-ს თვეში (net, base ARPU-ებით)

| სამიზნე | ვარიანტი A (მხოლოდ ერთი მოდელი) | ვარიანტი B (რეალისტური მიქსი) | რას ნიშნავს ოპერაციულად |
|---|---|---|---|
| **€1k/თვე** (infra + tooling + ≈ 25 სთ) | 170 B2C sub × €5.9 (≈ 8,500 აქტიური მომხმარებელი 2%-ზე) · ან 13 Helper Pro/თვე · ან **2.4 ლიცენზია €5k/წ** · ან **3.5 M5 ოჯახი/თვე** | 2 M5 ოჯახი (€560) + 1 ლიცენზია (€415) | Solo, part-time; მიღწევადი თვე 9–15 |
| **€5k/თვე** = €60k/წ (მფლობელის სრული ხელფასი) | 850 B2C sub (42k აქტიური) · ან **12 ლიცენზია** · ან 17 ოჯახი/თვე | 6 ლიცენზია (€2.5k) + 5 ოჯახი (€1.4k) + 1 გრანტი €15k/წ (€1.25k) | Full-time, ასოციაცია, 1 ფრილანსერი კონტენტზე; თვე 24–30 base-ში |
| **€20k/თვე** = €240k/წ | 3,400 B2C (170k აქტიური — > SAM) · ან 48 ლიცენზია | AMIF/DIAIR €150k/წ (€12.5k) + 12 ლიცენზია (€5k) + M3/M5 (€2.5k) | **3–4 FTE nonprofit**, არა solo founder; მხოლოდ optimistic; FR + ES + DE |

> **ფორმულა B2C-სთვის:** საჭირო აქტიური მომხმარებელი = სამიზნე € ÷ (net ARPU €5.9 × კონვერსია 2%) = სამიზნე € ÷ €0.118. €1k/თვე ≈ 8,500 აქტიური — ეს არის ka+ru SAM-ის ≈ 19% ყოველთვიურად აქტიური. **ამიტომ M0 არითმეტიკულადაც არ მუშაობს**, ეთიკის გარეშეც.

---

## 6. Sensitivity — 5 დაშვება, რომელზეც ვერდიქტი ჰკიდია

| # | დაშვება | Base | თუ უარესია | თუ უკეთესია | როგორ იცვლება ვერდიქტი |
|---|---|---|---|---|---|
| 1 | **B2B pilot→paid close rate** | 30% | 10% → წ. 3 M2 = €12k, არა €35k; სრული break-even არასდროს | 50% → წ. 3 M2 = €60k; break-even თვე 24 | ეს ერთი რიცხვი განსაზღვრავს, არის თუ არა GrantKit „ბიზნესი" თუ „გრანტ-პროექტი" |
| 2 | **გრანტის მოგება** (ბინარული) | წ. 2 €40k × 30% | 0 → base წ. 3 = €73k; cash-ზე მაინც დადებითი | AMIF €150k წ. 2 → optimistic; მაგრამ **დამოკიდებულება ერთ წყაროზე** (§7) | გრანტი არ ცვლის „მომგებიანობას" — ცვლის, თუ ვინ იხდის მფლობელის ხელფასს |
| 3 | **ru-რელოკანტების კონვერსია** (ერთადერთი მაღალი-WTP B2C სეგმენტი) | არ არის base-ში | 0 — არაფერი იცვლება | 500 IT-რელოკანტი × €29/თვე × 20% = €35k/წ | ეს არის ერთადერთი გზა, რომ B2C-მ რაიმე ითამაშოს; მაგრამ ბაზარი გადატვირთულია (Telegram-გიდები) `[fact — 01-needs §5.1 C]` და ქართული ბრენდისთვის პოლიტიკურად სენსიტიური |
| 4 | **AI ხარჯი მომხმარებელზე** | $0.02/MAU | abuse დაუცველად: $4,300/თვე ერთი IP-დან → პროექტი წითელშია ერთ დღეში | cache + limit → < $0.01/MAU | Phase 0-ის S-effort fix; **არ დაიწყოთ მარკეტინგი ამის გარეშე** |
| 5 | **მფლობერის საათობრივი ღირებულება** | €25 | €50 (senior dev opportunity cost) → სრული ხარჯი €5k/თვე, break-even არასდროს base-შიც | €15 (ან €0 — „side project") → სრული break-even თვე 18–20 base-ში | ვერდიქტი „მომგებიანია თუ არა" **მთლიანად** ამ ერთ არჩევანზეა დამოკიდებული: €0-ზე პროექტი cash-positive თვე 6-დანაა |

**მეორე რიგის sensitivity:** Google Maps lazy-load (±€130/თვე Phase 4-ში = M2 ლიცენზიის ¼); Paddle vs Stripe ($0.50 fix → 10.6% vs ≈ 3% B2C-ზე, მაგრამ Stripe = VAT OSS თვითონ, §7); founder-ის ka/ru review-ს ჩანაცვლება ფრილანსერით (€15–20/სთ → იგივე ხარჯი, ნაკლები bandwidth-რისკი).

---

## 7. რისკები, რომლებიც P&L-ს კლავს

| # | რისკი | ფინანსური ეფექტი | ალბათობა | მიტიგაცია |
|---|---|---|---|---|
| R1 | **GDPR Art. 9 + მოწყვლადი აუდიტორია vs რეკლამა/lead-gen.** სტატუსი + ჯანმრთელობა = special category; behavioural ads/tracking CNIL-ის რისკია; DPIA სავალდებულო `[fact — MASTER I13, D15]` | M3 კონტექსტურ, tracking-ის გარეშე ფორმატამდე იკვეცება (≈ −60% M3); ჯარიმა CNIL — ექზისტენციალური | მაღალი, თუ M3 „ჩვეულებრივად" გაკეთდება | მხოლოდ კონტექსტური სპონსორ-ბლოკები („პარტნიორი" ღიად), 0 third-party pixel, cookieless Umami |
| R2 | **Lead-gen ეთიკა და რეგულაცია:** ადვოკატის referral რეგულირებულია (FR loi 1971), სამედიცინო/დაზღვევის შუამავლობა ლიცენზირებული (ORIAS) `[fact — 02-comp R3]` | ყველაზე მაღალ-CPA კატეგორიები (ადვოკატი, დაზღვევა) გამორიცხულია → M3 opt. €25k → ≈ €10k | დარწმუნებული | M3 მხოლოდ remittance/SIM/ენის სკოლა/თარგმანი; M5 = ინფორმაცია და ლოგისტიკა, არა სამედიცინო რჩევა (disclaimer + escalation) |
| R3 | **დამოკიდებულება ერთ გრანტზე:** AMIF 2–3-წლიანი ციკლი, reporting 30%, გადადებული payout (co-financing 25% წინასწარ სჭირდება) | AMIF-ის დასრულებისას შემოსავლის 50–70% ქრება; cash-gap 6–9 თვე პროექტის დაწყებამდე | საშუალო | არასდროს > 50% ერთი წყაროდან; M2+M5 როგორც „earned income" ბაზა; reserve 6 თვე |
| R4 | **Paddle / VAT:** Paddle MoR-ად VAT-ს თვითონ იხდის (ეს მისი ღირებულებაა), მაგრამ $0.50 fix B2C-ს კლავს; Stripe-ზე გადასვლისას EU B2C TBE სერვისებზე **€10,000 EU-wide ზღვარი** → OSS რეგისტრაცია და destination-VAT 27 ქვეყანაზე `[fact — amavat/vatcalc]`; ViDA 2026-07-დან scope ფართოვდება | Helper Pro €99-ზე Paddle ≈ 6% — მისაღები; B2C €9-ზე — არა. `subscription.cancel` Paddle-ს არ ატყობინებს → chargeback/refund რისკი `[fact — 03-tech F5]` | დარწმუნებული M0-ზე | D2 = pause; Helper Pro-ზე Paddle რჩება (MoR = 0 საბუღალტრო სამუშაო); B2B ინვოისი Paddle-ის გარეშე (reverse charge B2B EU) |
| R5 | **ვალუტა:** ხარჯი USD (Railway, Anthropic, Claude Max, Google), შემოსავალი EUR/GEL | ±10% USD/EUR = ±€40/თვე Phase 4-ში — უმნიშვნელო; GEL-გრანტი (MFA) −15% რყევის რისკი | დაბალი | არაფერი — მასშტაბი პატარაა |
| R6 | **იურიდიული პირი:** ფრანგული/EU გრანტები FR ასოციაციას ითხოვს; ქართული MFA — ქართველ მოქალაქეს; ორივეს ერთდროულად ერთი entity ვერ აკმაყოფილებს | M4-ის ნახევარი მიუწვდომელია, სანამ association loi 1901 არ არსებობს (ხარჯი ≈ €0–300, 2–4 კვირა) | დარწმუნებული | Association წ. 1 ბოლოს; მფლობელი = président; M2/M5 კომერციულად — auto-entrepreneur ან ასოციაციის „activité lucrative accessoire" (ბუღალტრის კონსულტაცია €200) |
| R7 | **რეპუტაციული (France24 „AME abuse" ნარატივი, საელჩო):** M5 ღიად „სამედიცინო თავშესაფრის ნავიგატორად" პოზიციონირება | M2-ის NGO/CCAS მყიდველები იკარგებიან, თუ ბრენდი „medical asylum broker"-ად აღიქმება | საშუალო | D17 = (a): ჯანდაცვა ერთ-ერთი დომენია; M5 ცალკე, ნეიტრალურ ბრენდ-ქოლგის ქვეშ, არა მთავარ landing-ზე |
| R8 | **Founder bandwidth:** Phase 2 = 150 სთ/თვე (§2.4) — full-time-ზე მეტი, სანამ შემოსავალი €0-ია | პროექტი ისევ „მიძინდება" (2026-05 → 09 პრეცედენტი: commit 119 → 2/თვე `[fact — MASTER §3.1]`) | **მაღალი** — უკვე მოხდა ერთხელ | 10 გიდი → 5; ვერიფიკაციის ზარები → community/pilot-პარტნიორის სოცმუშაკებზე; M5-ის ადრეული cash = მოტივაცია |

---

## 8. რეკომენდაცია

### 8.1. პატიოსანი ჩარჩო

**GrantKit არის გრანტ/მისია-დაფინანსებული პროდუქტი, არა profit-ბიზნესი.** ეს არ არის ვერდიქტი პროდუქტზე — ეს არის კატეგორიის თვისება: ინფორმაცია მოწყვლადი ადამიანებისთვის ბაზარზე უფასოა და სახელმწიფო/ფონდები იხდიან. ამის გამო:

- „მომგებიანობა" უნდა განისაზღვროს როგორც **self-sustaining**: infra + tooling + მფლობელის ხელფასი (€3–5k/თვე) დაფარული ≥ 3 წყაროდან, არცერთი > 50%.
- ეს მიღწევადია **base სცენარში 24–30 თვეში**, თუ (1) იურიდიული პირი შეიქმნება, (2) B2B close rate ≥ 25% იქნება, (3) M5 პირველ 3 თვეში ცოცხალ ფულს აჩვენებს.
- თუ მფლობელს ეს ჰორიზონტი არ აწყობს — **რაციონალური ალტერნატივაა „minimum viable maintenance"**: paywall მოხსნა, abuse-fix, Maps lazy-load, ≈ €30/თვე infra, M5 როგორც ერთადერთი ფასიანი სერვისი (თვითდაფინანსება), 4 სთ/კვირა. ეს არა „წარუმატებლობა", არამედ ოფციონის შენარჩუნება €360/წ-ად.

### 8.2. რეკომენდებული მიქსი და თანმიმდევრობა

| თვე | მოქმედება | ფინანსური მიზანი |
|---|---|---|
| **0–1** (Phase 0) | D1 = უფასო B2C; D2 = billing pause; **smartSearch cache + 10/min** (abuse cap); ყალბი „500+ members / $79" copy-ის მოხსნა (DGCCRF); Umami cookieless | ხარჯის ჭერი < €50/თვე; ფინანსური P0 დახურული |
| **1–3** (Phase 1–2) | M5 fake-door: ქართულ FB ჯგუფებში „სამედიცინო მარშრუტის პაკეტი €250" — 5 გადამხდელი ოჯახი = ვალიდაცია; 3 შუამავლის ინტერვიუ (M2 pipeline-ის დასაწყისი); Maps lazy-load | **პირველი €1,000 cash თვე 3-მდე**; M2 pipeline 3 კვალიფიცირებული org |
| **3–6** (Phase 2–3) | 3 უფასო pilot (1 დიასპორული ორგ., 1 NGO, 1 CCAS) წერილობითი „მერე ფასი €X" პირობით; association loi 1901; MFA დიასპორული მიკროგრანტი (თუ რეპუტაციული რისკი მისაღებია — D-გადაწყვეტილება); Fondation/Crédit Mutuel განაცხადი €10k | გრანტის pipeline €20k EV; pilot-ების „1 ვიზიტი დავუზოგე" ევიდენსი (KPI 11) |
| **6–12** (Phase 4 gate) | pilot → 1–2 ფასიანი ლიცენზია; Helper Pro მხოლოდ თუ pilot-ის სოცმუშაკები თვითონ ითხოვენ (სხვაგვარად — არა: Turn2us/Réfugiés.info უფასოა); M3 მხოლოდ remittance/SIM კონტექსტურად | €1k/თვე run-rate; **cash break-even (infra+tooling)** |
| **12–30** | DIAIR/რეგიონული გრანტი; AMIF sub-partner ჩამოყალიბებულ NGO-სთან; ES გაფართოება M2-ის მიხედვით, არა B2C-ის | €3–5k/თვე; **self-sustaining** |

### 8.3. 3 ფინანსური KPI, რომელიც პირველ რიგში უნდა დაინსტრუმენტდეს

| # | KPI | ფორმულა | რატომ ეს | სამიზნე |
|---|---|---|---|---|
| **F1** | **ხარჯი ერთ დახმარებულ კონტაქტზე** | (infra + AI + Maps €/თვე) ÷ „დახმარებული კონტაქტი კვირაში" × 4.3 (MASTER north-star) | ეს არის რიცხვი, რომელსაც დონორს/CCAS-ს ვაჩვენებთ სახელმწიფოს „€0.60/ინფორმირებული" ბენჩმარკის პირისპირ; Umami 3 event-ით იზომება Phase 1-დან | < €0.50 Phase 3-ში; < €0.20 Phase 4 |
| **F2** | **B2B pipeline-ის შეწონილი ღირებულება** | Σ (org × სავარაუდო €/წ × stage-ალბათობა: საუბარი 10% / pilot 30% / offer 60%) | sensitivity #1 — ერთადერთი რიცხვი, რომელიც „გრანტ-პროექტსა" და „ბიზნესს" შორის განასხვავებს; spreadsheet-ში, არა კოდში | €15k თვე 6; €40k თვე 12 |
| **F3** | **Earned-income share და M5 unit economics** | (M1+M2+M3+M5) ÷ სულ შემოსავალი; M5: net € ÷ founder სთ/ოჯახი | გრანტ-დამოკიდებულების (R3) მონიტორი + ერთადერთი ადრეული cash-სიგნალი | earned ≥ 40% წ. 2-დან; M5 ≥ €60/სთ (სხვაგვარად პროდუქტიზაცია ან გაუქმება) |

**რას არ ვზომავთ ახლა (და რატომ):** B2C კონვერსია (paywall არ არსებობს), LTV/CAC (მომხმარებელი არ არსებობს), donation rate (დონორი დიასპორაა, არა მომხმარებელი — მოგვიანებით, ასოციაციასთან ერთად).

---

## 9. წყაროები

**რეპოს ფაილები (`[fact]`):** `.grantkit-redesign/PIVOT.md`; `integration-pivot/00-MASTER-PLAN.md` §0, §2.1–2.3, §3.1, §5 (effort), §7 (KPI), §8 (D1–D18); `02-competitors.md` §5.1–5.3 (Réfugiés.info, Soliguide, Integreat €4–15k, Handbook Germany AMIF €9M, USAHello $854k შემოწირულობა [ამოცანის ბრიფში $904k], Findhelp $304M, GrantWatch, Instrumentl, Expatica, Arrive/RBC, DIAIR ≈ €500k, „€0.60/ინფორმირებული"); `01-integration-needs.md` §5 (პერსონები, WTP), §5.1 (დიასპორის რიცხვები, OFPRA 2022 8,099), §8; `03-tech-diagnostic.md` F2–F6, F4 (smartSearch საჯარო), §4.1 (Haiku 4.5); `audit-reports/12-subscription-funnel.md`; `audit-reports/04-db-content.md` (users 0); `OPS.md` (Railway service + MySQL, Google Maps 2 გასაღები, Anthropic, env სია); `client/src/i18n/en.ts:18-120` ($9/mo, $79/yr, „500+ Active members"); `server/queryExpander.ts:53-54`; `server/grantAssistant.ts:128-149`; `scripts/enrich-metadata.ts:26-73` (OpenRouter/Gemini); `.github/workflows/daily-discovery.yml`, `contact-enrichment.yml`; `package.json` scripts.

**საჯარო ფასები (`[fact]`):**
- Railway: https://railway.com/pricing · https://docs.railway.com/pricing/plans
- Anthropic Haiku 4.5 $1/$5 per MTok: claude-api skill model table (cached 2026-06-24); https://claude.com/pricing (Max $100/$200)
- Google Maps Platform: https://developers.google.com/maps/billing-and-pricing/faq · https://mapsplatform.google.com/pricing/ · https://www.woosmap.com/blog/google-maps-api-pricing-breakdown
- Paddle 5% + $0.50: https://www.stackscored.com/pricing/saas-billing/paddle/ · https://dodopayments.com/blogs/paddle-fees-explained
- Resend: https://resend.com/pricing · Umami: https://umami.is/pricing
- EU VAT OSS €10,000: https://amavat.eu/vat-oss-threshold-explained-what-happens-after-e10000/ · https://www.vatcalc.com/eu/eu-vat-in-the-digital-age-vida-adopted-by-ec/
- Turn2us adviser account (უფასო): https://www.turn2us.org.uk/services-for-organisations

**ბაზარი და გრანტები:**
- ქართული დიასპორა MFA 2025 შეფასება (FR 35k, ES 25k, DE 50k, IT 50k, US 120k); Destatis 40,885 (2024): https://en.wikipedia.org/wiki/Georgian_diaspora · https://en.wikipedia.org/wiki/Georgians_in_Germany · https://civil.ge/archives/667946 · ICMPD ENIGMMA 2 (GR/IT/ES)
- OFPRA 2024/2025: https://www.ofpra.gouv.fr/actualites/rapport-dactivite-2024 · https://www.ofpra.gouv.fr/actualites/bilan-2025-de-lofpra-une-activite-record-et-des-evolutions-contrastees · https://www.lacimade.org/rapport-2025-ofpra-cartographie-de-la-demande-dasile/ (საქართველო ტოპ-10, „pays d'origine sûr", accelerated)
- რუსული ემიგრაცია 666k, ES 16k: https://www.intellinews.com/666-000-russians-have-emigrated-since-early-2022-the-bell-333948/ · https://en.wikipedia.org/wiki/Russians_in_Spain
- AMIF/FAMI საფრანგეთი (€34M 2025, 75% co-financing): https://www.immigration.interieur.gouv.fr/Info-ressources/Fonds-europeens/Les-fonds-europeens-programmation-2021-2027/Appels-a-projets · https://www.ofpra.gouv.fr/actualites/le-fonds-asile-migration-et-integration-fami
- Google.org Impact Challenge 2026 ($500k–3M): https://grantedai.com/grants/google-org-impact-challenge-2026-google-org-5ab51997 · Tech for Refugees (მოწვევით): https://techforrefugees.org/programs
- MFA საქართველო დიასპორული გრანტი: https://mfa.gov.ge/News/programa-diasporuli-iniciativebis-khelshecyobis-sa.aspx · https://gda.ge/pages/diasporuli-initsiativebis-khelshetskoba (თანხა ვერ ვერიფიცირდა); შესადარებელი ჭერი 30k GEL: https://www.interpressnews.ge/ka/article/819865-iusticiis-saministro-morig-sagranto-konkurss-acxadebs/

**ბენჩმარკები (`[benchmark]`):**
- Freemium→paid 2–5%: https://productled.com/blog/product-led-growth-benchmarks · https://firstpagesage.com/seo-blog/saas-freemium-conversion-rates/
- B2B sales-assisted trial→paid median 55%, ციკლი 3–6 თვე: https://www.pulseahead.com/blog/trial-to-paid-conversion-benchmarks-in-saas · https://www.growthspreeofficial.com/blogs/b2b-saas-trial-to-paid-conversion-rate-benchmarks-2026-by-trial-type-acv-length-credit-card
- Nonprofit: 1.6% ვიზიტორი დონორი, $1.33/ვიზიტორი (M+R 2025): https://mrbenchmarks.com/website-performance/ · https://www.idonate.com/blog/2025-mr-benchmarks-what-nonprofits-must-know-about-online-giving-and-donation-pages

**ვერ ვერიფიცირდა (რჩება `[assumption]`):** MFA დიასპორული გრანტის ჭერი; ქართული ოჯახების სამედიცინო ფონდრაიზინგის რაოდენობა/მოცულობა; OFPRA-ს 2024–2025 ქართული პირველი განაცხადების ზუსტი რიცხვი (გამოყენებულია 2022-ის 8,099 ანგარიშებიდან); Railway-ის რეალური vCPU/RAM მოხმარება (dashboard-ის metrics სჭირდება); affiliate CPA-ები კონკრეტული პარტნიორებისთვის.
