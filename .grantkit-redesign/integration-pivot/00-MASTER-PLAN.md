# 00 — MASTER PLAN v2: GrantKit → ემიგრანტების ინტეგრაციის ნავიგატორი, რომელიც თავს ირჩენს

> **ავტორი:** Tamar (Head of Product & Program Director) · **თარიღი:** 2026-09-19 · **ცვლის:** v1-ს (2026-09-18) სრულად — v1 არქივირებულია `./archive/00-MASTER-PLAN-v1.md`-ში.
> **წყაროები:** v1 `[v1]`; `05-financial-analysis.md` (Nika) `[N]`; `06-profitable-site-models.md` (Levan) `[L]`; `07-monetization-architecture.md` (Arash) `[A]`; რეპოს ფაილები, რომლებიც ამ სესიაში თავად შევამოწმე `[✓]`. v1-ის დიაგნოსტიკური წყაროები (Ezra `[E]`, Nino `[Nino]`, Priya `[P]`, Arash-ის 03 `[A03]`) უცვლელი რჩება.
> **მეთოდი:** მფლობელის კითხვა იყო — „არის თუ არა ეს პროექტი ფინანსურად მომგებიანი, როგორი უნდა იყოს მომგებიანი საიტი, როგორ დავაპროგრამოთ, და გეგმა შესაბამისად გარდაქმენით". სამივე ანგარიში სრულად წაკითხულია; სადაც ერთმანეთს ეწინააღმდეგებიან — §10-ში ორივე პოზიციაა და ჩემი გადაწყვეტა. ყოველი რიცხვი ან ანგარიშიდანაა, ან რეპოდან; საიდუმლო მნიშვნელობა ამ დოკუმენტში **არ არის**.
> **სფერო:** გეგმა, არა კოდი. რეპოში არაფერი შეცვლილა.

---

## 0. TL;DR

1. **პატიოსანი ვერდიქტი:** GrantKit დღეს არც მომგებიანია, არც შემოსავალი აქვს (users = 0, billing fail-closed `[N §1][✓]`), და **$9/თვე B2C-ით ვერასდროს გახდება** — €1k/თვე-ს 8,500 აქტიური მომხმარებელი სჭირდება, ეს SAM-ის 19%-ია `[N §5.3]`. ბაზრის ყველა შესადარებელი პლატფორმა სახელმწიფოს, EU-ს ან ფონდების ფულით ცხოვრობს; ერთადერთი კომერციული პრეცედენტები ან ინსტიტუტს ყიდიან (Findhelp, Integreat, Instrumentl), ან კომერციულ პროვაიდერს — წვდომას აუდიტორიაზე (Expatica → Wise, 2026-06), ან გადახდისუნარიან ინდივიდს — *სერვისს*, არა ინფოს (Boundless, Bookimed) `[L §2]`. არცერთი არ ყიდის ინფორმაციას ღარიბ ინდივიდზე.
2. **რა არის „მომგებიანი საიტი" GrantKit-ისთვის (§2):** უფასო ინტეგრაციის ნავიგატორი ka/ru-ში (ბირთვი, ნდობის აქტივი) + სამი გადამხდელი, რომელთაგან არცერთი ემიგრანტი არ არის: **(1) ორგანიზაცია/ინსტიტუტი** ka/ru ფენისა და ინსტრუმენტების სანაცვლოდ (Org Pro €300–900/წ, Institutional €2–6k/წ; helper-ის account უფასო) `[L 3B]`; **(2) ოჯახი**, რომელიც საზღვარგარეთ მკურნალობას ეძებს — ring-fenced `/health-abroad` concierge €290–590 (ერთადერთი სეგმენტი, სადაც ფული უკვე მოძრაობს) `[N M5][L 3C]`; **(3) კომერციული პარტნიორები** მხოლოდ კომოდიტიზებულ, არა-გადაუდებელ ნაბიჯებზე (SIM, გზავნილი, თარგმანი, ენა) კოდში ჩაშენებული „no-monetization zone"-ით + ერთი სპონსორი ქვეყანაზე `[L 3A][A §5]`. **გრანტები = runway და თანადაფინანსება, არა შემოსავალი** `[L §4.5]` — ცალკე ხაზში ითვლება.
3. **რა ვარდება v1-დან:** Helper Pro ინდივიდუალური გამოწერა ($9–29/თვე) — Turn2us-ის adviser account **უფასოა** (Nika-მ 2026-ში პირდაპირ გადაამოწმა; Nino-ს „£100+VAT" მოძველებულია) `[N M1]`, Réfugiés.info-ს 30–40k პროფესიონალი უფასოს ხმარობს `[L §2 #11]`. „Sponsorship/affiliate = უარყოფილი ალტერნატივა" — ცვლილება: დაშვებულია **მხოლოდ** არქიტექტურული guardrail-ებით (§2.5), არა copy-ის დაპირებით.
4. **3-წლიანი P&L (base, §2.7):** შემოსავალი €16k → €52k → €105k, აქედან earned (გრანტების გარეშე) €11k → €37k → €75k; cash-ხარჯი ≈ €3.5–5.6k/წ; მფლობელის დრო ≈ €27–30k/წ `[N §2.5, §4.2 — v2-ში M1 ამოღებული, Levan-ის Org Pro და listing-ები დამატებული]`. **Break-even:** infra — თვე 4–6 (პირველი concierge ოჯახი); infra + Claude Max — თვე 8–10; მფლობელის დროის ჩათვლით — თვე ≈ 30 base-ში, კონსერვატიულში არასდროს `[N §5.2]`.
5. **პატიოსანი ჩარჩო:** ეს არის **self-sustaining მისიის პროდუქტი + founder-salary** (€3–5k/თვე 24–30 თვეში, ≥3 წყარო, არცერთი > 50%), არა venture-ბიზნესი `[N §8.1]`. ალტერნატივა, რომელიც მფლობელს ღიად უნდა შევთავაზოთ: „minimum viable maintenance" — €30/თვე infra, concierge ერთადერთ ფასიან სერვისად, 4 სთ/კვირა. ეს D26-ია და ყველა სხვა გადაწყვეტილებაზე წინ დგას.
6. **ფინანსური P0-ები Phase 0-ში (§3):** `smartSearch` საჯარო + cache 0 + 100 req/min/IP = **$4,300/თვე ერთი IP-დან** `[N §2.2]` — ეს არის პროექტის ერთადერთი წმინდად ფინანსური P0 და მარკეტინგის დაწყებამდე უნდა დაიხუროს; Paddle-ის მკვდარი გზა (pause ახლა, repair Phase 3-ში concierge-ისა და org billing-ისთვის, არა Helper Pro-სთვის); შემოსავლის telemetry 0 (Umami cookieless Phase 0-შივე + ხარჯის baseline).
7. **Roadmap შემოსავლისთვის გადალაგებული (§5):** Phase 0 ჰიგიენა + ფინანსური P0 (კვ. 1–2; €0, ხარჯის ჭერი < €50/თვე) → Phase 1 ვალიდაცია + რეპოზიციონირება + **პირველი ევრო** (კვ. 2–4; concierge v0 კოდის გარეშე, ≥1 გადამხდელი ოჯახი, ≥3 B2B საუბარი) → Phase 2 კონტენტ-მოდელი + `/fr/essentials` + partner v0 (კვ. 5–10; კუმულაციური cash ≥ €1,000, 3 უფასო pilot ხელმოწერილი, ასოციაცია loi 1901 დაფუძნებული) → Phase 3 billing/entitlements + org portal + retention (კვ. 11–16; **პირველი განმეორებადი შემოსავალი**, MRR ≥ €250) → Phase 4 მასშტაბი (თვე 5+; €1k/თვე run-rate, cash break-even, DIAIR/Fondation).
8. **სქემა:** Phase 0–1 სქემას არ ეხება. Migration ნუმერაცია Arash-ის მიხედვით რჩება (0021–0026), მაგრამ **0024 (offers) და 0025 (cases) v0-ში სქემის გარეშე იშვება** — სტატიკური JSON + counter, ცხრილი მხოლოდ gate-ის გავლის შემდეგ (§5, §10 #6). Golden rule უცვლელი: schema PR ცალკე, migration Railway-ზე merge-მდე.
9. **გუნდი (§6):** v1-ის 7 persona + 3 ახალი: Levan (Partnerships & Revenue Ops), Nika (Finance & Unit Economics), Salomé (Commerce Compliance & Trust). Phase 1-დან მფლობელის დრო 30/40/30 (გაყიდვები / კონტენტი+ვალიდაცია / პროდუქტი) `[L L8]`.
10. **KPI (§7):** მისიის 12 KPI რჩება; ემატება F1–F9: ხარჯი ერთ დახმარებულ კონტაქტზე, MRR/ARR, კუმულაციური cash, earned-income share, B2B pipeline-ის შეწონილი ღირებულება, concierge €/founder-სთ, AI ხარჯი/MAU + cache hit-rate, CAC არხების მიხედვით, affiliate EPC.
11. **გადაწყვეტილებები (§8):** v1-ის 18 + Levan-ის 8 + Arash-ის 2 → **26 დედუპლიცირებული**; ⛔ = 9 (D26, D1, D2, D3, D5, D6, D19, D20, D23). D1, D2, D17 რეკომენდაცია **შეიცვალა** — ცხადად მონიშნულია.
12. **პირველი სამი მოქმედება (§9):** (1) ოპერატორი — secrets rotation (უცვლელი v1-დან); (2) მფლობელი — D26 (ჰორიზონტი) + 8 ⛔ პასუხი; (3) Mira — smartSearch cache/limit PR იმავე კვირაში, რომელშიც CI ჩნდება.

### 0.1. რა შეიცვალა v1-თან შედარებით

| სექცია | v1 | v2 | რატომ | წყარო |
|---|---|---|---|---|
| §1 საზღვარი | „არ აკეთებს case management-ს" | „არ იძლევა იურიდიულ/სამედიცინო რჩევას და არ წარმოადგენს"; ფასიანი **ინფორმაციული ნავიგაცია + ლოგისტიკა** ring-fenced ქვე-ბრენდში დაშვებულია (D20) | M5/C = ერთადერთი 1–3-თვიანი cash; Bookimed-ის „premium services from patients" ლეგალურია FR-შიც (კომისია — არა) | [N M5][L 3C][A §6] |
| §2 მოდელი | Free + Helper Pro + გრანტები → B2B2C 6–18 თვე | Free + **Org-sold** (Org Pro/Institutional) + concierge + partner/sponsor; გრანტები = runway; B2B pipeline Phase 1-დან იწყება | Turn2us უფასოა; sales cycle-ს ვერ „გადავდებთ" | [N M1, M2][L §4.5, L5] |
| §2 affiliate | ალტერნატივა 2 — უარყოფილი (ინტერესთა კონფლიქტი) | დაშვებული **მხოლოდ** კოდის დონის no-monetization zone-ით, redirect-only attribution-ით, `/trust` კონტრაქტით (D19) | კონფლიქტი წყდება არქიტექტურით; Expatica → Wise ადასტურებს მოდელს; Nika: მხოლოდ კონტექსტური, tracking-ის გარეშე | [L 3A, §4.4][A §5][N R1] |
| §2 P&L | არ არსებობდა | 3 სცენარი, break-even, sensitivity, პატიოსანი ჩარჩო + MVM ალტერნატივა | მფლობელის კითხვა | [N §4–6, §8] |
| §3 P0 | I1 secrets, I2 billing, I3 ყალბი ნდობა | + **I6 P0-ზე აწეული** (abuse $4,300/თვე), I2 გადაფორმულირებული, **I27 revenue telemetry 0** | ერთადერთი წმინდად ფინანსური ექსპოზიცია | [N §2.2, §6 #4][A P3–P4] |
| §4 gap matrix | 20 capability | + 8 მონეტიზაციის capability (entitlements, billing, tenancy, offers, concierge, metering, attribution, SEO acquisition) | Arash-ის დიზაინი ფაზებზე მიბმული | [A §2–9] |
| §5 Phase 0 | 9 deliverable | + 0.10 Umami/ხარჯის baseline (1.9-დან გადმოტანილი) + 0.2 copy DGCCRF-ზე; `smartSearch` cache = P0 | ფინანსური P0 Phase 0-ში | [N §8.2] |
| §5 Phase 1 | ვალიდაცია + რეპოზიციონირება | + 1.11 concierge v0 (კოდის გარეშე), 1.12 B2B pipeline start, 1.13 affiliate accounts + `/trust`; 1.8 + SEO head/hreflang | „პირველი ევრო" თვე 1–3-ში; SEO S-ნაწილი ადრე | [N §8.2][L §5.2][A §9, §10 C] |
| §5 Phase 2 | კონტენტ-მოდელი, 10 გიდი | 6 გიდი (+4 Phase 3), + 2.9 `/fr/essentials` + partner v0 (JSON), 2.10 Pro listing v0, 2.11 ასოციაცია + sponsor pitch; 0021 + `usage_counters`, `providerType`, `listingTier` | founder bandwidth 150 სთ/თვე = burnout-ის რეცეპტი | [N R8][A §10 D][L §4.3] |
| §5 Phase 3 | 3.7 Helper Pro (თუ D1=yes) | 3.7 = **billing & entitlements** (0023; concierge one-time + org manual/self-serve), 3.8 org portal v0, `admin.stats.revenue` + impact report | Helper Pro ამოღებულია; Paddle repair-ის მიზანი შეიცვალა | [A §2–3, §8][L 3B] |
| §5 Phase 4 | ES/DE, uk, 3 pilot, PWA, `/:lang`, გრანტები | + embed/API (0023 ცხრილები), offers DB (0024) და cases (0025) **gate-ებით**, DIAIR/AMIF sub-partner, data licence მხოლოდ ≥500 ვერიფიცირებულზე | Simplicity First: ცხრილი მოცულობის შემდეგ | [A §10][L 3D, L7] |
| §5 ახალი | — | „რას **არ** ვაშენებთ" სია | Karpathy §2 | [A P6][L §5.3] |
| §6 გუნდი | 7 persona | + Levan, Nika, Salomé; ფაილების მფლობელობა; 30/40/30 | შემოსავლის სამუშაო ვინმეს უნდა ეკუთვნოდეს | [L L8] |
| §7 KPI | 12 მისიის | + F1–F9 ფინანსური, baseline + ფაზური სამიზნეები | „does anyone pay" ცალკე ჯაჭვია | [N §8.3][L §4.5] |
| §8 | D1–D18 | D1–D26; D1, D2, D17 რეკომენდაცია შეცვლილი; ⛔ 5 → 9 | merge L1–L8, D19, D20 | [L §6][A §5–6] |
| §9 | უსაფრთხოება → CI → copy → docs | იგივე ხერხემალი + pipeline sheet, pitch, `/trust` draft, cost baseline, D26 | revenue-first | — |
| §10 | 12 შეუთანხმებლობა | + 12 ახალი (#13–#24) სამ სპეციალისტსა და v1-ს შორის | — | — |

---

## 1. განმარტება: რას ნიშნავს ემიგრანტების ინტეგრაციის მხარდაჭერა GrantKit-ისთვის

### 1.1. პროდუქტული განმარტება (უცვლელი v1 §1.1-დან)

> GrantKit ემიგრანტს ეხმარება ინტეგრაციაში იმით, რომ **ამცირებს მისი ძიების, ორიენტაციისა და ნდობის ხარჯს**: მის ენაზე, მისი ლეგალური სტატუსისა და ჩამოსვლის ეტაპის მიხედვით აჩვენებს (ა) რომელი ორგანიზაცია მიიღებს მას *რეალურად*; (ბ) როგორ გაიაროს კონკრეტული პროცედურა; (გ) რას გააკეთოს პირველ 30 დღეში. პლატფორმა ამბობს „*ვინ დაგეხმარება და როგორ მიხვიდე მასთან*", არა „ჩვენ დაგეხმარებით".

Ezra-ს ჩარჩო (Ager & Strang; „information precarity") და 11-დომენიანი ტაქსონომია (`legal_status`, `housing`, `health`, `mental_health`, `language_education`, `work_income`, `money_benefits`, `family_children`, `community_social`, `safety_rights`, `daily_life`) **უცვლელია** — v1 §1.3-ის ცხრილი და mapping წესი ძალაშია. ტაქსონომია v2-ში ერთ დამატებით ფუნქციას იძენს: **ის არის მონეტიზაციის საზღვრის ერთეულიც** (§2.5) — დომენი განსაზღვრავს, შეიძლება თუ არა გვერდზე პარტნიორი გამოჩნდეს.

### 1.2. საზღვარი — რას აკეთებს და რას არა (განახლებული)

| პლატფორმა **აკეთებს** | პლატფორმა **არ აკეთებს** |
|---|---|
| ორიენტაცია სტატუსი × ეტაპის მიხედვით; დირექტორია წვდომის სიგნალებით + provenance; ნაბიჯ-ნაბიჯ პროცედურები ka/ru; „ვინ ლაპარაკობს ჩემს ენაზე"; link-out Soliguide/Réfugiés.info-ზე; გაზიარებადი/ბეჭდვადი მარშრუტი — **ყველაფერი უფასოდ, სამუდამოდ** `[v1]` | იურიდიულ/სამედიცინო **რჩევას** და წარმომადგენლობას; თერაპიას, ენის სწავლებას, ბინის მინიჭებას; „უფლებამოსილების გარანტიას"; AI-რჩევას ადამიანური escalation-ის გარეშე; გრანტების აგრეგატორობას ინდივიდისთვის მთავარ ღირებულებად `[v1]` |
| **ახალი (D20):** ring-fenced `/health-abroad` ქვე-ბრენდში ოჯახის მიერ გადახდილ **ინფორმაციულ ნავიგაციასა და ლოგისტიკას** — რომელი პროგრამა/ფონდი ეხმარება ამ დიაგნოზზე, სად ვიცხოვრო საავადმყოფოსთან, რა საბუთი/თარგმანი, fundraising-კიტი — ადამიანთან ერთად `[L 3C]` | **კლინიკის/ექიმის/ადვოკატის კომისიას** — FR-ში აკრძალულია (R4127-19/22; décret 2005-790 art. 10) `[L §1 #7–8]`; „ჩვენ დაგეხმარებით ვიზაში" ტიპის დაპირებას; სამედიცინო/იურიდიულ საქმეზე გადაწყვეტილებას |
| **ახალი (D19):** პარტნიორის კონტექსტურ შეთავაზებას მხოლოდ კომოდიტიზებულ ნაბიჯებზე (SIM, ბანკი/გზავნილი, თარგმანი, ენა), დისკლოზურით და უფასო ალტერნატივით გვერდით `[L §4.2]` | პარტნიორს `legal_status`, `health` (გადაუდებელი/უფასო კლინიკა/დაზღვევა თავშესაფრის მაძიებლისთვის), `mental_health`, `safety_rights`, `housing.emergency_shelter`, `family_children.women_gbv` დომენებზე — **კოდი ამას ტექნიკურად ვერ დაუშვებს** (§2.5) |
| **ახალი:** ორგანიზაციისთვის ka/ru ფენას — claim, რედაქტირება, QR/A4 pack, „მარშრუტის გაგზავნა" `[L 3B]` | Pro badge-ის „verified"-ად წარმოჩენას; ფულით რიგის შეცვლას — NGO/საჯარო ორგანიზაცია ყოველთვის კომერციულის ზემოთაა `[L §4.4 #4]` |

---

## 2. სტრატეგიული პოზიციონირება და ბიზნეს-მოდელი — ფინანსური ბირთვი

### 2.1. Beachhead და პოზიციონირება (უცვლელი)

v1 §2.1–2.2 ძალაშია: ქართველები საფრანგეთში (ka) = ვალიდაცია + reference implementation; რუსულენოვანი არა-რუსული ემიგრაცია (ru) = TAM-ის გაფართოება; შუამავლები = შემოსავლის ჰიპოთეზა; US medical = `health` ვერტიკალი. ერთი დამატება: **შუამავალი (სოცმუშაკი) არის მომხმარებელი, ორგანიზაცია — მყიდველი** `[L §4.5]`.

### 2.2. რატომ ვერ იქნება GrantKit „ჩვეულებრივი" მომგებიანი ბიზნესი — ევიდენსი ერთ ცხრილში

| ფაქტი | რიცხვი | შედეგი |
|---|---|---|
| სამიზნის გადახდისუნარიანობა | ADA ≈ €6.8/დღე; recognition ~4% | WTP ≈ 0; churn 25%/თვე `[N M0]` |
| Substitute-ები | Réfugiés.info, Soliguide (27,600 სტრუქტურა), Integreat, USAHello — ყველა უფასო, სახელმწიფო/AMIF/ფონდები | ინფოზე paywall = ბაზრის წინააღმდეგ სვლა `[N §1 #9]` |
| M0 unit economics | $9 → net ≈ €5.9 (VAT 20% + Paddle 5% + $0.50 = 10.6%) | €1k/თვე = 170 sub = 8,500 აქტიური = SAM-ის 19% `[N §5.3]` |
| Helper Pro | Turn2us adviser account **უფასოა** (2026); Réfugiés.info 30–40k პროფესიონალი/თვე უფასოდ | ინდივიდუალური helper-ის TAM FR ka-სეგმენტზე < 200 `[N M1][L §4.5]` |
| M2 ინსტიტუტი | Integreat €4–15k/კომუნა, 140 კომუნა ≈ €1.1M/წ; sales cycle 2–6 თვე (ასოციაცია) / 6–18 (საჯარო) | ერთადერთი მასშტაბირებადი earned ხაზი; ნელი `[L §2 #3][N M2]` |
| M5 ოჯახი | ≈ 3,000 ოჯახი/წ სამედიცინო მოტივით; fundraising €5–50k; facilitator-ის ბაზარი $1,500–5,000/პაციენტი | ერთადერთი სეგმენტი, სადაც მყიდველს ფული უკვე აქვს და მოტივირებულია `[N §3.1 d][L §1 #8]` |
| M3 პარტნიორი | Wise £10/£50, Remitly $5–20, Lebara £5–40, Lingoda €50–75; Expatica 7M ვიზიტი → low-mid $M → Wise-ის შეძენა | მოდელი ვალიდურია, მაგრამ მოცულობა-დამოკიდებული: 0 ტრაფიკი = €0 `[L §1–2]` |
| M4 გრანტი | AMIF €100–500k, 75% co-financing, FR ასოციაცია, 18–30 თვე; Fondation/Crédit Mutuel €5–15k; MFA დიასპორული (თანხა ვერ ვერიფიცირდა) | runway, არა შემოსავალი; დამოკიდებულების რისკი `[N §4.3, R3][L §4.5]` |

### 2.3. მომგებიანი საიტის დიზაინი — რომელი კონცეფცია ბირთვია, რომელი დანამატი

Levan-ის 4 კონცეფცია `[L §3]` + Nika-ს რისკ-შეწონილი მიქსი `[N §1 #4]` → ერთი ინტეგრირებული დიზაინი:

| როლი | კონცეფცია | ვინ იხდის | ფასი | Time-to-first-€ | ჩემი გადაწყვეტა |
|---|---|---|---|---|---|
| **ბირთვი (ნდობა + ტრაფიკი)** | A — უფასო ნავიგატორი ka/ru | არავინ | €0 | — | უცვლელი v1-დან; ყველა სხვა ხაზი ამაზე დგას |
| **პირველი cash** | C — `/health-abroad` concierge | ოჯახი | €290 საბუთების პაკეტი / €590 სრული მარშრუტი `[L 3C, N M5 — €200–400 → შუალედური]` | 1–3 თვე | **Phase 1-ში, კოდის გარეშე** (ფორმა + ხელით ინვოისი); cases module (0025) მხოლოდ ≥10 გადამხდელი ოჯახის შემდეგ |
| **Earned ხერხემალი** | B — Org Pro / Institutional | ორგანიზაცია/ინსტიტუტი | Org Pro €300–900/წ; Institutional €2–6k/წ; helper seat უფასო `[L 3B]` | 6–12 თვე (3 უფასო pilot → ფასიანი) | pipeline **Phase 1-დან**; ინვოისი ხელით 0023-მდე |
| **სტრუქტურული, მოცულობა-დამოკიდებული** | A' — partner offers + Pro listing + sponsor | Wise/Remitly/Lebara/Lingoda (CPA); მთარგმნელი/კომერციული პროვაიდერი (listing €30–90/თვე); 1 სპონსორი/ქვეყანა (€10–25k/წ) | CPA §2.2; listing; sponsor | კვირები (affiliate) / 2–4 თვე (sponsor) / 12+ თვე მოცულობისთვის | Phase 2 v0 სტატიკური JSON-ით; sponsor = ბინარული ცვლადი, pitch Phase 2–3 |
| **Runway** | M4 გრანტები | AMIF/DIAIR/Fondation/MFA | €5–150k | 4–8 თვე (მიკრო) / 18–30 (AMIF) | ასოციაცია loi 1901 Phase 2-ში; ცალკე ხაზი, არასდროს > 50% |
| **გადავადებული** | D — Data/API | NGO/მკვლევარი | €2–10k/წ | 12+ თვე | მხოლოდ ≥500 org `lastVerifiedAt` ≤ 90 დ.; NGO-მონაცემი ODbL (D24) |
| **ამოღებული** | M1 Helper Pro ინდივიდუალური; M0 $9 B2C | — | — | — | §10 #13 |

### 2.4. უფასო / ფასიანი საზღვარი

| უფასო — ყოველთვის, ყველასთვის (`ENTITLEMENTS.free` snapshot test-ით დაცული `[A §2.2]`) | ფასიანი — ვინ იხდის |
|---|---|
| დირექტორია, სიგნალები, პროცედურები/გიდები, ჩეკლისტი, რუკა, AI chat (20/დღე), share/print, alerts ×1, helper account (case list ბენეფიციარის PII-ს გარეშე) | **ორგანიზაცია/ინსტიტუტი:** claim + ka/ru რედაქტირება + QR/A4 pack (Org Pro); embed widget, ბრენდირებული ქვე-გვერდი, seats, stats, API (Institutional) |
| NGO/საჯარო org-ის listing + claim (base) — **სამუდამოდ უფასო** (D22) | **კომერციული პროვაიდერი** (მთარგმნელი, ka/ru ექიმი, ადვოკატი — ფიქსირებული listing, CPA არა): Pro listing €30–90/თვე |
| Health-abroad self-service (გრანტები × დიაგნოზი, housing საავადმყოფოსთან, ჩეკლისტი, fundraising-ბმულები) | **ოჯახი:** concierge €290 / €590 ფლატი |
| — | **პარტნიორი:** კონტექსტური ბლოკი whitelist-დომენებში (CPA/flat) |
| — | **სპონსორი:** €10–25k/წ/ქვეყანა, ერთი, „supported by", ბანერების გარეშე |

### 2.5. ნდობის კონტრაქტი და no-monetization zone — კოდის დონეზე

**წესი (Simplicity First — ერთი ფაილი, ერთი pure function):** `content/offers-allowlist.json` `[A §5.2]` + `server/offers/placement.ts` (`selectOffers()` pure function). ცარიელი allowlist = ზედაპირი გამორთულია. Default allowlist (მხოლოდ owner D19-ის yes-ზე ივსება):

```json
{ "guide_step":     ["daily_life", "money_benefits", "language_education", "work_income", "housing"],
  "org_sidebar":    ["housing", "language_education"],
  "checklist_item": ["daily_life", "money_benefits"],
  "ai_footer":      [] }
```

**Hard exclusion, allowlist-ის მიუხედავად** `[A §5.2 #1][L §4.2]`: (ა) გიდის frontmatter `commercial: false` (default) → 0 offer; (ბ) org-გვერდი, სადაც `providerType ∈ {public, nonprofit}` ან `mainCategory ∈ {legal_status, safety_rights, mental_health}` ან `acceptsUndocumented === "yes"` → 0; (გ) client-side სტატუსი `asylum_seeker | undocumented` (D6, სერვერზე არასდროს ილოგება) → 0 ყველგან, გარდა SIM/გზავნილი/თარგმანი; (დ) print/A4 ვერსია → 0; (ე) AI system prompt-ში პარტნიორის ხსენება — eval-ტესტით აკრძალული (2.7). `legal_status` → **არასდროს** (loi 1971 / apport d'affaires აკრძალვა `[L §1 #7]`).

**Attribution მხოლოდ redirect-ით** `[A §5.3]`: `/go/:offerSlug` → სერვერული ანონიმური counter → 302 `trackingUrl?gk_ref={clickId}`. Cookie 0, pixel 0, `userId` სვეტი არ არსებობს, სტატუსი არ ილოგება. დისკლოზური ყოველ კარტზე ×5 ენა (loi influenceurs / DGCCRF — Salomé review).

**`/trust` გვერდი** (ka/ru/fr/en/es), Levan-ის 8 პუნქტი `[L §4.4]` სიტყვასიტყვით: ემიგრანტისთვის ყველაფერი უფასოა და ასეც დარჩება; ვისგან ვიღებთ ფულს — საჯარო სია; სად არასდროს არის ფული — „ტექნიკურად შეუძლებელია"; ფული რიგს არ ცვლის; პარტნიორის გვერდით ყოველთვის უფასო ალტერნატივაა; სტატუსი და ჯანმრთელობა სერვერზე არ ინახება; AI პარტნიორს არ გირჩევთ; შეცდომის შეტყობინება ერთი კლიკია.

### 2.6. გვერდი-გვერდ მონეტიზაციის რუკა (`[L §4.3]`, ფაზებით)

| გვერდი | უფასო ღირებულება | მონეტიზაციის ზედაპირი | ფაზა | არასდროს |
|---|---|---|---|---|
| Home | ქვეყანა/ქალაქი-first, რეალური რიცხვები DB-დან | „supported by {sponsor}" ერთი ხაზი; „ორგანიზაცია ხართ? დაამატეთ თქვენი სერვისი ქართულად" → B | 1 / 3 | ბანერი, pop-up, affiliate |
| `/fr` landing + ჩეკლისტი | „პირველი 30 დღე" სტატუსით | `daily_life`/`money` ნაბიჯებზე პარტნიორ-ბარათი + უფასო ალტერნატივა | 2 | სტატუს/სამედიცინო/საბინაო-გადაუდებელ ნაბიჯებზე |
| `/fr/essentials` | 5 კომოდიტიზებული საჭიროების შედარება (SIM · ბანკი · გზავნილი · თარგმანი · ენა) | **მთავარი affiliate გვერდი**: ყოველ რიგში 1 პარტნიორი + ≥1 არა-პარტნიორი; დისკლოზური სათაურში | 2 | asylum-სტატუსზე დაზღვევის რიგი |
| Org-გვერდი NGO/საჯარო | სიგნალები, provenance, sticky bar | „Claim this listing" → Org Pro | 3 | პარტნიორი, რეკლამა |
| Org-გვერდი კომერციული | იგივე + `serviceCost=paid` | Pro badge („ფასიანი listing"), ka/ru აღწერა | 2 (ხელით) / 3 | „რეკომენდებული"/რეიტინგი ფულით |
| გიდი | ნაბიჯები, საბუთები, org ბმა, „ბოლოს შემოწმდა" | მხოლოდ `commercial: true` გიდზე ბოლოში 1 ბლოკი | 2 | AME/PUMa/OFPRA/ANEF/DALO/115 გიდებზე |
| AI chat | org/guide-grounded, disclaimer, ქვოტა | **არაფერი** | — | პარტნიორის სახელი |
| `/health-abroad` | დიაგნოზი × ქვეყანა → გრანტები + housing + PASS/AME გიდი; fundraising-ბმულები | concierge ფორმა → €290/€590 | 1 (v0) / 4 (module) | კლინიკის კომისია; „ვიზაში დაგეხმარებით" |
| Org portal `/partner` | — | claim, ka/ru edit (AI draft → review), QR/A4, „მარშრუტის გაგზავნა", stats, billing | 3 (v0) / 4 | ბენეფიციარის PII |
| Admin | grants CRUD | review queue (claims, edits, offers), affiliate click report ანონიმური, `admin.stats.revenue` | 2–3 | — |

### 2.7. 3-წლიანი P&L — შეჯამება

Nika-ს §4.2 base-ის კორექტირება Levan-ის ევიდენსით: **M1 ამოღებული** (−€0.8k/−€3k/−€7.6k); **M2 წ.1–2 გადმოწეული** Org Pro-ს დაბალი შესასვლელით (12–20 × €450 `[L 3B]`, ჩემი ¼ დისკონტით solo-sales-ისთვის); **M3-ს ემატება** მთარგმნელების listing (5 × €60 × 8 თვე ≈ €2.4k `[L 3A]`) და sponsor EV (€10k × 50% წ.2, €10k წ.3 `[L §5.1 #8]` — ბინარული).

| ხაზი (€, net) | კონს. წ.1 / წ.2 / წ.3 | **Base წ.1 / წ.2 / წ.3** | Opt. წ.1 / წ.2 / წ.3 | წყარო |
|---|---|---|---|---|
| M2 Org Pro / Institutional | 0 / 4k / 8k | **3k / 14k / 35k** | 6k / 28k / 90k | [N M2] + [L 3B] |
| M3 partner + listing + sponsor | 0 / 0.5k / 1k | **3k / 10k / 18k** | 5k / 25k / 45k | [N M3] + [L 3A, #8] |
| M5 concierge | 1k / 2k / 3k | **5k / 12k / 20k** | 10k / 25k / 40k | [N M5] (Levan €8–16k წ.1 — Nika-ს კონსერვატიული ვიღე) |
| M6 data | 0 | **0 / 1k / 2k** | 0 / 3k / 5k | [N M6] |
| **Earned ჯამი** | **1k / 6.5k / 12k** | **11k / 37k / 75k** | 21k / 81k / 180k | |
| M4 გრანტები (runway, ცალკე) | 0 / 3k / 5k | **5k / 15k / 30k** | 15k / 60k / 150k | [N M4] |
| **სულ** | **1k / 9.5k / 17k** | **16k / 52k / 105k** | 36k / 141k / 330k | Nika: 1/10/18 · 11/44/103 · 32/129/333 |
| Cash-ხარჯი (infra + Claude Max) | — | ≈ 3.5k / 4.8k / 5.6k | — | [N §2.5, §5.1] |
| მფლობელის დრო (90–100 სთ × €25) | — | ≈ 27k / 29k / 30k | — | [N §2.4] |
| Earned share (M4-ის გარეშე) | — | 69% / 71% / 71% | — | სამიზნე ≥ 40% [N F3] ✓ |

**Break-even** `[N §5.2]`: infra (€100/თვე) — base თვე 4–6, კონს. თვე ≈ 14; infra + Claude Max (€260–400) — base თვე 8–10; მფლობელის დროით (€2.7–3k/თვე) — base თვე ≈ 30, კონს. **არასდროს**, opt. თვე 14–16. Cumulative 36 თვე base: cash +€110k, სრული (დროით) ≈ 0.

**Sensitivity — 5 დაშვება, რომელზეც ვერდიქტი ჰკიდია** `[N §6]`: (1) B2B close rate 30% (10% → M2 წ.3 = €12k, break-even არასდროს; 50% → თვე 24); (2) გრანტის მოგება — არ ცვლის მომგებიანობას, ცვლის ვინ იხდის ხელფასს; (3) ru-რელოკანტების WTP — ერთადერთი B2C გზა, roadmap-ს არ მართავს; (4) AI abuse — Phase 0.5-ის S-effort fix; (5) მფლობელის საათის ღირებულება — €0-ზე cash-positive თვე 6-დან, €50-ზე არასდროს.

### 2.8. პატიოსანი ჩარჩო და D26

**GrantKit არის self-sustaining მისიის პროდუქტი, არა venture-ბიზნესი** `[N §8.1]`. „მომგებიანობა" = infra + tooling + founder-salary (€3–5k/თვე) დაფარული ≥3 წყაროდან, არცერთი > 50%. მიღწევადია base-ში 24–30 თვეში, თუ: იურიდიული პირი შეიქმნება (D23), B2B close ≥ 25%, concierge პირველ 3 თვეში ცოცხალ ფულს აჩვენებს. ალტერნატივა, რომელსაც მფლობელს ღიად ვთავაზობ: **„minimum viable maintenance"** — paywall მოხსნა, abuse-fix, Maps lazy-load, ≈ €30/თვე infra, concierge ერთადერთ ფასიან სერვისად, 4 სთ/კვირა. ეს არ არის წარუმატებლობა — ეს არის ოფციონის შენარჩუნება €360/წ-ად. **D26 არის პირველი გადაწყვეტილება, რომელიც მფლობელმა უნდა მიიღოს — მისი გარეშე Phase 1-ის 30/40/30 დროის განაწილება უსაფუძვლოა.**

---

## 3. დიაგნოსტიკის შეჯამება — საიტის დღევანდელი მდგომარეობა

### 3.1. ჯანმრთელობის ფაქტები

v1 §3.1-ის ცხრილი **სრულად ძალაშია** (check 0 error · test 201/202 · build 17 წმ · 57 CVE · commit/თვე 65·119·3·2·2·4 · CI 0 · Lighthouse 26–39 · users 0 · orgs 1,110 · FR 493 · enrichment 130/130 fail · migrations journal 0013, 0020 unverified). ემატება ფინანსური ფაქტები:

| ფაქტი | მნიშვნელობა | წყარო |
|---|---|---|
| შემოსავალი ბოლო 4 თვე | €0; ხარჯი ≈ $27/თვე infra + მფლობელის დრო | [N §1 #1, §2.5] |
| `smartSearch` abuse ჭერი | 100 req/min/IP × $0.001 = **$144/დღე ≈ $4,300/თვე ერთი IP-დან** | [N §2.2][A P3] |
| ნორმალური AI ხარჯი | $5–100/თვე ყველა ფაზაში; grantChat ≈ $0.03/საუბარი | [N §2.2] |
| Google Maps | Phase 4-ში (WAU 2,000) ≈ $140/თვე dynamic map-ით — AI-ზე დიდი ხაზი; lazy-load → $0 | [N §2.3] |
| Paddle | 5% + $0.50 = 10.6% $9-ზე; €99-ზე ≈ 6%; MoR = VAT/OSS Paddle-ზე — solo founder-ისთვის დარჩენის მთავარი არგუმენტი | [N R4][A §3.2] |
| Revenue telemetry | 0: analytics გათიშულია; `admin.stats` = `GROUP BY subscriptionStatus`; funnel 0 | [A P4][✓ v1 I24] |
| Entitlement მოდელი | `isActive = status==="active" || role==="admin"` — გეგმის ცნება არ არსებობს; price ID hardcoded `usePaddle.ts:13` | [A P2] |
| `@aws-sdk/client-s3` + presigner | dependency-ა, არსად გამოიყენება | [A §6.1] |
| მფლობელის დრო Phase 0–3 | ≈ 363 სთ ≈ €9,100; Phase 2 = 150 სთ/თვე — full-time-ზე მეტი €0 შემოსავალზე; კონტენტი = ხარჯის ⅓ | [N §2.4–2.5, R8] |

### 3.2. კონსოლიდირებული პრობლემების ცხრილი

v1 I1–I26 **ყველა რჩება** იმავე ID-ებით. ცვლილებები და დამატებები:

| ID | პრიორიტეტი | პრობლემა | ცვლილება v1-თან | Effort | ფაზა |
|---|---|---|---|---|---|
| I1 | **P0** | secrets რეპოში + Maps key-ები rotation-ის გარეშე | უცვლელი | S | 0 |
| I2 | **P0** | Paddle გზა მკვდარია (webhook fail-closed, secret არ არის, 0020 unverified) | **გადაფორმულირებული:** არა „ვინც გადაიხდის ვერაფერს იღებს" (users 0), არამედ „ვერცერთ ფასიან ზედაპირს ვერ ჩავრთავთ" → pause ახლა (D2a), repair Phase 3.7 concierge one-time + org billing-ისთვის `[A §3.1]` | S / M | 0 / 3 |
| I3 | **P0** | ყალბი ნდობის სიგნალები + „$79/yr" რომელიც არ იყიდება | უცვლელი; DGCCRF/loi Toubon რისკი ფასის რეკლამაზე `[N M0]` | S | 0 |
| **I6** | **P0 (იყო P1)** | `smartSearch` ×2 public, Haiku ყოველ query-ზე, cache 0, 100/min/IP | **აწეულია P0-ზე:** ერთადერთი წმინდად ფინანსური ექსპოზიცია; „არ დაიწყოთ მარკეტინგი ამის გარეშე" `[N §6 #4]` | S | 0 |
| I23 | P2 → **P1** | `subscription.cancel` Paddle-ს არ ატყობინებს; annual დეკორატიულია; token hardcoded | Phase 3.7-ის წინაპირობა ნებისმიერი ფასიანი ზედაპირისთვის (არა მხოლოდ Helper Pro) `[A B3–B4]` | S | 3 |
| I24 | P2 → **P1** | telemetry 0; `Analytics.tsx` სტატიკურ სნეპშოტზე | ვერცერთი მისიის და ვერცერთი ფინანსური KPI არ იზომება → Umami **Phase 0-ში** | S | 0 |
| **I27** | **P1 (ახალი)** | Revenue telemetry 0: signup/plan/offer/contact სერვერული events არ არსებობს; MRR/ARR/ARPU ვერ ითვლება; გრანტ-ანგარიშგებისთვის „people informed / contacts made" ვერ დგება | ახალი `[A P4, §8]` | S | 3 (0022) |
| **I28** | **P1 (ახალი)** | Metering 0: LLM/API/Places/embed არცერთ subject-ზე არ ითვლება; ქვოტა = entitlement არ არსებობს | ახალი `[A P3, §7]`; `usage_counters` 0021-ში | S | 2 |
| **I29** | P2 (ახალი) | Google Maps eager load Catalog-ზე → Phase 4-ში ყველაზე დიდი infra-ხაზი | ახალი `[N §2.3]`; list-first + lazy 2.8-ში | S | 2 |
| **I30** | P2 (ახალი) | `index.html` სტატიკური description „640+ … $9/month" — crawler-ს ეს ხვდება; hreflang 0; canonical `window.location`-იდან | ახალი `[A §9.1]`; head injection 1.8-ში | S | 1 |
| **I31** | P2 (ახალი) | იურიდიული პირი: ვერცერთი ინვოისი ვერ გაიცემა; FR გრანტები ასოციაციას ითხოვს, MFA — ქართველ მოქალაქეს | ახალი `[N R6][L L6]`; D23 | EXT | 1–2 |

---

## 4. Gap analysis — capability matrix

v1-ის 20 capability **უცვლელია** (cap 1–20, ფაზები იგივე, გარდა: cap 6 SEO S-ნაწილი Phase 1-ში `[A §10 C]`, cap 12 Umami Phase 0-ში). ემატება Arash-ის მონეტიზაციის 8 capability:

| # | Capability | დღეს | რა არსებობს | სამიზნისთვის საჭირო | Migration | ფაზა |
|---|---|---|---|---|---|---|
| 21 | **Entitlements & plans** | missing | `isActive` ბულეანი; `role` enum | `shared/plans.ts` კონსტანტა (არა ცხრილი): `free \| org_basic \| org_pro \| concierge` (helper_pro ამოღებული); `ENTITLEMENTS` map + free snapshot test; `server/entitlements.ts` `resolvePlan()` + `requireEntitlement()` middleware; client მხოლოდ რენდერს ცვლის `[A §2]` | — | 3.7 |
| 22 | **Billing (Paddle repair + manual)** | dead | webhook, 33 ტესტი, `processed_webhook_events` სქემაში | B1–B8 `[A §3.1]`: secret + 0020 verify; `cancel` → Paddle API; `PRICE_MAP` env-იდან boot-validation; webhook → `subscriptions` upsert (dual-write); უცნობი სტატუსი → previous; `transaction.completed` one-time; `subscriptions(source=manual)` pilot-ინვოისისთვის; Stripe — არა | 0023 | 3.7 |
| 23 | **B2B tenancy** | missing | — | `org_accounts` (≠ `organizations`), `memberships`, `orgProcedure`; `settings.linkedOrgId` = claim-listing-ის ბმა; iframe `/embed/:orgSlug` + per-route CSP allowlist; `/api/v1` Express + `api_keys` `[A §4]` | 0023 (ცხრილები) | 3 (ცხრილი) / 4 (feature) |
| 24 | **Partner offers** | missing | — | v0: `content/offers/*.json` + allowlist + `placement.ts` + `/go/:slug` + counter; v1: `partners/offers/offer_events` + HMAC postback + `AdminOffers.tsx` `[A §5]` | — (v0) / 0024 | 2 / 4 gate |
| 25 | **Concierge** | missing | `grants.targetDiagnosis/ageRange` 100%; `organization_housing` 102; S3 SDK unused | v0: `/health-abroad` + intake ფორმა (Resend) + ხელით ინვოისი; module: `cases/case_steps/case_files/case_messages`, EU bucket presigned, purge 90 დ., DPIA `[A §6]` | — (v0) / 0025 | 1 / 4 gate |
| 26 | **Metering & cost control** | missing | `lru-cache` dep; `express-rate-limit` | 0.5: smartSearch LRU + 10/min; `usage_counters` (MySQL, Redis არა) + `consume()`; grantChat history 10 / max_tokens 1024 / iter 5 / prompt caching; Places `--max-requests` cap; GCP budget alert; `admin.stats.costs` `[A §7]` | 0021 (+1 ცხრილი) | 0 / 2 |
| 27 | **Attribution & revenue analytics** | missing | `index.html:31` env hook | Umami cookieless (Phase 0); `events` ცხრილი allowlist სახელებით + `telemetry.track`; UTM first-touch `localStorage` → `events(signup)`; `admin.stats.revenue` (MRR/ARR/churn SQL, `source='grant'` ცალკე); `admin.reports.impact` CSV `[A §8]` | 0022 | 0 / 3 |
| 28 | **SEO acquisition** | partial | `SEO.tsx` client-side; sitemap 404 | `server/seoHead.ts` head injection + hreflang ×5 + canonical სერვერიდან + org JSON-LD (Phase 1.8); bot prerender body + programmatic `/{lang}/{country}/{city}/{domain}` ~800 გვერდი + `/:lang` (Phase 4) `[A §9]` | — | 1 / 4 |

სტატუსი დღეს 28 capability-ზე: exists 1 · partial 9 · missing 18. Pivot არის *build*, არა *refactor* — და მონეტიზაციის ფენა მთლიანად missing-ია.

---

## 5. Roadmap ფაზებად — შემოსავლისთვის გადალაგებული

> **წესები (უცვლელი v1-დან + 2 ახალი):** (1) სქემის ცვლილება = ცალკე PR, migration Railway-ზე merge-მდე, `SELECT <col>` ვერიფიკაცია, მერე merge; (2) ყოველი item მიდის §3-ის ID-მდე, §4-ის capability-მდე ან შემოსავლის milestone-მდე; (3) CI მწვანე + Session Log 3 ხაზი; (4) „done when" = ბრძანება ან დაკვირვება; **(5) ყოველ ფაზას აქვს შემოსავლის milestone და ის ფაზის done-when-ის ნაწილია; (6) მონეტიზაციის ზედაპირი კოდში არ შედის, სანამ მისი „არასდროს" ტესტი (§2.5) არ არსებობს.**
> **Effort:** CC-დღე = Claude Code სესია-დღე; OP = ოპერატორი; EXT = გარე/ადამიანური. Nika-ს კონვერსია: 1 CC-დღე ≈ 3 სთ მფლობელის review `[N §2.4]`.
> **Migration ნუმერაცია (§10 #6):** 0021 Phase 2 · 0022 Phase 3 · 0023 Phase 3 · 0024/0025 Phase 4 gate-ით · 0026 მოგვიანებით. **0021 არ იწერება, სანამ 0.9 (migration მექანიზმი) არ დასრულდება.**

### Phase 0 — ჰიგიენა და P0, ფინანსური P0-ს ჩათვლით (კვირა 1–2 · ~9 CC-დღე + ~5 OP-სთ)

| | |
|---|---|
| **მიზანი** | საიტი უსაფრთხო, პატიოსანი, merge-ვადი და **ხარჯ-კონტროლირებადი**. არცერთი ახალი feature. |
| **შემოსავლის milestone** | €0 შემოსავალი (ნორმალურია). **ხარჯის ჭერი < €50/თვე infra; abuse-ექსპოზიცია < $50/თვე** (იყო $4,300). ხარჯის baseline დოკუმენტირებული. |
| **Scope IN** | I1, I2 (pause), I3, I4, I5, I6 (P0), I7 (დაწყება), I8 (ნაწილი), I13 (S), I15, I20 (3 შეცდომა), I22, **I24 (Umami)** |
| **Scope OUT** | სქემა; UI redesign; კონტენტი; ნებისმიერი ფასიანი ზედაპირი; `shared/plans.ts` (Phase 3 — Simplicity First: გეგმის ცნება არ სჭირდება, სანამ რამე არ იკეტება) |
| **დამოკიდებულებები** | D26, D1, D2, D3 — 0.2 და 0.4 დაბლოკილია პასუხამდე |

| # | Deliverable | ვინ | Effort | Done when |
|---|---|---|---|---|
| 0.1 | **Secrets rotation + purge** — v1 0.1 უცვლელი | OP + CC-Mira | S | `git grep -n "proxy.rlwy.net\|<pw-assignment pattern>"` → 0; ძველი credential → `Access denied`; ძველი Maps key → 403; `OPS.md` env ცხრილში ყველა სახელი (PADDLE_*, JWT, RESEND ჩათვლით) — სახელები, არა მნიშვნელობები |
| 0.2 | **Billing pause (D2a) + DGCCRF copy:** Home pricing + `PricingCTA` + „$9/month"/„$79/yr" ამოღება 5 ენაზე; `Catalog.tsx` `PREVIEW_ITEMS` gating ამოღება; `/refund` → „ამჟამად ფასიანი გეგმა არ არის"; `subscription` router + webhook უცვლელი. **OP:** Railway-ზე `PADDLE_WEBHOOK_SECRET` არსებობს თუ არა + `node scripts/check-migration-0020.mjs` — output PROJECT_MAP-ში (repair 3.7-ის წინაპირობა) | CC-Kwame + CC-Lila; OP | S | `grep -rn "\$9\|9/month\|79/yr" client/src/i18n/*.ts` → 0; ანონიმური `/catalog` → სრული სია = `mapPoints` რიცხვი; `pnpm test` 33 Paddle ტესტი მწვანე; 0020 სტატუსი ჩაწერილი |
| 0.3 | **CI** — v1 0.3 უცვლელი | CC-Mira + OP | S | PR წითელი check-ით ვერ merge-დება; `pnpm check` scripts/-ის ჩათვლით 0 |
| 0.4 | **სიმართლე copy-ში (5 ენა)** — v1 0.4 უცვლელი | CC-Kwame + CC-Lila | S | `grep -rn "500+\|Manus\|640+\|29+\|538" client/src/i18n/*.ts client/src/lib/constants.ts client/public/manifest.json client/index.html` → 0; რიცხვები = live COUNT |
| 0.5 | **ფინანსური P0 — abuse cap (I6):** `expandQuery` შიგნით LRU (`lru-cache` უკვე dep; key = NFC(lowercase(collapse-ws(q))), max 5,000, ttl 24 სთ, ორივე namespace ერთ cache-ზე); route limit `catalog.smartSearch` + `organizations.smartSearch` **10/min/IP** (`bootstrap.ts:131-136` pattern); `sameSite: "lax"`; `express.json` 2 MB გლობალურად, import route 50 MB `[A §7.2][N §2.2]` | CC-Mira | S | იგივე query ×2 → 1 Anthropic call (log); მე-11/წთ → 429; worst-case ხარჯი ≤ 10 × 60 × 24 × $0.001 = **$14/დღე/IP** (იყო $144); `cookies.ts` `sameSite: "lax"`; 25 import ტესტი მწვანე |
| 0.6 | **Docs — ერთი წყარო** — v1 0.6 + `PIVOT.md` ← `PIVOT-v2.md`; `CLAUDE.md`-დან tRPC სია და phase progress ამოღება | CC-Ilias | S | non-archive `.grantkit-redesign/*.md` ≤ 6; `grep -rn "640+\|643\|3,650\|subscription.activate\|~960" .grantkit-redesign/*.md CLAUDE.md` → 0 |
| 0.7 | **მონაცემთა გაწმენდა I** — v1 0.7 უცვლელი; + Places `--max-requests` hard cap script-ში `[A §7.3]` | OP + CC-Noa + CC-Ilias | M (background) | workflow green 3 დღე; ნაგავი org = 0; cap-ის ტესტი: `--max-requests=5` → ზუსტად 5 request |
| 0.8 | **Dead code archive** — v1 0.8 უცვლელი | CC-Ilias | S | `pnpm check && pnpm build` მწვანე |
| 0.9 | **Migration მექანიზმი — ერთი (I7)** — v1 0.9 უცვლელი. **Gate 0021-ისთვის** | CC-Mira + CC-Dmitri; OP | M | `drizzle-kit check` clean; Dockerfile CMD = `node dist/index.js`; 0020 სტატუსი ვერიფიცირებული |
| **0.10** | **Telemetry + ხარჯის baseline (I24, I27-ის საფუძველი):** Umami cloud cookieless (D18) `VITE_ANALYTICS_*` env-ით; pageview + 3 event (`org_call_click`, `org_directions_click`, `org_site_click`); `reports/finance/2026-09-baseline.md`: Railway რეალური vCPU/RAM/egress (Nika-მ ვერ გადაამოწმა), Anthropic usage ბოლო 30 დღე, Maps quota — **რიცხვები, არა გასაღებები**; GCP budget alert $50/თვე; Railway usage alert | OP (Umami account, dashboards) + CC-Mira (env hook) + CC-Nika (baseline doc) | S | Umami-ში 24 სთ-ში ≥1 pageview production-იდან; baseline ფაილი 3 რიცხვით (Railway $, Anthropic $, Maps loads) და თარიღით; `Privacy.tsx`-ში „analytics cookies" 0 |

**Phase 0 done when:** 10 done-when ✓; CI 5 PR-ზე ზედიზედ მწვანე; `STATUS.json` + finance baseline არსებობს; **D26 + D1–D3 პასუხები `PIVOT.md`-ში**; abuse worst-case ≤ $14/დღე/IP დოკუმენტირებული.

### Phase 1 — ვალიდაცია + რეპოზიციონირება + პირველი ევრო (კვირა 2–4 · ~15 CC-დღე + ~25 EXT-სთ)

| | |
|---|---|
| **მიზანი** | საიტი სწორ ადამიანს სწორ რამეს ეუბნება; ჩვენ ვიგებთ სჭირდება თუ არა ვინმეს; **და ვამოწმებთ, გადაიხდის თუ არა ვინმე** — ოჯახი (concierge), ორგანიზაცია (pilot LOI). სქემა არ იცვლება. |
| **შემოსავლის milestone — „პირველი ევრო"** | **≥1 გადამხდელი ოჯახი** concierge v0-ზე (€290 ან €590, ხელით ინვოისი) კვირა 4-მდე; **≥3 კვალიფიცირებული B2B საუბარი** + ≥1 LOI უფასო pilot-ზე ფასის ხაზით; affiliate account-ები შექმნილი (placement ჯერ არა); pipeline sheet F5 ≥ €1.5k შეწონილი. Fallback: თუ 0 ოჯახი 4 კვირაში — „M5 ცივია" ცხადად ჩაწერილი, D20 გადაიხედება. |
| **Scope IN** | v1 1.1–1.10 (1.9 Umami-ს გარეშე) + 1.11, 1.12, 1.13; I30 |
| **Scope OUT** | `services`/`guides` entity; `/:lang`; AI retool; entitlements/Paddle; partner placement-ები საიტზე (Phase 2 — გიდები არ არსებობს); org portal |
| **დამოკიდებულებები** | 0.3, 0.4, 0.10; D5, D6, D7, D8, D14, D15, D17, **D19 (1.13), D20 (1.11), D23 (ინვოისი 1.11-ში)** |
| **რისკები** | v1-ის + concierge-ის მისიის დრიფტი (mitigation: ცალკე route, მთავარ nav-ში არა, D17 marketing-ში ძალაშია); ინვოისის იურიდიული ბაზა (D23 — auto-entrepreneur/არსებული პირი მინიმალურ ვარიანტად); founder bandwidth (30/40/30, L8) |

| # | Deliverable | ვინ | Effort | Done when |
|---|---|---|---|---|
| 1.1 | **ვალიდაცია (Ezra §7)** — v1 1.1 + **WTP ბლოკი**: 2–3 სოცმუშაკს — „გადაიხდიდა თქვენი ორგანიზაცია €300–900/წ ka/ru ფენაში? ვინ წყვეტს? რომელი ბიუჯეტიდან?"; ru-relocant WTP landing რჩება (0/€5/€15) | EXT (მფლობელი + CC-Ezra) | ~10 სთ | `reports/05-validation.md`: ≥5 ინტერვიუ; card sort ≥9/11; fake-door ≥30 ან „<30" ჩაწერილი; cold-call 5/5; **WTP: 3 ორგ-პასუხი ცხადად (yes/no/who decides)** |
| 1.2 | **Hero + copy v2 (5 ენა)** — v1 1.2 + ერთი ხაზი „ორგანიზაცია ხართ? → /partner" (ჯერ mailto) | CC-Lila + CC-Kwame | M | Home hero-ში „grant" 0-ჯერ; `t.hero.*` parity; Priya-ს 22 სტრინგიდან ≥18 ✔︎ |
| 1.3 | **Onboarding v2** — v1 1.3 უცვლელი (სტატუსი client-only, D6) | CC-Kwame + CC-Dmitri | M | `SELECT needs FROM users` არასდროს შეიცავს სტატუსს (test) |
| 1.4 | **ტაქსონომია → დომენები (mapping)** — v1 1.4 უცვლელი; `shared/domains.ts`-ში **`NEVER_MONETIZE` სია** კონსტანტად (§2.5) — ჯერ მხოლოდ ექსპორტი, მომხმარებელი 2.9-ში | CC-Dmitri + CC-Kwame + CC-Lila | M | `organizations.list?domain=health&language=ka&serviceCost=free&country=FR` ტესტი; `other` ≤ 3%; `NEVER_MONETIZE` snapshot test |
| 1.5 | **Provenance + ნდობა UI** — v1 1.5 უცვლელი | CC-Kwame + CC-Lila | S | provenance ხაზი 100% org-ზე; disclaimer 5 ენაზე |
| 1.6 | **France ველები + org ლოკალიზაცია (read-only)** — v1 1.6 უცვლელი | CC-Kwame + CC-Dmitri | M | 102/102 housing card; e2e smoke ka/fr |
| 1.7 | **Mobile ქმედება + სისწორე** — v1 1.7 უცვლელი (`streamdown` → `react-markdown`) | CC-Kwame | S | 390 px sticky 3 ღილაკი; `dist/public/assets` < 150 ფაილი |
| 1.8 | **Routes + SEO (I14, I30):** v1 1.8 + **`server/seoHead.ts`**: `/organizations/:orgId`, `/guides/:slug`, landing-ებზე Express ცვლის `<title>`, description, canonical (server host), `og:*`, `hreflang ×5 + x-default`, org JSON-LD (`NGO`, `address`, `telephone` მხოლოდ provenance-ით, `availableLanguage`); `index.html` სტატიკური description → ნეიტრალური; sitemap index → `sitemap-{lang}.xml` `[A §9.2]` | CC-Kwame + CC-Mira | S+S | `curl -A Googlebot /organizations/ORG-0061` → `<title>` org-ის სახელით + 5 hreflang JS-ის გარეშე; sitemap-ის ყოველი URL → 200; `curl -I /catalog` → 301; `grep "9/month" client/index.html` → 0 |
| 1.9 | **Email sender + Privacy:** Resend DNS + `FROM_EMAIL`; admin notify მფლობელზე; Privacy rewrite (legal basis, retention, cookies 0, **„ვისგან ვიღებთ ფულს" → `/trust` ბმა**) | OP + CC-Mira + CC-Salomé | S | verification email inbox-ში 3 პროვაიდერზე; Privacy-ში „analytics cookies" 0 |
| 1.10 | **Deps** — v1 1.10 უცვლელი | CC-Mira | S | `pnpm audit --prod` high = 0 ან ADR |
| **1.11** | **Concierge v0 — კოდის მინიმუმით (D20, D23):** `/health-abroad` სტატიკური გვერდი ka/ru/en: დიაგნოზი × ქვეყანა → არსებული catalog ფილტრები (`targetDiagnosis`, `health` ქვეფილტრი I12) + housing სია (`organization_housing`, `childrenFriendly`) + PASS/AME/B-2 ბმულები + fundraising-ბმულები (Leetchi 0% solidarité, HelloAsso — ბმული, არა escrow); **intake ფორმა** → Resend ემაილი მფლობელს (ველები: ქვეყანა, დიაგნოზის კატეგორია, ეტაპი, ენა, კონტაქტი; **DB-ში არ ინახება**, consent ტექსტი Art. 9-ზე Salomé-სგან, retention „90 დღეში ვშლით" ღიად); ფასი €290 / €590, გადახდა ხელით ინვოისით (`act-generator` skill, D23-ის პირის სახელით) — Paddle one-time 3.7-ში; მთავარ nav-ში **არა**, მხოლოდ `health` დომენიდან ერთი ბმა (D17). Founder-სთ/ოჯახი ილოგება `reports/finance/ledger.md`-ში (თანხა, საათები, თარიღი — **PII 0**) | CC-Kwame (გვერდი) + CC-Lila (copy ka/ru) + CC-Salomé (consent, T&C, disclaimer „არა სამედიცინო რჩევა") + CC-Levan/OP (FB პოსტი 2 ჯგუფში) | S (კოდი) + EXT | გვერდი 200 ka/ru/en; ფორმა → ემაილი ≤ 1 წთ; `grep -rn "health-abroad" client/src/components/Navbar*` → 0; disclaimer ×3 ენა; **ledger-ში ≥1 გადახდილი ინვოისი** ან „0/4 კვირა" ჩანაწერი; F6 გაზომილი (€/სთ) |
| **1.12** | **B2B pipeline start (D1, L8):** `reports/finance/pipeline.md` — 10 ორგანიზაცია (CADA/HUDA ოპერატორები Lyon/Reims/Strasbourg/Paris, 1 დიასპორული ასოციაცია, 1 PASS, 1 CCAS) × stage × €/წ × ალბათობა (საუბარი 10% / pilot 30% / offer 60%) `[N F2]`; pitch one-pager fr/ka: „ინტერპრეტატორის საათი €40–80 vs A4 ქართულად €0" `[L 3B]`; შეთავაზება: Institutional pilot 3 თვე უფასო → €3k/წ წერილობით `[L §5.1 #6]`; დიასპორული ასოციაცია — Org Pro უფასოდ 12 თვე (არხი, არა ფული) | CC-Levan (მასალა) + OP/მფლობელი (outreach, ≈ 10 სთ) | EXT | pipeline.md 10 რიგით; ≥3 საუბარი ჩატარებული (თარიღით); ≥1 LOI-ს draft გაგზავნილი; F5 შეწონილი ≥ €1.5k |
| **1.13** | **Affiliate account-ები + `/trust` (D19):** Wise, Remitly (Impact), Lebara/Lyca (Awin), Lingoda — self-serve რეგისტრაცია `[L §5.2]`; tracking URL-ები `content/offers/partners.json`-ში (URL საიდუმლო არ არის; postback secret — env, არა ფაილი); **placement საიტზე ჯერ არა** (გიდები 2.3-ში); `/trust` გვერდი ×5 ენა Levan §4.4-ის 8 პუნქტით + „ჩვენი პარტნიორები" საჯარო სია (თავიდან ცარიელი ან 4 სახელი) | CC-Salomé (ტექსტი, compliance) + CC-Lila (5 ენა) + CC-Kwame (გვერდი) + OP (account-ები) | S | `/trust` 200 ×5 ენა; `partners.json` ≥ 4 ჩანაწერი `slug, name, domain, countries, excludedStatuses, disclosure×5, trackingUrl`; `grep -rn "partners.json" client/src server/` → 0 გამოყენება (placement არ არსებობს) |

**Phase 1 done when:** 1.1 ანგარიში + go/no-go Phase 2-ზე ჩაწერილი (no-go = სეგმენტი ცივია → D5); 1.2–1.13 ✓; Lighthouse mobile org გვერდი ≥ 50; **პირველი ევრო ledger-ში ან „M5 ცივია" ჩანაწერი**; pipeline ≥3 საუბარი; `/trust` live.

### Phase 2 — კონტენტ-მოდელი + პირველი მონეტიზაციის ზედაპირები (კვირა 5–10 · ~25 CC-დღე + ~20 EXT-სთ)

| | |
|---|---|
| **მიზანი** | დირექტორია „როგორ"-საც ამბობს (სერვისები, გიდები, „პირველი 30 დღე"); ერთადერთი სქემის ცვლილება 0021; **`/fr/essentials` + partner v0 + Pro listing v0 + ასოციაცია** — ხაზები, რომლებიც ტრაფიკთან ერთად იზრდება. |
| **შემოსავლის milestone** | **კუმულაციური cash ≥ €1,000** (≈ 3–4 ოჯახი ან 2 ოჯახი + 3 მთარგმნელის listing) `[N §8.2]`; **3 უფასო pilot ხელმოწერილი** LOI-თი და წერილობითი ფასით; ასოციაცია loi 1901 დაფუძნებული; sponsor pitch ≥2 შეხვედრა; affiliate EPC გაზომილი (რიცხვი, არა მიზანი). |
| **Scope IN** | v1 2.1–2.8 (2.3 → 6 გიდი) + 2.9, 2.10, 2.11; I28, I29 |
| **Scope OUT** | user journey state; feedback entity; entitlements/Paddle; offers DB (0024); cases module (0025); `/:lang`; headless CMS; ახალი ქვეყანა |
| **დამოკიდებულებები** | 0.9 (gate); Phase 1 go; D9, D10, D13, D19, D21, D22, D23 |
| **რისკები** | 0021 = ერთადერთი outage-რისკი (golden rule); founder 150 სთ/თვე `[N R8]` → 6 გიდი, ვერიფიკაციის ზარები pilot-ის სოცმუშაკებზე; partner-ბლოკი ნდობას აზიანებს (mitigation: „არასდევს" ტესტები merge-ის წინაპირობაა, print სუფთა) |

| # | Deliverable | ვინ | Effort | Done when |
|---|---|---|---|---|
| 2.1 | **ADR + migration 0021 (ცალკე schema PR):** v1 2.1 (`services`, `documents`, `entity_translations`, housing idx, `organizations.lastVerifiedAt/verifiedBy`) + **`usage_counters`** (`[A §7.1]`, PK `(subjectType, subjectId, metric, day)`) + **`organizations.providerType` enum(`public|nonprofit|commercial`) default `nonprofit`** + **`organizations.listingTier` enum(`free|pro`) default `free`**; rollback SQL | CC-Dmitri; OP (apply Railway-ზე) | M | PR = schema + SQL + apply + rollback + ADR; apply **merge-მდე**; `SELECT lastVerifiedAt, providerType, listingTier FROM organizations LIMIT 1` ✓; `SELECT count FROM usage_counters LIMIT 1` ✓; `drizzle-kit check` clean; deploy-ის შემდეგ `/healthz` 200 |
| 2.2 | **grants → programs/services კლასიფიკაცია** — v1 2.2 უცვლელი (D10) | CC-Noa + OP + CC-Dmitri | M | `services` ≥ 500; sample 50 → ≥45 სწორი |
| 2.3 | **6 FR გიდი ka-first** (10-დან შემცირებული, `[N R8]`): GUDA/OFPRA; préfecture/ANEF; PUMa; AME; CAF/ADA + domiciliation (ერთ გიდში); **ბანკის ანგარიში récépissé-ით** (`commercial: true` — ერთადერთი). Frontmatter: v1 + `commercial: false` default `[A §5.2]` + `steps[]`/`faq[]` HowTo/FAQPage JSON-LD-სთვის `[A §9.2]`. +4 (სკოლა, CIR, ENIC-NARIC, თარგმანი) Phase 3-ში | CC-Lila + EXT review | L (6 × ~0.5 დღე) | 6 გიდი `content/guides/fr/`, `lastVerifiedAt` ≤ 30 დ., ≥1 ოფიციალური წყარო; `/guides/puma` ka/fr/ru → 200 + HowTo JSON-LD; Ezra #2 ტესტი 4/5 |
| 2.4 | **„პირველი 30 დღე" ჩეკლისტი × სტატუსი** — v1 2.4 + item-ს `commercial` ველი (default false); print CSS-ში partner-ბლოკი `display: none` | CC-Lila + CC-Kwame | M | `/first-30-days?country=FR&status=asylum_seeker&city=Lyon` ≥8 item; print 1–2 A4 **0 partner** (test) |
| 2.5 | **Multilingual pipeline v2** — v1 2.5 უცვლელი | CC-Lila + CC-Dmitri; OP | M | `entity_translations` ≥ 493×4; JSON reader 0 |
| 2.6 | **მინიმალური content editor `AdminContent.tsx`** — v1 2.6 + `providerType`, `listingTier`, `lastVerifiedAt` რედაქტირება; **`listingTier=pro` შესაძლებელია მხოლოდ `providerType=commercial`-ზე** (server validation) | CC-Kwame + CC-Dmitri | M | ადმინი org-ზე `acceptsUndocumented=yes` ინახავს → „ბოლოს შემოწმდა"; `listingTier=pro` + `providerType=nonprofit` → 400 (test); `Admin.tsx` diff = 0 |
| 2.7 | **AI retool (D13)** — v1 2.7 + **ხარჯის ჭერი**: history ≤ 10, `max_tokens 1024`, `MAX_ITERATIONS 5`, system prompt/tools `cache_control: ephemeral` `[A §7.2]`; ქვოტა 20/დღე `usage_counters`-ით; eval-ში **+5 კითხვა „რომელი ბანკი/SIM?"** → პასუხი მიმართავს `/fr/essentials`-ზე, პარტნიორის სახელი 0 | CC-Noa | M | eval 25/25; 21-ე შეტყობინება → 429 (DB counter); `grep -i "wise\|lebara\|remitly" server/grantAssistant.ts` → 0 |
| 2.8 | **Perf II + Maps ხარჯი (I18, I29):** v1 2.8 + Catalog **list-first mobile** (რუკა ღილაკით), org detail → Static Maps `<img>` `[A §7.3][N §2.3]` | CC-Kwame + CC-Dmitri | M | `/catalog` mobile transfer < 2 MB; Lighthouse ≥ 60; Maps loads/ვიზიტი ≤ 1 (Umami event) |
| **2.9** | **`/fr/essentials` + partner offers v0 (D19, cap 24):** სტატიკური `content/offers/*.json` (partners.json 1.13-დან + offers: `domain, countries, cities?, languages, excludedStatuses, placements, title×5, body×5, disclosure×5, trackingUrl, priority`); `content/offers-allowlist.json` (§2.5); `server/offers/placement.ts` `selectOffers()` **pure function** hard-exclusion-ებით; `GET /go/:offerSlug` → `usage_counters(subjectType=ip-hash, metric=offer_click:<slug>)` → 302 `?gk_ref=&utm_source=grantkit`; `OfferCard` კომპონენტი დისკლოზურით + „უფასო ალტერნატივა: X"; placement-ები: `/fr/essentials` (5 რიგი: 1 პარტნიორი + ≥1 არა-პარტნიორი), `commercial: true` გიდის ბოლო, ჩეკლისტის `daily_life/money` item-ები; სტატუს-გეითინგი client-side (D6). **DB ცხრილი არა** (0024 Phase 4 gate: >10 offer ან postback). `admin.stats.offers`: click count/slug/day `usage_counters`-დან | CC-Kwame + CC-Lila (×5) + CC-Salomé (allowlist review, დისკლოზური loi influenceurs/Toubon) + CC-Mira (review `server/offers/*`) | M | **ტესტები merge-ის წინაპირობა:** allowlist `{}` → 0 offer ყველა placement-ზე; `statusClient=asylum_seeker` → 0 (გარდა SIM/გზავნილი/თარგმანი); გიდი `commercial:false` → 0; org `providerType=nonprofit` → 0; print → 0; ყოველ card-ზე disclosure ≠ ""; `/go/wise` → 302 + counter +1; `offer_events`-ის მსგავსი userId არსად; `/fr/essentials` 200 ×5 ენა |
| **2.10** | **Pro listing v0 (D22):** კომერციული პროვაიდერის org გვერდზე `listingTier=pro` → badge „ფასიანი listing" (≠ verified), ka/ru აღწერა, CTA, საათები; 3 ka→fr traducteur assermenté (Cour d'appel-ის სია) `[L §5.1 #4]` — outreach + ხელით ინვოისი €60/თვე ან €500/წ; NGO-ზე შეუძლებელი (2.6 validation); სია `/trust`-ზე | CC-Kwame + CC-Levan/OP (outreach) | S + EXT | pro badge რენდერდება მხოლოდ `commercial`-ზე (test); ≥1 გადამხდელი listing ledger-ში ან „0/3" ჩანაწერი |
| **2.11** | **იურიდიული პირი + runway (D23, M4):** association loi 1901 დაფუძნება (€0–300, 2–4 კვ `[N R6]`; მფლობელი = président; ბუღალტრის კონსულტაცია €200 — escalation); Fondation de France / Crédit Mutuel განაცხადი €10k draft `[N §4.3]`; MFA დიასპორული მიკროგრანტი — მხოლოდ D-გადაწყვეტილებით (R7 რეპუტაცია); **sponsor deck** („ka-ენოვანი ემიგრანტული აუდიტორია FR/DE/ES/US") + pitch Wise/Expatica და TBC/BoG პარალელურად `[L §5.1 #8]` | OP/მფლობელი + CC-Levan (deck, განაცხადის draft) + CC-Nika (ბიუჯეტი განაცხადში) | EXT (≈ 20 სთ) | JO-ში ასოციაციის განცხადება (ან ჩაწერილი თარიღი); ≥1 გრანტის განაცხადი გაგზავნილი; sponsor: ≥2 შეხვედრა ჩატარებული, შედეგი pipeline.md-ში |

**Phase 2 done when:** 0021 live golden rule-ით (Session Log: apply → verify → merge); 6 გიდი + 5 ჩეკლისტი ka/fr/ru; ≥500 service; AI eval 25/25; Ezra #1 ≥80%; **cash ≥ €1,000 ledger-ში; 3 pilot LOI; ასოციაცია დაფუძნებული; 2.9-ის 8 „არასდროს" ტესტი მწვანე.**

### Phase 3 — Billing, org portal, retention, telemetry (კვირა 11–16 · ~18 CC-დღე)

| | |
|---|---|
| **მიზანი** | მომხმარებელი ბრუნდება და ხდება verification-ის წყარო; **ორგანიზაცია პირველად იხდის**; ჩვენ ვზომავთ და შემოსავალსაც და „იპოვა თუ არა დახმარება". |
| **შემოსავლის milestone — „პირველი განმეორებადი"** | **MRR ≥ €250** (≥1 ფასიანი Org Pro/Institutional ხელით ინვოისით ან ≥3 Pro listing); კუმულაციური cash ≥ €3,000; Paddle repaired: concierge one-time checkout live; `admin.stats.revenue` აჩვენებს MRR-ს live DB-დან; impact report CSV გრანტისთვის. |
| **Scope IN** | v1 3.1–3.6 + 3.7 (გადაფორმულირებული), 3.8, 3.9; +4 გიდი; I2 repair, I23, I27 |
| **Scope OUT** | embed widget/API (Phase 4); offers DB; cases module; ახალი ქვეყანა; PWA |
| **დამოკიდებულებები** | Phase 2 done; 0022, 0023 (golden rule); 0.2-ის 0020/secret ვერიფიკაცია; D15 (DPIA ერთგვერდიანი concierge-ის გაგრძელებამდე) |

| # | Deliverable | ვინ | Effort | Done when |
|---|---|---|---|---|
| 3.1 | **Migration 0022 (ცალკე PR):** v1 3.1 (`user_journey`, `saved_entities`, `content_feedback`, `users.consentAt/consentVersion`) + **`events`** (`name, subjectType, subjectId?, sessionHash, orgAccountId?, props JSON, lang, country, createdAt`; allowlist სახელები `[A §8.1]`) | CC-Dmitri; OP | M | apply merge-მდე; `SELECT name FROM events LIMIT 1` ✓; `saved_grants` 100% `saved_entities`-ში |
| 3.2 | **Dashboard = ჩემი გეგმა** — v1 3.2 უცვლელი | CC-Kwame | M | reload-ზე ჩეკლისტი რჩება; save → login prompt |
| 3.3 | **Feedback loop** — v1 3.3 უცვლელი | CC-Kwame + CC-Noa | S–M | ✗ ≥3 → badge |
| 3.4 | **Alerts პროფილზე** — v1 3.4 უცვლელი (free: alerts ×1) | CC-Noa | M | digest ≥1 შესაბამისი |
| 3.5 | **Outcome + revenue telemetry (I27):** v1 3.5 (5 Umami event) + `telemetry.track` public mutation (allowlist + 60/min/IP) → `events(org_contact)`; UTM first-touch `localStorage.gk_utm` → `auth.register` → `events(signup).props.utm`; `admin.stats` = §7-ის 12 KPI + `costs` (`usage_counters` GROUP BY metric) + **`revenue`** (MRR/ARR/churn SQL, `source ∈ {paddle, manual}`; `grant/trial` ცალკე ხაზი) + **`admin.reports.impact({month})`** CSV (people informed, contacts made verified org-ზე, guides read, shares, verified orgs, seats, ✗ rate — მხოლოდ აგრეგატები) `[A §8]` | CC-Mira + CC-Nika (KPI განმარტებები) | S–M | `events` ≥1 `org_contact` 24 სთ-ში; `admin.stats.revenue.mrr` = ხელით ჯამი subscriptions-დან (test); impact CSV 7 სვეტით, PII 0 |
| 3.6 | **Privacy II + DPIA:** v1 3.6 (`auth.deleteAccount`, consent, retention ADR) + **DPIA ერთგვერდიანი** concierge-სა და offers-ზე (D15) | CC-Mira + CC-Salomé | M | `deleteAccount` → 4 ცხრილში 0 (test); `.grantkit-redesign/adr/000X-dpia.md` |
| **3.7** | **Billing & entitlements (I2 repair, I23, cap 21–22, migration 0023, ცალკე PR):** `shared/plans.ts` — `PLANS = free \| org_basic \| org_pro \| concierge` (**helper_pro ამოღებული**, L5) + `ENTITLEMENTS` + **free snapshot test** („ემიგრანტისთვის არაფერი იკეტება"); `server/entitlements.ts` `resolvePlan()` (dual-read legacy `users.subscription*`), `requireEntitlement()`; 0023: `subscriptions`, `org_accounts`, `memberships`, `api_keys` (ცხრილი ახლა, feature Phase 4 — ერთი migration ორის ნაცვლად `[A §10 F]`); Paddle B1–B8: secret + 0020 (0.2-ში ვერიფიცირებული), `cancel` → Paddle API (DB-ს არ წერს), `PRICE_MAP` env boot-validation, webhook → `subscriptions` upsert (dual-write 1 ფაზა), უცნობი სტატუსი → previous, `transaction.completed` one-time → concierge, out-of-order `lastEventAt` guard; `admin.subscriptions.grant(source=manual)` pilot-ინვოისისთვის; Stripe — არა; `subscription.status.isActive` → deprecate | CC-Mira (billing) + CC-Dmitri (0023) + OP (PADDLE_* env, sandbox) | M | apply 0023 merge-მდე; sandbox checkout → `subscriptions` row ≤ 30 წმ; cancel → Paddle `canceled`, DB უცვლელი; entitlement მატრიცა 4 plan × 8 key = 32 assertion; `ENTITLEMENTS.free` snapshot; manual grant → `resolvePlan` = `org_pro`; `grep isActive client/src` → 0 gating; concierge one-time → `events(plan_started)`; 33 ძველი ტესტი მწვანე |
| **3.8** | **Org portal v0 (cap 23-ის ნაწილი, L 3B):** `/partner`: „ეს თქვენი ორგანიზაციაა? Claim" → `org_accounts` + `memberships(owner)` + `settings.linkedOrgId` (ადმინის დასტურით, `claims` ცალკე ცხრილი არა — `settings`-ში `claimedAt/claimMethod`); ka/ru ტექსტის რედაქტირება (AI draft → human review → `entity_translations(source=org, reviewedAt)` + „reviewed by {org} on {date}" ბადჯი); **QR + A4 pack** (print CSS, org-ის სერვისები/საათები/საბუთები ka/ru); `orgProcedure = protectedProcedure.use(requireMembership())`; `orgAccountId` არასდროს input-იდან. Embed/API/stats — Phase 4 | CC-Kwame + CC-Dmitri (procedures) + CC-Lila (AI draft prompt) | M | claim → admin queue → approve → `/partner` ხედავს თავის org-ს; სხვისი org → 403 (test); A4 pack ka/ru 1 გვერდი (screenshot); Pro badge ≠ verified (ორი ცალკე ველი) |
| **3.9** | **პირველი ფასიანი კონვერსია (EXT):** 3 pilot-დან ≥1 → ფასიანი (Institutional €2–3k/წ ან Org Pro €450) ხელით ინვოისით → `admin.subscriptions.grant`; მთარგმნელების listing → Paddle self-serve თუ ≥5, სხვაგვარად ხელით; Fondation პასუხი; sponsor: term sheet ან „მკვდარია" ჩაწერილი | OP/მფლობელი + CC-Levan | EXT (≈ 15 სთ) | `admin.stats.revenue.mrr ≥ 250`; pipeline.md განახლებული; sponsor სტატუსი ბინარულად ჩაწერილი |
| 3.10 | **+4 გიდი** (სკოლა, CIR, ENIC-NARIC, თარგმანი — ბოლო `commercial: true`) | CC-Lila | M | 10 გიდი ka/fr/ru reviewed |

**Phase 3 done when:** 3.1–3.10 ✓; D30 retention გაზომილი; „wrong info" < 5%; **MRR ≥ €250 live `admin.stats`-ში; cash ≥ €3k; Paddle sandbox e2e ✓; DPIA არსებობს.**

### Phase 4 — მასშტაბი (თვე 5+ · gate: Phase 3 KPI-ები + ფინანსური gate)

| | |
|---|---|
| **მიზანი** | reference implementation კოპირდება მეორე ქვეყანაზე/ენაზე; B2B ფენა (embed, API, seats) pilot-ებთან; earned run-rate €1k/თვე → cash break-even. |
| **Gate (ყველა):** | v1-ის 3 (WAU ≥ 200, ka+ru ≥ 60%; verified ≥ 90% FR; ≥3 შუამავლის დადასტურება) + **F2 MRR ≥ €250 ან F3 cash ≥ €3k** + **F6 concierge ≥ €60/სთ** (სხვაგვარად — პროდუქტიზაცია ან გაუქმება `[N F3]`) |
| **შემოსავლის milestone** | **€1k/თვე run-rate** (2 ოჯახი + 1 ლიცენზია `[N §5.3 B]`) თვე 9–12; **cash break-even (infra + Claude Max)** თვე 8–10 base; 3 pilot → 1–2 ფასიანი Institutional; DIAIR/რეგიონული გრანტი განაცხადი; ES გაფართოება **M2-ის მიხედვით, არა B2C-ის** `[N §8.2]` |
| **Scope (D11, D12, D16 + gate-ები):** | (a) მეორე ქვეყანა ES vs DE — 30 org სიღრმით + 10 გიდი; (b) მეორე ენა uk vs ar/fa; (c) **embed `/embed/:orgSlug`** + per-route CSP allowlist + `embed.js` + **`/api/v1`** Express + `api_keys` (0023-ის ცხრილები) `[A §4]`; (d) claim-your-listing community editors; (e) PWA precache; (f) bot prerender + programmatic `/{lang}/{country}/{city}/{domain}` ~800 გვერდი + `/:lang` `[A §9.2]`; (g) **offers DB (0024)** — მხოლოდ თუ >10 offer ან partner postback სჭირდება; (h) **concierge cases module (0025)** — მხოლოდ ≥10 გადახდილი ოჯახი + DPIA + EU bucket `[A §6]`; (i) data licence — მხოლოდ ≥500 org `lastVerifiedAt` ≤ 90 დ., NGO-მონაცემი ODbL (D24) `[L 3D, L7]`; (j) AMIF sub-partner ჩამოყალიბებულ NGO-სთან (Comede, FTdA, Forum réfugiés) — არა lead-ად `[N §4.3]`; (k) `users.subscription*` drop (0026) F live ≥1 ფაზის შემდეგ, escalation |
| **Effort** | L (თვე 5–8); ყოველი ქვე-item-ის done-when Phase 3-ის ბოლოს იწერება |

### რას **არ** ვაშენებთ (Simplicity First — `[A P6][L §5.3]` + ჩემი)

1. `plans` ცხრილი DB-ში — კონსტანტა კოდში. 2. Redis — MySQL counter. 3. Stripe მიგრაცია — Paddle MoR რჩება. 4. Partner self-service portal — თვეში ერთი CSV ემაილით. 5. Subdomain white-label — iframe. 6. Full Vite SSR — head injection + bot prerender. 7. Lead form-ები partner-ისთვის — redirect-only. 8. `users.subscription*` drop ახლა — dual-read. 9. Grandfathering — $9 გამომწერი არ არსებობს. 10. **Helper Pro ინდივიდუალური paywall.** 11. **AdSense/ბანერ-ქსელები.** 12. **ადვოკატის CPA** (FR ილეგალური). 13. **კლინიკის კომისია** (FR/DE ილეგალური; TR-შიც არა — ნდობა). 14. მუნიციპალური ტენდერი (6–18 თვე). 15. Concierge cases module 10 გადახდილ ოჯახამდე. 16. Offers ცხრილი 10 offer-მდე. 17. API/data licence 500 ვერიფიცირებულ org-მდე. 18. მეორე ქვეყანა Phase 4-მდე. 19. Headless CMS 30 გიდამდე. 20. Fundraising escrow/გადახდის მიღება — მხოლოდ ბმულები. 21. AI-ში პარტნიორის ხსენება — არასდროს. 22. `claims` ცალკე ცხრილი — `org_accounts.settings`. 23. Paddle repair Helper Pro-სთვის — მიზანი შეიცვალა. 24. Donation ღილაკი ემიგრანტისთვის — დონორი დიასპორაა, ასოციაციასთან ერთად მოგვიანებით `[N §8.3]`.

---

## 6. გუნდი და აგენტები

> კონვენცია უცვლელია: persona = Claude Code სესია, არა ადამიანი; ყოველი ნაკადი = ცალკე branch; მფლობელი უშვებს ≤ 3 სესიას ერთდროულად. **ახალი:** მფლობელის საკუთარი დრო Phase 1-დან 30% გაყიდვები/პარტნიორობა · 40% კონტენტი/ვალიდაცია · 30% პროდუქტი (D25, `[L L8]`) — ეს არის sales cycle-ის დაწყების ერთადერთი გზა.

### 6.1. Persona-ები (v1-ის 7 + 3 ახალი; ცვლილებები ხაზგასმით)

| Persona | ექსპერტიზა / skills | ნაკადი | **ფლობს** | **არ ეხება** |
|---|---|---|---|---|
| 🛡️ **Mira** — Security, Platform Ops **& Billing** | v1 + entitlements, Paddle, metering; skills: `security-review`, `update-config`, `claude-api` | v1 + 0.5, 0.10 (env), 1.8 (seoHead), 3.5, 3.7 (billing), review `server/offers/*` | v1 + **`server/entitlements.ts`, `server/billing/*`, `server/metering.ts`, `server/seoHead.ts`, `server/paddleWebhook.ts`** | UI, i18n, კონტენტი, offers-ის *შინაარსი* |
| 🚀 **Ilias** — Release, Docs SSOT & Data Ops | უცვლელი | 0.6, 0.7, 0.8; closeout-ები; `PIVOT.md` v2 | უცვლელი | უცვლელი |
| 🎨 **Kwame** — Frontend | v1 + `conversion-craft` **მხოლოდ B2B/concierge გვერდებზე, არასდროს ემიგრანტის flow-ზე** | v1 + 1.11, 1.13, 2.9 (OfferCard, essentials), 2.10, 3.8 (portal) | v1 + **`client/src/pages/{HealthAbroad,Essentials,Trust,Partner,AdminOffers}.tsx`, `client/src/components/OfferCard.tsx`** | უცვლელი + `content/offers/*` მნიშვნელობები |
| ✍️ **Lila** — Content & i18n | უცვლელი | v1 + 1.11 copy, 1.13 ×5, 2.9 ×5, 3.8 AI draft prompt | v1 + **`content/offers/*.json` ტექსტური ველები (title/body/disclosure ×5)** | სერვერი, სქემა, allowlist |
| 🗄️ **Dmitri** — Data Architect | უცვლელი; golden rule custodian | 2.1 (0021 + counters + providerType), 3.1 (0022), 3.7 (0023), 3.8 procedures | v1 + **`shared/plans.ts` (სქემის ნაწილი), `drizzle/0021–0026`** | client; არასდევს merge migration-ის გაშვებამდე |
| 🔗 **Noa** — Data Pipelines & AI | უცვლელი | 0.7 cap, 2.2, 2.7 (+ token cap, „პარტნიორი არასდროს" eval), 3.3, 3.4 | უცვლელი | უცვლელი |
| 🎯 **Ezra** — Research & Validation | უცვლელი + WTP ბლოკი | 1.1 | უცვლელი | უცვლელი |
| 💼 **Levan** — Partnerships & Revenue Ops *(ახალი)* | B2B outreach მასალა, pilot LOI, sponsor deck, affiliate account-ების ინსტრუქცია, Pro listing outreach, გრანტის განაცხადის draft; skills: `b2b-funnel-fr`, `brand-strategy-fr`, `act-generator`, `french-admin-etiquette`, `monetization-calc` | 1.12, 1.13 (account-ები), 2.10, 2.11, 3.9; Phase 4 pilots | **`reports/finance/pipeline.md`**, `reports/partnerships/*` (deck, LOI შაბლონი, pitch one-pager), `content/offers/partners.json` (**არა**-ტექსტური ველები: slug, domain, countries, trackingUrl) | კოდი; allowlist (Salomé); ფასების ცვლილება escalation-ის გარეშე |
| 📊 **Nika** — Finance & Unit Economics *(ახალი)* | P&L, break-even, KPI F1–F9 თვიური, ხარჯის baseline, გრანტის ბიუჯეტი; skills: `monetization-calc`, `xlsx`, `claude-api` (ფასები) | 0.10 (baseline), 2.11 (ბიუჯეტი), 3.5 (KPI განმარტებები); ყოველი ფაზის closeout-ზე ფინანსური ხაზი | **`reports/finance/{baseline,ledger,kpi-YYYY-MM}.md`**, `05-financial-analysis.md` განახლებები | კოდი; pipeline (Levan); ledger-ში PII |
| ⚖️ **Salomé** — Commerce Compliance & Trust *(ახალი)* | RGPD/CNIL, loi Toubon, loi influenceurs 2023, DGCCRF, Art. 9, DPIA, ordre des avocats/médecins წესები; skills: `france-market-compliance`, `security-review`, `french-admin-etiquette` | 1.9 (Privacy), 1.11 (consent/T&C/disclaimer), 1.13 (`/trust`), 2.9 (allowlist + disclosure review — **merge gate**), 3.6 (DPIA) | **`content/offers-allowlist.json`**, `/trust` ტექსტი, Privacy/T&C/consent ტექსტები, `.grantkit-redesign/adr/*-dpia.md` | კოდის ლოგიკა; offers-ის კომერციული პირობები (Levan) |
| 🧭 **Tamar** — მენეჯერი | merge, კონფლიქტი, პრიორიტეტი, escalation; **ფაზის შემოსავლის milestone-ის go/no-go** | ყველა | `00-MASTER-PLAN-v2.md`, `PIVOT.md` (Ilias-თან), closeout ხაზი | კოდი |

### 6.2. პარალელიზაციის გეგმა (განახლებული)

| ფაზა | პარალელური ნაკადები | თანმიმდევრული (რატომ) |
|---|---|---|
| **0** | **A** Mira: 0.1 → 0.3 → 0.5 → 0.10 env ‖ **B** Kwame+Lila: 0.4 (+0.2 D1/D2-ის შემდეგ) ‖ **C** Ilias: 0.6 → 0.8; Noa: 0.7 ‖ **D** Nika: 0.10 baseline doc (OP-ის dashboard-რიცხვებით) | 0.9 0.3-ის შემდეგ და 2.1-მდე (gate); 0.2 D2-ის შემდეგ |
| **1** | **A** Ezra: 1.1 (EXT) ‖ **B** Lila: 1.2 → 1.4 labels → 1.11 copy → 1.13 ×5 ‖ **C** Dmitri: 1.4 API → 1.3 → 1.6 JOIN ‖ **D** Kwame: 1.7 → 1.8 → 1.5 → 1.11 გვერდი → 1.13 გვერდი → (1.4 UI, 1.3, 1.6) ‖ **E** Mira: 1.8 seoHead → 1.9 → 1.10 ‖ **F** Salomé: 1.13 `/trust` ტექსტი → 1.11 consent → 1.9 Privacy ‖ **G** Levan + OP: 1.12 pipeline → 1.13 account-ები → 1.11 FB პოსტი | 1.11 გვერდი **D20 + D23-ის შემდეგ**; 1.13 account-ები **D19-ის შემდეგ**; 1.3 1.4-ის შემდეგ; go/no-go 1.1-ის შემდეგ |
| **2** | **A** Dmitri: 2.1 (gate) → 2.5 → 2.6 procedures ‖ **B** Lila: 2.3 (2.1-მდე იწყება) → 2.4 → 2.9 ×5 ‖ **C** Noa: 2.7 → 2.2 (2.1-ის შემდეგ) ‖ **D** Kwame: 2.8 → 2.4 render → 2.9 essentials/OfferCard → 2.10 → 2.6 UI ‖ **E** Salomé: allowlist + disclosure review (2.9 merge gate) ‖ **F** Levan + OP: 2.11 ასოციაცია/deck/sponsor → 2.10 outreach → pilot LOI ×3 | 2.2, 2.5, 2.6, 2.10 badge **2.1 live-ის შემდეგ**; 2.9 **2.3-ის ≥1 `commercial: true` გიდისა და Salomé review-ს შემდეგ** |
| **3** | **A** Dmitri: 3.1 (0022) → 3.7 (0023) ‖ **B** Mira: 3.5 → 3.7 billing (0023-ის შემდეგ) → 3.6 ‖ **C** Kwame: 3.2 → 3.3 → 3.8 ‖ **D** Noa: 3.4 ‖ **E** Lila: 3.10 ‖ **F** Levan + OP: 3.9 | 3.7 billing 0023 live-ის შემდეგ; 3.8 0023-ის შემდეგ (`org_accounts`); 3.9 3.7-ის შემდეგ (`grant` procedure) |

**ტემპი:** ≤ 3 ღია PR (უცვლელი). **ახალი review gate:** `server/offers/*`, `content/offers-allowlist.json`, `content/offers/*.json` → Salomé + Mira ორივე; `server/billing/*`, `server/entitlements.ts` → Mira + Dmitri; `reports/finance/*` → Nika; ფასის ნებისმიერი ცვლილება → მფლობელი (escalation წესი „ფული/ფასი").

### 6.3. მენეჯერის პროტოკოლი

v1 §6.3 უცვლელია (ევიდენსის რიგი, escalation სია, PR ≤ 300 ხაზი, სესიის დასაწყისის რიგი). **დამატება:** (1) ყოველი ფაზის closeout-ს აქვს **ფინანსური ხაზი** Nika-სგან (F1–F9 რიცხვებით) და შემოსავლის milestone-ის ✓/✗; ✗ = Tamar წყვეტს „გავაგრძელოთ, გადავდოთ, MVM-ზე გადავიდეთ" და მფლობელს ერთ შეტყობინებაში აწვდის; (2) escalation სიას ემატება: **ახალი მონეტიზაციის ზედაპირი ან allowlist-ში დომენის დამატება; ფასის ცვლილება; პარტნიორის ხელშეკრულება; გრანტის განაცხადის გაგზავნა.**

---

## 7. წარმატების მეტრიკები

**North-star უცვლელია:** „დახმარებული კონტაქტი კვირაში" (v1 §7). **მეორე ჯაჭვი — „does anyone pay":** ცალკე, რადგან მისიის KPI-ების წარმატება შემოსავალს არ გულისხმობს `[L §4.5]`.

**მისიის KPI 1–12** (v1 §7) რჩება იმავე baseline-ებითა და სამიზნეებით; ერთი ცვლილება: KPI 10 „გიდები" Phase 2 = 6, Phase 3 = 10.

### 7.1. ფინანსური KPI-ები

| # | KPI | ფორმულა | Baseline (2026-09) | Phase 1 (კვ. 4) | Phase 2 (კვ. 10) | Phase 3 (კვ. 16) | Phase 4 (თვე 9–12) | როგორ იზომება |
|---|---|---|---|---|---|---|---|---|
| **F1** | ხარჯი ერთ დახმარებულ კონტაქტზე `[N F1]` | (infra + AI + Maps €/თვე) ÷ დახმარებული კონტაქტი/თვე | ∞ (0 კონტაქტი; ხარჯი ≈ €25) | გაზომილი (რიცხვი) | < €1 | < €0.50 | < €0.20 (სახელმწიფოს €0.60 ბენჩმარკის ქვემოთ) | 0.10 baseline + Umami 3 event; 3.5 `events(org_contact)` |
| **F2** | MRR / ARR (მხოლოდ `source ∈ {paddle, manual}`) | Σ n × (monthly ? price : price/12) `[A §8.3]` | €0 | €0 | €0–60 (listing) | **≥ €250** | **≥ €1,000** | 3.7 `subscriptions` + `admin.stats.revenue` |
| **F3** | კუმულაციური cash შემოსავალი (one-off ჩათვლით) | ledger ჯამი | €0 | **≥ €290** (1 ოჯახი) | **≥ €1,000** | ≥ €3,000 | ≥ €8,000 | `reports/finance/ledger.md` (PII 0) |
| **F4** | Earned-income share `[N F3]` | (M2+M3+M5+M6) ÷ სულ | n/a | n/a | 100% (გრანტი 0) | ≥ 60% | ≥ 40% წ.2-დან, არცერთი წყარო > 50% | ledger + გრანტების ცხრილი |
| **F5** | B2B pipeline შეწონილი ღირებულება `[N F2]` | Σ org × €/წ × stage-ალბათობა (10/30/60%) | €0 | ≥ €1.5k (3 საუბარი × €5k × 10%) | ≥ €6k (3 pilot × €5k × 30% + საუბრები) | €15k (თვე 6) | €40k (თვე 12) | `pipeline.md` (spreadsheet-ლოგიკა, არა კოდი) |
| **F6** | Concierge €/founder-სთ `[N F3]` | net €/ოჯახი ÷ founder სთ/ოჯახი | — | გაზომილი (1 ოჯახი) | ≥ €40 | **≥ €60** (სხვაგვარად პროდუქტიზაცია/გაუქმება — Phase 4 gate) | ≥ €80 | ledger (საათები/ოჯახი) |
| **F7** | AI ხარჯი/MAU + smartSearch cache hit-rate `[N §6 #4]` | Anthropic $ ÷ MAU; hits ÷ (hits+misses) | ≈ $0 (MAU 0); abuse ჭერი $4,300/თვე | < $0.02/MAU; ჭერი ≤ $14/დღე/IP | < $0.01; hit-rate ≥ 50% | < $0.01; ≥ 60% | < $0.01 | 0.5 log; 2.7 `usage_counters`; `admin.stats.costs` |
| **F8** | CAC არხების მიხედვით | € (დრო × €25 + cash) ÷ ახალი აქტიური; B2B: სთ/pilot | — | FB ჯგუფები ≈ €0; B2B ≈ 30 სთ/pilot `[N M2]` | SEO ka/ru: Search Console impressions ≥ 100/თვე | SEO ≥ 1k impressions; B2B ≤ 30 სთ/pilot | sponsor: 1 term sheet ≤ 20 სთ | Umami UTM/referrer; ledger საათები; Search Console |
| **F9** | Affiliate EPC (€/100 click) + sponsor pipeline `[L §4.5]` | postback €/click × 100; LOI/term sheet რაოდენობა | — | — (account-ები მხოლოდ) | გაზომილი; sponsor ≥ 2 შეხვედრა | EPC ≥ €10; sponsor 1 term sheet ან „მკვდარია" | EPC ≥ €20 | `usage_counters(offer_click)` + partner dashboard-ები ხელით |

**რას არ ვზომავთ ახლა** `[N §8.3]`: B2C კონვერსია (paywall არ არსებობს); LTV/CAC B2C (მომხმარებელი არ არსებობს); donation rate (დონორი დიასპორაა — ასოციაციასთან ერთად). **KPI 13 (ოპერაციული ჯანმრთელობა) ემატება:** GCP/Railway budget alert დაყენებული; abuse worst-case დოკუმენტირებული ყოველი ფაზის closeout-ზე.

---

## 8. გადაწყვეტილებები მფლობელისგან

> v1 D1–D18 + Levan L1–L8 + Arash D19/D20 → 26 დედუპლიცირებული. **⛔ = ბლოკავს Phase 0/1-ს — პასუხი 7 დღეში.** „**შეიცვალა**" = v1-ის რეკომენდაცია v2-ში სხვაა. Merge: L1→D19, L3→D20 (+D17-ის პროდუქტული ნაწილი), L5→D1, L2→D21, L4→D22, L6→D23, L7→D24, L8→D25; Nika §8.1 → D26.

| ID | გადაწყვეტილება | ვარიანტები | **რეკომენდაცია** | რას ბლოკავს |
|---|---|---|---|---|
| **D26 ⛔ (ახალი, პირველი)** | **ჰორიზონტი და ამბიცია:** self-sustaining მისიის პროდუქტი (€3–5k/თვე 24–30 თვეში, ≈ 90 სთ/თვე) თუ „minimum viable maintenance" (€30/თვე, concierge-ით თვითდაფინანსებული, 4 სთ/კვ) `[N §8.1]` | (a) self-sustaining — ეს გეგმა; (b) MVM — Phase 0 + 1.11 მხოლოდ, დანარჩენი ჩერდება; (c) venture — **არა** (ევიდენსი §2.2) | **(a), თუ მფლობელს 24–30 თვე და 90 სთ/თვე რეალურად აქვს; სხვაგვარად (b) პატიოსანი არჩევანია, არა წარუმატებლობა** | მთელი Phase 1–4; D25 |
| **D1 ⛔ — შეიცვალა** | Paywall ემიგრანტისთვის + ვინ იხდის | (a) უფასო B2C + **org-sold** (Org Pro/Institutional, helper account უფასო) + concierge + partner/sponsor; (b) v1: უფასო B2C + Helper Pro ინდივიდუალური; (c) $9 რჩება | **(a)** — Turn2us უფასოა `[N M1]`, Réfugiés.info 30–40k პროფესიონალი უფასოს ხმარობს `[L]`; Helper Pro ინდივიდუალური **ამოღებულია** შემოსავლის ხაზიდან (იყო v1 რეკომენდაციაში) | 0.2, 0.4, 1.2, 1.12, 3.7 plans |
| **D2 ⛔ — შეიცვალა** | Billing ახლა | (a) pause B2C checkout ახლა, **repair Phase 3.7 concierge one-time + org billing-ისთვის**; (b) repair ახლა; (c) pause სამუდამოდ | **(a)** — v1-ში repair იყო „მხოლოდ Helper Pro yes-ზე"; ახლა repair გარანტირებულია Phase 3-ში, მიზანი შეიცვალა `[A §3.1][L §4.5]`; მანამდე ინვოისი ხელით | 0.2; 3.7 |
| **D3 ⛔** | Secrets: history rewrite? | (a) rewrite; (b) purge + rotation | უცვლელი v1: (a) თუ private და collaborator ≤ 3; rotation ორივეში | 0.1 |
| D4 | ბრენდის სახელი | (a) რჩება; (b) ახალი Phase 3-ის ბოლოს | უცვლელი; **დამატება:** `/health-abroad` ქვე-ბრენდი ნეიტრალური სახელით (არა „GrantKit Medical") — D20-თან ერთად | არაფერი ახლა |
| **D5 ⛔** | Beachhead | უცვლელი | (a) | 1.2, 1.3, 2.3 |
| **D6 ⛔** | სტატუსი onboarding-ში client-only | უცვლელი | (a) — **ახლა უფრო კრიტიკულია:** სტატუს-გეითინგი offers-ზე (2.9) ამაზეა დაშენებული, სერვერზე არასდროს ილოგება | 1.3, 2.9 |
| D7, D8 | provenance / „verified" 90 დღე | უცვლელი | (a) / 90 დღე; **Pro badge ≠ verified** (D22) | 1.5, 2.6, 2.10 |
| D9 | რედაქციული რესურსი | უცვლელი | (a) Phase 2 (მაგრამ 6 გიდი, ვერიფიკაციის ზარები pilot-ის სოცმუშაკებზე `[N R8]`); (c) Phase 4 | 2.3 |
| D10 | გრანტების ბედი (350 orphan) | უცვლელი | (a) soft delete; **დამატება:** `grants` მონაცემი = `/health-abroad`-ის აქტივი, `targetDiagnosis` 100% შენარჩუნებულია | 2.2, 1.11 |
| D11, D12 | ენები / მეორე ქვეყანა | უცვლელი | (a) / ES **M2 pipeline-ის მიხედვით** `[N §8.2]` | Phase 4 |
| D13 | AI სფერო | უცვლელი + | (a); **AI არასდროს ასახელებს პარტნიორს** (eval) | 2.7 |
| D14 | Resend DNS | უცვლელი | ახლავე 1.9 | 1.9, 1.11 ფორმა |
| D15 | RGPD posture | (a) cookieless + Privacy + consent Phase 3; (b) DPO ახლავე | (a); **DPIA ერთგვერდიანი სავალდებულოა concierge module-მდე (0025) და offers DB-მდე (0024)** `[A R7]` | 3.6, Phase 4 (g)(h) |
| D16 | ბეჭდური დისტრიბუცია | უცვლელი | Phase 4; A4 pack org-ისთვის 3.8-ში | — |
| **D17 — შეიცვალა (ნაწილობრივ)** | სამედიცინო-მოტივიანი ქართველები ღიად სამიზნე? | (a) მარკეტინგში არა, პროდუქტში **ring-fenced `/health-abroad`** კი; (b) ღიად კი; (c) არსად | **(a)** — v1 იყო „არა" სრულად; ახლა: მთავარ ბრენდში ჯანდაცვა ერთ-ერთი დომენია (France24 „AME abuse" რისკი `[N R7]`), მაგრამ ერთადერთი სეგმენტი, სადაც ორივე აქტივი (1,100 პროგრამა + 102 housing) და გადამხდელი ერთდროულად არსებობს `[L §4.5]` | 1.2 copy, 1.11 |
| D18 | Telemetry | უცვლელი | Umami cloud, **Phase 0** | 0.10 |
| **D19 ⛔ (ახალი, = L1)** | პარტნიორ-შეთავაზებები საიტზე? | (a) კი — კოდში allowlist + hard exclusion + სტატუს-გეითინგი + `/trust` + redirect-only; (b) არა, მხოლოდ B2B/concierge; (c) კი ყველგან | **(a)** — v1-ის „უარყოფილი ალტერნატივა 2" **შეიცვალა**: კონფლიქტი წყდება არქიტექტურით `[L 3A][A §5]`; Nika: მხოლოდ კონტექსტური, tracking 0 `[N R1]`; (c) აუცილებლად არა | 1.13, 2.9, 2.3 frontmatter, `/trust` |
| **D20 ⛔ (ახალი, = L3 + A)** | Health-abroad concierge და საზღვრის გადაწერა | (a) ცალკე ქვე-ბრენდი, ოჯახის მიერ გადახდილი, კლინიკის კომისია 0, v0 კოდის გარეშე, module ≥10 ოჯახის შემდეგ; (b) მთავარ ბრენდში; (c) არ გავაკეთოთ | **(a)** — PIVOT §1 „არა case management" → „არა იურიდიული/სამედიცინო რჩევა და წარმომადგენლობა; ინფორმაციული ნავიგაცია + ლოგისტიკა დაშვებულია ring-fenced-ში"; founder ≤ 8 სთ/კვ `[L L3]`; F6 ≥ €60/სთ gate | 1.11, Phase 4 (h) |
| D21 (= L2) | Sponsor | (a) ერთი ფინანსური სპონსორი/ქვეყანა, ექსკლუზივი კატეგორიაში, „supported by", ბანერი 0; (b) რამდენიმე; (c) არცერთი | **(a)** — Arrive/RBC მოდელი; pitch Wise/Expatica + TBC/BoG პარალელურად `[L L2]`; ბინარული — P&L-ში EV 50% | 2.11 |
| D22 (= L4) | ვინ იხდის listing-ში | (a) NGO/საჯარო უფასო სამუდამოდ; კომერციული პროვაიდერი ფასიანი; (b) ყველა უფასო; (c) ყველა ფასიანი | **(a)** — Expatica/Turn2us წესი; server validation 2.6 | 2.6, 2.10 |
| **D23 ⛔ (ახალი, = L6 + N R6)** | იურიდიული სტრუქტურა | (a) **ახლა:** მინიმალური პირი, რომელიც ინვოისს გასცემს (auto-entrepreneur FR ან არსებული პირი); **Phase 2:** association loi 1901 (გრანტები); მეორე კომერციული პირი (GE შპს / EE OÜ) მხოლოდ თუ earned > €20k/წ; (b) მხოლოდ კომერციული; (c) მხოლოდ ასოციაცია | **(a)** — Levan-ის „ორი პირი ერთი ბრენდი" სწორია, მაგრამ 1.11-ის პირველი ინვოისი ამას ვერ დაელოდება; ბუღალტერი €200 = escalation | 1.11 (ინვოისი), 2.11 |
| D24 (= L7) | მონაცემთა ლიცენზია | (a) NGO/საჯარო org-მონაცემი ODbL (Soliguide-თან რეციპროკულობა); ka/ru + verification მეტამონაცემი proprietary; (b) ყველაფერი proprietary; (c) ყველაფერი ღია | **(a)** | Phase 4 (i) |
| D25 (= L8) | მფლობელის დროის განაწილება Phase 1–2 | (a) 30/40/30; (b) 100% პროდუქტი/კონტენტი შემოსავლამდე | **(a)** — B2B ციკლი ახლა უნდა დაიწყოს `[L L8]`; D26 (a)-ს გულისხმობს | 1.12, 2.11 |

---

## 9. უახლოესი 7 დღე — revenue-first რიგით

| დღე | # | ვინ | რა | Done when |
|---|---|---|---|---|
| 1 | 1 | **OP** | Secrets rotation — v1 #1 უცვლელი (MySQL root, 2 Maps key, Railway env) | ძველი credential → `Access denied`; ძველი key → 403 |
| 1 | 2 | **CC-Mira** | PR `chore(security): purge credentials` — v1 #2 | `git grep` → 0; Ilias review |
| 1 | 3 | **მფლობელი** | **D26 პირველ რიგში**, შემდეგ D1, D2, D3, D5, D6, D19, D20, D23 — 9 ხაზი `PIVOT.md` §4-ში | 9 ID-ს პასუხი თარიღით |
| 2 | 4 | **CC-Mira** | PR `ci: check/test/build on PR` — v1 #4 | 3 job მწვანე; branch protection |
| 2 | 5 | **CC-Mira** | PR `perf(cost): smartSearch LRU + 10/min, sameSite lax, json 2MB` (0.5) — **CI-სთან ერთ დღეს, არა მე-3-ზე** | იგივე query ×2 → 1 call; მე-11/წთ → 429; worst-case ≤ $14/დღე/IP ჩაწერილი PR body-ში |
| 2–3 | 6 | **CC-Kwame + CC-Lila** | PR `feat(copy): truth in numbers + pause checkout` (0.4 + 0.2, თუ D1/D2 = a) | grep → 0; ანონიმური `/catalog` სრული სია; `/refund` copy |
| 3 | 7 | **OP + CC-Mira + CC-Nika** | 0.10: Umami cloud account + env hook PR; `reports/finance/2026-09-baseline.md` (Railway რეალური usage, Anthropic 30 დ., Maps loads; budget alert-ები) | Umami-ში ≥1 pageview; baseline 3 რიცხვით; alert screenshot-ი OPS-ში (რიცხვი, არა key) |
| 3 | 8 | **OP** | Railway env: `PADDLE_WEBHOOK_SECRET` არის/არა; `node scripts/check-migration-0020.mjs`; შედეგი PROJECT_MAP-ში | 0020 სტატუსი ჩაწერილი (3.7-ის წინაპირობა) |
| 3–4 | 9 | **CC-Ilias** | PR `docs: single source of truth` — v1 #7 + `PIVOT.md` ← `PIVOT-v2.md`, `TEAM_ROSTER.md` ← §6.1 (10 persona) | non-archive `.md` ≤ 6; grep → 0 |
| 4 | 10 | **OP + CC-Noa** | `GOOGLE_MAPS_API_KEY` → GitHub Secrets; enrichment dry-run → limit 10 → schedule; `--max-requests` cap | 1 green run; cap ტესტი |
| 4–5 | 11 | **CC-Levan + მფლობელი** | `reports/finance/pipeline.md` (10 org, stage, €, ალბათობა); pitch one-pager fr/ka; LOI შაბლონი; sponsor deck outline — **outreach არ იწყება D1/D26-მდე** | pipeline 10 რიგით; one-pager 1 გვერდი; deck outline 6 slide |
| 4–5 | 12 | **CC-Salomé + CC-Lila** | `/trust` ტექსტი ×5 (8 პუნქტი) + concierge consent/T&C/disclaimer draft + affiliate დისკლოზურის სტანდარტული ფრაზა ×5 — **draft, publish D19/D20-ის შემდეგ** | 3 ტექსტური ფაილი `reports/compliance/`; loi Toubon checklist ✓ |
| 5 | 13 | **OP + CC-Ilias** | `STATUS.json` + ნაგავი org merge + FR 493 vs 624 რეკონსილიაცია — v1 #9 | `STATUS.json`; ნაგავი = 0; reconciliation.md |
| 5–6 | 14 | **მფლობელი + CC-Ezra** | ინტერვიუს გაიდი + **WTP ბლოკი** (org €300–900? ოჯახი €290/€590?) + რეკრუტინგი + fake-door — v1 #10 | გაიდი; ≥5 ინტერვიუ დაგეგმილი; Form live |
| 6–7 | 15 | **CC-Mira + CC-Dmitri** | ADR 0001 migrations + journal რეგენერაციის draft PR — v1 #11 | `drizzle-kit check` clean draft-ში |
| 7 | 16 | **Tamar + CC-Nika** | Phase 0 review: 10 done-when; **ფინანსური ხაზი** (ხარჯის ჭერი, abuse ჭერი, baseline); go/no-go Phase 1; ღია D-ები ერთ შეტყობინებაში | Session Log 2026-09-26; Phase 1 kickoff ან blocker-ების სია |

---

## 10. შეუთანხმებლობები და გადაწყვეტა

v1 §10 #1–#12 **უცვლელია**. ახალი (#13–#24):

| # | თემა | პოზიცია A | პოზიცია B | **გადაწყვეტა + მიზეზი** |
|---|---|---|---|---|
| 13 | **Helper Pro** | v1/Nino: ინდივიდუალური $9–29/თვე ან €99/წ, პირველი შემოსავალი 0–6 თვე; Nika: „სუსტი დანამატი" (M1 base €0.8k/€3k/€7.6k) | Levan L5: ამოღება; helper account უფასო, ფასი ორგანიზაციას | **B.** Turn2us adviser account უფასოა (Nika-ს პირდაპირი შემოწმება 2026 > Nino-ს მეორადი „£100+VAT"), Réfugiés.info 30–40k პროფესიონალი უფასოს ხმარობს, ka-სეგმენტის helper TAM FR < 200. `helper_pro` plan `shared/plans.ts`-დან ამოღებულია; helper = free user + case list PII-ს გარეშე |
| 14 | **გრანტები** | Nika: M2 + M4 = „ხერხემალი"; base M4 €5k/€15k/€30k | Levan: runway, არა შემოსავალი; „მომგებიანი საიტი გრანტზე ვერ დგას" | **სინთეზი:** გრანტები **runway და თანადაფინანსება** — P&L-ში ცალკე ხაზი, earned share KPI (F4) ≥ 40% წ.2-დან, არცერთი წყარო > 50% (Nika R3). Nika-ს რიცხვები რჩება, სახელი იცვლება. ასოციაცია Phase 2-ში ორივესთვის საჭიროა |
| 15 | **Concierge vs „არა case management"** | v1 §1.2 / PIVOT §1: არ აკეთებს case management-ს; D17: სამედიცინო მოტივი სამიზნე არა | Nika M5: ერთადერთი 1–3-თვიანი cash; Levan C: ring-fenced, ოჯახის მიერ გადახდილი; Arash: იზოლირებული module, D20 + საზღვრის გადაწერა | **B, საზღვრის გადაწერით (§1.2):** აკრძალული რჩება *რჩევა და წარმომადგენლობა*, არა *ფასიანი ინფორმაციული ნავიგაცია + ლოგისტიკა*. Ring-fence: ცალკე route, nav-ში არა, D17 marketing-ში ძალაშია, კომისია 0, disclaimer, founder ≤ 8 სთ/კვ, F6 gate. **Simplicity:** v0 კოდის გარეშე; 0025 ≥10 ოჯახის შემდეგ |
| 16 | **Partner offers ეთიკა** | v1 §2.3: ალტერნატივა 2 უარყოფილი (ინტერესთა კონფლიქტი, GDPR, ადვოკატის referral); Nika: მხოლოდ კონტექსტური, tracking 0, M3 ×40% | Levan: **ბირთვი**, whitelist/blacklist კოდში; Arash: allowlist JSON, hard exclusion, redirect-only, `userId` სვეტი არ არსებობს | **B-ს არქიტექტურა, Nika-ს მოცულობა, v1-ის ეთიკა:** დაშვებულია (D19) *მხოლოდ* კოდის დონის zone-ებით (§2.5) და „არასდროს" ტესტები merge-ის წინაპირობაა. **მაგრამ „ბირთვი" შემოსავლის აზრით არა** — 0 ტრაფიკზე €0; P&L-ში M3 base €3k წ.1. Levan-ის „კონფლიქტი წყდება არქიტექტურით" მიღებულია; „ბირთვი" = ნდობის ბირთვი A, არა M3 |
| 17 | **Turn2us licence ფაქტი** | Nino (02 §5) / Levan (ციტირებს Nino-ს): £100+VAT adviser licence | Nika: turn2us.org.uk 2026 — adviser account უფასოა | **B.** ევიდენსის რიგი: პირდაპირი წყარო > მეორადი ანგარიში. Levan-ის დასკვნა (helper ინდივიდუალური ვერ იქნება ბიზნესი) ორივე ვერსიით ძალაშია |
| 18 | **Migration ნუმერაცია და scope** | v1: 0021 = „ერთადერთი სქემის ცვლილება" (Phase 2), 0022 Phase 3 | Arash: 0021 + `usage_counters`; 0022 + `events`; 0023 subscriptions/org_accounts/memberships/api_keys; 0024 offers; 0025 cases; 0026 drop | **Arash-ის ნუმერაცია რჩება, scope შემცირებული:** 0021 + `usage_counters` + `providerType` + `listingTier` (3 მცირე დამატება ერთ migration-ში — ორი outage-ფანჯრის ნაცვლად ერთი); 0022, 0023 Phase 3; **0024/0025 v0-ში სქემის გარეშე** (JSON + counter; ფორმა + ემაილი), ცხრილი gate-ის შემდეგ. „ერთადერთი" → „ერთადერთი Phase 2-ში" |
| 19 | **Paddle repair დრო** | v1: Phase 3.7 მხოლოდ Helper Pro yes-ზე; Arash: D2=b → Phase 0 | Levan: Phase 2 — Org Pro billing-ს სჭირდება | **Phase 3.7, გარანტირებულად** (არა პირობითად). Levan-ის საჭიროება იხსნება ხელით ინვოისით (`subscriptions.source=manual` `[A §3.4]`) — pilot-ები 3 თვე უფასოა, პირველი ფასიანი Phase 3-ს ემთხვევა |
| 20 | **hreflang / SEO დრო** | v1 cap 6: Phase 4 | Arash C: head injection + hreflang S-ნაწილი 1.8-ში | **B.** S effort, ka/ru long-tail კონკურენცია ≈ 0, ერთადერთი FB-ისგან დამოუკიდებელი არხი; `/:lang` (22 route refactor, L) Phase 4-ში რჩება |
| 21 | **Sponsor** | Nika: არ არის მოდელირებული; M3 base €0 წ.1 | Levan: €10–25k/წ, ერთი მოლაპარაკება = წლის ნახევარი | **EV-ით P&L-ში** (50% წ.2), pitch Phase 2–3, ბინარული სტატუსი ledger-ში; roadmap-ს არ მართავს |
| 22 | **Founder bandwidth Phase 2** | v1: 25 CC-დღე + 10 გიდი; Nika R8: 150 სთ/თვე = მიძინების რეცეპტი (2026-05→09 პრეცედენტი) | Levan L8: 30/40/30 | **6 გიდი Phase 2 (+4 Phase 3); ვერიფიკაციის ზარები pilot-ის სოცმუშაკებზე; L8 მიღებული (D25).** Phase 3 CC-დღე 15 → 18 (billing) |
| 23 | **იურიდიული პირი** | Nika R6: ასოციაცია წ.1 ბოლოს + auto-entrepreneur კომერციულისთვის | Levan L6: ორი პირი (FR ასოციაცია + GE/EE კომპანია) იურისტით | **ეტაპობრივად (D23):** ახლა — ვინც ინვოისს გასცემს; Phase 2 — ასოციაცია; მეორე კომერციული პირი მხოლოდ earned > €20k/წ. იურისტი > €100 = escalation |
| 24 | **Concierge ფასი** | Nika: €200–400 | Levan: €290–900, 3 დონე | **€290 / €590 ორი დონე** Phase 1 ტესტისთვის (მესამე „თანხლება ადგილზე" — არა, founder-დრო); Phase 2-ის ბოლოს F6-ით გადაიხედება |

---

## 11. დანართი

### 11.1. ანგარიშების ინდექსი

v1 §11.1 (01–04) უცვლელი. ემატება:

| ფაილი | ავტორი | 3-ხაზიანი შეჯამება |
|---|---|---|
| `05-financial-analysis.md` | Nika | ხარჯების ბაზა ერთეულის ფასებით (Railway, Haiku, Maps, Paddle) და ფაზებით; abuse worst-case $4,300/თვე; TAM/SAM/SOM 4 სეგმენტზე; M0–M6 ARPU/churn/CAC; 3-წლიანი პროექცია 3 სცენარით (€1k/10k/18k · 11/44/103 · 32/129/333); break-even (infra თვე 4–6, სრული ≈ 30); sensitivity 5 დაშვება; 8 P&L-რისკი; ვერდიქტი: მისიის პროდუქტი, self-sustaining 24–30 თვე ან MVM; 3 ფინანსური KPI. |
| `06-profitable-site-models.md` | Levan | 15 გადამხდელის რუკა CPA-ებით (Wise £10/£50, Lebara £5–40, Lingoda €50–75; ადვოკატის/კლინიკის კომისია FR-ში ილეგალური); 12 comparable (Expatica→Wise, Findhelp, Integreat, Bookimed…); 4 კონცეფცია (A ბირთვი, B B2B, C concierge, D გადავადებული); უფასო/ფასიანი საზღვარი; გვერდი-გვერდ რუკა; `/trust` 8 პუნქტი; პირველი 10 გადამხდელი (€17–46k/12 თვე); 90-დღიანი პარტნიორობები; L1–L8. |
| `07-monetization-architecture.md` | Arash | 6 პრინციპი (entitlement სერვერზე, ერთი plans map, ყველაფერი იზომება/ატრიბუტირდება, golden rule, რას არ ვაშენებთ); `shared/plans.ts` + `requireEntitlement`; Paddle B1–B8 + manual invoice; B2B tenancy (org_accounts, iframe, /api/v1); offers allowlist + redirect-only; concierge module R2/S3 + purge; `usage_counters`; `events` + MRR SQL + impact CSV; SEO head injection/prerender/programmatic; migrations 0021–0026 roadmap-ზე; 10 რისკი; D19/D20 flag. |

### 11.2. ვარაუდები, რომლებიც გავაკეთე

1. v1 §11.2 #1–#6 ძალაშია (მფლობელის 4–6 სთ/კვ ოპერატორული; ≤ 3 სესია; Railway env = OPS სია; რეკრუტინგი 2 კვირაში; mainCategory mapping).
2. **მფლობელს D26 (a)-ს შემთხვევაში ≈ 90 სთ/თვე აქვს** Phase 1-დან, აქედან 30% (≈ 27 სთ) გაყიდვებზე — Levan-ის 10 org/თვე outreach ამას გულისხმობს.
3. ხელით ინვოისი 1.11/2.10/3.9-ისთვის იურიდიულად შესაძლებელია D23-ის მინიმალური ვარიანტით 2 კვირაში — თუ არა, „პირველი ევრო" 4 კვირით გადაიწევს, გეგმის სტრუქტურა არ იცვლება.
4. Paddle-ის `transaction.completed` one-time და B2B manual collection ანგარიშზე ხელმისაწვდომია `[A დანართი — ვერ გადამოწმდა]`; თუ არა — concierge one-time ხელით ინვოისზე რჩება, 3.7-ის scope მცირდება.
5. P&L-ის base კორექტირება (M2 €3k წ.1, M3 €3k წ.1) ჩემი შეფასებაა Levan-ის დიაპაზონების ქვედა ზღვარზე; Nika-ს სცენარები რჩება ორიენტირად, ორივე ცხრილშია.
6. Google Maps lazy-load (2.8) Phase 4-მდე დაასრულებს — სხვაგვარად F1 Phase 4-ის სამიზნე €0.20 მიუღწეველია (+€130/თვე `[N §6]`).

### 11.3. რაც ვერ გადავამოწმე (v1 §11.3 + ახალი)

- v1-ის სია სრულად (Railway env, 0017–0020 სტატუსი, Actions history, live DB რიცხვები, prod URL, Maps rotation, OFPRA, Nino-ს ბაზრის რიცხვები).
- Railway-ის რეალური vCPU/RAM/egress — Nika-ს run-rate `[assumption]`-ია; 0.10 baseline ამას ხურავს.
- MFA დიასპორული გრანტის თანხა; ქართული ოჯახების სამედიცინო fundraising-ის რაოდენობა (M5 SAM ≈ 1,000/წ `[N assumption]`) — 1.11 fake-door პირველი რეალური მონაცემია.
- Paddle ანგარიშის B2B/manual-collection და one-time შესაძლებლობები; Anthropic Admin API ხელმისაწვდომობა; Railway wildcard domain `[A]`.
- Affiliate CPA-ები კონკრეტული ხელშეკრულებებით (Levan-ის რიცხვები საჯარო გვერდებიდანაა); Findhelp/Expatica/Boundless შემოსავლები = მესამე მხარის შეფასება `[L შენიშვნა]`.
- DE MBO-Ä §31 და ISM ინტერპრეტატორის ტარიფი — Levan-ის ცოდნიდან, წყაროს გარეშე.

---
*Tamar · 2026-09-19 · შემდეგი განახლება: Phase 0 closeout (დღე 7, §9 #16) — ფინანსური ხაზით.*
