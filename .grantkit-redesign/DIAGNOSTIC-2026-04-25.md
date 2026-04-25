# Diagnostic — დაწყებული, მაგრამ დაუსრულებელი მიმართულებები

> **შექმნილია:** 2026-04-25 | **ბაზა:** main @ `234ba4c` + `.grantkit-redesign/*` + git branches
> **მიზანი:** რა არის რეალურად დაწყებული + გასაშვები ბოლომდე. ფაქტი ფაქტისა.

---

## TL;DR — 5 ცოცხალი მიმართულება, რეალური სტატუსი

| # | მიმართულება | სტატუსი | რა აკლია |
|---|---|---|---|
| 1 | Phase 2 — Org-centric migration (5-PR sequence) | 🟡 2/5 ship | PR#3, PR#4, PR#5 |
| 2 | Contact Enrichment Phase B | 🟡 script ready, batch არ გაშვებული | 50/დღე batch + monitoring |
| 3 | France Import (Wave 2) | 🔴 არ დაწყებული | Excel + migration 0018 + script |
| 4 | Q5 — Resend DNS + `FROM_EMAIL=hello@grantkit.com` | 🔴 არ დაწყებული | DNS + `emailService.ts:69` |
| 5 | Q2 — URL rename + 301 redirects | 🔴 არ დაწყებული | App.tsx routes + Express middleware |

დამატებით: **დოკუმენტაცია stale** — `MASTER-ROADMAP-2026-04-25.md`, `todo.md`, `STATE.md` ფაქტობრივ რეალობას ვერ ასახავს.

---

## 1. Phase 2 — Org-Centric Migration (EXECUTION-PLAN.md)

**წყარო:** `.grantkit-redesign/EXECUTION-PLAN.md` — 7/7 გადაწყვეტილება დადასტურებულია მომხმარებლის მიერ.

### რა შერეულია main-ში (✅)

| PR | ფაქტი | მტკიცებულება |
|---|---|---|
| **PR#1** — `orgId` column + FK + index | ✅ schema-ში | `drizzle/schema.ts:99` (`grants.orgId nullable`), `drizzle/0017_add_orgid_to_grants.sql`, `scripts/apply-migration-0017.mjs` |
| **PR#2** — backfill script | ✅ script main-ში | `scripts/backfill-grants-orgid.ts`, `pnpm backfill:orgid:dry` package.json-ში |

⚠️ **გაუარკვეველი:** PR#2 backfill რეალურად **გაიშვა** Railway-ის ბაზაზე? STATE.md-ში 2026-04-20-ის შემდეგ ჩანაწერი არ არის. ცხრილში `SELECT COUNT(orgId) FROM grants` უნდა გადამოწმდეს.

### რა აკლია (❌)

#### PR#3 — NOT NULL + drop dup columns + drop org_translations
**არცერთი ფაილი არ არსებობს:**
- migration `0018_*.sql` — არა
- `scripts/convert-orphan-grants-to-orgs.mjs` — არა
- schema-ში ჯერ ისევ:
  - `grants.organization`, `grants.phone`, `grants.email`, `grants.hqAddress` (დუბლიკატი)
  - `grants.latitude`, `grants.longitude`, `grants.address` (Q7 — 558 დუბლიკატი)
  - `organization_translations` ცხრილი (`schema.ts:283`, ცარიელი)
- `grants.orgId` ჯერ ისევ `nullable` (`schema.ts:99`)

**რისკი:** 🟠 ყველაზე აგრესიული PR. სტეიჯინგზე ტესტი + rollback-ი აუცილებელია.

#### PR#4 — RENAME `grants` → `programs`
- ცხრილი schema-ში ისევ `grants` ჰქვია
- `grant_translations` → `program_translations` — არ შეცვლილა
- VIEW (gradual migration) — არ შექმნილა

#### PR#5 — DELETE `catalog.*` namespace + rewire
- `server/routers.ts:321` — `catalog: router({ ... })` ისევ ცოცხალია
- 9 catalog endpoint ისევ მოქმედი
- frontend rewire (Home.tsx, Dashboard.tsx, EntityDetail.tsx) — არ შეცვლილა

---

## 2. Contact Enrichment Phase B

**PROJECT_MAP.md ამბობს:** "Current phase: Contact enrichment — Phase B (scraping script)"

### რა გაკეთდა (✅)
- Schema (PR #153, #155, migration 0015 + 0016) — Railway-ზე
- `scripts/enrich-org-contacts.ts` — **460 ხაზი, არა stub** (commit `4d4f757`)
  - Google Places (New) — Text Search → Place Details
  - Website regex scraping (domain-validated, anti-hallucination)
  - Provenance: `phoneSource`, `phoneVerifiedAt`, `emailSource`, `emailVerifiedAt`
  - CLI: `--dry-run`, `--limit=N`, `--batch-id=YYYY-MM-DD-NNN`, `--force`
- pnpm scripts: `enrich:contacts`, `enrich:contacts:dry`, `enrich:contacts:limit10`

### რა აკლია (❌)
- 50 ორგ/დღე batch run — **არ გაშვებულა** (DB-ში `contactEnrichmentBatch` უცარიელო რიგების არსებობა გადასამოწმებელია)
- Monitoring/report ციკლი
- სქედულერი (cron ან GitHub Action — Daily Discovery-ის მსგავსი)

⚠️ **`MASTER-ROADMAP-2026-04-25.md` ცდება:** ამბობს „scraper script ჯერ არ შექმნილა" — სინამდვილეში main-ში 460-ხაზიანი სრული script-ი დევს.

---

## 3. France Import (Wave 2 / HANDOFF-claude-code-wave1.md)

**HANDOFF brief:** `.grantkit-redesign/HANDOFF-claude-code-wave1.md` — დეტალური (PR1.1 + PR1.2) — შექმნილი 2026-04-24, **არცერთი ნაბიჯი არ შესრულებულა**.

### რა აკლია (❌ — ყველაფერი)
| ნაკადი | სტატუსი | მდებარეობა |
|---|---|---|
| Excel ფაილი | ❌ არ აქვს | `data/France_Emigration_Organizations_5_Languages.xlsx` (`data/`-ში არ არის) |
| Migration 0018 | ❌ არ შექმნილა | `drizzle/0018_org_extensions_and_housing.sql` |
| Apply script | ❌ | `scripts/apply-migration-0018.mjs` |
| Schema ცვლილება | ❌ | `abbreviation`, `organizationType`, `servicesOffered`, `targetAudience`, `emigrationPurpose`, `foundedYear`, `legalStatus`, `mainCategory`, `isNational` — schema-ში არცერთი |
| `organization_housing` ცხრილი | ❌ არ აქვს | 102 housing რიგისთვის |
| Import script | ❌ არ შექმნილა | `scripts/import-france-orgs.ts` |
| UI (HousingCard, badges) + i18n | ❌ Wave 3 | depending on PR1.1+1.2 |

⚠️ **კონფლიქტი Phase 2-თან:** France-ი იყენებს `organization_translations`-ს, რომელსაც PR#3 წაშლის. **რიგი:** ჯერ Phase 2-ის PR#3, მერე France (ან ცალკე გადაწყვეტა — JSON სვეტი organizations-ში).

---

## 4. Q5 — Resend DNS + Branded Email

**EXECUTION-PLAN.md Task #45**

### ფაქტი
```
server/emailService.ts:69
const FROM_EMAIL = "onboarding@resend.dev"; // Resend default sender for testing
```

### რა აკლია
- Resend Dashboard-ში domain verification (4 DNS record)
- მომხმარებლის მიერ DNS-ის დამატება (GoDaddy/Cloudflare/...)
- `FROM_EMAIL = "hello@grantkit.com"` ცვლილება
- ტესტ email — verified

**ბლოკერი:** მომხმარებელი + `OPS.md`-ში DNS instructions საჭიროა.

---

## 5. Q2 — URL Rename + 301 Redirects

**EXECUTION-PLAN.md Task #46** — Q2 დადასტურებული, არ implementing.

### ფაქტი
```
client/src/App.tsx:57   <Route path="/catalog" component={Catalog} />          ← unchanged
client/src/App.tsx:58   <Route path="/grant/:id" component={EntityDetail} />   ← unchanged
client/src/App.tsx:69   <Route path="/organizations/:orgId" ...                ← detail only, list missing
```
**`server/_core/index.ts`-ში** `app.get("/catalog", ...)` ან `redirect 301` — **არცერთი match არ არის.**

### რა აკლია
- `/organizations` (list page) route — არ აქვს
- Express redirect: `/catalog` → `/organizations`, `/grant/:id` → `/organization/:id`
- `sitemap.xml` regen
- Google Search Console — submit

---

## 6. დოკუმენტაცია — Stale

| ფაილი | პრობლემა | რჩევა |
|---|---|---|
| `MASTER-ROADMAP-2026-04-25.md` | ამბობს branch A (`claude/contact-enrichment-schema`, 24K ხაზი) და B (`feat/catalog-organizations-data-source`, 1.7K) main-ში არ შერეულა. სინამდვილეში **ორივე 0 ahead, 18-72 behind** — სრულად შერეულია/ჩამორჩა. | წაშლა ან განახლება Phase 2-ის რეალური მდგომარეობით |
| `todo.md` | "Phase 1: Onboarding + Dashboard + Smart Search" `[ ]` ცარიელად — სინამდვილეში CLAUDE.md ყველაფერ ✅-ით აღნიშნავს. ყველა გრანტის ნომერი 3,650+ ცდება (PROJECT_MAP: 643). | წაშლა ან cyclic update |
| `STATE.md` | ბოლო ცვლილება 2026-04-20 (Phase 8.5.A2 🟡 In progress); 5 დღე ჩუმად. Phase 2 / Wave 1 / France არ ფიგურირებს. | append: Phase 8.5.A2 დასრულდა / Phase 2 PR#1+#2 ship |
| `DIAGNOSTIC-2026-04-23.md` | 2 დღით ძველი | OK (ისტორიული ჩანაწერი) |

---

## 7. რეკომენდებული თანმიმდევრობა

```
დღე 1 — verify-and-update:
  • Railway-ზე გადამოწმდე: SELECT COUNT(orgId IS NOT NULL) FROM grants → PR#2 backfill rate
  • STATE.md + todo.md + MASTER-ROADMAP — სინქი რეალობასთან

დღე 2-3 — Phase 2 დასრულება:
  • PR#3 (NOT NULL + drop columns + drop org_translations) — 6 სთ
  • migration 0018 Railway-ზე
  • PR#4 (RENAME grants → programs) — 4 სთ + VIEW backward-compat
  • PR#5 (DELETE catalog.*) — 4 სთ + rewire 4-5 frontend ფაილი

დღე 4 — Contact Enrichment batch:
  • cron / GitHub Action: 50 orgs/day
  • monitoring report ცხრილი

დღე 5-7 — France:
  • Excel upload data/-ში
  • migration 0018b (post-Phase 2 rename)
  • import-france-orgs.ts + dry-run + apply
  • UI Wave 3 (HousingCard, badges, i18n)

დღე 4 (parallel) — Q5 + Q2:
  • Resend DNS instructions → მომხმარებელი
  • Express redirects + sitemap regen
```

---

## 8. ბლოკერები + გადაწყვეტის საჭირო წერტილები

1. **PR#3 აგრესიულია** — სტეიჯინგ DB-ზე ტესტი ან production backup სანამ აპლაიდი ექნება. (R2 EXECUTION-PLAN.md-დან.)
2. **France vs Phase 2 ჩარჩო** — France-ის HANDOFF იყენებს `organization_translations`-ს რომელსაც PR#3 ხსნის. გადაწყვეტა საჭირო:
   - **ვარიანტი A:** ჯერ Phase 2 PR#3, მერე France ცარიელი org_translations-ის ხელახლა შექმნით
   - **ვარიანტი B:** ჯერ Phase 2 PR#3, France იყენებს `organizations.translations` JSON სვეტს
3. **Backfill verification** — სანამ PR#3 NOT NULL დადგება, 100% backfill საჭიროა. 102 orphan-ი → ORG-9001..9102 (PR#3 step 1).
4. **MASTER-ROADMAP-ი ცდება ფაქტებში** — მოწოდებული შემდგომი action-ები ნაწილობრივ უსარგებლოა, რადგან branches უკვე main-შია.

---

*ცოცხალი მიმართულება სამივე საფეხურზე ცხადია. რეკომენდაცია: ჯერ Phase 2 ბოლომდე (3 PR), მერე France (Wave 2), Contact Enrichment ცალკე background-ში.*
