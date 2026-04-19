# GrantKit Redesign — Launch Report

**Launched:** 2026-04-19
**Production URL:** https://grantkit-production-06f7.up.railway.app
**Duration:** 2026-04-16 to 2026-04-19 (4 days)
**Engineer:** Jonas (Release Engineer, Phase 8)

---

## Phases Completed

| Phase | Description | Status | Engineer |
|-------|-------------|--------|---------|
| 0 | Email/password authentication | ✅ | Mira |
| 1 | Database schema migration (geocoding cols) | ✅ | Dmitri |
| 2 | Geocoding pipeline | ✅ | Yuki |
| 3 | Google Maps setup + LocationMap component | ✅ | Luca |
| 4A | CatalogToolbar + QuickChips | ✅ | Priya |
| 4B | Split-view Catalog layout | ✅ | Arash |
| 5 | GrantDetail page rewrite | ✅ | Sofia |
| 6 | Google Maps deep-link audit | ✅ | Kenji |
| 7 | Mobile + i18n full audit | ✅ | Amina |
| 8 | Polish, testing, deploy | ✅ | Jonas |

---

## Phase 8 Fixes (Jonas)

### P1 Issues Resolved

| Issue | Location | Fix |
|-------|----------|-----|
| MapPanel `role="region"` incorrect for interactive map | `MapPanel.tsx:319` | Changed to `role="application"`, aria-label now uses new `t.map.ariaLabel` i18n key |
| CatalogToolbar `aria-disabled` redundant with `disabled` | `CatalogToolbar.tsx` | Removed `aria-disabled` attribute; `disabled` already communicates this to ATs |
| Footer hidden on mobile in GrantDetail — no legal links | `GrantDetail.tsx` | Added minimal mobile footer row (Privacy · Terms · © GrantKit) above sticky CTA |

### P2 Issues Resolved

| Issue | Location | Fix |
|-------|----------|-----|
| No `prefers-reduced-motion` guard on pulsing ring animation | `MapPanel.tsx` | Added `@media (prefers-reduced-motion: reduce)` to MAP_PANEL_CSS |
| No `<main>` landmark on Catalog page | `Catalog.tsx` | Added `<main id="catalog-main">` wrapping the catalog content area |
| No skip-navigation link for keyboard users | `Catalog.tsx` | Added SR-visible skip-nav link `#catalog-main` at top of Catalog |

### SEO & Infrastructure

| Item | Details |
|------|---------|
| `robots.txt` | Created at `client/public/robots.txt`. Disallows AI crawlers (GPTBot, ClaudeBot, Google-Extended), /admin, /api/, /dev/ |
| Sitemap generation | `scripts/generate-sitemap.ts` — generates XML from DB grants (fallback to bundled catalog). Added `pnpm sitemap:generate` script |
| `map.ariaLabel` i18n key | Added to types.ts + all 5 languages (en/fr/es/ru/ka) |

### Pre-existing (not changed)

- ✅ `react-helmet-async` + `SEO.tsx` + `GrantJsonLd.tsx` already in use on all pages
- ✅ `vite.config.ts` manual chunks already configured (vendor-gmaps, vendor-react, vendor-framer, vendor-trpc, vendor-csc)
- ✅ All pages lazy-loaded in `App.tsx`
- ✅ `ErrorBoundary` wrapping entire app
- ✅ 100% i18n coverage (957 keys × 5 languages), confirmed by Amina (Phase 7)

---

## Build Metrics

| Metric | Value |
|--------|-------|
| `pnpm check` | ✅ 0 TypeScript errors |
| `pnpm build` | ✅ Clean (only pre-existing chunk-size + direct-eval warnings) |
| `pnpm test` | ✅ 195/196 tests pass (1 skipped — expected) |
| Main bundle (gzipped) | ~632 KB (above 500KB target, within 800KB must-pass) |
| vendor-gmaps (gzipped) | ~7.9 KB (lazy-loaded, excellent) |
| vendor-react (gzipped) | ~4.3 KB |
| vendor-framer (gzipped) | ~38.6 KB |
| vendor-trpc (gzipped) | ~23 KB |

**Bundle note:** The 632KB main bundle is pre-existing and driven primarily by the bundled static catalog data (`catalogData.ts`). The `vendor-csc` (country-state-city) is 2.3MB gzipped but cached separately. Breaking up `catalogData.ts` into paginated/lazy fetched data would require a dedicated sprint (deferred — see below).

---

## Languages

5 languages fully covered: English (en), French (fr), Spanish (es), Russian (ru), Georgian (ka)
- 957 i18n keys × 5 languages = 4,785 key-values
- Georgian phrasing reviewed by Amina (native speaker)

---

## Grants in Catalog

637 active grants (629 original + 8 imported 2026-04-16)

---

## Known Deferred Items

See also `.grantkit-redesign/deferred-issues.md`.

### Performance
- **Static catalog bundle** — `catalogData.ts` is included in the main bundle for offline fallback. Moving to DB-only with proper error handling would cut the main bundle by ~40%. Estimated: 1 day.
- **Lighthouse scores** — Cannot be measured in sandbox (no browser). Target: Perf ≥ 75, A11y ≥ 95. Architecture is positioned for these scores (lazy loading, manual chunks, ErrorBoundary, semantic HTML, i18n aria-labels).

### SSR / SEO
- **Server-side meta tag rendering** — Currently using react-helmet-async (client-side). For guaranteed social preview cards (Facebook, older Twitter crawler), SSR meta injection per crawler user-agent would be ideal. Estimated: 4-8 hours.
- **hreflang tags** — SEO component supports canonical URL but not hreflang per-language. Could be added to `SEO.tsx` when language-specific URL routes are implemented.

### Maps
- **LocationMap InfoWindow focus trap** — Google Maps SDK manages focus for its own popups; no React focus trap needed. Low priority.
- **MapPanel cluster accessibility** — Cluster markers (count bubbles) have no screen reader text. Could add `aria-label` to cluster element in the custom renderer.

---

## Post-launch Priorities (Phase 9+)

1. **User profile system** — Match badge, smart matching algorithm, saved search alerts
2. **Email digest** — Weekly "new grants matching your profile" via Resend
3. **AI Research Agent** — Premium tier, conversational grant discovery
4. **SEO** — SSR meta injection for crawler agents
5. **Bundle optimization** — Paginated catalog data, remove static fallback
6. **Mobile polish** — iOS PWA install prompt, Android share sheet

---

## Handover

Project transitions from "active redesign" to "maintenance + iteration" mode.

All 8 phases complete. Production URL deployed on Railway.
