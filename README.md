# GrantKit

> Curated database of **643+ grants**, foundations, and support resources for individuals, families, and caregivers across **29 countries**. Organized by category, country, and eligibility. Updated monthly.

---

## Features

- **Grants & Resources Catalog** — Browse, search, and filter 643+ entries by category, country, condition, funding type, and more
- **5-Language Support** — Full UI and catalog content in English, French, Spanish, Russian, and Georgian
- **Advanced Filters** — Filter by diagnosis, B-2 visa eligibility, funding type, deadline, state, and city
- **User Dashboard** — Save grants, track favorites, manage subscription
- **Admin Panel** — Full CRUD for grants, user management, newsletter notifications, CSV/Excel import
- **External Grant Search** — Search 84,000+ grants and 133,000+ US foundations via GrantedAI API directly from the admin panel
- **Subscription & Payments** — Paddle integration for monthly/annual plans
- **Email Notifications** — Resend-powered email alerts for new grants
- **SEO Optimized** — Server-side meta tags, JSON-LD structured data
- **Mobile-First Design** — Responsive UI with bottom navigation, pull-to-refresh

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite, TailwindCSS 4 |
| **UI Components** | Radix UI, Framer Motion, Recharts |
| **Backend** | Node.js, Express, tRPC 11 |
| **Database** | MySQL, Drizzle ORM |
| **Auth** | OpenID / JWT (jose) |
| **Payments** | Paddle |
| **Email** | Resend |
| **Deployment** | Docker, Render |

## Project Structure

```
grantkit/
├── client/src/
│   ├── pages/          # Home, Catalog, Dashboard, Admin, Profile, etc.
│   ├── components/     # Navbar, FilterBar, CatalogCard, etc.
│   ├── contexts/       # LanguageContext (i18n)
│   ├── i18n/           # Translation files (en, fr, es, ru, ka)
│   └── data/           # Static catalog fallback + translations JSON
├── server/
│   ├── routers.ts      # All tRPC API endpoints
│   ├── db.ts           # Database queries (Drizzle ORM)
│   ├── externalGrants.ts # GrantedAI API integration
│   ├── emailService.ts # Resend email notifications
│   └── importGrants.ts # CSV/Excel bulk import
├── drizzle/
│   └── schema.ts       # MySQL table definitions
├── Dockerfile          # Multi-stage production build
└── render.yaml         # Render deployment config
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
# Edit .env with your database URL, Paddle keys, Resend API key, etc.

# Push database schema
pnpm db:push

# Start development server
pnpm dev
```

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server with hot reload |
| `pnpm build` | Build for production |
| `pnpm start` | Run production server |
| `pnpm test` | Run tests with Vitest |
| `pnpm check` | TypeScript type checking |
| `pnpm db:push` | Push Drizzle schema to database |

## Screenshots

### Home Page
The landing page features a hero section, problem statement, feature categories, preview entries, testimonials, pricing, and FAQ — all fully translated in 5 languages.

### Grants Catalog
Browse and filter 643+ grants with advanced search, category/country filters, condition filters, and pagination.

### Admin Panel
Manage users, grants, newsletter subscribers, and search external grant databases with the integrated GrantedAI API.

### External Grant Search
Search 84,000+ grants from federal, foundation, state, and international sources. Preview details and import into your catalog with one click.

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

All API endpoints use tRPC and are available at `/api/trpc`.

### Public
- `catalog.list` — Browse grants with filters and pagination
- `catalog.detail` — Get grant details by item ID
- `catalog.preview` — Get preview entries for non-subscribers

### Protected (Auth required)
- `grants.savedList` — Get user's saved grant IDs
- `grants.toggleSave` — Save/unsave a grant
- `subscription.status` — Get subscription status

### Admin
- `admin.grants` — List all grants with search/filter
- `admin.createGrant` — Add new grant
- `admin.searchExternal` — Search 84,000+ external grants
- `admin.importExternal` — Import external grant to catalog
- `admin.searchFunders` — Search 133,000+ US foundations

## License

MIT

---

Built with React, tRPC, and Drizzle ORM.
