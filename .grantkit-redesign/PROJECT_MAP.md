# GrantKit — Project Map

> **🛑 READ ME FIRST, ALWAYS.** This is the living wide-view of the entire
> project. Any new session (Claude / Cowork / human) must scan this before
> opening a PR, asking the user for setup, or touching schema/env vars.
>
> Last updated: **2026-04-24** — fire drill #2 (re-restore 8 files after PR #162 merge resolution dropped them).

---

## 🚦 Quick Status

| Area | State |
|---|---|
| Production URL | https://grantkit-production-06f7.up.railway.app |
| Last migration on DB | `0016_contact_provenance` ✅ |
| Pending migrations | _(none)_ |
| Active PR | _(none open)_ |
| Current phase | **Contact enrichment — Phase B (scraping script)** |
| Blocker | _(none — Google Places server key exists as `grantkit-server-geocoding-v2`)_ |

---

## 🗺 Site Map — Public Routes

Defined in `client/src/App.tsx`.

| URL | Component | What users see |
|---|---|---|
| `/` | Home.tsx | Landing page, hero, features, pricing, FAQ |
| `/catalog` | 🚫 **FROZEN** Catalog.tsx | Split view — map + org list with filters |
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
| `grants` | 643+ grants/resources | `itemId`, `name`, `category`, `country`, `eligibility`, `amount`, `deadline`, `targetDiagnosis`, `ageRange` |
| `grant_translations` | Multilingual grant content | `grantItemId`, `language`, `name`, `description`, `eligibility` (+ enriched fields) |
| `organizations` | **790 orgs** across 29 countries | `orgId`, `name`, `country`, `programsCount`, `branchesCount` + enrichment (see below) |
| `organization_branches` | 1 HQ + N branches per org | `branchId`, `orgId`, `branchType`, lat/lng, `source` |
| `organization_translations` | Multilingual org content (new) | `orgId`, `language`, `name`, `description`, `missionStatement` |
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
| `subscription` | status, cancel, activate |
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
Each DB migration has both an SQL file and an apply script:
- `drizzle/00XX_*.sql` — the SQL
- `scripts/apply-migration-00XX.mjs` — applies it to Railway MySQL

Current migrations 0000–0016 are all applied to Railway.

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
- `client/src/pages/Catalog.tsx`

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

---

## 🔎 How to use this file

- **New session:** read top-to-bottom before touching anything.
- **Before asking the user for setup:** ctrl-F the service name here first.
- **Before opening a PR:** check the Constraints section.
- **After shipping a PR:** append to Session Log + bump "Last updated".
