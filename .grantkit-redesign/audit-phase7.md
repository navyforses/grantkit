# Phase 7 Audit Report — Mobile & i18n
**Auditor:** Amina (Mobile & Accessibility Lead)
**Date:** 2026-04-19
**Branch:** claude/review-project-plan-57ppn

---

## i18n Coverage Audit

### Method
- Automated key-path extraction across all 5 language files (en, fr, es, ru, ka)
- Python recursive TS object parser extracted 954 leaf key paths from `en.ts`
- Compared against fr, es, ru, ka

### Result
**954/954 keys present in all 5 languages** — 100% coverage before fixes.

### Issues found & fixed (P0)
| Key | Was missing | Fixed |
|-----|------------|-------|
| `toolbar.ariaLabel` | All 5 languages — new key | ✅ Added |
| `toolbar.search.clearAriaLabel` | All 5 languages — new key | ✅ Added |
| `toolbar.view.ariaLabel` | All 5 languages — new key | ✅ Added |

These keys were missing from `types.ts` (the TypeScript interface) — they needed to be added to both the interface and all 5 language files.

### Georgian natural phrasing review
Reviewed all `ka.ts` sections added in Phases 4A–6:
- `toolbar.*` — ✅ Natural Georgian phrasing
- `mobileCatalog.*` — ✅ Natural Georgian phrasing  
- `detail.*` — ✅ Natural Georgian phrasing
- `deepLink.*` — ✅ Natural Georgian phrasing (გაიხსნება = "will open" is correct)
- `map.*` — ✅ Natural Georgian phrasing
- New audit keys added: კატალოგის ფილტრები, ძიების გასუფთავება, ხედვის რეჟიმი ✅

---

## Mobile Responsive Audit

### Viewport range tested: 375px – 1920px

#### CatalogToolbar
**P0 issue found & fixed:** `CatalogToolbar.tsx` had `h-12 flex items-center gap-3` with no overflow handling. On a 375px viewport, the 8 controls (search + 5 dropdowns + spacer + view toggle) overflowed without scroll.

**Fix applied:**
- Added `overflow-x-auto scrollbar-hide` to toolbar container
- Search input changed from `flex-1 max-w-[480px]` → `flex-shrink-0 w-36 sm:flex-1 sm:w-auto sm:max-w-[480px]` so it doesn't push everything off screen on mobile
- All dropdown trigger buttons got `flex-shrink-0` so they render at full width
- Spacer div hidden on mobile (`hidden sm:flex flex-1`) — view toggle follows dropdowns on small screens
- Padding reduced on mobile: `px-2 sm:px-6`

**Result:** On 375px the toolbar scrolls horizontally. All controls accessible.

#### GrantDetail
- Breadcrumb bar: compact at all sizes ✅
- 2-col grid: stacks at < `lg` (1024px) ✅ 
- Related grants: horizontal snap-scroll on mobile, 3-col grid on lg+ ✅
- Sticky bottom CTA: `bottom-16` clears MobileBottomNav ✅
- `safe-area-bottom` class present on sticky bar ✅
- Footer hidden on mobile (by design — avoids duplication with sticky CTA) — P1, see below

#### MobileCatalogView
- Tab buttons: `h-11` = 44px tap target ✅ (WCAG 2.5.5 AA target size 44×44px)
- List/Map label shown with count ✅
- Focus ring: `focus-visible:ring-2 focus-visible:ring-inset` ✅

#### MobileBottomNav
- Tab items: `flex-1 h-full` fills full 64px height ✅
- `aria-current="page"` on active tab ✅
- Icon + label layout ✅
- `safe-area-bottom` class present ✅

#### SplitView
- 40/60 on md–lg, 50/50 on lg+ ✅
- Not shown on mobile (replaced by MobileCatalogView) ✅

#### CatalogCardCompact
- 92px row: readable at all tablet/desktop widths ✅
- Not shown on mobile ✅

#### Navbar
- Desktop-only (`md:block`) — mobile uses MobileHeader + MobileBottomNav ✅

---

## Accessibility Audit (WCAG 2.2 AA)

### P0 — Fixed in this phase

| Issue | Location | Fix |
|-------|----------|-----|
| Invalid HTML: `<a>` wrapping `<button>` in breadcrumb | `GrantDetail.tsx:321-332` | Removed inner `<button>` elements; moved classes + aria-label to `<Link>` (renders as `<a>`). Added `aria-current="page"` on current crumb, `aria-hidden="true"` on chevron icons. |
| Hardcoded English `aria-label="Catalog filters"` | `CatalogToolbar.tsx:149` | Now uses `t.toolbar.ariaLabel` |
| Hardcoded English `aria-label="View mode"` | `CatalogToolbar.tsx:329` | Now uses `t.toolbar.view.ariaLabel` |
| Hardcoded English `aria-label="Clear search"` | `CatalogToolbar.tsx:176` | Now uses `t.toolbar.search.clearAriaLabel` |

### P1 — Documented for Jonas (Phase 8)

| Issue | Location | Recommendation |
|-------|----------|----------------|
| Footer hidden on mobile in GrantDetail | `GrantDetail.tsx:729` | Show a minimal footer row (privacy/terms links + copyright) on mobile below the sticky CTA, or include those links in MobileBottomNav. |
| GrantList keyboard navigation: `CatalogCardCompact` rows have `tabIndex={0}` and `onKeyDown` for Enter/Space but no `role="article"` or `role="listitem"` | `CatalogCardCompact.tsx` | Add `role="article"` or `role="button"` for clearer AT announcement. |
| MapPanel: map container has no `role="application"` or `aria-label` | `MapPanel.tsx` | Add `role="application" aria-label={t.map.ariaLabel}` — needs new i18n key. |
| LocationMap: map div has `role="region"` + `aria-label` but the info-window opens outside React — no focus trap | `LocationMap.tsx` | Low-priority: InfoWindow is Google's own popup; focus management is handled by Google Maps SDK. |
| CatalogToolbar: disabled State/City dropdowns have `aria-disabled` but also `disabled` attribute — screen readers may read both | `CatalogToolbar.tsx` | Keep `disabled` for native behaviour; remove `aria-disabled` redundancy since `disabled` already communicates this. Low impact. |

### P2 — Nice-to-have for future

- Add `prefers-reduced-motion` media query guard to pulsing ring animation in MapPanel
- Add `<main>` landmark to Catalog page
- Consider skip-navigation link for keyboard users on the catalog page

---

## Verification Gates

- ✅ `pnpm check` — 0 TypeScript errors
- ✅ `pnpm build` — clean (only pre-existing chunk-size + direct-eval warnings)
- ✅ i18n: 957/957 keys (954 original + 3 new) across all 5 languages

---

## Files Changed

| File | Change |
|------|--------|
| `client/src/i18n/types.ts` | Added `toolbar.ariaLabel`, `toolbar.search.clearAriaLabel`, `toolbar.view.ariaLabel` |
| `client/src/i18n/en.ts` | Added 3 new toolbar keys (English) |
| `client/src/i18n/fr.ts` | Added 3 new toolbar keys (French) |
| `client/src/i18n/es.ts` | Added 3 new toolbar keys (Spanish) |
| `client/src/i18n/ru.ts` | Added 3 new toolbar keys (Russian) |
| `client/src/i18n/ka.ts` | Added 3 new toolbar keys (Georgian) |
| `client/src/components/CatalogToolbar.tsx` | Mobile overflow-x-auto; i18n aria-labels; flex-shrink-0 on dropdowns/toggle |
| `client/src/pages/GrantDetail.tsx` | Fixed breadcrumb: removed `<button>` inside `<Link>`; added `aria-current="page"` + `aria-hidden` on chevrons |
