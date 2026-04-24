# ORG-CENTRIC REDESIGN — მეხსიერების ფაილი

> **კრიტიკული:** ყოველი აგენტი, ვინც GrantKit-ის Phase 2-ზე (Org-centric
> pivot) მუშაობს, ვალდებულია ეს ფაილი წაიკითხოს **პირველად**, სანამ
> რაიმე ცვლილებას გააკეთებს. სესიის დასრულებისას — განახლება აუცილებელია.

**შექმნის თარიღი:** 2026-04-23
**ბოლო განახლება:** 2026-04-23 (მომხმარებელმა დაადასტურა 7/7 გადაწყვეტილება, Wave 1 გასაშვებად მზადაა)
**პროექტის ფაზა:** 🟢 დიაგნოსტიკა დასრულებული (A→E). მომხმარებელმა დაამტკიცა გეგმა. **Wave 1 გაშვება ნებადართულია.**
**წინა ფაზის სტატუსი:** ✅ Phase 1 complete (Map redesign, STATE.md-ში)

> **🎯 EXECUTION-PLAN.md** არის ახლა ყველაზე მნიშვნელოვანი ფაილი ამ ფოლდერში —
> ყოველი Phase 2-ის აგენტმა ვალდებულია ის წაიკითხოს ამ ფაილის შემდეგ, პირველივე task-ის
> დაწყებამდე.

---

## 1. 🎯 სტრატეგიული გადაწყვეტილება (2026-04-23)

**რა შეიცვალა:** GrantKit გადადის **გრანტ-ცენტრული** მოდელიდან
**ორგანიზაცია-ცენტრულ** მოდელზე.

### მომხმარებლის ფორმულირება (ციტატა)
> „გრანტს გამოაცხადებს თუ არა ეგ არის მუდმივი მონიტორინგის საგანი,
> ამიტომ მინდა რომ ორგანიზაციები დარჩეს მხოლოდ რომლის შესახებ იქნება
> დაწერილი ემიგრანტისათვის საინტერესო ინფორმაცია... ეს საიტი არ არის
> მხოლოდ გრანტებზე."

### ძირითადი აზრი
- **საიტის ძირითადი ერთეული = ორგანიზაცია** (არა გრანტი)
- **გრანტი = ორგანიზაციის ერთ-ერთი აქტივობა** (მოხსენიებული აღწერაში)
- **სამიზნე აუდიტორია = ემიგრანტები** რომლებიც ახალ ქვეყანაში რესურსებს
  ეძებენ (არა grant-seekers ფინანსური ფონდიდან)

### ორგანიზაციის კარდინალური ველები (Product requirements)
მომხმარებლის პირდაპირი სია:
1. **სახელი**
2. **საკონტაქტო ინფორმაცია** (ემაილი, ტელეფონი, ვებსაიტი)
3. **აღწერა:** რას აკეთებს, მისია, რა სახის აქტივობები
4. **მისამართი** (ძირითადი ოფისი)
5. **რუკა** — ლოკაციის ვიზუალიზაცია
6. **Google Maps rating + reviews** (თუ არსებობს)
7. **ფილიალების მისამართები** — თითოეულზე კლიკი → რუკაზე jump
8. **საბუთების მოთხოვნა** (ითხოვს თუ არა, რას კონკრეტულად)

---

## 2. 📊 დიაგნოსტიკის შედეგები (Phase A/B/C)

### 2.1. ბაზები
- **Railway MySQL** — ერთადერთი ცოცხალი ბაზა, 10 ცხრილი (5 აქტიური)
- **Supabase** — სრულად მკვდარი (SDK ამოღებული Phase R1-ში, მხოლოდ 3 SQL ფაილი + env vars-ი დარჩენილი, არასდროს deploy-ი)

### 2.2. ძირითადი რიცხვები
| ერთეული | რაოდენობა | კომენტარი |
|---|---|---|
| ორგანიზაციები (organizations) | 538 | აქტიური |
| გრანტები (grants) | 637 | აქტიური |
| ფილიალები (organization_branches) | 790 | map marker-ების წყარო |
| მომხმარებლები (users) | 0 | ცარიელი |
| გრანტის თარგმანი (grant_translations) | ~2500 | 4 ენა × 629 |
| ორგ. თარგმანი (organization_translations) | 0 | **უსაფრთხოდ წასაშლელი** |

### 2.3. მონაცემების ხარისხის პრობლემები
- **102 orphan გრანტი** — ორგანიზაციასთან არ არის დაკავშირებული
- **63 orphan ორგანიზაცია** — არცერთი გრანტი არ აქვს
- **4 დუბლიკატი ორგ. სახელი** (რჩევა: dedup)
- **558 grant-branch კოორდინატის დუბლიკატი** (ერთიდაიგივე მისამართი ორჯერ ინახება: grants ცხრილში და branches-ში)
- **grants.organization** free-text ველია — არ არის FK ბმული organizations.id-თან

### 2.4. კოდის დუბლიკაცია
- **`catalog.*` და `organizations.*` tRPC namespace-ები** — 99% იდენტური კოდი (9 endpoint × 2)
- **`Catalog.tsx`** (frozen) — **უკვე 90%-ით მიგრირებულია `organizations.*`-ზე** (მხოლოდ 1 ხაზი `catalog.count`, ხაზი 508)
- **`catalog.*` live-consumers:** Home.tsx (preview + count), Dashboard.tsx (list + count), EntityDetail.tsx (detail)

---

## 3. 👥 გუნდი — Phase 2 Org-Centric Redesign

6 named პერსონა, დაალაგებული wave-ის მიხედვით:

### Wave 1 (parallel)
- **🎯 Ezra** — Product Architect (Ex-Airbnb migrants team)
  - Skills: `problem-reframer`, `site-architect`, `persona-forge`
  - Deliverable: `PRD.md`, `USER_FLOWS.md`
  - Philosophy: "ემიგრანტი უცხო ქვეყანაში ვერ ეძებს გრანტს. ის ეძებს ორგანიზაციას, ვინც დაეხმარება."

- **🗄️ Tamar** — Data Architect (Senior MySQL + Drizzle, 8 წლიანი)
  - Skills: `engineering:system-design`, `data:sql-queries`, `data:data-validation`
  - Deliverable: `drizzle/0010_org_centric.sql`, migration apply scripts
  - Philosophy: "Schema ცვლილება სამუდამოა. დუბლიკატი ველების წაშლა ჯერ ფორმულდეს, მერე migration."

### Wave 2 (parallel, after Wave 1)
- **🔗 Noa** — Integrations Engineer (Ex-Google Maps Platform team)
  - Skills: `workflow-connector`, `mvp-architect`
  - Deliverable: `server/placesClient.ts`, `scripts/enrich-places-reviews.ts`
  - Philosophy: "რუკაზე კლიკი უნდა გრძნობდეს instant. API latency-ი მომხმარებელს არ ეხება."

- **🎨 Kwame** — Frontend Engineer (Principal, React 19 + TailwindCSS 4)
  - Skills: `engineering:code-review`, `responsive-polish`, `conversion-craft`
  - Deliverable: გადაწერილი `OrganizationDetail.tsx`, responsive mobile layout
  - Philosophy: "Detail page-ი ითარგმნება conversion-ად. Home-ი მხოლოდ მიყვანა."

- **✍️ Lila** — Content Strategist + Native Translator (5 ენა)
  - Skills: `marketing:content-creation`, `native-translator`, `data-context-extractor`
  - Deliverable: `scripts/enrich-organizations.ts`, `scripts/translate-organizations.ts`
  - Philosophy: "ცუდი აღწერა უარესია ვიდრე არავითარი. 2-3 აბზაცი, რომელიც ემიგრანტს კონკრეტულად ეუბნება რას მიიღებს."

### Wave 3 (after Waves 1+2)
- **🚀 Ilias** — Release & QA Engineer (Ex-Vercel DX, CLAUDE.md-ის golden rule guardian)
  - Skills: `operations:change-management`, `engineering:deploy-checklist`, `engineering:testing-strategy`
  - Deliverable: `DEPLOYMENT_PLAN.md`, `ROLLBACK_RUNBOOK.md`, Playwright/vitest tests
  - Philosophy: "Migration ბაზაზე წინ უყოფს merge-ს. ყოველთვის. გამონაკლისის გარეშე."

---

## 4. 🗺️ Roadmap (3 Wave × ~3 დღე)

### Wave 1 (დღე 1-3) — Foundation
- Ezra: PRD + user flows + sitemap
- Tamar: schema diff-ი + 3-PR migration plan (org.id FK, dedup, drop dup cols)

### Wave 2 (დღე 4-7) — Build
- Noa: Google Places integration (rating + reviews + place_id per branch)
- Kwame: `OrganizationDetail.tsx` re-write (hero, mission, services, contact, docs, branches → map)
- Lila: 538 ორგანიზაციის description/mission/activities/docs ველების AI-enrichment, მერე 5 ენაზე თარგმანი

### Wave 3 (დღე 8-10) — Ship
- Ilias: staging deploy → smoke test → production rollout → post-deploy validation

### დასრულების კრიტერიუმი
- 538/538 ორგანიზაციას აქვს სრული (description + mission + activities + docs)
- ყოველ ფილიალზე კლიკი რუკაზე jump-ს აკეთებს
- Google rating + review count ნაჩვენებია (თუ არსებობს)
- `catalog.*` namespace ამოღებულია
- `organization_translations` ცხრილი dropped
- pre-deploy + post-deploy validation ✅

---

## 5. 🚫 მუდმივი წესები (CLAUDE.md + ამ პროექტის სპეციფიკა)

### ყოველ აგენტს სავალდებულო
1. **DB migration ჯერ, კოდი მერე** — არასდროს merge schema.ts ცვლილება სანამ migration Railway-ზე არ გაიშვა (PR #145-ის მსხვერპლი)
2. **pnpm-ი მხოლოდ** — არასდროს npm ან yarn
3. **tRPC URL: `/api/trpc`** — relative, არ შეცვალო
4. **ENV vars** — `server/_core/env.ts`-დან `ENV` object-ით
5. **Catalog.tsx FROZEN** — ცვლილების საჭიროებისას მომხმარებლის ცალსახა ნებართვა

### Phase 2-ის სპეციფიკა
6. **`organization_translations` ცხრილი უსაფრთხოდ dropped** — 0 endpoint-ი
7. **`catalog.*` namespace deprecated** — ახალი კოდი მხოლოდ `organizations.*`
8. **`EntityDetail.tsx` → `OrganizationDetail.tsx` migration** — backwards-compat wrapper Ezra/Kwame-ს შორის სინქრონიზება
9. **Google Places API key** — უკვე არსებობს backend-ზე (`.grantkit-redesign/OPS.md`-ს წაიკითხე ჯერ)
10. **Railway MySQL URL** — public endpoint-ი უკვე დოკუმენტირებულია OPS.md-ში

---

## 6. 📂 დელივერების ინდექსი (`.grantkit-redesign/`)

### Phase 2 (ახალი)
- `ORG-CENTRIC-MEMORY.md` ← ეს ფაილი (master context)
- **`EXECUTION-PLAN.md`** ← 🎯 WAVE 1 GASASHVAD MZADAA — ყოველი აგენტის მეორე წაკითხვა
- `DIAGNOSTIC-2026-04-23.md` — Phase A: DB inventory (Railway + Supabase) ✅
- `DATA_MAP.md` — Phase B: tRPC endpoint map (57 endpoint × 10 namespace) ✅
- `FRONTEND_MAP.md` — Phase C: გვერდი × endpoint მატრიცა ✅
- `INFRASTRUCTURE_MAP.md` — Phase D: scripts (20 live + 12 standalone + 32 archived), CRON (daily-discovery.yml), 7 external API, MCP servers, 10-item risk register ✅
- `CONSOLIDATION-PROPOSAL.md` — Phase E: org + programs model design, 5-PR migration sequence, 3-wave 7-10 day timeline, cost projection, 7 open questions for user ✅

### Phase 1 (ისტორია, არ შეხო)
- `STATE.md` — Phase 1 master state (Map redesign, dasrulebuli 2026-04-19)
- `TEAM_ROSTER.md` — Phase 1 team (Mira, Dmitri, Yuki, Luca, Priya, Arash, Sofia, Kenji, Amina, Jonas) + Phase 2 appendix
- `WORKFLOW.md` — Agent protocol (ორივე ფაზისთვის ვალიდური)

### Supporting (reference)
- `OPS.md` — ოპერატორის runbook (API keys, Railway config, რა გაკეთდა უკვე)
- `supabase-inventory.md` — Supabase-ის სტატუსის დეტალური რეპორტი (Phase R1)
- `r1-cleanup-report.md` — Supabase SDK removal report
- `schema-inventory.md` — drizzle schema sattribute list
- `location-audit-report.md` — geocoding audit (790 vs 538 mystery resolved)

---

## 7. ⏸️ ღია საკითხები / დაუდასტურებელი

### მომხმარებლის გადაწყვეტილებები — 7/7 RESOLVED ✅
ყველა კითხვა პასუხგაცემულია 2026-04-23-ზე. დეტალი: `EXECUTION-PLAN.md §1`.
- [x] Q1: 63 orphan org → შენარჩუნდეს, იმავე 8 ველით
- [x] Q2: URL გადარქმევა → **კი, 301 redirect-ით** (ვარიანტი B)
- [x] Q3: Catalog.tsx exemption → **ნებართვა გაცემული** (1 ხაზი 508)
- [x] Q4: grants → programs რენეიმინგი → **კი**
- [x] Q5: Resend DNS → მომხმარებელი ხელით + ჩვენი ინსტრუქცია (ვარიანტი A)
- [x] Q6: Newsletter org-centric scope → **გადავიდეს**
- [x] Q7: 558 coord duplicate → **PR#3-ში, ერთად** (ვარიანტი A)

### ოპერაციული
- [ ] MapStatsBar.tsx + Catalog.tsx count-label fix-ის commit + push (sandbox git OneDrive-ზე არ მუშაობს — მომხმარებლის მოქმედებაა)
- [ ] Railway redeploy verification (PR #156 merged, ORG-0129 ჯერ 200 აბრუნებს)

### გუნდზე
- [ ] მომხმარებლის დადასტურება გუნდის კომპოზიციაზე (6 persons: Ezra, Tamar, Noa, Kwame, Lila, Ilias) — implicit approved დღეს
- [ ] SEO სპეციალისტი საჭიროა თუ არა?
- [ ] Analytics სპეციალისტი საჭიროა?

### დასრულებული (ისტორიული მითითებისთვის)
- [x] Phase D დაწერა (scripts + CRON + APIs) → `INFRASTRUCTURE_MAP.md`
- [x] Phase E დაწერა (consolidation proposal) → `CONSOLIDATION-PROPOSAL.md`
- [x] Execution plan → `EXECUTION-PLAN.md` (2026-04-23)

---

## 8. 🔄 ბოლო სესიის ცვლილებები

**2026-04-23 (Wave 1 kickoff) — Hana:**
- მომხმარებელმა დაადასტურა 7/7 გადაწყვეტილება (Q1-Q7)
- სამი რეკომენდაცია მიღებულია: Q2→B (URL rename + 301), Q5→A (user does DNS), Q7→A (cleanup in PR#3)
- შეიქმნა `EXECUTION-PLAN.md` — master execution plan cross-chat consumption-ისთვის
- TaskList განახლდა: 12 ახალი task (#35-#46) Wave 1/2/3 + cross-cutting-ისთვის, dependency blocks მითითებული
- Wave 1 გასაშვებად მზადაა: #35 (Ezra) + #36 (Tamar) + #45 (DNS) paralelurad

**2026-04-23 (გაგრძელება) — Hana:**
- Phase D დაწერა: `INFRASTRUCTURE_MAP.md` (~500 ხაზი) — 20 ცოცხალი სკრიპტი + 12 standalone + 32 archived, ერთი GitHub Actions cron (daily-discovery.yml), 7 გარე API კატალოგი, .mcp.json inventory, PR #145 incident retrospective, 10-punkt risk register, Phase 2 persona-per-deliverable matrix
- Phase E დაწერა: `CONSOLIDATION-PROPOSAL.md` (~500 ხაზი) — before/after ASCII data model, 5-PR migration sequence (add nullable → backfill → NOT NULL + drop dupes + drop organization_translations → rename to programs w/ VIEW → delete catalog.*), 3-wave 7-10 day rollout, 14-punkt Definition of Done, ~$44 + $5/mo cost projection, 60 dev-hours, 7 ღია კითხვა მომხმარებლისთვის
- ORG-CENTRIC-MEMORY.md §6, §7, §8, §9 განახლდა

**2026-04-23 (დასაწყისი) — Hana:**
- დიაგნოსტიკა: Phase A/B/C სრულად დოკუმენტირებული
- სტრატეგიული pivot ფორმალიზებული (org-centric)
- 6-პიროვანი გუნდი შედგენილი
- Roadmap 3-wave-ად დაგეგმილი
- ამ memory file-ის შექმნა

**წინა სესიები (2026-04-22 → 04-16):**
- Phase 1 (Map redesign) — STATE.md-ში დოკუმენტირებული
- Location audit, org enrichment (538 ორგ), Phase R1 Supabase cleanup

---

## 9. შემდეგი ნაბიჯის ანკერი

მომხმარებელმა დაადასტურა გეგმა 2026-04-23-ზე. Wave 1 გასაშვებად მზადაა.

თუ სესია აქ წყდება, მომდევნო აგენტმა უნდა:
1. წაიკითხოს `CLAUDE.md` (golden rule — migration Railway-ზე JER)
2. წაიკითხოს ეს ფაილი (`ORG-CENTRIC-MEMORY.md`)
3. წაიკითხოს **`EXECUTION-PLAN.md`** (PR-by-PR ნაბიჯები, DoD, რისკები)
4. წაიკითხოს `OPS.md` (API keys, Railway URL)
5. `TaskList`-ს გადახედოს, ამოიღოს პირველი pending task (blocked არ არის):
   - #35 (Ezra / PRD) ← Wave 1-ში parallel
   - #36 (Tamar / PR#1) ← Wave 1-ში parallel
   - #45 (DNS instructions) ← parallel, cross-cutting
6. Agent-ი თავის persona-ს სრულად შეერიცხოს (TEAM_ROSTER.md-ის Phase 2 Team ნაწილი)
7. სესიის ბოლოს: ამ ფაილის §7 + §8 განახლება სავალდებულოა

**კრიტიკული შეხსენებები:**
- Phase D/E უკვე დასრულებულია. არ გააგრძელო თავიდან.
- 7 კითხვა უკვე პასუხგაცემულია. არ სცადო მომხმარებელს თავიდან ჰკითხო.
- Wave 2/3 დაწყება აკრძალულია სანამ Wave 1 (PR#1..#5) დასრულდება.

---

*შექმნილი Hana-ს მიერ, 2026-04-23. master context for Phase 2 Org-Centric Redesign.*
*განახლდა Hana-ს მიერ 2026-04-23 Phase D + E დასრულების შემდეგ.*
