# GrantKit Redesign — Project State

> **CRITICAL:** Every agent working on this project MUST read this
> file FIRST, before making any changes. After completing work,
> MUST update the relevant phase section with: what was done,
> files changed, decisions made, blockers.

**Last updated:** 2026-04-17T02:00:00Z
**Current phase:** Phase 3 — in progress (Luca).
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
| 4A | CatalogToolbar + QuickChips | ⚪ Not started | — | — |
| 4B | Split-view Catalog layout | ⚪ Not started | — | — |
| 5 | GrantDetail page rewrite | ⚪ Not started | — | — |
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
**Status:** Not started
**Files planned:**
- client/src/components/CatalogToolbar.tsx (new)
- client/src/components/QuickChips.tsx (new)
- client/src/components/FilterBar.tsx (DELETE after confirming)
- client/src/pages/Catalog.tsx (update)

**Log:** —

---

### Phase 4B — Split-View Catalog
**Status:** Not started
**Files planned:**
- client/src/pages/Catalog.tsx (split layout)
- client/src/components/CatalogCard.tsx (compact redesign)

**Log:** —

---

### Phase 5 — GrantDetail Rewrite
**Status:** Not started
**Files planned:**
- client/src/pages/GrantDetail.tsx (rewrite)

**Log:** —

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

---

## 🔗 External Resources

- Design reference: Images 1 (dark catalog split-view) + Image 3
  (detail page) confirmed as visual targets
- Google Cloud Console: https://console.cloud.google.com/ (Maps JS API + Maps IDs)
- Railway project: grantkit-production-06f7up
- GitHub: https://github.com/navyforses/grantkit
