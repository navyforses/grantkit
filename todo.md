# GrantKit — TODO

## Current Status (April 2026)
- 3,650+ grants in MySQL, 29 countries, 10 categories
- 5 languages (EN 100%, FR ~80%, ES ~82%, RU ~81%, KA ~77%)
- Railway deploy (primary) + Vercel (staging)
- 196 vitest tests passing

---

## Completed (Summary)
- [x] Full-stack app: React 19 + Express + tRPC 11 + MySQL + Drizzle ORM
- [x] Auth (Manus OAuth) + Paddle subscription (monthly/annual)
- [x] Catalog with advanced filters (category, country, state, city, diagnosis, B-2 visa, funding type, deadline)
- [x] Full-text search (LIKE queries across name, description, organization)
- [x] Grant detail pages with enriched fields (applicationProcess, deadline, documentsRequired, etc.)
- [x] Admin panel: CRUD grants, user management, newsletter, CSV/Excel import/export
- [x] GrantedAI integration: 84,000+ external grant search + one-click import
- [x] Email notifications (Resend): subscription events + new grant alerts
- [x] SEO: sitemap.xml, robots.txt, meta tags, JSON-LD structured data
- [x] Mobile-first design: bottom nav, pull-to-refresh, skeleton loading, PWA manifest
- [x] Sun/Moon dual theme system
- [x] AI Grant Assistant (Anthropic SDK)
- [x] 5-language UI + catalog translations
- [x] LLM enrichment for all grants (applicationProcess, deadline, targetDiagnosis, etc.)
- [x] Repo cleanup: development artifacts moved to _archive/

---

## Planned

### Phase 1: Onboarding + Dashboard + Smart Search
- [ ] 3-step onboarding flow (country + goal + need)
- [ ] Personalized dashboard based on onboarding preferences
- [ ] Smart search with Claude Haiku (semantic understanding, 5 languages)
- [ ] i18n strings for onboarding flow

### Phase 2: Translation Completion (95%+ coverage)
- [ ] Audit which grants are missing which language translations
- [ ] Generate missing translations with Claude
- [ ] Write to grant_translations table
- [ ] Verify all 5 languages at 95%+

### Phase 3: Data Enrichment
- [ ] Audit grant description quality (short descriptions)
- [ ] Enrich short descriptions using existing enrich-descriptions.ts
- [ ] Fill empty category/country/eligibility fields
- [ ] Update expired deadlines, find new ones
- [ ] Homepage counter update to reflect latest count

### Phase 4: Daily Discovery Routine
- [ ] Set up Claude Code Routine for daily grant discovery
- [ ] Automatic GrantedAI search + deduplication + import
- [ ] Newsletter notification for new grants

---

## Known Issues
- [ ] Railway deploy shows default page (needs investigation/fix)
- [ ] Translation coverage below 95% for FR/ES/RU/KA
- [ ] Some grant descriptions are only 1-2 sentences
