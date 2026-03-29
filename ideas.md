# GrantKit Design Brainstorm

<response>
<idea>
## Idea 1: "Clinical Trust" — Swiss Medical Design

**Design Movement**: Swiss/International Typographic Style meets healthcare UI
**Core Principles**:
1. Rigid grid system with mathematical precision — every element snaps to a 4px baseline
2. Information hierarchy through scale contrast — massive headlines vs. compact data
3. Restrained color — near-monochrome with a single accent color for actions
4. Functional beauty — every visual element serves a purpose

**Color Philosophy**: Deep navy (#1a2744) as the authority color, paired with pure white backgrounds. A single emerald green (#16a34a) reserved exclusively for CTAs and positive indicators. Slate grays (#64748b, #94a3b8) for secondary text. The restraint communicates medical seriousness.

**Layout Paradigm**: Asymmetric two-column layouts with a dominant content column (65%) and a supporting sidebar (35%). Hero uses a split layout — text left, abstract data visualization right. Grant cards use a tight horizontal list format rather than a traditional grid.

**Signature Elements**:
1. Thin horizontal rules that divide content sections like a medical chart
2. Country flag pills with subtle background tints matching the flag's dominant color
3. Monospaced numbers for amounts/deadlines to evoke data precision

**Interaction Philosophy**: Minimal, purposeful interactions. Hover states reveal additional grant details via smooth height expansion (no modals). Filter changes animate with a subtle slide-and-fade.

**Animation**: Staggered fade-in-up on scroll for grant cards (50ms delay between each). Section headings slide in from the left. Numbers count up when they enter viewport. All transitions use ease-out-cubic, 300ms max.

**Typography System**: DM Sans for headings (700 weight, tight letter-spacing -0.02em), Source Sans 3 for body (400/600 weights). Monospaced JetBrains Mono for amounts and dates. Size scale: 48/36/24/18/16/14px.
</idea>
<probability>0.08</probability>
<text>Swiss medical precision with asymmetric layouts and restrained color</text>
</response>

<response>
<idea>
## Idea 2: "Warm Authority" — Editorial Health Magazine

**Design Movement**: Editorial design meets modern SaaS — think The Economist meets Stripe
**Core Principles**:
1. Content-first hierarchy with generous whitespace as a luxury signal
2. Warm neutrals that feel approachable yet authoritative
3. Card-based information architecture with subtle depth
4. Typographic contrast as the primary visual device

**Color Philosophy**: Warm slate (#1e293b) for primary text, cream-white (#fafaf8) backgrounds, deep teal (#0f766e) for primary actions, and a warm amber (#d97706) for highlights and badges. The warmth makes medical/financial topics feel less intimidating.

**Layout Paradigm**: Full-width hero with centered content, then a staggered card grid (masonry-like) for grants. The landing page uses alternating full-bleed and contained sections. Problem section uses a three-column icon grid. Preview section uses a horizontal scroll carousel on mobile.

**Signature Elements**:
1. Subtle cream-to-white gradient backgrounds between sections
2. Rounded category badges with pastel tints matching category meaning (green=medical, blue=startup, etc.)
3. A thin teal left-border accent on cards that intensifies on hover

**Interaction Philosophy**: Warm and inviting — cards lift slightly on hover with a soft shadow expansion. Filters use pill-shaped toggle buttons that fill with color when active. Smooth scroll between sections.

**Animation**: Cards fade in with a gentle scale (0.97 → 1.0) and opacity transition. Section transitions use intersection observer with 100px threshold. Badge pills have a subtle bounce on filter activation. Hero text uses a typewriter-style reveal.

**Typography System**: Playfair Display for hero headline only (to create editorial gravitas), Inter for all other text (400/500/600/700). The contrast between serif hero and sans-serif body creates visual interest. Scale: 56/40/28/20/16/14px.
</idea>
<probability>0.06</probability>
<text>Editorial warmth with teal/amber accents and Playfair Display headlines</text>
</response>

<response>
<idea>
## Idea 3: "Structured Clarity" — Government Data Portal Reimagined

**Design Movement**: Data-driven design meets Scandinavian minimalism
**Core Principles**:
1. Dense but scannable — maximize information per viewport without clutter
2. Strong vertical rhythm with consistent section spacing
3. Color-coded categorization as a wayfinding system
4. Flat design with strategic micro-shadows for depth

**Color Philosophy**: Pure white (#ffffff) canvas, charcoal (#0f172a) text, deep blue (#1e3a5f) for navigation and headers. Each grant category gets its own muted color: Medical=#2563eb (blue), Rehab=#7c3aed (violet), Rare Disease=#dc2626 (red), Pediatric=#f59e0b (amber), Startup=#059669 (emerald). CTAs use a vivid green (#22c55e).

**Layout Paradigm**: Top navigation with sticky filter bar. Landing page uses a bold left-aligned hero with a floating stats counter on the right. Grant directory uses a dense table-card hybrid — cards on mobile, compact rows on desktop. Sidebar filters on desktop, bottom sheet on mobile.

**Signature Elements**:
1. Category color dots/bars that create a visual rhythm across the page
2. A floating "sticky" CTA bar that appears after scrolling past the hero
3. Compact stat counters (50+ grants, 15+ countries) with bold numbers

**Interaction Philosophy**: Efficient and responsive — instant filter results with no loading states. Cards have a left-colored border that expands on hover. Country dropdown uses a searchable combobox. Smooth anchor scrolling between landing sections.

**Animation**: Minimal and fast — 200ms transitions max. Cards use a simple opacity fade on filter changes. Stats counter animates numbers on viewport entry. Filter pills slide horizontally with spring physics. No decorative animations.

**Typography System**: DM Sans throughout (400/500/700) for clean uniformity. Hero uses 700 weight at 52px. Category labels use 500 weight, uppercase, 12px with 0.05em tracking. Body at 16px/24px line-height. The single-family approach reinforces the data-focused identity.
</idea>
<probability>0.07</probability>
<text>Data portal clarity with category color-coding and dense layouts</text>
</response>
