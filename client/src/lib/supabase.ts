import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[GrantKit] Supabase not configured — using fallback mode (catalog.json)')
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
)

export const USE_SUPABASE = !!(supabaseUrl && supabaseAnonKey)
