import { getDb } from '../server/db'
import { grants } from '../drizzle/schema'
import { eq, sql } from 'drizzle-orm'
import fs from 'fs'
import path from 'path'

interface SupabaseMedical {
  supabase_id: string
  title: string
  slug: string
  source_url: string
  source_name: string
}

interface MatchResult {
  supabase_id: string
  supabase_title: string
  mysql_id: number | null
  mysql_itemId: string | null
  mysql_name: string | null
  mysql_category: string | null
  match_method: 'itemId' | 'name' | 'source_url' | 'none'
  needs_update: boolean
}

async function matchMedicalGrants() {
  const exportPath = path.join('.grantkit-redesign', 'supabase-medical-export.json')

  if (!fs.existsSync(exportPath)) {
    console.error(`Missing ${exportPath}. Run export-supabase-medical.ts first.`)
    process.exit(1)
  }

  const exported = JSON.parse(fs.readFileSync(exportPath, 'utf-8'))
  const medicalGrants: SupabaseMedical[] = exported.grants ?? exported

  if (medicalGrants.length === 0) {
    console.log('No Supabase medical grants to match — Supabase resources table was empty.')
    const decision = {
      timestamp: new Date().toISOString(),
      total: 0,
      matched: 0,
      needsUpdate: 0,
      recommendation: 'skip',
      reasoning: 'Supabase resources table is empty. No migration needed.',
    }
    const decisionPath = path.join('.grantkit-redesign', 'migration-decision.json')
    fs.writeFileSync(decisionPath, JSON.stringify(decision, null, 2))
    console.log(`Decision: SKIP (written to ${decisionPath})`)
    return
  }

  const db = await getDb()
  const results: MatchResult[] = []

  console.log(`Matching ${medicalGrants.length} Supabase medical grants against MySQL...`)

  for (const supabaseGrant of medicalGrants) {
    let mysqlGrant: any = null
    let matchMethod: MatchResult['match_method'] = 'none'

    // 1. Try itemId match (Supabase slug → MySQL itemId)
    if (supabaseGrant.slug) {
      const byItemId = await db.select().from(grants)
        .where(eq(grants.itemId, supabaseGrant.slug))
        .limit(1)
      if (byItemId.length > 0) {
        mysqlGrant = byItemId[0]
        matchMethod = 'itemId'
      }
    }

    // 2. Try name match (case-insensitive via LOWER())
    if (!mysqlGrant && supabaseGrant.title) {
      const byName = await db.select().from(grants)
        .where(sql`LOWER(${grants.name}) = LOWER(${supabaseGrant.title})`)
        .limit(1)
      if (byName.length > 0) {
        mysqlGrant = byName[0]
        matchMethod = 'name'
      }
    }

    // 3. Try sourceUrl match
    if (!mysqlGrant && supabaseGrant.source_url) {
      const bySource = await db.select().from(grants)
        .where(eq(grants.sourceUrl, supabaseGrant.source_url))
        .limit(1)
      if (bySource.length > 0) {
        mysqlGrant = bySource[0]
        matchMethod = 'source_url'
      }
    }

    const isMedical =
      mysqlGrant?.category === 'medical_treatment' ||
      mysqlGrant?.category === 'medical' ||
      mysqlGrant?.category?.toLowerCase().includes('medical')

    results.push({
      supabase_id: supabaseGrant.supabase_id,
      supabase_title: supabaseGrant.title,
      mysql_id: mysqlGrant?.id ?? null,
      mysql_itemId: mysqlGrant?.itemId ?? null,
      mysql_name: mysqlGrant?.name ?? null,
      mysql_category: mysqlGrant?.category ?? null,
      match_method: matchMethod,
      needs_update: mysqlGrant !== null && !isMedical,
    })
  }

  const matched = results.filter(r => r.match_method !== 'none').length
  const unmatched = results.length - matched
  const needsUpdate = results.filter(r => r.needs_update).length
  const alreadyMedical = results.filter(r => r.match_method !== 'none' && !r.needs_update).length

  console.log(`\n=== Match Report ===`)
  console.log(`Total Supabase medical grants:  ${results.length}`)
  console.log(`Matched in MySQL:               ${matched}`)
  console.log(`Unmatched (Supabase-only):      ${unmatched}`)
  console.log(`Already medical in MySQL:       ${alreadyMedical}`)
  console.log(`Needs category update:          ${needsUpdate}`)

  const categoryCounts: Record<string, number> = {}
  results.filter(r => r.match_method !== 'none').forEach(r => {
    const cat = r.mysql_category || '(null)'
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
  })
  console.log(`\n=== MySQL categories of matched grants ===`)
  Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => console.log(`  ${cat.padEnd(30)} ${count}`))

  const reportPath = path.join('.grantkit-redesign', 'match-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2))
  console.log(`\nFull report written to ${reportPath}`)

  const decision = {
    timestamp: new Date().toISOString(),
    total: results.length,
    matched,
    unmatched,
    needsUpdate,
    alreadyMedical,
    recommendation: needsUpdate < 20 ? 'skip' : 'migrate',
    reasoning:
      needsUpdate < 20
        ? `Only ${needsUpdate} grants need category update — redundant with MySQL data. Skip migration.`
        : `${needsUpdate} grants need category update. Proceed with migration.`,
  }

  const decisionPath = path.join('.grantkit-redesign', 'migration-decision.json')
  fs.writeFileSync(decisionPath, JSON.stringify(decision, null, 2))
  console.log(`Decision: ${decision.recommendation.toUpperCase()} (written to ${decisionPath})`)
  console.log(`Reasoning: ${decision.reasoning}`)
}

matchMedicalGrants().catch(console.error)
