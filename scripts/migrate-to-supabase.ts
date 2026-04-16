/**
 * migrate-to-supabase.ts
 *
 * Reads all grants from the MySQL database via Drizzle ORM and migrates them
 * to the Supabase resources table.
 *
 * Usage:
 *   npx tsx scripts/migrate-to-supabase.ts
 *
 * Required env vars:
 *   DATABASE_URL         — MySQL connection string (Railway / local)
 *   VITE_SUPABASE_URL    — Supabase project URL
 *   VITE_SUPABASE_ANON_KEY or SUPABASE_SERVICE_KEY — Supabase key
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import { grants, grantTranslations } from '../drizzle/schema'
import { eq } from 'drizzle-orm'

// ─── Supabase client ──────────────────────────────────────────────────────────

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY/VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// ─── Types ────────────────────────────────────────────────────────────────────

type ResourceType = 'GRANT' | 'SOCIAL' | 'MEDICAL'
type ResourceStatus = 'OPEN' | 'CLOSED' | 'UPCOMING' | 'ONGOING' | 'ARCHIVED'

interface SupabaseResource {
  title: string
  title_ka?: string | null
  title_fr?: string | null
  title_es?: string | null
  title_ru?: string | null
  slug: string
  description: string
  description_ka?: string | null
  description_fr?: string | null
  description_es?: string | null
  description_ru?: string | null
  resource_type: ResourceType
  status: ResourceStatus
  eligibility: 'INDIVIDUAL' | 'ORGANIZATION' | 'BOTH'
  amount_min?: number | null
  amount_max?: number | null
  currency: string
  source_url?: string | null
  source_name?: string | null
  application_url?: string | null
  is_verified: boolean
  is_featured: boolean
  is_rolling: boolean
  target_groups: string[]
  disease_areas: string[]
  view_count: number
  published_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string, suffix: string): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70)
  return `${base}-${suffix}`
}

/**
 * Parse MySQL amount text (e.g. "$5,000", "$1,000 - $25,000", "Up to $10,000")
 * to [amount_min_cents, amount_max_cents].
 */
function parseAmount(raw: string | null | undefined): [number | null, number | null] {
  if (!raw) return [null, null]
  const clean = raw.replace(/[$,]/g, '')
  const nums = clean.match(/\d+(?:\.\d+)?/g)
  if (!nums || nums.length === 0) return [null, null]
  const vals = nums.map((n) => Math.round(parseFloat(n) * 100))
  if (vals.length === 1) return [vals[0], vals[0]]
  return [Math.min(...vals), Math.max(...vals)]
}

/**
 * Map MySQL category string to Supabase category IDs.
 * Returns [resourceType, categoryIds[]]
 */
function mapCategory(
  category: string,
  grantType: string,
): [ResourceType, string[]] {
  switch (category) {
    case 'housing':
      return ['SOCIAL', ['SOCIAL.HOUSING']]
    case 'food_basic_needs':
      return ['SOCIAL', ['SOCIAL.FOOD']]
    case 'social_services':
      return ['SOCIAL', ['SOCIAL']]
    case 'medical_treatment':
      return ['GRANT', ['GRANT.MEDICAL']]
    case 'financial_assistance':
      return ['GRANT', ['GRANT']]
    case 'scholarships':
    case 'educational':
      return ['GRANT', ['GRANT.EDUCATION']]
    case 'startup':
      return ['GRANT', ['GRANT.STARTUP']]
    case 'research':
      return ['GRANT', ['GRANT.RESEARCH']]
    case 'assistive_technology':
      return ['GRANT', ['GRANT.DISABILITY']]
    case 'community':
      return ['GRANT', ['GRANT.COMMUNITY']]
    case 'travel_transport':
    case 'international':
      return ['GRANT', ['GRANT']]
    case 'individual':
      return ['GRANT', ['GRANT']]
    default:
      return ['GRANT', ['GRANT']]
  }
}

/**
 * Derive resource type: SOCIAL if housing/food/social_services;
 * MEDICAL if category=medical_treatment with a targetDiagnosis;
 * otherwise GRANT.
 */
function deriveResourceType(
  category: string,
  targetDiagnosis: string | null | undefined,
  grantType: string,
): ResourceType {
  if (['housing', 'food_basic_needs', 'social_services'].includes(category)) {
    return 'SOCIAL'
  }
  if (category === 'medical_treatment' && targetDiagnosis && targetDiagnosis !== 'General') {
    return 'MEDICAL'
  }
  return 'GRANT'
}

/**
 * Normalize grant status to Supabase ResourceStatus enum.
 */
function normalizeStatus(raw: string | null | undefined): ResourceStatus {
  if (!raw) return 'OPEN'
  const s = raw.toLowerCase()
  if (s.includes('close') || s.includes('expired')) return 'CLOSED'
  if (s.includes('upcoming') || s.includes('future')) return 'UPCOMING'
  if (s.includes('ongoing') || s.includes('rolling') || s.includes('continuous')) return 'ONGOING'
  return 'OPEN'
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('❌ Missing DATABASE_URL')
    process.exit(1)
  }

  // Connect to MySQL
  const connection = await mysql.createConnection(databaseUrl)
  const db = drizzle(connection)

  console.log('📖 Reading grants from MySQL…')
  const allGrants = await db.select().from(grants).where(eq(grants.isActive, true))
  console.log(`   Found ${allGrants.length} active grants`)

  console.log('📖 Reading translations…')
  const allTranslations = await db.select().from(grantTranslations)
  // Group by grantItemId
  const transMap: Record<string, Record<string, typeof allTranslations[0]>> = {}
  for (const t of allTranslations) {
    if (!transMap[t.grantItemId]) transMap[t.grantItemId] = {}
    transMap[t.grantItemId][t.language] = t
  }
  console.log(`   Found ${allTranslations.length} translations`)

  let migrated = 0
  let errored = 0
  let skipped = 0
  const errors: Array<{ id: string; name: string; error: string }> = []

  // Process in batches of 50
  const BATCH_SIZE = 50
  for (let i = 0; i < allGrants.length; i += BATCH_SIZE) {
    const batch = allGrants.slice(i, i + BATCH_SIZE)

    const resources: SupabaseResource[] = []
    const categoryMaps: Array<{ slug: string; categoryIds: string[] }> = []
    const locationMaps: Array<{
      slug: string
      countryCode: string | null
      state: string | null
    }> = []

    for (const g of batch) {
      try {
        const trans = transMap[g.itemId] ?? {}
        const resourceType = deriveResourceType(g.category, g.targetDiagnosis, g.type)
        const [, categoryIds] = mapCategory(g.category, g.type)
        const [amountMin, amountMax] = parseAmount(g.amount)

        const resource: SupabaseResource = {
          title: g.name ?? g.itemId,
          title_ka: trans['ka']?.name ?? null,
          title_fr: trans['fr']?.name ?? null,
          title_es: trans['es']?.name ?? null,
          title_ru: trans['ru']?.name ?? null,
          slug: slugify(g.name ?? g.itemId, g.itemId),
          description: g.description ?? '',
          description_ka: trans['ka']?.description ?? null,
          description_fr: trans['fr']?.description ?? null,
          description_es: trans['es']?.description ?? null,
          description_ru: trans['ru']?.description ?? null,
          resource_type: resourceType,
          status: normalizeStatus(g.status),
          eligibility: 'BOTH',
          amount_min: amountMin,
          amount_max: amountMax,
          currency: g.country === 'GB' ? 'GBP' : g.country === 'DE' || g.country === 'FR' || g.country === 'ES' || g.country === 'IT' ? 'EUR' : 'USD',
          source_url: g.website ?? null,
          source_name: g.organization ?? null,
          application_url: g.website ?? null,
          is_verified: false,
          is_featured: false,
          is_rolling: (g.status ?? '').toLowerCase().includes('rolling'),
          target_groups: [],
          disease_areas: g.targetDiagnosis && g.targetDiagnosis !== 'General' ? [g.targetDiagnosis] : [],
          view_count: 0,
          published_at: g.createdAt.toISOString(),
        }

        resources.push(resource)
        categoryMaps.push({ slug: resource.slug, categoryIds })
        locationMaps.push({ slug: resource.slug, countryCode: g.country ?? null, state: g.state ?? null })
      } catch (err: unknown) {
        errored++
        errors.push({
          id: g.itemId,
          name: g.name ?? g.itemId,
          error: (err as Error).message ?? String(err),
        })
      }
    }

    if (resources.length === 0) continue

    // Insert resources
    const { data: inserted, error: insertError } = await supabase
      .from('resources')
      .insert(resources)
      .select('id, slug')

    if (insertError) {
      console.error(`   ❌ Batch insert error: ${insertError.message}`)
      errored += resources.length
      errors.push(...resources.map((r) => ({ id: r.slug, name: r.title, error: insertError.message })))
      continue
    }

    if (!inserted) continue

    // Build slug → id map
    const slugToId: Record<string, string> = {}
    for (const row of inserted) {
      slugToId[row.slug] = row.id
    }

    // Insert resource_categories
    const catRows: Array<{ resource_id: string; category_id: string; is_primary: boolean }> = []
    for (const cm of categoryMaps) {
      const resourceId = slugToId[cm.slug]
      if (!resourceId) continue
      for (let ci = 0; ci < cm.categoryIds.length; ci++) {
        catRows.push({ resource_id: resourceId, category_id: cm.categoryIds[ci], is_primary: ci === 0 })
      }
    }
    if (catRows.length > 0) {
      const { error: catError } = await supabase.from('resource_categories').insert(catRows)
      if (catError) {
        console.warn(`   ⚠️  resource_categories insert error: ${catError.message}`)
      }
    }

    // Insert resource_locations
    const locRows: Array<{ resource_id: string; country_code: string; is_nationwide: boolean }> = []
    for (const lm of locationMaps) {
      const resourceId = slugToId[lm.slug]
      if (!resourceId || !lm.countryCode) continue
      locRows.push({
        resource_id: resourceId,
        country_code: lm.countryCode,
        is_nationwide: !lm.state || /^(nationwide|national)/i.test(lm.state.trim()),
      })
    }
    if (locRows.length > 0) {
      const { error: locError } = await supabase.from('resource_locations').insert(locRows)
      if (locError) {
        console.warn(`   ⚠️  resource_locations insert error: ${locError.message}`)
      }
    }

    migrated += inserted.length
    process.stdout.write(`\r   Migrated ${migrated}/${allGrants.length}…`)
  }

  console.log('\n')
  console.log('─'.repeat(50))
  console.log(`✅ Migration complete`)
  console.log(`   Migrated:  ${migrated}`)
  console.log(`   Errored:   ${errored}`)
  console.log(`   Skipped:   ${skipped}`)

  if (errors.length > 0) {
    console.log('\n⚠️  Errors:')
    for (const e of errors.slice(0, 20)) {
      console.log(`   [${e.id}] ${e.name}: ${e.error}`)
    }
    if (errors.length > 20) {
      console.log(`   … and ${errors.length - 20} more`)
    }
  }

  await connection.end()
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
