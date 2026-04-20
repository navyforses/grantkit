/**
 * Apply medical_treatment category to MySQL grants that were tagged GRANT.MEDICAL in Supabase.
 *
 * Usage:
 *   pnpm tsx scripts/apply-medical-category.ts          # dry-run (shows plan, no writes)
 *   pnpm tsx scripts/apply-medical-category.ts --apply  # execute updates
 */
import { getDb } from '../server/db'
import { grants } from '../drizzle/schema'
import { eq } from 'drizzle-orm'
import fs from 'fs'
import path from 'path'

interface MatchResult {
  supabase_id: string
  supabase_title: string
  mysql_id: number | null
  mysql_name: string | null
  mysql_category: string | null
  needs_update: boolean
  match_method: string
}

async function applyMedicalCategory() {
  const reportPath = path.join('.grantkit-redesign', 'match-report.json')

  if (!fs.existsSync(reportPath)) {
    console.error(`Missing ${reportPath}. Run match-supabase-medical.ts first.`)
    process.exit(1)
  }

  const results: MatchResult[] = JSON.parse(fs.readFileSync(reportPath, 'utf-8'))
  const toUpdate = results.filter(r => r.needs_update && r.mysql_id !== null)

  if (toUpdate.length === 0) {
    console.log('No grants need category update. Nothing to do.')
    return
  }

  console.log(`Planning to update ${toUpdate.length} grants to category='medical_treatment'`)
  console.log('\nCurrent category distribution for grants to be updated:')

  const distByCurrent: Record<string, number> = {}
  toUpdate.forEach(r => {
    const cat = r.mysql_category || '(null)'
    distByCurrent[cat] = (distByCurrent[cat] || 0) + 1
  })
  Object.entries(distByCurrent)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) =>
      console.log(`  ${cat.padEnd(30)} ${count} → medical_treatment`)
    )

  if (!process.argv.includes('--apply')) {
    console.log('\nDry-run complete. To execute, run with --apply flag:')
    console.log('  pnpm tsx scripts/apply-medical-category.ts --apply')
    return
  }

  console.log('\nApplying updates...')
  const db = await getDb()
  let updated = 0

  for (const r of toUpdate) {
    if (!r.mysql_id) continue
    await db.update(grants)
      .set({ category: 'medical_treatment' })
      .where(eq(grants.id, r.mysql_id))
    updated++
    if (updated % 20 === 0) {
      console.log(`  Progress: ${updated}/${toUpdate.length}`)
    }
  }

  console.log(`\nDone. Updated ${updated} grants to category='medical_treatment'.`)
}

applyMedicalCategory().catch(console.error)
