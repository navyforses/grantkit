# GrantKit

> Curated database of **3,650+ grants**, foundations, and support resources for individuals, families, and caregivers across **29 countries**. Organized by category, country, and eligibility. Subscription-based SaaS.

---

## Features

- **Grants & Resources Catalog** — Browse, search, and filter 3,650+ entries by category, country, condition, funding type, state, city, and more
- **5-Language Support** — Full UI and catalog content in English, French, Spanish, Russian, and Georgian
- **Advanced Filters** — Filter by diagnosis, B-2 visa eligibility, funding type, deadline, state, and city
- **AI Grant Assistant** — Chat-powered grant discovery using Anthropic Claude
- **User Dashboard** — Save grants, track favorites, manage subscription
- **Admin Panel** — Full CRUD for grants, user management, newsletter notifications, CSV/Excel import/export
- **External Grant Search** — Search 84,000+ grants and 133,000+ US foundations via GrantedAI API directly from the admin panel
- **Subscription & Payments** — Paddle integration for monthly/annual plans
- **Email Notifications** — Resend-powered email alerts for new grants and subscription events
- **SEO Optimized** — Server-side sitemap, robots.txt, meta tags, JSON-LD structured data
- **Mobile-First Design** — Responsive UI with bottom navigation, pull-to-refresh, skeleton loading, PWA manifest
- **Dual Theme** — Sun & Moon theme system (light/dark)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite, TailwindCSS 4 |
| **UI Components** | Radix UI, Framer Motion, Recharts |
| **Backend** | Node.js 22, Express, tRPC 11 |
| **Database** | MySQL, Drizzle ORM |
| **Auth** | OpenID / JWT (jose) — Manus OAuth |
| **Payments** | Paddle |
| **Email** | Resend |
| **AI** | Anthropic Claude SDK |
| **Deployment** | Railway (primary), Vercel (staging), Docker |

## Project Structure

```
grantkit/
├── client/src/
│   ├── pages/          # Home, Catalog, Dashboard, Admin, Profile, etc.
│   ├── components/     # Navbar, FilterBar, CatalogCard, AIChatBox, etc.
│   ├── contexts/       # LanguageContext (i18n), ThemeContext
│   ├── i18n/           # Translation files (en, fr, es, ru, ka)
│   └── main.tsx        # tRPC client setup
├── server/
│   ├── _core/          # Express entry, tRPC setup, env, OAuth
│   ├── routers.ts      # All tRPC API endpoints
│   ├── db.ts           # Database queries (Drizzle ORM)
│   ├── externalGrants.ts # GrantedAI API integration
│   ├── emailService.ts # Resend email notifications
│   ├── toolboxClient.ts # AI assistant
│   └── importGrants.ts # CSV/Excel bulk import
├── drizzle/
│   └── schema.ts       # MySQL table definitions
├── scripts/            # Enrichment and utility scripts
├── Dockerfile          # Multi-stage production build
└── vercel.json         # Vercel frontend config
```

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 10+
- MySQL database

### Installation

```bash
# Clone the repository
git clone https://github.com/navyforses/grantkit.git
cd grantkit

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL, API keys, etc.

# Push database schema
pnpm db:push

# Start development server
pnpm dev
```

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server with hot reload |
| `pnpm build` | Build for production (Vite + esbuild) |
| `pnpm start` | Run production server |
| `pnpm test` | Run tests with Vitest |
| `pnpm check` | TypeScript type checking |
| `pnpm db:push` | Push Drizzle schema to database |

## Internationalization (i18n)

GrantKit supports 5 languages with full UI and catalog content translations:

| Language | Code | Coverage |
|----------|------|----------|
| English | `en` | 100% (base) |
| French | `fr` | ~80% catalog + 100% UI |
| Spanish | `es` | ~82% catalog + 100% UI |
| Russian | `ru` | ~81% catalog + 100% UI |
| Georgian | `ka` | ~77% catalog + 100% UI |

## API Endpoints

All API endpoints use tRPC at `/api/trpc`.

### Public
- `catalog.list` — Browse grants with filters and pagination
- `catalog.detail` — Get grant details by item ID
- `catalog.preview` — Diverse category preview for homepage

### Protected (Auth required)
- `grants.savedList` — Get user's saved grant IDs
- `grants.toggleSave` — Save/unsave a grant
- `subscription.status` — Get subscription status
- `ai.grantChat` — AI-powered grant discovery chat

### Admin
- `admin.grants` — List all grants with search/filter
- `admin.createGrant` / `admin.updateGrant` / `admin.deleteGrant` — Grant CRUD
- `admin.searchExternal` — Search 84,000+ external grants
- `admin.importExternal` — Import external grant to catalog
- `admin.searchFunders` — Search 133,000+ US foundations
- `admin.parseImport` / `admin.executeImport` — CSV/Excel bulk import

## License

MIT

---

Built with React, tRPC, Drizzle ORM, and Claude AI.
