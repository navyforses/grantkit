# Grants Table Schema Inventory

**Generated:** 2026-04-20

## All Fields on Grants Table

| Field Name | Type | Nullable | Default | Notes |
|------------|------|----------|---------|-------|
| `id` | int | ❌ | autoincrement | Primary key |
| `itemId` | varchar(64) | ❌ | — | Unique slug/identifier |
| `name` | text | ❌ | — | Grant name |
| `organization` | text | ✅ | NULL | Funding organization |
| `description` | text | ✅ | NULL | Grant description |
| `category` | varchar(64) | ❌ | — | Category slug |
| `type` | enum (grant\|resource) | ❌ | "grant" | Grant vs resource |
| `country` | varchar(64) | ❌ | — | ISO country code |
| `eligibility` | text | ✅ | NULL | Eligibility criteria |
| `website` | text | ✅ | NULL | **Web URL** |
| `phone` | varchar(128) | ✅ | NULL | Contact phone |
| `email` (→ `grantEmail`) | varchar(320) | ✅ | NULL | Contact email |
| `amount` | text | ✅ | NULL | Funding amount |
| `status` | text | ✅ | NULL | Grant status |
| `applicationProcess` | text | ✅ | NULL | How to apply |
| `deadline` | text | ✅ | NULL | Application deadline |
| `fundingType` | varchar(64) | ✅ | NULL | Type of funding |
| `targetDiagnosis` | text | ✅ | NULL | Medical target (if health) |
| `ageRange` | varchar(32) | ✅ | NULL | Age eligibility |
| `geographicScope` | text | ✅ | NULL | Geographic scope |
| `documentsRequired` | text | ✅ | NULL | Required docs |
| `b2VisaEligible` | varchar(32) | ✅ | NULL | B2 visa eligibility |
| `state` | varchar(128) | ✅ | NULL | State/province |
| `city` | varchar(128) | ✅ | NULL | City |
| `address` | varchar(500) | ✅ | NULL | Full mailing address |
| `latitude` | decimal(10,7) | ✅ | NULL | Geocoded latitude |
| `longitude` | decimal(10,7) | ✅ | NULL | Geocoded longitude |
| `serviceArea` | varchar(100) | ✅ | NULL | e.g. "USA nationwide" |
| `officeHours` | varchar(200) | ✅ | NULL | Operating hours |
| `geocodedAt` | timestamp | ✅ | NULL | When geocoded |
| `isActive` | boolean | ❌ | true | Soft-delete flag |
| `createdAt` | timestamp | ❌ | NOW() | Created date |
| `updatedAt` | timestamp | ❌ | NOW() | Last updated |

## Contact/Web Fields Summary

**Contact fields that exist:**

- ✅ `website` — text (nullable)
- ✅ `phone` — varchar(128) (nullable)
- ✅ `email` (column name: `grantEmail`) — varchar(320) (nullable)

**Contact fields NOT present:**

- ❌ `facebook` / `twitter` / `linkedin` / other socials
- ❌ `sourceUrl` / `applicationUrl` (separate from `website`)

## Coverage Analysis

**Expected coverage queries** (to run locally via `DATABASE_URL`):

```typescript
// scripts/schema-coverage.ts
import { getDb } from '../server/db'
import { grants } from '../drizzle/schema'
import { sql, count, isNotNull, and, eq } from 'drizzle-orm'

async function coverageCheck() {
  const db = await getDb()
  if (!db) {
    console.error('DB connection failed')
    return
  }

  const [{ n: total }] = await db
    .select({ n: count() })
    .from(grants)
    .where(eq(grants.isActive, true))

  const [{ n: withWebsite }] = await db
    .select({ n: count() })
    .from(grants)
    .where(and(eq(grants.isActive, true), isNotNull(grants.website)))

  const [{ n: withPhone }] = await db
    .select({ n: count() })
    .from(grants)
    .where(and(eq(grants.isActive, true), isNotNull(grants.phone)))

  const [{ n: withEmail }] = await db
    .select({ n: count() })
    .from(grants)
    .where(and(eq(grants.isActive, true), isNotNull(grants.email)))

  const [{ n: withAddress }] = await db
    .select({ n: count() })
    .from(grants)
    .where(and(
      eq(grants.isActive, true),
      isNotNull(grants.address),
      sql`LENGTH(${grants.address}) > 5`
    ))

  const [{ n: withCoords }] = await db
    .select({ n: count() })
    .from(grants)
    .where(and(
      eq(grants.isActive, true),
      isNotNull(grants.latitude),
      isNotNull(grants.longitude)
    ))

  console.log('\n=== Coverage Report (643 active grants) ===')
  console.log(`Total active:              ${total}`)
  console.log(`With website URL:          ${withWebsite} (${((withWebsite / total) * 100).toFixed(1)}%)`)
  console.log(`With phone:                ${withPhone} (${((withPhone / total) * 100).toFixed(1)}%)`)
  console.log(`With email:                ${withEmail} (${((withEmail / total) * 100).toFixed(1)}%)`)
  console.log(`With valid address:        ${withAddress} (${((withAddress / total) * 100).toFixed(1)}%)`)
  console.log(`With lat/lng coordinates:  ${withCoords} (${((withCoords / total) * 100).toFixed(1)}%)`)
}

coverageCheck().catch(console.error)
```

## Next Steps

1. **Operator runs:** `export DATABASE_URL=... && pnpm tsx scripts/schema-coverage.ts`
2. Report coverage percentages back here
3. User decides Phase 8.5.A2 strategy based on coverage

---

## Key Findings for Phase 8.5.A2

- **Website URL:** Field exists (`website` — text)
- **Contact info:** phone + email present (not separate app URL)
- **Location:** address + lat/lng + serviceArea all present
- **No social media fields** — would require schema extension

**Implication:** Phase 8.5.A2 can enrich missing location data and fix ambiguous centroids, but cannot populate social URLs without schema change.
