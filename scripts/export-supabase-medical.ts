import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing credentials. Set SUPABASE_URL and SUPABASE_ANON_KEY (or VITE_ variants).')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function exportMedicalGrants() {
  console.log('Querying Supabase for GRANT.MEDICAL-tagged resources...')

  const { data, error } = await supabase
    .from('resources')
    .select(`
      id, title, slug, source_url, source_name,
      resource_categories!inner (category_id)
    `)
    .eq('resource_categories.category_id', 'GRANT.MEDICAL')

  if (error) throw error

  if (!data || data.length === 0) {
    console.log('No GRANT.MEDICAL resources found — Supabase resources table may be empty.')
    const empty = { count: 0, grants: [] }
    const outPath = path.join('.grantkit-redesign', 'supabase-medical-export.json')
    fs.writeFileSync(outPath, JSON.stringify(empty, null, 2))
    console.log(`Written to ${outPath}`)
    return
  }

  const output = data.map((r: any) => ({
    supabase_id: r.id,
    title: r.title,
    slug: r.slug,
    source_url: r.source_url,
    source_name: r.source_name,
    has_medical_tag: true,
  }))

  const result = { count: output.length, grants: output }
  const outPath = path.join('.grantkit-redesign', 'supabase-medical-export.json')
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2))

  console.log(`Exported ${output.length} medical-tagged grants → ${outPath}`)

  // Also check total resources count
  const { count: totalCount } = await supabase
    .from('resources')
    .select('*', { count: 'exact', head: true })

  console.log(`Total rows in resources table: ${totalCount ?? 'unknown'}`)
}

exportMedicalGrants().catch(console.error)
