# GrantKit — Project Map

> **🛑 READ ME FIRST, ALWAYS.** This is the living wide-view of the entire
> project. Any new session (Claude / Cowork / human) must scan this before
> opening a PR, asking the user for setup, or touching schema/env vars.
>
> Last updated: **2026-09-20** — Phase 1 batch B/C: 1.2 hero + integration FAQ, 1.3 onboarding v2, 1.6 France fields + org localisation, 1.9 Privacy rewrite + FROM_EMAIL/ADMIN_NOTIFY_EMAIL, 1.11 `/health-abroad` concierge v0, 1.12 B2B pipeline docs, 1.13 `/trust` + partners registry. Previous: **2026-09-19 (f)** — Phase 1 batch A: 1.4 domains + org filters, 1.5 provenance UI, 1.7 mobile action bar/react-markdown, 1.8 server-rendered SEO head + `/organizations` + 301s, 1.10 audit high 0, report 08 online validation. Previous: **2026-09-19 (e)** — Phase 0.9 single migration mechanism (ADR `adr/0001-migrations.md`; journal 0000–0020; boot-time migrator removed from Dockerfile). Previous: **2026-09-19 (c)** — Phase 0.6 docs single source of truth (stale redesign docs → `_archive/grantkit-redesign/`, CLAUDE.md rules-only, TEAM_ROSTER/WORKFLOW v2, numbers below re-cited to the 2026-05-02 audit) + Phase 0.8 dead-code archive (`_archive/server-core-manus/`, `_archive/server-oneoffs/`, `_archive/pending-imports/`). Previous: **2026-09-19** — MASTER PLAN v2 (finance-driven) + PIVOT.md v2; see integration-pivot/. Previous: **2026-09-18** — integration-pivot diagnostic + master plan added (`.grantkit-redesign/integration-pivot/`); leaked DB credential redacted from AUDIT-CONTINUATION (rotation still required). Previous: **2026-05-04** — Phase 4 data-quality findings closed via Task 2.2 (operator): 13 country fixes + 618 orphan grants linked + 1,245 branches geocoded (94 % success).

---

## 🚦 Quick Status

| Area | State |
|---|---|
| Production URL | https://grantkit-production-06f7.up.railway.app |
| Migrations applied | `0000`–`0016` verified (last direct apply: `0011`, 2026-05-03). `0017`–`0019` applied (indirect evidence — production code uses `orgId`, `geocodedAt`, France columns). See §Scripts → Migrations. |
| Pending migrations | `0020_processed_webhook_events` — **unverified on production** (operator: `node scripts/check-migration-0020.mjs`, PIVOT.md §5). |
| Migration mechanism | **One:** `scripts/apply-migration-XXXX.mjs` by hand, before merge. No boot-time migrator (removed 2026-09-19, Phase 0.9). Journal `0000`–`0020` complete; snapshot `0020` ≡ `schema.ts`. ADR: `.grantkit-redesign/adr/0001-migrations.md`. |
| Active PR | _(none open — #247 merged 2026-09-19)_ |
| Current phase | **Integration pivot — Phase 1 (validation + repositioning + first euro)**; Phase 0 code-complete, 0.2/0.7/0.10 wait on operator; see `PIVOT.md` §3 and `integration-pivot/00-MASTER-PLAN.md` §5. (Contact enrichment Phase B folded into Phase 0.7.) |
| Blocker | _(none — Google Places server key exists as `grantkit-server-geocoding-v2`)_ |

---

## 🗺 Site Map — Public Routes

Defined in `client/src/App.tsx`.

| URL | Component | What users see |
|---|---|---|
| `/` | Home.tsx | Landing page, hero, features, pricing, FAQ |
| `/catalog` | Catalog.tsx | Split view — map + org list with filters |
| `/organizations/:orgId` | OrganizationDetail.tsx | **Primary detail page** — compact map + branches + trust + enrichment |
| `/grant/:id` | ⚠️ **LEGACY** EntityDetail.tsx | Legacy grant detail — only used as fallback |
| `/profile` | Profile.tsx | User profile, subscription status |
| `/dashboard` | Dashboard.tsx | Saved grants, personalized recommendations |
| `/onboarding` | Onboarding.tsx | 3-step signup flow |
| `/admin` | Admin.tsx | Admin panel (stats, users, grants CRUD, import) |
| `/analytics` | Analytics.tsx | Analytics dashboard |
| `/ai-assistant` | AiAssistant.tsx | Standalone AI chat page |
| `/contact` / `/privacy` / `/terms` / `/refund` | Static | Legal & contact |
| `/login` / `/register` / `/verify-email` / `/forgot-password` / `/reset-password` | Auth | Email/password auth |

---

## 🗄 Database — MySQL on Railway

Schema lives in `drizzle/schema.ts`. Tables:

| Table | Purpose | Key columns |
|---|---|---|
| `users` | Auth + profile + Paddle subscription | `openId`, `email`, `role`, `subscriptionStatus`, `targetCountry`, `purposes`, `needs` |
| `grants` | 1,113 grants / 1,102 active (audit 2026-05-02; live numbers → `STATUS.json` when 0.7 lands) | `itemId`, `name`, `category`, `country`, `eligibility`, `amount`, `deadline`, `targetDiagnosis`, `ageRange` |
| `grant_translations` | Multilingual grant content | `grantItemId`, `language`, `name`, `description`, `eligibility` (+ enriched fields) |
| `organizations` | 1,110 orgs · 9 distinct country values in DB (audit 2026-05-02; live numbers → `STATUS.json` when 0.7 lands) | `orgId`, `name`, `country`, `programsCount`, `branchesCount` + enrichment (see below) |
| `organization_branches` | 1 HQ + N branches per org — 1,324 branches (audit 2026-05-02) | `branchId`, `orgId`, `branchType`, lat/lng, `source` |
| ~~`organization_translations`~~ | **Dropped** by migration `0018` (2026-04-25, 0 rows); replaced by `organizations.translations` JSON column | — |
| `organization_housing` | Housing-specific rows (shelters / temporary stays), added by `0018` | `orgId`, housing fields |
| `processed_webhook_events` | Paddle webhook idempotency, added by `0020` (unverified on prod) | `eventId`, `processedAt` |
| `saved_grants` | User bookmarks | `userId`, `grantId` |
| `newsletter_subscribers` | Email list | `email`, `isActive` |
| `notification_history` | Sent email campaigns | `subject`, `grantItemIds`, `recipientCount` |

### `organizations` — enrichment fields

Added via migrations **0015** (accessibility + Google + content) and **0016** (contact provenance):

| Column | Type | Purpose |
|---|---|---|
| `orgLanguages` | text (CSV) | "en,ka,ru" — spoken languages |
| `acceptsUndocumented` | enum | yes / no / case_by_case / unknown |
| `acceptsUninsured` | enum | yes / no / unknown |
| `serviceCost` | enum | free / sliding_scale / paid / insurance / mixed / unknown |
| `appointmentPolicy` | enum | required / walk_in / both / unknown |
| `googleRating` · `googleReviewCount` · `googlePlaceId` | num + string | Google Places signals |
| `missionStatement` · `socialMedia` | text | Mission quote + `{facebook, linkedin, ...}` JSON |
| `phoneSource` · `phoneVerifiedAt` | string + timestamp | Provenance for phone |
| `emailSource` · `emailVerifiedAt` | string + timestamp | Provenance for email |
| `contactFormUrl` | string | Fallback when no public email |
| `contactEnrichmentBatch` | string | `"2026-04-23-001"` for 50/day rollout |
| `contactEnrichmentStatus` | enum | pending / enriched / no_data / failed |

---

## 🔌 tRPC API Endpoints

Defined in `server/routers.ts`. Grouped by router:

| Router | Endpoints |
|---|---|
| `auth` | me, logout, register, login, verifyEmail, forgotPassword, resetPassword |
| `subscription` | status, cancel |
| `grants` | savedList, toggleSave |
| `catalog` | list, detail, count, preview, states, countries, cities, regions, categoryCounts, smartSearch |
| `newsletter` | subscribe, unsubscribe |
| `onboarding` | complete, saveProfile, getProfile, updateProfile |
| `admin` | stats, grantStats, newsletterStats, notificationHistory, exportGrants, sendNewGrantNotification, users, updateRole, updateSubscription, grants, grantDetail, createGrant, updateGrant, updateGrantTranslations, deleteGrant, hardDeleteGrant, parseImport, executeImport, searchExternal, getExternalDetail, importExternal, searchFunders |
| `ai` | grantChat |
| `organizations` | list, detail, count, mapPoints, states, countries, cities, regions, categoryCounts |

---

## 🌐 External APIs

| Service | Env var | What we use |
|---|---|---|
| **Google Places API (New)** | `GOOGLE_MAPS_API_KEY` (local only) | Text Search, Place Details — for batch geocoding + contact enrichment. Key name: `grantkit-server-geocoding-v2`. |
| **Google Maps JS API** | `VITE_GOOGLE_MAPS_BROWSER_KEY` (Railway) | Frontend map rendering |
| **Anthropic API** | `ANTHROPIC_API_KEY` (Railway) | AI Assistant (`ai.grantChat`) |
| **GrantedAI** | `BUILT_IN_FORGE_API_URL` + `BUILT_IN_FORGE_API_KEY` | 84,000+ external grants search |
| **Paddle** | `PADDLE_API_KEY` + `PADDLE_WEBHOOK_SECRET` | Subscription billing |
| **Resend** | `RESEND_API_KEY` | Transactional email + newsletter |
| **Auth (in-house)** | `JWT_SECRET` | Email/password login → JWT cookie (jose) |

---

## 🧩 Key UI Components

Shared across detail pages:

| Component | Used by |
|---|---|
| `GrantDetailHeader` | EntityDetail + OrganizationDetail (sticky top bar) |
| `OrganizationsMap` | Catalog + OrganizationDetail (Google Places-backed) |
| `OrgAiChat` | OrganizationDetail (AI sheet) |
| `MatchSummary` | ⚠️ LEGACY — EntityDetail only |
| `TrustPanel`, `WhoWeHelpCard`, `SocialMediaRow`, `AnimatedNumber` | OrganizationDetail (v2 enrichment UI) |
| `CatalogCard`, `CatalogCardCompact`, `CatalogCardTile` | Catalog list views |
| `GrantGrid`, `GrantList`, `SplitView` | Catalog layouts |
| `MapPanel`, `MapFilterPanel`, `MapStatsBar`, `GrantDetailPanel` | Catalog map drawer |
| `AIChatBox` (base) | GrantAiChat + OrgAiChat + AiAssistant |

Helpers:
- `client/src/lib/orgEnrichment.ts` — parsers + enum→label
- `client/src/lib/grantFocusContext.ts` / `orgFocusContext.ts` — AI system prompts
- `client/src/lib/computeMatch.ts`, `parseList.ts` — ⚠️ LEGACY, EntityDetail only
- `client/src/hooks/useSaveEntity.ts`, `useGeocodedAddress.ts`

---

## ⚙️ Scripts — `scripts/` directory

### 🛠 Migrations
Mechanism (ADR `.grantkit-redesign/adr/0001-migrations.md`, 2026-09-19): `drizzle-kit generate` (dummy `DATABASE_URL`, no DB connection) writes SQL + snapshot + journal entry; the SQL is applied to Railway **by hand, before merge**, with a per-migration apply script. There is no boot-time migrator (`server/migrate.ts` deleted; `Dockerfile` CMD = `node dist/index.js`). `pnpm db:push` is for an empty local DB only.

Each DB migration has both an SQL file and an apply script:
- `drizzle/00XX_*.sql` — the SQL (statements separated by `--> statement-breakpoint`)
- `scripts/apply-migration-00XX.mjs` — applies it to Railway MySQL and records it in `__drizzle_migrations`

Migration files in `drizzle/` (`ls drizzle/*.sql`, 2026-09-19):

| File | Status on Railway |
|---|---|
| `0000`–`0010` | applied |
| `0011_volatile_demogoblin` | applied 2026-05-03 (operator, `apply-migration-0011.mjs`) |
| `0012_mean_kree` … `0016_contact_provenance` | applied |
| `0017_add_orgid_to_grants` | applied (indirect evidence: `backfill-grants-orgid.ts` ran 2026-05-04) |
| `0018_france_schema_and_drop_org_translations` | applied (indirect evidence: France columns served in production) |
| `0019_branches_geocoded_at` | applied (indirect evidence: `geocode-branches.ts --apply` ran 2026-05-04) |
| `0020_processed_webhook_events` | **unverified on production** — `node scripts/check-migration-0020.mjs` (Phase 0.2 / 0.9) |

Journal (`drizzle/meta/_journal.json`) lists `0000`–`0020`; snapshots exist for `0000`–`0008`, `0010`–`0013`, `0020` (gaps are fine for drizzle-kit). Known drift not covered by `schema.ts`: `grants.fk_grants_org` FK (0017) and nullable `organization_housing.createdAt` (0018) — decide in the 0021 PR.

Next numbers are reserved by MASTER-PLAN v2 §5: 0021 Phase 2 · 0022–0023 Phase 3 · 0024–0025 Phase 4 · 0026 later. Gate for 0021 (Phase 0.9) is code-complete; remaining operator step: `check-migration-0020.mjs` on Railway.

### 📥 Data import
- `scripts/import-organizations.ts` — loads orgs from Excel
- `scripts/import-new-grants.ts` — batch grant import with translations
- `scripts/daily-discovery.ts` — LLM-assisted daily discovery (GitHub Action at 08:00 UTC)

### 🔍 Enrichment
- `scripts/geocode-grants.ts` — Google Places batch geocoding (needs `GOOGLE_MAPS_API_KEY` local)
- `scripts/enrich-descriptions.ts` — fill short descriptions via GrantedAI
- `scripts/enrich-metadata.ts` — deadline / process / diagnosis fields
- `scripts/enrich-branches-places.py` — branches via Google Places (Python)
- `scripts/enhance-locations.ts` — address normalization
- _[Coming: `scripts/enrich-org-contacts.ts`]_ — Phase B

### 🌍 Translation
- `scripts/audit-translations.ts`, `scripts/translate-missing.ts` (referenced as `pnpm translate:audit`, `translate:missing`)

### 🔎 Audits
- `scripts/audit-descriptions.ts`, `audit-i18n.ts`, `audit-locations.ts`, `audit-metadata.ts`

### 🧹 Cleanup
- `scripts/cleanup-deadlines.ts`, `reset-bad-geocodes.ts`, `find-bad-country-rows.mjs`, `fix-country.ts`, `normalize-country-codes.ts`

### 🗂 Historical (DO NOT TOUCH)
- `scripts/stage1-*.cjs`, `stage2-*.cjs` — one-off city/amount backfills from past batches

---

## 🔑 Infrastructure

### Railway (primary)
- **Service:** `grantkit` — backend + frontend bundled
- **MySQL plugin:** in the same project
- **Auto-deploy:** on push to `main`
- **URL:** `grantkit-production-06f7.up.railway.app`
- **Env vars on Railway:** `DATABASE_URL`, `ANTHROPIC_API_KEY`, `NODE_ENV`, `PORT`, `RAILWAY_PUBLIC_DOMAIN`, `VITE_GOOGLE_MAPS_BROWSER_KEY`, `VITE_GOOGLE_MAPS_MAP_ID`

### Vercel (secondary / preview)
- Used for PR previews only
- `vercel.json` exists but Railway is primary

### Google Cloud — "My Project 30040"
- **Browser key:** `Maps Platform API Key` — HTTP referrer restricted, on Railway
- **Server key:** `grantkit-server-geocoding-v2` — IP-unrestricted, **NOT on Railway** (operator exports locally when running batch scripts)
- **APIs enabled:** Maps JavaScript API, Places API (New), Geocoding API

See `.grantkit-redesign/OPS.md` for full operational details.

---

## 🚫 Constraints

### Frozen files (🚫 DO NOT TOUCH)
- _(none — `Catalog.tsx` un-frozen 2026-05-02 per audit PR #194; see CLAUDE.md historical note)_

### Legacy files (⚠️ do not extend, new features go elsewhere)
- `client/src/pages/EntityDetail.tsx` — `/grant/:id` (extend OrganizationDetail instead)
- `client/src/components/GrantAiChat.tsx`
- `client/src/components/GrantDetailSkeleton.tsx`
- `client/src/components/grant/MatchSummary.tsx`
- `client/src/lib/computeMatch.ts`
- `client/src/lib/parseList.ts`

### Migration golden rule
1. Open a PR with schema change + migration SQL + apply script
2. Run migration on Railway **BEFORE merging** (via `node scripts/apply-migration-XXXX.mjs` or Cowork)
3. Verify columns exist
4. Only then merge
5. Breaking this rule = production outage (it happened 2026-04-22, PR #145)

### Anti-hallucination rule (for scrapers / enrichment)
- **LLM only extracts, never generates.** Output must be a substring of input HTML.
- **Structured APIs first** (Google Places JSON).
- **NULL, not fiction** when data is missing.
- **Every fact gets provenance** (`*Source` + `*VerifiedAt` columns).

---

## 📝 Session Log — append on session end

_Each session appends a 3-line summary so the next session knows what was done and what's live/blocked._

- **2026-04-22** — Grant + Org detail redesigns merged (PR #142, #143, #146, #148, #150, #151, #153). Schema v2 + contact provenance applied to Railway. Blocked briefly by a migration-after-code mistake → reverted → re-applied in the right order.
- **2026-04-23** — Project Map created. Ready to start Phase B (contact enrichment script).
- **2026-04-24** — Fire drill #2: Wave 1 merge (PR #160) deleted 8 detail-page files; PR #162 tried to restore them but the GitHub merge resolution (commit 72c926f) dropped the restored paths — only `package.json` landed in main. Railway builds from 05:49 → 20:29 all failed with `ENOENT: GrantDetailHeader`. Fix PR re-restores the 8 files via `git checkout af283e1 --`. Lesson: when a "restore" branch is based on a pre-deletion commit and the target `main` has the deletion, GitHub's default merge will keep the deletion — must rebase the restore branch onto current main first, or explicitly `git checkout <files>` on main.
- **2026-05-03** — Audit blitz: PRs #210/#211/#212/#214/#216 shipped (bundle −78%, self-hosted fonts, dropped eval, Express 4→5). Operator ran `apply-migration-0011.mjs --apply` against Railway proxy — closed the 6-month-old `users` table drift (8 auth columns + 3 indexes added, schema.ts and DB now in sync through 0011). Email/password auth, lockout, password reset, brute-force protection now functional on production. Last DB migration on Railway: `0011_volatile_demogoblin`.
- **2026-05-04** — Phase 9 closeout + Phase 4 closeout. Sandbox: PR #218 (Lighthouse baseline), #219 (lazy AIChatBox), #220 (verification re-baseline), #221 (lazy MapPanel), #222 draft (bundle-graph verification). Operator (Task 2.2): `fix-country-codes.ts --apply` (13 rows), `backfill-grants-orgid.ts` (618 grants linked), `geocode-branches.ts --apply --force` (1,245/1,324 branches geocoded, 94 % — re-geocoded entire DB rather than just 84 missing because of `--force` flag). Live data: 1,102 active grants, 752 linked to orgs (68 %, was 12 %). Discovered side-finding: ~30 organizations with garbage names (Georgian spreadsheet headers misimported) — tracked as Tier 2 cleanup. Both Google Maps keys leaked to chat during diagnosis — flagged for rotation.

---
- **2026-09-18** — Integration-pivot planning session (4 parallel specialist agents + 1 manager): `.grantkit-redesign/integration-pivot/` — `00-MASTER-PLAN.md` (definition, positioning, consolidated diagnostic, 5-phase roadmap with done-when, agent team, KPIs, 18 owner decisions) + reports 01–04. Verified `pnpm check` 0 errors / `pnpm test` 201/202 / `pnpm build` OK / `pnpm audit --prod` 57 vuln (0 critical). **P0 found:** production MySQL root password was committed in `AUDIT-CONTINUATION-2026-05-03.md` → redacted in PR #247, value still in git history → operator must rotate (OPS.md §Secret rotation) + both Google Maps keys; Paddle webhook fail-closed while `PADDLE_WEBHOOK_SECRET` absent from documented Railway env and migration 0020 unverified. Note: the `subscription` router's `activate` procedure no longer exists (removed 2026-05-12) — the tRPC list then in CLAUDE.md was stale (removed in 0.6). Blocking owner decisions: D1 paywall, D2 billing, D3 history rewrite, D5 beachhead, D6 status question (plan §8). Docs-only PR: #247 (draft).
- **2026-09-19** — PR #247 merged by owner. Added `.grantkit-redesign/PIVOT.md` (strategy + status + owner-decision log + operator P0 list + agent protocol) and pointers in `CLAUDE.md` / this file so every future session sees the integration-pivot plan. Current phase set to Integration pivot — Phase 0. Owner decisions D1–D6 and secret rotation still pending.
- **2026-09-19 (c)** — Phase 0.6 (Ilias, docs single source of truth): 28 stale planning files (`STATE.md`, `todo.md`, roadmaps, diagnostics, inventories, `wave1-pr2/`, `.pptx`) → `_archive/grantkit-redesign/` (README there); `.grantkit-redesign/` now holds 6 `.md` + `integration-pivot/`; `CLAUDE.md` rules-only (tRPC list, phase progress, hard-coded counts removed); `TEAM_ROSTER.md` / `WORKFLOW.md` rewritten from MASTER-PLAN v2 §6; DB numbers here re-cited to the 2026-05-02 audit; `deferred-issues.md` folded into the list at the bottom. `_archive/` un-ignored in `.gitignore`. Kept in place because scripts read them: `geocode-checkpoint.json`, `location-audit-report.json`. Note: `pnpm audit:locations` still writes `location-audit-report.md` into `.grantkit-redesign/` (7th .md if re-run).
- **2026-09-19 (d)** — Phase 0.8 (Ilias, dead-code archive, move only): `server/_core/{imageGeneration,voiceTranscription,dataApi,map,llm}.ts` (0 importers in server/client/shared/scripts) → `_archive/server-core-manus/`; 13 `server/*.mjs|cjs` one-offs (not referenced by package.json, Dockerfile, workflows or imports) → `_archive/server-oneoffs/`; all 60 `pending-imports/*` (last commit ≤ 2026-05-12) → `_archive/pending-imports/`, `pending-imports/.gitkeep` kept because `daily-discovery.ts` writes and `daily-discovery.yml` reads `discovery-*.json` there. `scripts/stage*.cjs` untouched. Verified: `pnpm check` 0 errors · `pnpm build` OK · `pnpm test` 201 passed / 1 skipped.
- **2026-09-19 (b)** — Finance-driven transformation: PRs #249 (reports 05 financial analysis, 06 profitable-site models, 07 monetization architecture) + this PR (`00-MASTER-PLAN.md` **v2**, v1 archived to `integration-pivot/archive/`, `PIVOT.md` v2). Verdict: $9/mo B2C cannot work; model = free ka/ru navigator + org-sold Org Pro/Institutional + ring-fenced `/health-abroad` concierge + partner offers behind code-level no-monetization zones; grants = runway. Helper Pro individual dropped. New financial P0: public `smartSearch` abuse exposure (cache + 10/min). 26 owner decisions, 9 blocking (D26 horizon first).
- **2026-09-19 (e)** — Phase 0.9 (Mira, single migration mechanism): ADR `adr/0001-migrations.md`; `_journal.json` extended 0014–0020 (`when` = SQL commit time, strictly increasing); `0020_snapshot.json` generated from `schema.ts` (`drizzle-kit generate` now reports no changes); `--> statement-breakpoint` added to 0018/0019; `server/migrate.ts` + `dist/migrate.js` build step + Dockerfile `COPY drizzle` removed, CMD = `node dist/index.js`. Verified: `drizzle-kit check` clean, `readMigrationFiles` 21 entries / single-statement chunks, check 0 errors, tests 210 passed, build OK. Left for operator: fresh-DB `drizzle-kit migrate` run + `check-migration-0020.mjs` on Railway. Batch 1 (PR #251) merged by owner 13:31 UTC.
- **2026-09-19 (f)** — Phase 1 batch A (4 worktree agents): **1.4** `shared/domains.ts` (11 domains, category/mainCategory/need mapping, `NEVER_MONETIZE` export) + `organizations.list`/`mapPoints` inputs `domain, language, serviceCost, acceptsUndocumented, acceptsUninsured, appointmentPolicy` + CatalogToolbar filters (France `mainCategory` values unknown in repo → operator: `SELECT mainCategory, COUNT(*) FROM organizations GROUP BY 1`); **1.5** `lib/orgTrust.ts`, ProvenanceLine, WhoWeHelpCard known-rows-only, TrustPanel rating only ≥5 reviews, disclaimer + error mailto; **1.7** sticky Call/Directions/Website bar, network vs 404 states, `navigator.language` autodetect, `streamdown`→`react-markdown` (assets 448→51); **1.8** `server/seoHead.ts` (title/description/canonical/og/hreflang×5 `?lang=`/JSON-LD, LRU 10 min), `server/seoRoutes.ts` 301 `/catalog`→`/organizations`, `/grant/:id`→`/organizations/:orgId`, static sitemap.xml deleted, `pnpm check:sitemap`; **1.10** audit high 15→0 (drizzle-orm 0.45, mysql2 3.24, overrides); **08-online-validation.md** replaces 1.1 interviews (owner decision). vitest now runs `shared/` and `client/src` tests (jsdom opt-in). Verified: check 0, tests 261, build OK, drizzle-kit check clean. Follow-ups: ~21 in-app links still `/catalog`; org `<h1>` `text-white` invisible in light theme; SEO.tsx/JsonLd.tsx client defaults still say grants (1.2).
- **2026-09-20** — Phase 1 batch B/C (6 worktree agents): **1.2** country-first hero with live FR count, 7-question integration FAQ ×5, ka/ru vocabulary pass, `/catalog`→`/organizations` links, neutral SEO defaults, org `<h1>` colour fix; **1.3** onboarding v2 (country → city+language → status *client-only* → 11 domains; `OnboardingModal` removed; Dashboard = `organizations.list` per top domain; last `|| "643"` gone); **1.6** `organization_housing` JOIN in `getOrganizationDetail` + HousingCard/ServicesOffered/TargetAudience cards + `translations[lang]` localisation; **1.9** `FROM_EMAIL`/`ADMIN_NOTIFY_EMAIL` env + `notifyAdmin()`, Privacy rewritten ×5 (legal basis, retention, no analytics cookies, link to `/trust`); **1.11** `/health-abroad` v0 — static page ka/ru/en, `concierge.intake` (zod, email only, never touches the DB, 20 req/min), linked only from the health domain context, noindex, `reports/finance/ledger.md`; **1.12** `reports/finance/{pipeline,pitch-one-pager,loi-template}.md` (10 orgs, weighted €0 until real outreach); **1.13** `/trust` ×5 + `content/offers/partners.json` (4 entries, tracking URLs never rendered, contract test). New tRPC: `concierge.intake`; `organizations.count({country})`; `organizations.detail` now returns `housing` + `translations`. New routes: `/trust`, `/health-abroad`.

## 🔎 How to use this file

- **New session:** read top-to-bottom before touching anything.
- **Before asking the user for setup:** ctrl-F the service name here first.
- **Before opening a PR:** check the Constraints section.
- **After shipping a PR:** append to Session Log + bump "Last updated".

---

## ⏸ Deferred (from 2026-04)

Folded from `deferred-issues.md` (Jonas, Phase 8, 2026-04-19; file archived 2026-09-19). Status notes are from the 2026-09 diagnostic (`integration-pivot/03-tech-diagnostic.md` §5).

| # | Item | Status 2026-09 |
|---|---|---|
| D1 | Static catalog bundle (`client/src/data/catalogData.ts`) inflating main bundle (632 KB gzip) | **Stale** — `catalogData` is lazy-loaded; build 2026-09-18 = 563 KB gzip (03-tech §5). Close. |
| D2 | Lighthouse performance not measurable in sandbox; add Lighthouse CI | Baseline taken 2026-05-04 (`audit-reports/09-lighthouse-*`); CI job still not added. |
| D3 | SSR meta tags for non-JS social crawlers (`react-helmet-async` only) | Open — becomes MASTER-PLAN v2 1.8 (`server/seoHead.ts`, Mira). |
| D4 | `MapPanel.tsx` cluster bubbles lack `aria-label` | Open, P3 (~2 h). |
| D5 | `SEO.tsx` emits no `hreflang`; needs language-prefixed routes first | Open — part of the pivot's ka/ru-first routing (Phase 1 UI). |
