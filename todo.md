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
