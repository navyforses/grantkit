# Deferred Issues

Issues explicitly deferred from Phase 8 with rationale.

---

## D1 — Static catalog bundle size (P2)

**File:** `client/src/data/catalogData.ts`
**Impact:** Main bundle 632KB gzipped (target: < 500KB)
**Root cause:** Bundled static catalog data for offline fallback (original design pre-dates tRPC streaming)
**Effort:** ~1 day
**Deferral rationale:** The 800KB must-pass threshold is met. Removing the static fallback requires a multi-step migration (fallback handling throughout, error states) that exceeds Phase 8 scope.
**Recommendation:** When Phase 9 user profiles ship, use that sprint to also move catalog to server-only with skeleton loading and remove `catalogData.ts` from the bundle.

---

## D2 — Lighthouse performance scores (P2)

**Impact:** Cannot measure in sandbox (no headless browser)
**Architecture note:** Lazy loading (all pages), manual chunks (gmaps, react, framer, trpc), ErrorBoundary, proper semantic HTML, i18n aria-labels — all in place. Expected Perf ≥ 75, A11y ≥ 95 based on architecture.
**Deferral rationale:** Measurement requires a browser with network throttling. Recommend running Lighthouse CI on Railway production URL post-deploy.
**Recommendation:** Add Lighthouse CI to `.github/workflows/` in Phase 9.

---

## D3 — SSR meta tags for social preview (P2)

**Impact:** `react-helmet-async` injects meta tags after JS executes. Google crawler (JS-capable) works correctly. Older Facebook/Twitter crawlers that don't execute JS will see default meta tags from `index.html`.
**Effort:** 4–8 hours
**Deferral rationale:** Google is the primary traffic source and fully supports JS-rendered meta. MVP launch acceptable without SSR. Client-side SEO is industry-standard for SPAs.
**Recommendation:** If social sharing traffic becomes material, add Express middleware that detects crawler User-Agent and injects pre-rendered meta tags.

---

## D4 — MapPanel cluster marker accessibility (P3)

**File:** `client/src/components/MapPanel.tsx`
**Issue:** Cluster count bubbles (e.g. "42") have no `aria-label` for screen readers
**Effort:** ~2 hours
**Deferral rationale:** Cluster markers are secondary navigation. The underlying grant list (GrantList) is the accessible alternative.
**Recommendation:** Add `el.setAttribute('aria-label', \`\${count} grants in this area\`)` to the cluster renderer in Phase 9.

---

## D5 — hreflang tags on grant detail pages (P3)

**File:** `client/src/components/SEO.tsx`
**Issue:** SEO component does not emit `<link rel="alternate" hreflang="...">` tags
**Effort:** ~2 hours
**Deferral rationale:** Language-specific URL paths (e.g. `/ka/grant/...`) don't exist yet; hreflang requires consistent alternate URLs to be useful.
**Recommendation:** Implement when language-based routing is added.

---

_Last updated: 2026-04-19 by Jonas (Phase 8)_
