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
