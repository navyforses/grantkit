# PIVOT.md — GrantKit → ემიგრანტების ინტეგრაციის ნავიგატორი, რომელიც თავს ირჩენს

> **🛑 ეს ფაილი ყოველ სესიაში იკითხება** (`CLAUDE.md` → `PROJECT_MAP.md` → **`PIVOT.md`**).
> სტრატეგიის და სტატუსის **ერთადერთი მოკლე წყარო**. სრული გეგმა: **[`integration-pivot/00-MASTER-PLAN.md`](./integration-pivot/00-MASTER-PLAN.md)** (დაიწყე §0 TL;DR + §0.1 „რა შეიცვალა", შემდეგ §2 ფინანსური ბირთვი, §5 ფაზა, §6 persona). ფინანსური საფუძველი: `05-financial-analysis.md` (Nika), `06-profitable-site-models.md` (Levan), `07-monetization-architecture.md` (Arash).
>
> v2: 2026-09-19 (v1 არქივირებულია `integration-pivot/archive/00-MASTER-PLAN-v1.md`-ში) — მფლობელის კითხვაზე „არის თუ არა ეს მომგებიანი და როგორ დავაპროგრამოთ მომგებიანად" პასუხის შემდეგ. განაახლე ყოველი ფაზის closeout-ზე და ყოველი გადაწყვეტილებისას.

---

## 1. რას ვაშენებთ (განმარტება)

GrantKit ემიგრანტს ეხმარება ინტეგრაციაში იმით, რომ **ამცირებს მისი ძიების, ორიენტაციისა და ნდობის ხარჯს**: მის ენაზე, სტატუსისა და ეტაპის მიხედვით აჩვენებს (ა) რომელი ორგანიზაცია მიიღებს მას *რეალურად*, (ბ) როგორ გაიაროს პროცედურა, (გ) რა გააკეთოს პირველ 30 დღეში. პლატფორმა ამბობს „*ვინ დაგეხმარება და როგორ მიხვიდე მასთან*". **ემიგრანტისთვის ყველაფერი უფასოა და ასეც დარჩება.**

**არ აკეთებს:** იურიდიულ/სამედიცინო **რჩევას** და წარმომადგენლობას; თერაპიას, ენის სწავლებას, ბინის მინიჭებას; AI-რჩევას ადამიანური escalation-ის გარეშე; **კლინიკის/ექიმის/ადვოკატის კომისიას** (FR-ში ილეგალურია); პარტნიორის ჩვენებას სტატუსის, გადაუდებელი ჯანდაცვის, ფსიქიკური ჯანმრთელობის, უსაფრთხოებისა და გადაუდებელი თავშესაფრის თემებზე — **კოდი ამას ტექნიკურად ვერ დაუშვებს**.

**აკეთებს (v2-ში ახალი, D19/D20-ის yes-ზე):** ring-fenced `/health-abroad` ქვე-ბრენდში ოჯახის მიერ გადახდილ *ინფორმაციულ ნავიგაციასა და ლოგისტიკას*; ორგანიზაციისთვის ka/ru ფენას (claim, რედაქტირება, QR/A4); კონტექსტურ პარტნიორ-შეთავაზებას მხოლოდ კომოდიტიზებულ ნაბიჯებზე (SIM, ბანკი/გზავნილი, თარგმანი, ენა), დისკლოზურითა და უფასო ალტერნატივით. დეტალი: MASTER-PLAN v2 §1.2.

## 2. პოზიციონირება და მოდელი — მომგებიანი საიტის განმარტება

- **ვისთვის:** ქართველი და რუსულენოვანი ემიგრანტი, ჯერ საფრანგეთში (ვალიდაცია + reference implementation), შემდეგ ES/DE/US. US სამედიცინო = `health` ვერტიკალი. **შუამავალი (სოცმუშაკი) = მომხმარებელი; ორგანიზაცია = მყიდველი.**
- **რა:** „ინტეგრაციის ნავიგატორი" — ორგანიზაციები „შემიძლია თუ არა?" სიგნალებით + პროცედურები + „პირველი 30 დღე", მომხმარებლის ენაზე. 11 დომენი უცვლელი (§1.3 v1) — და **დომენი არის მონეტიზაციის საზღვრის ერთეულიც**.
- **პატიოსანი ვერდიქტი:** $9/თვე B2C ვერასდროს იქნება მომგებიანი (€1k/თვე = SAM-ის 19% ყოველთვიურად აქტიური). ბაზარი უფასოა და სახელმწიფო/ფონდების ფულით ცხოვრობს. GrantKit არის **self-sustaining მისიის პროდუქტი + founder-salary** (€3–5k/თვე 24–30 თვეში, ≥3 წყარო, არცერთი > 50%), არა venture-ბიზნესი. base P&L: €16k → €52k → €105k (earned €11k → €37k → €75k); break-even infra თვე 4–6, სრული (მფლობელის დროით) თვე ≈ 30.
- **ვინ იხდის (არასდროს ემიგრანტი):** (1) **ორგანიზაცია/ინსტიტუტი** — Org Pro €300–900/წ, Institutional €2–6k/წ, helper account უფასო; (2) **ოჯახი** — `/health-abroad` concierge €290/€590; (3) **პარტნიორი/სპონსორი** — CPA whitelist-დომენებში, Pro listing კომერციული პროვაიდერისთვის €30–90/თვე, ერთი სპონსორი/ქვეყანა. **გრანტები = runway, არა შემოსავალი** (ცალკე ხაზი).
- **ამოღებული:** Helper Pro ინდივიდუალური გამოწერა (Turn2us-ის adviser account უფასოა); $9 B2C; AdSense; ადვოკატის CPA; კლინიკის კომისია.
- **უფასო/ფასიანი საზღვარი:** უფასო = დირექტორია, სიგნალები, გიდები, ჩეკლისტი, რუკა, AI (20/დღე), share/print, helper account, NGO listing + claim (base), health-abroad self-service. ფასიანი = org-ის ka/ru ფენა და ინსტრუმენტები, concierge, კომერციული Pro listing, პარტნიორ-ბლოკი, sponsor. `ENTITLEMENTS.free` snapshot test იცავს: „ემიგრანტისთვის არაფერი იკეტება". სრული ცხრილი და გვერდი-გვერდ რუკა: MASTER-PLAN v2 §2.4–2.6.

## 3. სად ვართ ახლა

| | |
|---|---|
| **მიმდინარე ფაზა** | **Phase 0 — ჰიგიენა და P0, ფინანსური P0-ს ჩათვლით** (კვირა 1–2). დაწყებული 2026-09-19. |
| **დასრულებული** | დიაგნოსტიკა + კვლევა + გეგმა v1 (PR #247); ფინანსური ანალიზი + მომგებიანი საიტის მოდელი + მონეტიზაციის არქიტექტურა + **MASTER PLAN v2** (2026-09-19); leaked პაროლის ტექსტი დოკუმენტიდან ამოღებულია (history-ში რჩება). |
| **შემოსავალი / ხარჯი** | €0 / ≈ €25 infra + მფლობელის დრო. Abuse-ექსპოზიცია: `smartSearch` საჯარო, cache 0 → $4,300/თვე ერთი IP-დან (0.5 ხურავს). |
| **შემდეგი ფაზა** | Phase 1 — ვალიდაცია + რეპოზიციონირება + **პირველი ევრო** (კვირა 2–4). Gate: Phase 0-ის 10 done-when ✓ + D26, D1–D3 პასუხები. Milestone: ≥1 გადამხდელი ოჯახი, ≥3 B2B საუბარი, `/trust` live. |
| **ბლოკერი** | §4-ის 9 ⛔ გადაწყვეტილება (D26 პირველი) და §5-ის ოპერატორის P0. |

ფაზების სრული ცხრილი შემოსავლის milestone-ებით: MASTER-PLAN v2 §5. უახლოესი 7 დღე: §9.

## 4. გადაწყვეტილებები მფლობელისგან

> ⛔ = ბლოკავს Phase 0/1-ს. **პასუხი ჩაწერე „პასუხი" სვეტში და თარიღი.** სრული სია (26) და არგუმენტაცია: MASTER-PLAN v2 §8. „შეიცვალა" = v1-ის რეკომენდაცია v2-ში სხვაა.

| ID | გადაწყვეტილება | რეკომენდაცია | **პასუხი** | თარიღი |
|---|---|---|---|---|
| **D26 ⛔** | ჰორიზონტი: self-sustaining (24–30 თვე, ≈ 90 სთ/თვე) თუ minimum viable maintenance (€30/თვე, 4 სთ/კვ)? | (a) self-sustaining, თუ დრო რეალურად არის; სხვაგვარად (b) — პატიოსანი არჩევანი | _(ცარიელი)_ | |
| **D1 ⛔** (შეიცვალა) | Paywall + ვინ იხდის | (a) უფასო B2C + **org-sold** + concierge + partner/sponsor; Helper Pro ინდივიდუალური ამოღებული | _(ცარიელი)_ | |
| **D2 ⛔** (შეიცვალა) | Billing ახლა | (a) pause B2C checkout; **repair Phase 3.7** concierge one-time + org billing-ისთვის; მანამდე ინვოისი ხელით | _(ცარიელი)_ | |
| **D3 ⛔** | Leaked პაროლი: history rewrite? | (a) rewrite თუ private და collaborator ≤ 3; rotation ორივეში | _(ცარიელი)_ | |
| **D5 ⛔** | Beachhead ქართველები FR (ka/ru); US medical = ვერტიკალი | (a) კი | _(ცარიელი)_ | |
| **D6 ⛔** | სტატუსი onboarding-ში client-only, სერვერზე არასდროს | (a) — offers-ის სტატუს-გეითინგიც ამაზეა | _(ცარიელი)_ | |
| **D19 ⛔** | პარტნიორ-შეთავაზებები საიტზე? | (a) კი — კოდში allowlist + hard exclusion + სტატუს-გეითინგი + `/trust` + redirect-only | _(ცარიელი)_ | |
| **D20 ⛔** | Health-abroad concierge + საზღვრის გადაწერა | (a) ring-fenced ქვე-ბრენდი, ოჯახის მიერ გადახდილი, კომისია 0, v0 კოდის გარეშე, module ≥10 ოჯახის შემდეგ | _(ცარიელი)_ | |
| **D23 ⛔** | იურიდიული პირი | (a) ახლა — ვინც ინვოისს გასცემს; Phase 2 — association loi 1901; მეორე კომერციული პირი მხოლოდ earned > €20k/წ | _(ცარიელი)_ | |
| D17 (შეიცვალა) | სამედიცინო მოტივი სამიზნე? | (a) მარკეტინგში არა; პროდუქტში ring-fenced `/health-abroad` | _(ცარიელი)_ | |
| D21, D22, D24, D25 | Sponsor / listing-ის გადამხდელი / მონაცემთა ლიცენზია / 30-40-30 | (a) ყველაზე — MASTER-PLAN v2 §8 | _(ცარიელი)_ | |
| D4, D7–D16, D18 | უცვლელი v1-დან | იხ. MASTER-PLAN v2 §8 | | |

## 5. ოპერატორის P0 მოქმედებები (ხელით, Claude ვერ გააკეთებს)

- [ ] Railway → MySQL → root პაროლის reset. `OPS.md` §Secret rotation.
- [ ] GCP → ორივე Google Maps გასაღების regenerate; Railway `VITE_GOOGLE_MAPS_BROWSER_KEY` განახლება.
- [ ] Railway env: არის თუ არა `PADDLE_WEBHOOK_SECRET`; `node scripts/check-migration-0020.mjs` — output PROJECT_MAP-ში (3.7-ის წინაპირობა).
- [ ] D26 + 8 ⛔ პასუხი §4-ში (D26 პირველი).
- [ ] `GOOGLE_MAPS_API_KEY` (ახალი server key) → GitHub Secrets.
- [ ] **ფინანსური:** Umami cloud account (cookieless) → `VITE_ANALYTICS_*` Railway-ზე; Railway usage alert + GCP budget alert $50/თვე; Railway რეალური vCPU/RAM/egress და Anthropic 30-დღიანი usage → `reports/finance/2026-09-baseline.md` (რიცხვები, არა გასაღებები).
- [ ] **D19/D20/D23-ის შემდეგ:** Wise/Remitly/Lebara/Lingoda affiliate account-ები (self-serve); მინიმალური იურიდიული პირი ინვოისისთვის; 2 ka FB ჯგუფში concierge v0 პოსტი.

## 6. აგენტის პროტოკოლი ამ pivot-ზე მუშაობისას

1. წაიკითხე: `KARPATHY_GUIDELINES.md` → `CLAUDE.md` → `PROJECT_MAP.md` → `OPS.md` → **ეს ფაილი** → `integration-pivot/00-MASTER-PLAN.md` §5 (მიმდინარე ფაზა) + §6 (შენი persona და რას **არ** ეხები).
2. აიღე ერთი deliverable, შეასრულე „done when", output PR body-ში.
3. წესები: სქემის ცვლილება = ცალკე PR, migration Railway-ზე **merge-მდე**; PR ≤ 300 ხაზი; „refactor while here" აკრძალულია; ≤ 3 ღია PR.
4. **No-monetization-zone წესი:** პარტნიორის, Pro badge-ის ან ფასიანი CTA-ს **ნებისმიერი** რენდერი გადის `server/offers/placement.ts`-ის `selectOffers()`-ზე და `content/offers-allowlist.json`-ზე. `legal_status`, `health` (გადაუდებელი/უფასო კლინიკა/asylum-დაზღვევა), `mental_health`, `safety_rights`, `housing.emergency_shelter`, `family_children.women_gbv`, NGO/საჯარო org-გვერდი, print ვერსია, AI chat, `commercial: false` გიდი, client-სტატუსი `asylum_seeker|undocumented` → **0 offer, allowlist-ის მიუხედავად.** ამ „არასდროს" ტესტების გარეშე მონეტიზაციის PR არ merge-დება; allowlist-ში დომენის დამატება = მფლობელის escalation; `server/offers/*` review = Salomé + Mira.
5. **ფინანსური წესი:** ფასის ცვლილება, ახალი მონეტიზაციის ზედაპირი, პარტნიორის ხელშეკრულება, გრანტის განაცხადი → მფლობელი. `reports/finance/ledger.md`-ში PII არასდროს. AI/API/Places-ის ყოველი ახალი გამოძახება `usage_counters`-ით (Phase 2-დან) ან LRU + rate-limit-ით (Phase 0–1).
6. სესიის ბოლოს: `PROJECT_MAP.md` Session Log 3 ხაზი + ამ ფაილის §3, თუ ფაზა/ბლოკერი/შემოსავალი შეიცვალა.
7. Escalation მხოლოდ: ფული/ფასი, ბრენდი, იურიდიული ექსპოზიცია, სვეტის/ცხრილის წაშლა, >100 რიგის deactivate, history rewrite, ახალი ქვეყანა/ენა, გარე ხარჯი > €100, **allowlist/ზედაპირი/პარტნიორი/გრანტი (წესი 4–5)**.

## 7. სტატუსის ჟურნალი (append-only)

- **2026-09-19** — PIVOT.md შექმნილია. Phase 0 იწყება; D1–D6 პასუხის მოლოდინში; P0 ოპერატორის მოქმედებები ღიაა.
- **2026-09-19 (v2)** — ფინანსური ანალიზი (Nika), მომგებიანი საიტის მოდელი (Levan), მონეტიზაციის არქიტექტურა (Arash) მიღებულია; **MASTER PLAN v2** ცვლის v1-ს. მოდელი: უფასო ნავიგატორი + org-sold + concierge + partner/sponsor; გრანტები = runway; Helper Pro ინდივიდუალური ამოღებული. `smartSearch` abuse = ფინანსური P0. ⛔ 5 → 9 (D26, D19, D20, D23 ახალი). გუნდს ემატება Levan, Nika, Salomé. Phase 0 შემოსავალი €0 (ნორმალურია), ხარჯის ჭერი < €50/თვე.
- **2026-09-19 (Phase 0 batch 1)** — PR #251: 0.1 credentials purge + OPS env names + D3 runbook (Maps browser key also found in Lighthouse reports, redacted); 0.3 CI (`ci.yml`, scripts typecheck 0 errors, create-temp-admin fixed); 0.5 smartSearch LRU + 10/min, sameSite lax, json 2 MB; 0.4 fabricated trust signals removed, live counts, 10 ka fixes; 0.6 docs SSOT (28 docs archived, CLAUDE.md rules-only, TEAM_ROSTER/WORKFLOW v2); 0.8 Manus modules + 13 one-offs + 60 pending-imports archived. Pending: 0.2 (D1/D2), 0.7/0.10 (operator secrets), 0.9 (draft). Owner: branch protection on `main` (check/test/build), D26 + 8 ⛔.
- **2026-09-19 (Phase 0.9)** — PR #251 merge-და (მფლობელი, 13:31 UTC). Migration მექანიზმი ერთია: ADR `adr/0001-migrations.md`; journal 0000–0020; snapshot 0020 ≡ schema.ts; boot-time migrator ამოღებულია (Dockerfile CMD = `node dist/index.js`). Gate 0021-ისთვის კოდის მხრივ გავლილია; ოპერატორს რჩება `check-migration-0020.mjs` Railway-ზე. Phase 0-დან დარჩენილი: 0.2 (D1/D2 პასუხის შემდეგ), 0.7 (`GOOGLE_MAPS_API_KEY` GitHub Secrets), 0.10 (Umami + finance baseline).
