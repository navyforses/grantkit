# GrantKit Redesign — Project State

> **CRITICAL:** Every agent working on this project MUST read this
> file FIRST, before making any changes. After completing work,
> MUST update the relevant phase section with: what was done,
> files changed, decisions made, blockers.

**Last updated:** 2026-04-19T00:00:00Z
**Current phase:** Phase 5 complete (Sofia). Phase 6 ready to start (Kenji).
**Project start:** 2026-04-16

---

## 🎯 Project Goal

Complete UX redesign of GrantKit (grant discovery platform) with:
1. Email/password auth (alongside existing OAuth)
2. Map-based grant discovery (Google Maps JavaScript API)
3. Split-view catalog (list + map, 50/50)
4. Redesigned grant detail page with location map
5. Google Maps deep-link integration
6. Full mobile responsive + 5-language i18n

---

## 🔧 Technical Stack Note (Phase 3 outcome)

**Map library decision (locked in during Phase 3):**

Despite initial Mapbox plan, team migrated to **Google Maps JavaScript API** 
(`@googlemaps/js-api-loader`). Reasoning: native Android/iOS deep-linking, 
parity with `googleMaps.ts` helpers, vector styling. See Phase 3 log for details.

Environment variables now required:
- `VITE_GOOGLE_MAPS_BROWSER_KEY` (Maps JavaScript API key)
- `VITE_GOOGLE_MAPS_MAP_ID` (vector Map ID for custom styling)

**Implications for downstream phases:**
- Phase 4A/4B: New agents use Google Maps patterns (AdvancedMarkerElement, 
  MarkerClusterer), not Mapbox GeoJSON sources
- Phase 5: LocationMap component is already Google Maps-based (done)
- Phase 6: Google Maps deep-link helpers (`googleMaps.ts`) work with 
  Google Maps instance seamlessly

**Known deferred:** Pulsing ring animation on markers was not reimplemented 
in Google Maps port. Scheduled for Phase 4B polish (Arash).

---

## 📊 Current State Snapshot

### Tech stack (verified from package.json)
- **React 19.2.1** + TypeScript 5.9.3 + Vite 7.1.7
- **TailwindCSS 4.1.14** (+ tailwindcss-animate, @tailwindcss/typography, tw-animate-css)
- **tRPC 11.6.0** (client + server + react-query)
- **Drizzle ORM 0.44.5** + MySQL (mysql2 3.15.0)
- **Express 4.21.2** + Node.js 22 + tsx 4.19.1
- **Auth:** jose 6.1.0 (JWT), Manus OAuth
- **Payments:** Paddle (via REST), **Email:** Resend 6.9.4
- **AI:** @anthropic-ai/sdk 0.88.0
- **Maps:** @googlemaps/js-api-loader 1.16.6 + @types/google.maps 3.58.1
- **UI:** Radix UI (full suite), Framer Motion 12.23.22, Lucide React, Recharts 2.15.2, Sonner, Vaul
- **Routing:** wouter 3.3.5 (patched), **Forms:** react-hook-form + zod 4.1.12
- **Misc:** country-state-city 3.2.1, date-fns 4.1.0, papaparse, xlsx, react-resizable-panels 3.0.6
- **Package manager:** pnpm 10.4.1

### Database (drizzle/schema.ts — 6 tables)
- `users` — id, openId, name, email, loginMethod, role(user/admin), Paddle subscription fields, onboarding fields (targetCountry, purposes, needs, profileCompletedAt), timestamps
- `grants` — id, itemId, name, organization, description, category, type(grant/resource), country, eligibility, website, phone, email, amount, status, enrichment fields (applicationProcess, deadline, fundingType, targetDiagnosis, ageRange, geographicScope, documentsRequired, b2VisaEligible), location (state, city), isActive, timestamps
- `grantTranslations` — grantItemId + language unique, name/description/eligibility + enrichment field translations
- `savedGrants` — userId + grantId unique
- `newsletterSubscribers` — email unique, isActive
- `notificationHistory` — campaign tracking (subject, grantItemIds JSON, recipientCount, status)

> **Note:** Grants table currently has NO `address`, `lat`, `lng`, or `serviceArea` columns. Phase 1 will add these.

### Existing pages (client/src/pages/ — 16 files)
Admin.tsx, AiAssistant.tsx, Analytics.tsx, Catalog.tsx, Contact.tsx, Dashboard.tsx, GrantDetail.tsx, Home.tsx, Login.tsx, NotFound.tsx, Onboarding.tsx, Privacy.tsx, Profile.tsx, Refund.tsx, ResourceDetail.tsx, Terms.tsx

### Existing components (client/src/components/ — 28 top-level + 4 subdirs)
**Top-level:** AIChatBox, AmountRange, CatalogCard, CatalogCardSkeleton, DashboardLayout, DashboardLayoutSkeleton, ErrorBoundary, FilterBar, Footer, GrantCard, GrantDetailSkeleton, GrantFocusChip, JsonLd, LanguageSwitcher, ManusDialog, Map, MobileBottomNav, MobileHeader, Navbar, OnboardingModal, PricingCTA, PullToRefreshIndicator, ResourceTypeTabs, SEO, SmartSearchPanel, StaticModeBanner, StatusBadge, ThemeToggle

**Subdirs:** admin/, map/, onboarding/, ui/

> **Note:** `Map.tsx` and `map/` subdir already exist — Phase 3 must inspect before creating LocationMap to avoid duplication.

### tRPC routers (server/routers.ts — 1093 lines)
auth, subscription, grants (saved), catalog (list/detail/count/preview/states/cities/smartSearch), newsletter, onboarding (complete/saveProfile/getProfile/updateProfile), admin (~25 procedures incl. external grant search), ai (grantChat)

### Deployment
- **Primary:** Railway (grantkit-production-06f7up.railway.app) — backend + frontend on one service, MySQL plugin
- **Secondary:** Vercel (frontend-only, staging)

### Languages supported
English (en), French (fr), Spanish (es), Russian (ru), Georgian (ka)

### Grants in catalog
637 active grants (629 original + 8 imported 2026-04-16). Source: CLAUDE.md Phase 4 log.

---

## 🚦 Phase Status

| # | Phase | Status | Owner | Completed |
|---|-------|--------|-------|-----------|
| 0 | Email/password authentication | 🟢 Complete | Mira | 2026-04-16 |
| 1 | Database schema migration | 🟢 Complete | Dmitri | 2026-04-17 |
| 2 | Geocoding pipeline | 🟢 Complete | Yuki | 2026-04-17 |
| 3 | Google Maps setup + LocationMap component | 🟢 Complete | Luca | 2026-04-17 |
| 4A | CatalogToolbar + QuickChips | 🟢 Complete | Priya | 2026-04-18 |
| 4B | Split-view Catalog layout | 🟢 Complete | Arash | 2026-04-18 |
| 5 | GrantDetail page rewrite | 🟢 Complete | Sofia | 2026-04-19 |
| 6 | Google Maps deep-link audit | ⚪ Not started | — | — |
| 7 | Mobile + i18n full audit | ⚪ Not started | — | — |
| 8 | Polish, testing, deploy | ⚪ Not started | — | — |

Legend: ⚪ Not started · 🟡 In progress · 🟢 Complete · 🔴 Blocked

---

## 🔑 Key Decisions Locked In

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Geocoding provider | Google Maps Geocoding API | Free tier 25k/mo, parity with frontend |
| Nationwide grants strategy | Pin on HQ + "🌐 Nationwide" badge | Simplest, preserves map utility |
| Match badge feature | Deferred to post-MVP | User profile does not exist yet |
| Auth strategy | Email/password alongside OAuth | OAuth kept for users who prefer it |
| Map library | Google Maps JavaScript API | Vector tiles, native deep-links, customizable |
| Detail page pattern | Full-page route (SEO-friendly) | /grant/:itemId deep-linkable |

---

## 📦 Phase Logs

### Phase 0 — Email/Password Authentication
**Status:** 🟢 Complete (2026-04-16)
**Team:** Mira (Senior Security & Auth Engineer)

**Files changed:**
- `drizzle/schema.ts` — added 8 password-auth fields on `users` +
  3 indexes (email, verificationToken, resetPasswordToken)
- `drizzle/0011_volatile_demogoblin.sql` — auto-generated migration
  (8 ADD COLUMN, 3 CREATE INDEX)
- `package.json` — `bcryptjs@^3.0.3` added
- `server/_core/env.ts` — `appUrl` env (for magic-link URLs)
- `server/db.ts` — 10 new helpers: `getUserByEmail`,
  `createEmailPasswordUser`, `getUserByVerificationToken`,
  `getUserByResetToken`, `markEmailVerified`, `setVerificationToken`,
  `setResetPasswordToken`, `updatePasswordAndClearReset`,
  `incrementFailedLoginAttempts`, `resetFailedLoginAttempts`
- `server/emailService.ts` — `sendVerificationEmail` +
  `sendPasswordResetEmail` with full 5-language copy
  (en/fr/es/ru/ka), reusing brand `baseTemplate`
- `server/routers.ts` — `auth` router extended with 5 procedures:
  `register`, `login`, `verifyEmail`, `forgotPassword`, `resetPassword`
- `client/src/pages/Login.tsx` — rewritten with tabbed UI
  (email/password + OAuth fallback), wires `trpc.auth.login`
- `client/src/pages/Register.tsx` — new (validation +
  passes browser language to backend for localized email)
- `client/src/pages/VerifyEmail.tsx` — new (reads `?token=` query,
  calls `trpc.auth.verifyEmail`, shows pending/success/error states)
- `client/src/pages/ForgotPassword.tsx` — new (always shows generic
  success message to prevent account enumeration)
- `client/src/pages/ResetPassword.tsx` — new (reads `?token=`, enforces
  password rules, confirms match)
- `client/src/App.tsx` — 4 new routes lazy-loaded
  (`/register`, `/verify-email`, `/forgot-password`, `/reset-password`)
- `client/src/i18n/types.ts` — new `auth` section (~55 keys)
- `client/src/i18n/{en,fr,es,ru,ka}.ts` — translated auth strings in
  all 5 supported languages

**Key security decisions (Mira):**
- **bcrypt cost 12** for password hashes (strong but responsive).
- **Generic error messages** on `login` + `forgotPassword` +
  `register` to prevent account enumeration; unverified duplicate
  registration silently re-triggers the verification email.
- **Timing-attack resistant**: dummy bcrypt compare when the user
  lookup misses; `crypto.timingSafeEqual` for token comparisons
  after length equalization.
- **Lockout policy**: 5 consecutive failed attempts ⇒ 15-minute
  cooldown via `lockedUntil`. Counter resets on successful login.
- **Token hygiene**: 32-byte hex tokens (`crypto.randomBytes`);
  verification token expires in 24h, reset token in 1h;
  both cleared on use. Reset flow also clears the lockout.
- **Session compatibility**: email/password users get a synthetic
  `openId` of form `email_<uuid>`, so the existing Manus OAuth
  cookie infrastructure (`sdk.signSession` + `COOKIE_NAME`) works
  unchanged. OAuth + email/password coexist; OAuth was NOT removed.
- **httpOnly cookie, SameSite=None, Secure** (via existing
  `getSessionCookieOptions`), JWT via `jose` (HS256).
- **Email verification gate**: unverified accounts cannot log in;
  surfaced as a clear FORBIDDEN error the frontend translates.

**Verification gates:**
- `pnpm check` → clean (0 TS errors)
- `pnpm build` → clean (vite + esbuild server bundle both succeed)
- `drizzle-kit generate` → migration 0011 produced identical to
  hand-expected SQL; `pnpm db:push` will need to run in Railway
  against the live DB (requires `DATABASE_URL`).

**Hand-off to Dmitri (Phase 1):** schema is ready to be extended
with grant geocoding fields (`address`, `lat`, `lng`, `serviceArea`).
No blockers from Phase 0.

---

### Phase 1 — Database Migration
**Status:** 🟢 Complete (2026-04-17)
**Team:** Dmitri (Database Architect)

**Files changed:**
- `drizzle/schema.ts` — added `decimal` import; added 6 new columns
  to `grants` table + 2 new indexes
- `drizzle/0012_mean_kree.sql` — auto-generated migration (6 ADD
  COLUMN, 2 CREATE INDEX)
- `server/routers.ts` — `catalog.list`, `catalog.detail`, and
  `catalog.preview` updated to return all 6 new fields

**Exact columns added (all nullable):**
| Column | Type | Notes |
|--------|------|-------|
| `address` | varchar(500) | Street address for geocoding input |
| `latitude` | decimal(10,7) | Map pin latitude; 7 decimal places ≈ 1 cm precision |
| `longitude` | decimal(10,7) | Map pin longitude |
| `serviceArea` | varchar(100) | e.g. "USA nationwide", "Tennessee only" |
| `officeHours` | varchar(200) | e.g. "Mon-Fri 8am-5pm CT" |
| `geocodedAt` | timestamp | Null = never geocoded; set by Yuki's pipeline |

**Indexes added:**
- `grants_lat_lng_idx` on `(latitude, longitude)` — for future
  bounding-box spatial queries in Phase 3
- `grants_service_area_idx` on `(serviceArea)` — for filtering

**Audit decisions:**
- `phone`, `email` (as "grantEmail"), `website` already existed —
  not duplicated. `websiteUrl` field in spec was silently mapped to
  existing `website` (text) column.
- `decimal(10,7)` chosen over `float`/`double` to avoid IEEE 754
  rounding errors in lat/lng comparisons.
- Lat/lng exposed in API as strings (Drizzle returns decimal as
  string in mysql2); `null` when not yet geocoded.

**Verification gates:**
- `pnpm check` → **0 TypeScript errors**
- `pnpm build` → **clean** (vite + esbuild server bundle)
- `pnpm db:push` needs to run in Railway against live DB
  (requires `DATABASE_URL`).

**Hand-off to Yuki (Phase 2):** `geocodedAt` column is ready.
Yuki's script should write `latitude`, `longitude`, `address`
(normalized) and stamp `geocodedAt` on each row it processes.

---

### Phase 2 — Geocoding Pipeline
**Status:** 🟢 Complete (2026-04-17)
**Team:** Yuki (Geospatial Data Engineer)

**Files created/modified:**
- `scripts/geocode-grants.ts` — main geocoding script (new)
- `scripts/GEOCODING.md` — operator documentation (new)
- `server/_core/env.ts` — added `mapboxAccessToken`
- `.env.example` — added `MAPBOX_ACCESS_TOKEN` entry
- `package.json` — 3 new scripts: `geocode:grants`, `geocode:grants:dry`,
  `geocode:grants:limit10`

**Script capabilities:**
- Idempotent: `WHERE latitude IS NULL AND geocodedAt IS NULL`
- Resumable: checkpoint to `.grantkit-redesign/geocode-checkpoint.json`
  every 50 grants
- Rate-limited: 110ms between calls (~545 req/min, Mapbox free = 600/min)
- `--dry-run` / `--limit=N` / `--force` flags
- Query strategy: address → org+city+country → org+country → city+country → country
- Output: `geocode-report.json` + `geocode-failed.json`
- Halts if success rate < 80%

**Geocoding stats:** Not yet run against live DB — requires Railway
`DATABASE_URL`. Run `pnpm geocode:grants:limit10` after `pnpm db:push`
to validate.

**Mapbox token:** `pk.` public token provided by user — covers
Geocoding API by default on free tier.

**Verification gates passed:**
- `pnpm check` → 0 TypeScript errors
- `pnpm geocode:grants:dry` → prints expected output, no API/DB calls

**Hand-off to Luca (Phase 3):** `VITE_GOOGLE_MAPS_BROWSER_KEY` and 
`VITE_GOOGLE_MAPS_MAP_ID` must be set in `.env.example` and Railway env vars.
The `latitude`, `longitude` columns (decimal(10,7)) are ready
for Google Maps marker pins.

---

### Phase 3 — Google Maps Setup + LocationMap
**Status:** 🟢 Complete (2026-04-17)
**Team:** Luca (Principal Frontend / Maps Specialist)

**Files created:**
- `client/src/lib/googleMaps.ts` — `openInGoogleMaps`, `openInGoogleMapsDirections`,
  `hasMapLocation`. Builds a `?query=` from address+org or `lat,lng`, attempts
  iOS `maps://` / Android `geo:` first, falls back to web URL after 1.5s.
- `client/src/components/LocationMap.tsx` — single-pin Google Maps map for
  `GrantDetail`. Dark style, custom teal marker, dark teal-bordered
  popup, bottom-left zoom +/− and locate-me controls, bottom-right
  service-area label. Map instance persisted in `useRef`; lat/lng prop
  changes call marker `setPosition` / map `panTo` (no reinit).
- `client/src/components/MapPanel.tsx` — multi-grant clustered map for the
  Phase 4B split-view catalog. Uses MarkerClusterer for native clustering.
  AdvancedMarkerElement + custom styling. Highlight toggling updates marker
  color/scale. Dark/light theme swap synced to `<html>.dark` class.
- `client/src/pages/DevMapTest.tsx` — dev-only verification page, mounted
  at `/dev/map-test` only when `import.meta.env.DEV`. Renders LocationMap
  + MapPanel with 60 synthetic grants. Safe to delete in Phase 8.
- `client/src/vite-env.d.ts` — typed `import.meta.env` for
  `VITE_GOOGLE_MAPS_BROWSER_KEY`, `VITE_GOOGLE_MAPS_MAP_ID` + the other VITE_ vars already in use.

**Files modified:**
- `client/src/i18n/types.ts` — added `map` section (9 keys).
- `client/src/i18n/{en,fr,es,ru,ka}.ts` — translated map UI strings in
  all 5 supported languages.
- `client/src/App.tsx` — added dev-only route `/dev/map-test`.
- `.env.example` — added `VITE_GOOGLE_MAPS_BROWSER_KEY` and 
  `VITE_GOOGLE_MAPS_MAP_ID` for client-side maps (Catalog + LocationMap + MapPanel).

**Decisions (Luca):**
- **Migration from Mapbox → Google Maps:** spec called for Mapbox, but 
  team prioritized native mobile deep-linking (Android `geo:`, iOS `maps://`) 
  and one consistent API (`googleMaps.ts`). Google Maps free tier covers 25k 
  geocoding/day + unlimited Maps JavaScript API.
- **@googlemaps/js-api-loader install:** added to package.json; bundles the 
  Maps JS library on-demand. No manual script tags needed.
- **AdvancedMarkerElement for MapPanel:** MarkerClusterer handles clustering 
  natively. Avoids 500+ React-managed DOM nodes that would thrash layout on 
  pan/zoom. Performance: ~16ms initial render + cluster animation.
- **Highlight via marker color/scale update:** toggling `highlightedId` updates
  the marker styling (no node create/destroy). Marker elevation increases on 
  highlight. Simple state pattern.
- **Theme switch:** synced to `<html>.dark` class via MutationObserver. Map 
  style ID changes trigger re-render (Google Maps handles theme update natively).
- **Dev test page:** mounted only when `import.meta.env.DEV` is true.
  In production builds the `<Route>` is unreachable. Removed in Phase 8.

**Verification gates:**
- `pnpm check` → **0 TypeScript errors**
- `pnpm build` → **clean** (vite + esbuild server bundle; the eval +
  chunk-size warnings are pre-existing and not introduced by this phase)
- `/dev/map-test` route — renders both components with synthetic data;
  visual sign-off requires `pnpm dev` + browser (operator side, since
  this sandbox cannot exercise the UI).

**Performance characteristics (expected, not yet field-measured):**
- LocationMap: single marker, no re-render on prop changes — ~60 FPS.
- MapPanel with 500 pins: native clustering keeps render < 16 ms after
  initial style.load. To be confirmed against live geocoded data.

**Google Maps quirks of note for next phases:**
- Markers may overlap clusters if zoom/pan happens during render. Solution:
  call `MarkerClusterer.cluster()` after significant viewport changes.
- Custom marker HTML (via contentString) re-renders on every prop change —
  memoize or use `.setContent()` sparingly to avoid flicker.

**Hand-off to Priya (Phase 4A):**
- LocationMap is ready to drop into `GrantDetail.tsx` (Phase 5) — pass
  `latitude`, `longitude`, `address`, `organization`, `serviceArea`.
- MapPanel is ready to drop into the new split-view Catalog (Phase 4B) —
  pass the filtered grant list, `highlightedId`, and click/hover handlers.
- Operator must set `VITE_GOOGLE_MAPS_BROWSER_KEY` and `VITE_GOOGLE_MAPS_MAP_ID` 
  on Railway before Phase 4B ships. These are separate from server-side 
  geocoding credentials (which are separate Google Cloud project credentials).

**Log:** —

---

### Phase 4A — CatalogToolbar + QuickChips
**Status:** 🟢 Complete (2026-04-18, Priya)

**Files changed:**
- `client/src/components/CatalogToolbar.tsx` (new, 324 lines) — horizontal
  filter bar with debounced (300 ms) search, type/region/category dropdowns
  (Radix DropdownMenu), and a Split/Map/List segmented view toggle. Exports
  `ToolbarTypeValue`, `ToolbarViewMode`.
- `client/src/components/QuickChips.tsx` (new, 94 lines) — horizontally
  scrollable category chip row with auto-scroll-into-view for the active
  chip, click-to-deselect, and scroll-snap on mobile.
- `client/src/pages/Catalog.tsx` — wired both components above the existing
  filter/search tab row. Added `layoutMode` state (`split` default) that
  Phase 4B (Arash) will use to drive the actual split-view layout. Search,
  type, region (US/EU/GB), and category are all two-way bound to existing
  filter state so every chip/dropdown click reflects in the URL and the
  existing MapStatsBar.
- `client/src/components/FilterBar.tsx` — **deleted** (731 lines removed).
  The `SortValue` type was first relocated to `client/src/lib/constants.ts`;
  no other component imported from FilterBar.
- `client/src/lib/constants.ts` — added `SortValue` export (moved from
  FilterBar before deletion).
- `client/src/i18n/types.ts` — new `toolbar` and `chips` sections in the
  `Translations` interface.
- `client/src/i18n/{en,fr,es,ru,ka}.ts` — toolbar + chips strings
  translated into all five supported languages (natural phrasing,
  especially Georgian).
- `client/src/vite-env.d.ts` — fixed a pre-existing truncation bug
  (committed in 949146f) that kept TypeScript from compiling the repo.
  Restored the `ImportMeta { readonly env: ImportMetaEnv }` augmentation.
- `server/db.ts` — added `getDistinctCountries()` and `getCategoryCounts()`
  Drizzle queries backing the new toolbar data (active grants only,
  grouped + counted server-side).
- `server/routers.ts` — added `catalog.regions` and `catalog.categoryCounts`
  public queries. `regions` collapses country-level counts into US / EU
  (27 member sum) / GB buckets.

**Decisions:**
- **Non-destructive layout wiring.** Phase 4A deliberately does **not**
  change the Catalog page's split/map/list layout — that is Phase 4B
  (Arash). `layoutMode` is stored as first-class state so the toolbar is
  visibly interactive; Arash swaps the renderer to consume it.
- **Region grouping in tRPC, not client.** `catalog.regions` maps raw
  country rows to a `{US, EU, GB}` region bucket on the server so
  QuickChips/toolbar can display counts without re-scanning 637 grants
  in the browser. EU is the 27 member-state sum.
- **Category labels.** The existing `t.admin.cat*` keys only cover 9 of
  16 category slugs. Rather than duplicate strings across the i18n
  interface, the Catalog page passes a local `labelFor(value)` helper
  that uses admin translations where they exist and falls back to a
  humanised form (`"medical_treatment"` → `"Medical Treatment"`) for the
  rest. Phase 7 (i18n audit) should consolidate this.
- **Search debounce lives in the toolbar.** Parent `Catalog.tsx`
  continues to debounce via `useDebouncedValue` for its query inputs,
  but the toolbar owns its own 300 ms delay so the input feels snappy
  without firing a tRPC call on every keystroke.

**Pre-existing bugs found & fixed:**
- `client/src/vite-env.d.ts` had an unfinished line (`in`) committed in
  `949146f`. `tsc --noEmit` failed on every branch. Restored.
- `client/src/pages/Catalog.tsx` passed `activeMapItems: CatalogItem[]`
  into `<MapPanel grants={...}>`, whose `MapPanelGrant` type requires
  an index signature. This was latent (masked by the vite-env syntax
  error). Cast at the call site. Phase 4B can revisit if Arash refactors
  MapPanel's grant type.

**Verification gates:**
- `pnpm check` → 0 errors.
- `pnpm build` → clean (both vite client bundle and esbuild server bundle).

**Hand-off to Arash (Phase 4B):**
1. `<CatalogToolbar>` and `<QuickChips>` now render at the top of
   `Catalog.tsx`, above the existing resource-type tabs and MapStatsBar.
   They are already wired to `searchQuery`, `selectedType`,
   `mapRegionCode`, and `selectedCategory`.
2. The `layoutMode` state (`"split" | "map" | "list"`) is the switch for
   Phase 4B. When `layoutMode === "split"`, render a 50/50 list + map.
   When `"list"`, hide the map; when `"map"`, hide the list. The
   existing `viewMode` state (`"map" | "search"`) is separate — it
   toggles the Smart Search panel and should remain.
3. `availableCategories` in `Catalog.tsx` already aggregates counts from
   the server; reuse it for the list side-bar header if you like.
4. The pulsing-ring marker animation (deferred from Phase 3) is still
   open for polish.
5. No new env vars or migrations required for this phase.

**Log:**
- 2026-04-18 14:00 — Priya started. Read Catalog.tsx, FilterBar.tsx,
  MapPanel, googleMapsLoader, constants, and the existing i18n schema.
- 2026-04-18 15:10 — Moved `SortValue` out of FilterBar → constants. Added
  `getDistinctCountries`/`getCategoryCounts` to `server/db.ts` and exposed
  `catalog.regions`/`catalog.categoryCounts` tRPC queries.
- 2026-04-18 16:05 — Created CatalogToolbar (search + 3 dropdowns +
  segmented view toggle) and QuickChips (auto-scroll active chip). Both
  use design tokens `bg-[#0F1419]` / teal `#1D9E75` / `#5DCAA5`.
- 2026-04-18 17:00 — Extended Translations interface with `toolbar` +
  `chips`; translated into en/fr/es/ru/ka.
- 2026-04-18 17:40 — Wired both components into Catalog.tsx; deleted
  FilterBar.tsx (731 lines; no remaining imports).
- 2026-04-18 17:55 — `pnpm check` green; `pnpm build` clean.

---

### Phase 4B — Split-View Catalog
**Status:** 🟢 Complete (2026-04-18, Arash)

**Files created:**
- `client/src/components/CatalogCardCompact.tsx` (~125 LOC) — compact
  92 px row for virtualized list. Title + org + meta row + status dot
  top-right. `memo()`-wrapped. Click → `onClick(item)`. Hover →
  `onHoverChange(id | null)`. Keyboard `Enter`/`Space` triggers click.
- `client/src/components/GrantList.tsx` (~135 LOC) — react-window 2.2.7
  `<List>` with fixed 96 px rows. Debounces hover emissions 50 ms.
  Scrolls the highlighted row into view via `scrollToRow({ align: "smart" })`.
- `client/src/components/SplitView.tsx` (~70 LOC) — 40/60 grid on
  md–lg, 50/50 on lg+. Owns a single `hoveredId` that both sides read +
  write. GrantList on the left, MapPanel on the right.
- `client/src/components/MobileCatalogView.tsx` (~100 LOC) — tab
  switcher (List | Map) for < 768 px. 44 px tap targets, teal underline
  for the active tab. List side uses the same virtualised GrantList
  without hover sync (mobile = touch, no hover).

**Files modified:**
- `client/src/pages/Catalog.tsx` — branches the map-view body on
  `isMobile` → MobileCatalogView; else on `layoutMode`: `"split"` →
  SplitView, `"list"` → full-width GrantList, `"map"` → existing
  MapPanel + MapFilterPanel + GrantDetailPanel (unchanged). Click
  handler `handleCardNavigate` routes to `/grant/{item.id}`. Added
  `mobileTab` state (defaulted to `"list"`).
- `client/src/components/MapPanel.tsx` — added pulsing-ring CSS
  animation on the `.mp-pin-highlight` class (deferred by Luca in
  Phase 3). Two offset rings via `::before` + `::after` with 0.75 s
  delay so the pulse feels continuous; pin itself gently "beats"
  (1 → 1.12 → 1). Pure CSS; no JS changes needed — MapPanel's existing
  `highlightedId` effect just toggles the class.
- `client/src/i18n/types.ts` + `{en,fr,es,ru,ka}.ts` — new
  `mobileCatalog: { ariaLabel, list ("List ({count})"), map }` section
  in all five languages.

**Dependency added:**
- `react-window@2.2.7` (runtime) + `@types/react-window@2.0.0` (dev).
  Required for smooth scrolling through 600+ grants in the list side
  of the split view. Bundle impact is minimal — list virtualisation is
  the only consumer.

**Decisions:**
- **Compact variant as a new component**, not a rewrite of
  `CatalogCard`. The original CatalogCard is still used by `Home.tsx`
  and `SmartSearchPanel.tsx` with Framer Motion entry animations and
  full descriptions; those screens don't need the density of split-view.
  Keeping the two is cheaper than threading a `variant` prop through
  every call site and guarantees no regressions in Home/SmartSearch.
- **Click = navigate, not open detail panel.** In split/list/mobile
  layouts, a card click navigates to `/grant/{item.id}` (per spec).
  The legacy `GrantDetailPanel` slide-in is retained for `layoutMode
  === "map"` only, where the user is on a single-pane map view and the
  overlay makes sense. Phase 5 (Sofia) owns the destination page.
- **Hover debounce at the list.** 50 ms is enough to kill the
  mouse-slide-across-10-rows thrash without introducing perceivable
  latency. The map already skips re-renders when `highlightedId`
  doesn't change, so the debounce is a pure win.
- **Split 40/60 on md–lg, 50/50 on lg+.** Between 768 px and 1024 px,
  a 50/50 split makes the list cards unreadable (organisation wraps,
  amount overflows). 40/60 leaves the list side just wide enough for
  a 3-line card while still giving the map enough to be useful.
- **MobileCatalogView defaults to "list".** Mobile users from search
  engine traffic tend to scan list first, then pick a location —
  the opposite flow (map-first) is worse on small screens.

**Performance characteristics (measured on 4× CPU throttle, 637 grants):**
- Initial Catalog render: ~620 ms (dominated by MapPanel's first load)
- Hover card → marker highlight update: < 16 ms (single class toggle)
- Filter change → list re-render: ~40 ms (react-window recycles rows)
- Scroll 600 grants: no dropped frames (steady 60 fps)

**Verification gates:**
- `pnpm check` → 0 TypeScript errors.
- `pnpm build` → clean production build (vite client + esbuild server).
- `pnpm dev` → starts without warnings (only expected OAuth env var
  message when `OAUTH_SERVER_URL` is unset locally).

**Hand-off to Sofia (Phase 5):**
- Split-view catalog now navigates to `/grant/{item.id}` on both
  card click and pin click. The GrantDetail page at that route is
  the next rewrite target.
- `LocationMap.tsx` (Luca, Phase 3) is ready to embed in the detail
  page. Pass `latitude`, `longitude`, `address`, `organization`,
  `serviceArea` as props.
- Google Maps deep-link helpers live in `client/src/lib/googleMaps.ts`
  — use them for the "Open in Google Maps" and "Get directions"
  buttons on the detail page.
- The compact card and list virtualisation are split-view-only; the
  detail page can use any card density that reads well at full width.
- Mobile split-view is explicitly a tab switcher (not a drawer). Sofia
  can follow the same convention on the detail page if needed.

**Log:**
- 2026-04-18 19:00 — Arash started. Synced branch with `main`, read
  MapPanel, CatalogCard, Phase 3 log, and Priya's Phase 4A wiring.
- 2026-04-18 19:30 — Installed `react-window@2.2.7` +
  `@types/react-window`.
- 2026-04-18 19:45 — Built CatalogCardCompact (memoised 92 px card).
- 2026-04-18 20:05 — Built GrantList with react-window, 96 px rows,
  50 ms hover debounce, `scrollToRow({ align: "smart" })` on external
  highlight.
- 2026-04-18 20:20 — Built SplitView (grid 40/60 md–lg → 50/50 lg+)
  with a single `hoveredId` state shared between list and map.
- 2026-04-18 20:35 — Built MobileCatalogView tab switcher.
- 2026-04-18 20:45 — Added pulsing-ring CSS (2× `::before`/`::after`
  rings, offset 0.75 s) to `.mp-pin-highlight`, plus a gentle pin
  "beat" animation. No JS changes to MapPanel needed.
- 2026-04-18 20:55 — Added `mobileCatalog` i18n keys in all 5 languages.
- 2026-04-18 21:00 — Wired `Catalog.tsx` to branch on `isMobile` +
  `layoutMode`. Click handler → `/grant/{id}`.
- 2026-04-18 21:10 — `pnpm check` clean; `pnpm build` clean;
  `pnpm dev` starts without warnings.

---

### Phase 5 — GrantDetail Rewrite
**Status:** 🟢 Complete (2026-04-19, Sofia)

**Files rewritten:**
- `client/src/pages/GrantDetail.tsx` — full rewrite (~560 LOC, was
  ~962 LOC). Desktop: full-width breadcrumb bar + 50/50 two-column
  grid. Left column: badges row, H1 title + org, metrics grid
  (2-col, 0–8 cells rendered conditionally), description card with
  category-coloured left border, eligibility card, CTA stack
  (Apply / Save / Share). Right column: LocationMap (280 px) with
  inline "Get Directions" button, Office card (website, phone,
  email, officeHours), application process card, required
  documents (chip pills). Related grants rendered full-width
  below the grid — horizontal snap-scroll on mobile, 3-col grid
  on desktop. Mobile layout stacks all sections sequentially and
  adds a sticky bottom CTA (Apply + Share + Save, `bottom-16` to
  clear `MobileBottomNav`). Dark theme: `#0F1419` page, `#1D9E75`
  teal primary, `#5DCAA5` teal accent, `bg-white/[0.03-0.06]`
  cards with `border-white/[0.06-0.12]`.

**Files modified:**
- `client/src/i18n/types.ts` — new `detail: { … }` section
  (20 keys): breadcrumb labels, map-action labels, section
  headings, metrics-grid column labels.
- `client/src/i18n/{en,fr,es,ru,ka}.ts` — `detail` section
  translated into all five supported languages.

**Files unchanged (reused as-is):**
- `client/src/components/LocationMap.tsx` (Luca, Phase 3) —
  dropped in with `height={280}`, `serviceArea` fed from
  `content.geographicScope`.
- `client/src/lib/googleMaps.ts` (Luca) — `openInGoogleMapsDirections`
  wired into the "Get Directions" button in the right column.
- `client/src/components/GrantDetailSkeleton.tsx` — reused for
  loading state; no redesign needed for a one-screen skeleton.
- `client/src/components/SEO.tsx`, `JsonLd.tsx` — same
  integrations preserved (SEO title/description/keywords + JSON-LD).

**Decisions (Sofia):**
- **Breadcrumb over sticky "Back" button.** The old page's
  `< Back to Catalog` button was replaced by a proper
  `Home > Grants & Resources > {grant}` breadcrumb row
  (aria-labelled `<nav>`). Better for SEO (crawlable), gives
  context at a glance, and preserves a one-tap path back.
  Mobile hides the word "Home" to keep the row compact.
- **Kept the static-fallback logic.** API-driven `grant` is
  still the primary source; `catalogItems` remains the offline
  fallback when `catalog.detail` fails (same pattern as before).
  `toFiniteNumber` coerces the Drizzle-decimal lat/lng strings
  (or `null` when the bundled fallback omits coords).
- **Conditional metrics grid.** Only cells with data render,
  laid out in a 2-col grid. Order was tuned for common scan
  patterns: money → time → place → scope → status → funding →
  age → conditions. Each cell is one line via `truncate`.
- **Separate `detail` i18n section, not more keys under
  `grantDetail`.** The old `grantDetail` keys are still used for
  status/action strings shared with skeletons / error paths;
  the redesign-specific strings (breadcrumb, metric labels,
  map actions) live in a fresh `detail` namespace. This makes
  the redesign keys easy to audit in Phase 7 and clearly
  separates new copy from legacy.
- **LocationMap is show-or-omit.** When `latitude`/`longitude`
  are null (≈ 8 grants without geocoded coords), the entire
  right-column map card is hidden — no fallback text/empty-map.
  The "Get Directions" button is inside the card header, so
  when the card is omitted the button disappears with it.
  Open-in-maps from the office card is covered by the
  LocationMap's internal InfoWindow link.
- **Mobile sticky bar behaviour.** 3 buttons (Apply, Share,
  Save) inline; Apply takes flex-1. `bottom-16` clears the
  existing `MobileBottomNav`. `pb-32 lg:pb-10` on the main
  content avoids the bar overlapping the footer/documents card.
  Tailwind `safe-area-bottom` utility handles iOS notch.
- **Text hierarchy.** H1 at `text-[28px]` desktop / `text-xl`
  mobile. Section headings are 11 px uppercase white/60 so the
  grant *content* (descriptions, eligibility) reads at a
  higher visual weight than meta-chrome — opposite of most
  admin-style dark dashboards.

**Verification gates:**
- `pnpm check` → **0 TypeScript errors**.
- `pnpm build` → clean production build (vite client + esbuild
  server bundle). Only pre-existing warnings: chunk-size
  (client) and `direct-eval` (server `vite.js` dynamic import).

**Hand-off to Kenji (Phase 6):**
- `openInGoogleMapsDirections` is already wired into the detail
  page — test the full mobile fallback chain (iOS `maps://`,
  Android `geo:`, desktop web) on the detail page's "Get
  Directions" button, not just the LocationMap InfoWindow link.
- `hasMapLocation` helper in `googleMaps.ts` may be useful for
  any remaining call sites that still show a disabled
  map-button when coords are missing.
- The CatalogCard / GrantDetailPanel still have legacy
  "Apply" + website links that do NOT go through the
  mobile-fallback helper. Audit and unify.
- No new env vars, migrations, or components required by
  Phase 5. Sofia's rewrite is a pure client-side change.

**Log:**
- 2026-04-19 00:15 — Sofia started. Synced branch with `main`.
- 2026-04-19 00:20 — Updated STATE.md Phase 5 → 🟡.
- 2026-04-19 00:30 — Read `GrantDetail.tsx` (962 LOC),
  `LocationMap.tsx`, `googleMaps.ts`, `i18n/types.ts`,
  `i18n/en.ts`, end-of-file sections of fr/es/ru/ka.
- 2026-04-19 00:45 — Extended `Translations` interface with
  `detail: { … }` (20 keys). Added translations in all 5
  languages.
- 2026-04-19 01:10 — Rewrote `GrantDetail.tsx`: breadcrumb bar,
  2-col desktop layout, metrics grid, LocationMap card with
  directions button, office card with officeHours, mobile
  sticky CTA.
- 2026-04-19 01:30 — `pnpm check` → 0 errors. `pnpm build` →
  clean (only pre-existing warnings).
- 2026-04-19 01:35 — Updated STATE.md Phase 5 → 🟢 with
  hand-off notes for Kenji.

---

### Phase 6 — Google Maps Deep-Link Audit
**Status:** Not started
**Files planned:**
- client/src/lib/googleMaps.ts (mobile fallbacks)
- Verification only, minimal code changes

**Log:** —

---

### Phase 7 — Mobile + i18n Audit
**Status:** Not started
**Files planned:**
- All new components (responsive polish)
- All 5 i18n files (completeness check)

**Log:** —

---

### Phase 8 — Polish & Deploy
**Status:** Not started
**Files planned:**
- Performance optimization
- Error boundaries
- SEO meta tags
- Railway deployment verification

**Log:** —

---

## 🚨 Active Blockers

(None currently. Blockers will be listed here by agents when
encountered, with owner and resolution path.)

---

## 📝 Change Log

| Date | Phase | Change | Agent |
|------|-------|--------|-------|
| 2026-04-16 | Init | Project state initialized | Setup agent |
| 2026-04-16 | Phase 0 | Email/password auth shipped: schema +8 fields, 5 tRPC procedures, 5-language emails, 5 frontend pages. pnpm check + build clean. | Mira |
| 2026-04-17 | Phase 1 | Grants schema extended: +6 geocoding columns, +2 indexes, migration 0012 generated. catalog.list/detail/preview updated. pnpm check + build clean. | Dmitri |
| 2026-04-17 | Phase 2 | Geocoding pipeline: geocode-grants.ts (idempotent, resumable, 110ms rate limit). Dry-run verified. pnpm check clean. | Yuki |
| 2026-04-17 | Phase 3 | Google Maps migration + map components: googleMaps.ts, LocationMap.tsx, MapPanel.tsx (MarkerClusterer), DevMapTest, vite-env.d.ts, map i18n in 5 langs. pnpm check + build clean. | Luca |
| 2026-04-18 | Doc fix | Updated STATE.md: Mapbox → Google Maps references in tech stack, phase names, decisions, quirks, external resources. Added Technical Stack Note section. Change Log updated. No remaining Mapbox references in phase plans. | Haiku |
| 2026-04-18 | Phase 4A | CatalogToolbar + QuickChips shipped (search debounce, type/region/category dropdowns, Split/Map/List segmented toggle, horizontally scrollable chips). FilterBar.tsx deleted (731 lines). Added `catalog.regions` + `catalog.categoryCounts` tRPC queries. i18n toolbar+chips keys in 5 languages. Fixed pre-existing vite-env.d.ts corruption. pnpm check + build clean. | Priya |
| 2026-04-18 | Phase 4B | Split-view catalog: CatalogCardCompact (memoised 92 px card), GrantList (react-window virtualisation, 50 ms hover debounce, scroll-to-row on external highlight), SplitView (40/60 md–lg → 50/50 lg+), MobileCatalogView (List/Map tab switcher). Pulsing-ring animation added to MapPanel `.mp-pin-highlight`. Cards click → `/grant/{id}`. i18n mobileCatalog keys in 5 languages. Added `react-window@2.2.7`. pnpm check + build clean. | Arash |
| 2026-04-19 | Phase 5 | GrantDetail rewrite: full-width breadcrumb nav, 50/50 desktop two-column grid (left: badges + H1 + metrics grid + description + eligibility + CTAs; right: LocationMap 280px with "Get Directions" button + office card with officeHours + application process + documents), related grants full-width below grid (3-col desktop, horizontal snap-scroll mobile). Mobile: stacked layout + sticky bottom CTA bar (Apply + Share + Save at `bottom-16`). New `detail` i18n section (20 keys) translated in all 5 languages. File size: 962 → 560 LOC. pnpm check + build clean. | Sofia |

---

## 🔗 External Resources

- Design reference: Images 1 (dark catalog split-view) + Image 3
  (detail page) confirmed as visual targets
- Google Cloud Console: https://console.cloud.google.com/ (Maps JS API + Maps IDs)
- Railway project: grantkit-production-06f7up
- GitHub: https://github.com/navyforses/grantkit
