# Diagnostic — დაწყებული, მაგრამ დაუსრულებელი მიმართულებები

> **შექმნილია:** 2026-04-25 | **ბაზა:** main @ `234ba4c` + `.grantkit-redesign/*` + git branches
> **მიზანი:** რა არის რეალურად დაწყებული + გასაშვები ბოლომდე. ფაქტი ფაქტისა.

---

## TL;DR — 4 ცოცხალი მიმართულება

| # | მიმართულება | სტატუსი | რა აკლია |
|---|---|---|---|
| 1 | Phase 2 — `DROP organization_translations` (ერთი ნაბიჯი) | 🟡 ცარიელი ცხრილი ცოცხალი schema-ში | migration `0018` |
| 2 | Contact Enrichment Phase B | 🟡 script ready, batch არ გაშვებული | 50/დღე batch + monitoring |
| 3 | France Import (Wave 2) | 🔴 არ დაწყებული | Excel + migration + script (JSON translations) |
| 4 | Q5 — Resend DNS + `FROM_EMAIL=hello@grantkit.com` | 🔴 არ დაწყებული | DNS + `emailService.ts:69` |
| 5 | Q2 — URL rename + 301 redirects | 🔴 არ დაწყებული | App.tsx routes + Express middleware |

დამატებით: **დოკუმენტაცია stale** — `MASTER-ROADMAP-2026-04-25.md`, `todo.md`, `STATE.md` ფაქტობრივ რეალობას ვერ ასახავს.

---

## 1. Phase 2 — გადაწყვეტა: ARCHIVED, ერთი ნაბიჯი დარჩა

**კვლევის დასკვნა (2026-04-25):** Phase 2-ის სრული 5-PR sequence (EXECUTION-PLAN.md) **არ არის საჭირო**. user-facing problem-ს არ წყვეტს, რეალური რისკი (R2: production outage) აქვს.

### რა გაკეთდა (✅, „phantom infrastructure")
- PR#1 — `grants.orgId` NULLABLE column + FK + index (`drizzle/0017`)
- PR#2 — backfill script (`scripts/backfill-grants-orgid.ts`)
- 0 user-facing ცვლილება. frontend არცერთი კომპონენტი არ კითხულობს `grants.orgId`-ს.

### რა დარჩა (✅ მცირე, რეკომენდებული)
**`DROP TABLE organization_translations`** — ცარიელი (0 row), მკვდარი (0 reader/writer ვერიფიცირებული codebase-ში). 1-ხაზიანი migration, ნული რისკი.

### რა გაუქმდა (❌ ცანცელ)
- ~~PR#3 (NOT NULL + drop grants.organization/phone/email/lat/lng/address)~~ — 7 frontend კომპონენტი ეყრდნობა, server JOIN refactor საჭირო, არცერთ user bug-ს არ წყვეტს
- ~~PR#4 (RENAME grants → programs)~~ — წმინდა cosmetic
- ~~PR#5 (DELETE catalog.*)~~ — 4 page-ის refactor ნული user-სარგებლისთვის

`grants.orgId` ცარიელ NULLABLE სვეტად რჩება — ცოცხალი outage-რისკი არ არის.

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

**Translation strategy:** Phase 2 ARCHIVED-ის შემდეგ თარგმანები JSON სვეტად ინახება `organizations.translations`-ში (`{en: {...}, fr: {...}}`). ცალკე `organization_translations` ცხრილი არ გვჭირდება — France-ის migration-ის pre-step-ად DROP TABLE იყოს.

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
| `STATE.md` | ბოლო ცვლილება 2026-04-20 (Phase 8.5.A2 🟡 In progress); 5 დღე ჩუმად. Phase 2 / Wave 1 / France არ ფიგურირებს. | append: Phase 8.5.A2 დასრულდა / Phase 2 ARCHIVED |
| `DIAGNOSTIC-2026-04-23.md` | 2 დღით ძველი | OK (ისტორიული ჩანაწერი) |

---

## 7. რეკომენდებული თანმიმდევრობა

```
დღე 1 — Contact Enrichment batch start:
  • cron / GitHub Action: 50 orgs/day
  • monitoring report ცხრილი

დღე 2-4 — France Import:
  • Excel upload data/-ში
  • migration 0018: org extensions + organization_housing + DROP organization_translations
  • organizations.translations JSON სვეტი
  • import-france-orgs.ts + dry-run + apply
  • UI (HousingCard, badges, i18n 5 ენაში)

დღე 1-4 (parallel) — Q5 + Q2:
  • Q5: Resend DNS instructions → მომხმარებელი → FROM_EMAIL=hello@grantkit.com
  • Q2: Express 301 redirects + /organizations list route + sitemap regen
```

---

## 8. ბლოკერები + გადაწყვეტის საჭირო წერტილები

1. **France schema strategy** — `organizations.translations` JSON column (Phase 2-ის გვერდის ავლა). HANDOFF brief-ი გადასაწერია ამ approach-ით.
2. **`MASTER-ROADMAP` updated** — Phase 2 ARCHIVED-ი მონიშნულია; ძველი action-ები აქტიური აღარ არის.
3. **Backfill verification (cosmetic)** — `grants.orgId` 535/637 row-ით ცარიელი NULLABLE-ად რჩება, არცერთ funcionality-ს არ აზიანებს.

---

*Phase 2 დახურულია. ცოცხალი 4 მიმართულება: Contact Enrichment, France Import, Q5 Resend DNS, Q2 URL redirects.*
