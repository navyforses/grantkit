# Phase 9 — Performance Audit

> Generated: 2026-05-03
> Scope: theoretical analysis based on bundle profile (Phase 10) + code review.
> Live Lighthouse blocked — see "What's blocked" at bottom.

## Summary — predicted Lighthouse on `/`

| Metric | Predicted | Cause |
|---|---|---|
| **LCP** (Largest Contentful Paint) | 🔴 ~4–6 s on 4G | 2.55 MB initial JS + 369 KB index.html parsed before any render |
| **FID / INP** (interactivity) | 🟡 ~200–400 ms | Same — main thread blocked parsing JS |
| **CLS** (layout shift) | ✅ probably good | Tailwind + Radix UI components are stable |
| **TBT** (Total Blocking Time) | 🔴 ~1.5–3 s | Direct consequence of bundle size |
| **Speed Index** | 🟡 ~3–5 s | Better than LCP because critical CSS is inline-able, but still slow |
| **Performance score** | 🔴 ~30–55 / 100 | Mobile would be worse |

These are **estimates from bundle analysis**. Real numbers need an operator to run Lighthouse on the live URL.

## Top performance hits

### 1. 369 KB index.html (Phase 10 finding #1)

`vite-plugin-manus-runtime` injects 200+ KB of inline JS into production HTML. This blocks parsing, blocks paint, and inflates TTFB. **Fix is 2 minutes.** See `10-bundle.md` for the patch.

Expected effect: **LCP drops by ~500 ms on slow connections.**

### 2. 2.55 MB initial JS (Phase 10 finding #2)

Single biggest performance cost. Until profiled with `rollup-plugin-visualizer`, root cause is theoretical, but likely:
- Eager imports of route components in `App.tsx` / `main.tsx`
- Lucide icons imported as `import {...} from "lucide-react"` (full barrel)
- Framer Motion eagerly bundled

Expected effect of fixing: **LCP drops by 1–2 s.**

### 3. No Service Worker / PWA caching

Looking at `client/public/manifest.json`, the app declares itself a PWA but there's no service worker (`grep -rn "serviceWorker\|workbox" client/`). Repeat visitors download everything fresh every time.

**Fix:** add `vite-plugin-pwa` with default Workbox config — gives:
- App shell caching (instant revisits)
- Offline fallback for catalog browsing
- Push-notification capability (future)

Estimated 1–2 hours of work, large UX win on revisits.

### 4. No prefetch on route navigation

`wouter` (the router) doesn't ship route-prefetch out of the box. When a user hovers `/catalog`, the chunk should pre-download. Currently it only loads on click.

**Fix:** wrap `<Link>` with hover-prefetch logic or use `<link rel="prefetch">` on visible nav items.

### 5. Google Fonts blocking render

`client/index.html` loads:
```html
<link href="https://fonts.googleapis.com/css2?family=DM+Sans..." rel="stylesheet" />
```

This is a render-blocking external CSS request before paint. Already optimized with `preconnect` for `fonts.googleapis.com` and `fonts.gstatic.com`, which helps — but the request itself is still blocking.

**Options:**
- Self-host the fonts (eliminate external roundtrip)
- Use `font-display: swap` (already implied by `display=swap` in URL — verify)
- Inline critical font subsets

### 6. No image optimization pipeline

`client/index.html` references `og-image-LT43qbv2mf3WDHuJv8pmuH.png` from CloudFront. Not a render path issue (it's just OG metadata), but worth checking on `/`, `/catalog`, `/organizations/:id`:
- Are images served as WebP/AVIF?
- Are they responsive (`srcset`)?
- Are below-the-fold images `loading="lazy"`?

This needs Lighthouse output to confirm.

## Code-level performance smells

### `country-state-city` — 8.7 MB

✅ Correctly split off main bundle. Loaded only when needed. Good.

### `streamdown` markdown chunks (~5 MB total)

Loaded only when AI chat renders code blocks. Good design, but see Phase 10 #3 — could be trimmed.

### Server response time

Cannot measure from sandbox (blocked). But:
- `/healthz` returns `{"status":"ok"}` — fast
- tRPC endpoints use Drizzle + MySQL — should be fast for indexed queries
- Bundle audit doesn't tell us about server latency — needs operator measurement

## Recommendations (priority)

| # | Action | Effort | Win |
|---|---|---|---|
| 1 | Disable `vitePluginManusRuntime` in prod | 2 min | LCP −500 ms |
| 2 | Lazy-load remaining pages (Onboarding, Profile, Admin, AiAssistant) | 1 hr | LCP −1 s |
| 3 | Add `vite-plugin-pwa` for caching | 1–2 hr | Repeat-visit instant |
| 4 | Self-host Google Fonts | 30 min | LCP −100 ms |
| 5 | Add route prefetch on hover | 30 min | Click-to-paint feels instant |
| 6 | Image audit (WebP, responsive, lazy) | needs Lighthouse data | TBD |

## What's blocked

Real Lighthouse measurements need operator access. From your machine:

```bash
# Install lighthouse CLI
npm i -g lighthouse

# Run against prod
lighthouse https://grantkit-production-06f7.up.railway.app/ \
  --preset=desktop \
  --output=json \
  --output-path=./lighthouse-home-desktop.json

lighthouse https://grantkit-production-06f7.up.railway.app/ \
  --preset=mobile \
  --output=json \
  --output-path=./lighthouse-home-mobile.json

lighthouse https://grantkit-production-06f7.up.railway.app/catalog \
  --output=json --output-path=./lighthouse-catalog.json
```

Or simpler: open Chrome DevTools → Lighthouse tab → Generate report.

Paste the four scores (Performance / A11y / Best Practices / SEO) for each route + the LCP / CLS / TBT numbers and I'll annotate against the bundle findings above.
