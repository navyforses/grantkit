# Mobile Audit Findings (375px viewport)

## Home Page
- Navbar: All nav items crammed together, overlapping text, no hamburger menu
- Hero: Text is readable but padding could be tighter
- Stats row: "Monthly" text gets cut off, 4 items too tight at 375px
- Cards: Preview cards need full-width treatment
- CTA buttons: OK size but could be larger for thumb targets
- Footer: Needs mobile-specific layout

## Navbar (Global)
- CRITICAL: No mobile hamburger menu - all items shown inline causing overflow
- User name "shako jincharadze" takes too much space
- Language selector overlaps with other items
- Need: Hamburger menu for mobile, bottom tab bar for app-like nav

## Key Mobile Issues to Fix
1. No hamburger menu / mobile nav
2. No bottom tab bar (app-like)
3. Cards not optimized for mobile
4. Filter bar on Catalog page needs bottom sheet treatment
5. Touch targets too small in many places
6. No safe-area-inset handling
7. No PWA manifest for "Add to Home Screen"
8. Stats row overflow on small screens
