# Project TODO

## Completed
- [x] Basic homepage layout
- [x] Navigation menu
- [x] Multilingual support (EN, FR, ES, RU, KA)
- [x] Catalog page with filters
- [x] Paddle payment integration (replace Gumroad)
- [x] Audit resources.json — remove personal notes, non-org entries, status notes, financial calculations
- [x] Audit grants.json — remove any irrelevant entries
- [x] Merge cleaned data into one unified catalog
- [x] Re-sort and categorize properly
- [x] Update translations for merged dataset
- [x] Rebuild website with single catalog page
- [x] Test all languages
- [x] Upgrade to full-stack with database and user management

## Auth & Payment Gating
- [x] Database schema: add subscription status field to users table
- [x] Create registration/login page UI (uses Manus OAuth)
- [x] Implement auth flow with Manus OAuth
- [x] Add Paddle checkout after registration/login
- [x] Store subscription status in database after successful payment
- [x] Lock catalog content behind paid subscription check
- [x] Update Navbar with login/logout buttons
- [x] Create user dashboard/account page (catalog page serves as main view)
- [x] Add Paddle subscription.activate tRPC endpoint
- [x] Write vitest tests for auth and subscription logic (9 tests passing)

## User Profile Page
- [x] Create Profile page UI with account info display
- [x] Show subscription status (active, cancelled, none)
- [x] Show subscription details (plan, next billing date)
- [x] Add cancel subscription functionality
- [x] Add resubscribe / upgrade CTA for non-subscribers
- [x] Register /profile route in App.tsx
- [x] Add profile link in Navbar for logged-in users
- [x] Write vitest tests for profile-related procedures (12 tests passing)

## Paddle Webhook
- [x] Create Express webhook endpoint at /api/paddle/webhook
- [x] Parse and verify Paddle webhook signature (HMAC-SHA256)
- [x] Handle subscription.activated event
- [x] Handle subscription.canceled event
- [x] Handle subscription.paused event
- [x] Handle subscription.past_due event
- [x] Handle subscription.updated + resumed events
- [x] Update user subscription status in DB based on events
- [x] Write vitest tests for webhook handler logic (28 tests total passing)

## Legal Pages
- [x] Create Privacy Policy page (/privacy)
- [x] Create Terms of Service page (/terms)
- [x] Register routes in App.tsx
- [x] Add footer links to Privacy Policy and Terms of Service
- [x] Add i18n translations for all 5 languages (EN, FR, ES, RU, KA)
- [x] Add @tailwindcss/typography plugin for proper prose styling
- [x] All 28 vitest tests passing

## Refund Policy Page
- [x] Create Refund Policy page (/refund)
- [x] Add i18n translations for all 5 languages (EN, FR, ES, RU, KA)
- [x] Register route in App.tsx
- [x] Add footer link
- [x] All 28 vitest tests passing

## Admin Panel
- [x] Create admin-only tRPC procedures (list users, user stats, update subscription)
- [x] Create adminProcedure middleware for role-based access control
- [x] Build Admin Dashboard page with user statistics overview
- [x] Build Users list with search, filter, and pagination
- [x] Show subscription status for each user (active/cancelled/none/past_due/paused)
- [x] Add ability to manually activate/deactivate subscriptions + change roles
- [x] Register /admin route in App.tsx (protected for admin role)
- [x] Add admin link in Navbar for admin users (purple badge)
- [x] Write vitest tests for admin procedures (37 tests total passing)

## Email Notifications
- [x] Create email notification service module (Resend API)
- [x] Design HTML email templates for subscription events (activated, cancelled, paused, past_due, resumed)
- [x] Integrate email sending into Paddle webhook handler
- [x] Integrate email sending into manual subscription changes (admin panel)
- [x] Integrate email sending into tRPC subscription.activate and subscription.cancel
- [x] Add welcome email on first subscription activation
- [x] Add admin notification on new subscriber
- [x] Write vitest tests for email notification logic (49 tests total passing)

## Phase 1: Professional Improvements
- [x] Grant detail page (/grant/:id) with full info, related grants, back navigation
- [x] Saved/bookmarked grants feature (database table + UI bookmark button)
- [x] User Dashboard page with saved grants, subscription status, quick actions
- [x] Catalog sorting (A-Z, Z-A, by category, by country)
- [x] Contact page with contact form (sends via notifyOwner)
- [x] CatalogCard clickable — navigates to grant detail page
- [x] Bookmark button on CatalogCard and GrantDetail page
- [x] Dashboard link in Navbar for authenticated users
- [x] Contact link in Footer (replaces mailto)
- [x] Write vitest tests for grants.savedList and grants.toggleSave (55 tests total passing)

## Phase 2: Conversion Optimization
- [x] "How It Works" section on landing page (3 steps: Register → Subscribe → Access)
- [x] Social proof / testimonials section on landing page
- [x] Annual pricing option ($79/year vs $9/month) with toggle
- [x] Onboarding flow — welcome modal for first-time users after login
- [x] Newsletter signup form for non-subscribers (landing page)
- [x] Newsletter subscribers DB table + tRPC endpoint
- [x] Onboarding completed DB field + tRPC endpoint
- [x] i18n translations for all Phase 2 sections (5 languages)
- [x] Write vitest tests for newsletter and onboarding (62 tests total passing)

## Admin Panel: Grant Management (CRUD)
- [x] Create grants database table with all catalog fields
- [x] Migrate existing JSON catalog data to database (643 grants + 2572 translations)
- [x] Build admin tRPC endpoints: list, create, update, delete grants
- [x] Build admin UI: grants list with search, filter, pagination
- [x] Build admin UI: add new grant form/modal
- [x] Build admin UI: edit grant form/modal
- [x] Build admin UI: delete grant with confirmation (soft + hard delete)
- [x] Update catalog page to fetch grants from database instead of JSON
- [x] Update grant detail page to fetch from database
- [x] Update homepage preview to use database grants
- [x] Write vitest tests for grant CRUD endpoints (91 tests total passing)

## Email Notifications: New Grant Alerts
- [x] Create HTML email template for new grant notifications
- [x] Build sendNewGrantNotification function in email service
- [x] Add newsletter notification tRPC endpoint for admin (send to all subscribers)
- [x] Add auto-notify option when admin creates a new grant
- [x] Build admin UI: newsletter management tab with send notification button
- [x] Add unsubscribe link in emails + unsubscribe endpoint
- [x] Track notification history (sent date, grant count, recipient count)
- [x] Write vitest tests for new grant notification logic (118 tests total passing)

## Database Cleanup
- [x] Identify all invalid/problematic entries (names starting with ~, numeric-only, personal notes)
- [x] Remove 13 invalid entries from grants, grant_translations, and saved_grants tables
- [x] Verify cleanup — 630 clean grants remain, 0 problematic entries

## Admin: Grants CSV/Excel Export
- [x] Build admin tRPC endpoint to export all grants as structured data
- [x] Add CSV export button in admin Grants tab
- [x] Add Excel (XLS/XML Spreadsheet) export button in admin Grants tab
- [x] Include translations in export (5 languages: EN, KA, FR, ES, RU)
- [x] Write vitest tests for export endpoint (126 tests total passing)

## Admin: Grants CSV/Excel Import
- [x] Build backend tRPC endpoint to parse and import grants from CSV/Excel data
- [x] Validate imported data (required fields, categories, countries)
- [x] Support both new grants and updating existing grants (upsert by itemId)
- [x] Build admin UI: file upload with drag & drop
- [x] Build admin UI: preview table showing parsed data before import
- [x] Build admin UI: import confirmation with success/error summary
- [x] Support CSV format with UTF-8 encoding
- [x] Support Excel (XLS/XLSX) format
- [x] Include translations import support (5 languages)
- [x] Write vitest tests for import parsing and validation logic (151 tests total passing)

## Full-Text Search for Grants Catalog
- [x] Build backend search tRPC endpoint with LIKE/full-text query across name, description, organization
- [x] Support search in translated content (grant_translations table)
- [x] Integrate search with existing catalog filters (category, country, type)
- [x] Build search input UI in catalog page with debounced input (300ms)
- [x] Show search results count (e.g., "14 results for 'wheelchair'")
- [x] Search integrated in catalog FilterBar with clear button
- [x] Write vitest tests for search endpoint (156 tests total passing)

## SEO Optimization
- [x] Build server-side sitemap.xml endpoint with all grant URLs (636 URLs: 6 static + 630 grants)
- [x] Build robots.txt endpoint (disallows admin/dashboard/profile/api)
- [x] Add dynamic meta tags (title, description) per page using react-helmet-async
- [x] Add Open Graph tags (og:title, og:description, og:image, og:url) per page
- [x] Add Twitter Card meta tags (summary_large_image)
- [x] Add JSON-LD structured data (Organization, WebSite, FAQPage, GovernmentService, BreadcrumbList)
- [x] Add canonical URLs for all pages
- [x] Write vitest tests for sitemap and robots.txt endpoints (15 tests, 171 total passing)

## Phase A: AI Grant Enrichment (630 grants)
- [x] Expand grants schema with new fields (applicationProcess, deadline, fundingType, targetDiagnosis, ageRange, geographicScope, documentsRequired, b2VisaEligible)
- [x] Run database migration for new fields
- [x] Build LLM enrichment script to research and fill all 630 grants (624 enriched, 6 failed)
- [x] Fill empty fields: website (586), email (516), phone (357), amount (583), description (629), eligibility
- [x] Fill new structured fields: applicationProcess (601), targetDiagnosis (609), b2VisaEligible (594), and more
- [ ] Translate enriched content to 4 languages (ka, fr, es, ru)
- [x] Update backend API (tRPC) to expose new fields (catalog.list + catalog.detail + new filters)
- [x] Update GrantDetail page with new sections (how to apply, required documents, funding type, deadline, B-2 visa badge, target conditions, age range, geographic scope)
- [x] Update CatalogCard to show key new info (amount, deadline, B-2 visa badge)
- [x] Add new filters: diagnosis, B-2 visa, funding type, deadline (in collapsible advanced panel)
- [x] Add new sort options: existing sorts retained, advanced filters serve as primary refinement
- [x] Update admin panel grant form with new enrichment fields (applicationProcess, deadline, fundingType, targetDiagnosis, ageRange, geographicScope, documentsRequired, b2VisaEligible)
- [x] Write vitest tests for enrichment and new features (12 new tests, 183 total passing)

## Bug Fixes
- [x] Fix tRPC error: hardened SPA fallback to never serve HTML for /api/* routes + added client-side retry for non-JSON responses

## Mobile App-Like Transformation
- [x] Audit all pages in mobile viewport (375px) and document issues
- [x] Create mobile bottom navigation bar (Home, Browse, Dashboard, Profile + Admin for admins)
- [x] Add app shell with safe-area handling, viewport-fit=cover, PWA meta tags, MobileHeader + MobileBottomNav
- [x] Redesign Home page for mobile-first (compact hero, horizontal-scroll cards, full-width CTAs, scrollbar-hide)
- [x] Redesign Catalog/Browse with mobile-friendly filters (bottom sheet, horizontal category chips, single-column grid, larger touch targets)
- [x] Redesign Grant Detail for mobile (sticky bottom CTA, collapsible sections, compact header, horizontal-scroll related grants, 2-col details grid)
- [x] Optimize Dashboard, Profile, Contact, Privacy, Terms, Refund pages for mobile (compact spacing, touch-friendly inputs, no footer on mobile, pb-24 for bottom nav)
- [x] Add PWA manifest.json (standalone display, portrait, theme-color #0f172a) and meta tags for Add to Home Screen
- [x] Ensure all touch targets are 44px+ (h-11/h-12 buttons, p-3/p-4 cards) and spacing is thumb-friendly
- [x] Test all pages — 183 vitest tests passing, no TypeScript errors, dev server running

## Pull-to-Refresh
- [x] Create reusable usePullToRefresh hook with touch gesture handling (rubber-band resistance, threshold, scroll-top gating)
- [x] Create PullToRefresh visual indicator component (rotating arrow + spinner + text labels)
- [x] Integrate pull-to-refresh into Catalog page (invalidates catalog.list, catalog.count, grants.savedList + toast confirmation)
- [x] Ensure it only activates on mobile (useIsMobile gating) and when scrolled to top (scrollY <= 5 check)
- [x] Fix React duplicate key error: MobileBottomNav used tab.href as key, but Dashboard+Profile both had getLoginUrl() when unauthenticated — changed to tab.label

## Skeleton Loading
- [x] Create CatalogCardSkeleton component matching CatalogCard layout (staggered pulse animation)
- [x] Integrate skeleton into Catalog page during loading (4 on mobile, 9 on desktop)
- [x] Add skeleton to Home page preview section (5 skeletons when data is loading)

## GrantDetail Skeleton
- [x] Create GrantDetailSkeleton component matching GrantDetail layout (mobile header, desktop header, content cards, sidebar, sticky CTA)
- [x] Integrate skeleton into GrantDetail page — replaces Loader2 spinner with full-page skeleton

## State & City for Grants
- [x] Add state and city columns to grants schema and migrate (with state index)
- [x] Build AI enrichment script to fill state/city for all 630+ grants (568 with state, 522 with city, 36 unique states)
- [x] Update backend API to expose state/city and add state filter (catalog.list, createGrant, updateGrant)
- [x] Update CatalogCard to show state/city (smart display: City, State or Nationwide)
- [x] Update GrantDetail page to show state/city (header chips + details section on mobile and desktop)
- [x] Add state filter to FilterBar (mobile bottom sheet + desktop advanced panel, fetches distinct states from API)
- [x] Update admin panel grant form with state/city fields
- [x] Write tests for new state filter (7 tests all passing)

## Sort by State
- [x] Add "state" sort option to backend listGrants function
- [x] Add "State" option to FilterBar sort dropdown (mobile + desktop)
- [x] Write vitest test for sort-by-state (8 tests all passing)

## City Filter (appears after state selection)
- [x] Add backend endpoint catalog.cities to return distinct cities for a given state
- [x] Add city filter to backend listGrants query
- [x] Update FilterBar with dynamic city dropdown that appears when state is selected (mobile + desktop)
- [x] Wire city filter state in Catalog.tsx and pass to backend (resets city when state changes)
- [x] Write vitest tests for city filter (13 total state/city tests, 196 overall all passing)

## Translation Audit & Fix — UI Functional Strings
- [x] Audit all hardcoded English strings in FilterBar, GrantDetail, CatalogCard
- [x] Add new i18n keys to types.ts (filters + grantDetail sections)
- [x] Add translations to en.ts, ka.ts, ru.ts, fr.ts, es.ts
- [x] Replace hardcoded strings in FilterBar.tsx with t() calls
- [x] Replace hardcoded strings in GrantDetail.tsx with t() calls (35+ strings replaced)
- [x] Replace hardcoded strings in CatalogCard.tsx with t() calls
- [x] Run tests and verify (196 tests all passing)

## Admin Panel i18n Translation
- [x] Audit all hardcoded English strings in Admin.tsx (150+ strings found)
- [x] Add admin section keys to types.ts (150+ keys)
- [x] Add translations to en.ts, ka.ts, ru.ts, fr.ts, es.ts
- [x] Replace hardcoded strings in Admin.tsx with t() calls (150+ strings, 0 TS errors)
- [x] Run tests and verify (196 tests all passing, 0 TS errors)

## Enriched Content Translation (4 languages)
- [x] Audit current translation coverage for enriched fields (schema needs 6 new columns)
- [x] Build LLM batch translation script for enriched fields
- [x] Run translation for all grants × 4 languages (KA, FR, ES, RU) — 609/609, 0 errors
- [x] Verify translation results in database (609/609 translated, all 4 languages)
- [x] Run tests and verify (196 tests all passing, 0 TS errors)

## Navbar i18n Translation
- [x] Audit Navbar component for hardcoded English strings (found: Dashboard, Admin, Login, Logout, Legal, User in Navbar, MobileHeader, MobileBottomNav)
- [x] Add navbar i18n keys to types.ts and all 5 language files (dashboard, admin, login, logout, legal, user)
- [x] Replace hardcoded strings in Navbar, MobileHeader, MobileBottomNav with t() calls
- [x] Run tests and verify (196 tests all passing, 0 TS errors)

## Profile Page i18n Translation
- [x] Audit Profile page for hardcoded English strings (only 2 remaining: admin access msg + plan name)
- [x] Add profile i18n keys to types.ts and all 5 language files (adminAccess, planName)
- [x] Replace hardcoded strings in Profile page with t() calls (adminAccess + planName)
- [x] Run tests and verify (196 tests all passing, 0 TS errors)

## Full Redesign: Sun & Moon Dual Theme System
- [x] Add dark theme CSS variables to index.css (.dark {} block)
- [x] Update Sun (light) theme CSS variables for warmer, more refined palette
- [x] Enable theme switching in ThemeContext (switchable=true)
- [x] Add Sun/Moon toggle button component
- [x] Add Sun/Moon toggle to Navbar (desktop)
- [x] Add Sun/Moon toggle to MobileHeader (mobile)
- [x] Redesign Navbar — use semantic colors, refined typography, theme-aware
- [x] Redesign MobileHeader — use semantic colors, theme-aware
- [x] Redesign MobileBottomNav — use semantic colors, theme-aware
- [x] Redesign Home.tsx hero section — theme-aware gradient, semantic colors
- [x] Redesign Home.tsx How It Works section — theme-aware
- [x] Redesign Home.tsx Problem section — theme-aware
- [x] Redesign Home.tsx What You Get section — theme-aware
- [x] Redesign Home.tsx Preview section — theme-aware cards
- [x] Redesign Home.tsx Testimonials section — theme-aware
- [x] Redesign Home.tsx Pricing section — theme-aware
- [x] Redesign Home.tsx FAQ section — theme-aware
- [x] Redesign Home.tsx Newsletter section — theme-aware
- [x] Redesign Home.tsx Final CTA section — theme-aware
- [x] Redesign CatalogCard.tsx — theme-aware card styling
- [x] Redesign Catalog.tsx page — theme-aware header, grid, pagination
- [x] Redesign FilterBar.tsx — theme-aware filters, mobile bottom sheet
- [x] Redesign GrantDetail.tsx — theme-aware detail page
- [x] Redesign Dashboard.tsx — theme-aware dashboard
- [x] Redesign Profile.tsx — theme-aware profile page
- [x] Redesign Footer.tsx — theme-aware footer
- [x] Redesign PricingCTA.tsx — theme-aware CTA button
- [x] Redesign Contact.tsx — theme-aware contact page
- [x] Mobile responsiveness verification for both themes
- [x] Run all vitest tests and ensure passing (196 tests all passing)
