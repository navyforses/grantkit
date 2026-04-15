/**
 * GrantKit Resource Data Service
 * Fetches resources from Supabase when configured, falls back to catalog.json.
 */
import { supabase, USE_SUPABASE } from './supabase'
import type { ResourceFull, ResourceFilters, Category, Country, Region, ResourceStats, ResourceType } from '../types/resources'
import { catalogItems } from '../data/catalogData'

// ─── Fallback helpers ────────────────────────────────────────────────────────

function mapCatalogItemToResource(item: any): ResourceFull {
  return {
    id: item.id,
    resource_type: 'GRANT',
    title: item.name ?? '',
    slug: item.id,
    description: item.description ?? '',
    amount_min: undefined,
    amount_max: undefined,
    currency: 'USD',
    deadline: item.deadline || undefined,
    is_rolling: false,
    status: (item.status === 'Open' || item.status === 'Active') ? 'OPEN' : 'ONGOING',
    eligibility: 'BOTH',
    eligibility_details: item.eligibility || undefined,
    target_groups: [],
    disease_areas: [],
    source_url: item.website || undefined,
    source_name: item.organization || undefined,
    application_url: item.website || undefined,
    is_verified: false,
    is_featured: false,
    view_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    categories: item.category
      ? [{ id: item.category, name: item.category, is_primary: true }]
      : [],
    locations: item.country
      ? [{ country_code: item.country, country_name: item.country, is_nationwide: !item.state || item.state === 'Nationwide' }]
      : [],
  }
}

function applyFallbackFilters(items: any[], filters: ResourceFilters): any[] {
  let result = [...items]
  if (filters.search) {
    const q = filters.search.toLowerCase()
    result = result.filter(
      (g) =>
        (g.name ?? '').toLowerCase().includes(q) ||
        (g.organization ?? '').toLowerCase().includes(q) ||
        (g.description ?? '').toLowerCase().includes(q)
    )
  }
  if (filters.countries?.length) {
    result = result.filter((g) => filters.countries!.includes(g.country))
  }
  if (filters.categories?.length) {
    result = result.filter((g) => filters.categories!.includes(g.category))
  }
  return result
}

async function fetchFromCatalogJson(filters: ResourceFilters): Promise<{ data: ResourceFull[]; count: number }> {
  const filtered = applyFallbackFilters(catalogItems, filters)
  const start = (filters.page - 1) * filters.limit
  const page = filtered.slice(start, start + filters.limit)
  return {
    data: page.map(mapCatalogItemToResource),
    count: filtered.length,
  }
}

// ─── Supabase query helpers ───────────────────────────────────────────────────

async function fetchFromSupabase(filters: ResourceFilters): Promise<{ data: ResourceFull[]; count: number }> {
  if (!supabase) return { data: [], count: 0 }

  let query = supabase
    .from('resources_full')
    .select('*', { count: 'exact' })

  if (filters.type) query = query.eq('resource_type', filters.type)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.eligibility) query = query.eq('eligibility', filters.eligibility)

  if (filters.amount_min != null) query = query.gte('amount_min', filters.amount_min)
  if (filters.amount_max != null) query = query.lte('amount_max', filters.amount_max)

  if (filters.deadline_before) query = query.lte('deadline', filters.deadline_before)

  if (filters.clinical_phase) query = query.eq('clinical_trial_phase', filters.clinical_phase)

  if (filters.target_groups?.length) {
    query = query.overlaps('target_groups', filters.target_groups)
  }
  if (filters.disease_areas?.length) {
    query = query.overlaps('disease_areas', filters.disease_areas)
  }

  // Full-text search
  if (filters.search) {
    query = query.textSearch('search_vector', filters.search, { type: 'websearch' })
  }

  // Sorting
  const sortMap: Record<string, { column: string; ascending: boolean }> = {
    newest:      { column: 'created_at',  ascending: false },
    oldest:      { column: 'created_at',  ascending: true },
    name_asc:    { column: 'title',       ascending: true },
    name_desc:   { column: 'title',       ascending: false },
    deadline:    { column: 'deadline',    ascending: true },
    amount_desc: { column: 'amount_max',  ascending: false },
    amount_asc:  { column: 'amount_min',  ascending: true },
    featured:    { column: 'is_featured', ascending: false },
  }
  // relevance: only meaningful when search query is active — use search_vector ranking
  if (filters.sort === 'relevance' && filters.search) {
    // search_vector full-text search already ranked by ts_rank; no explicit order needed
  } else {
    const sort = sortMap[filters.sort] ?? { column: 'created_at', ascending: false }
    query = query.order(sort.column, { ascending: sort.ascending })
  }

  // Pagination
  const start = (filters.page - 1) * filters.limit
  query = query.range(start, start + filters.limit - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('[GrantKit] Supabase fetchFromSupabase error:', error)
    throw error
  }

  // Post-filter by categories / countries / regions.
  // The resources_full view aggregates junction tables as JSON arrays, so these
  // filters cannot be pushed to the SQL WHERE clause without custom RPC.
  // Consequence: post-filtering reduces the items returned per page, but the
  // `count` from Supabase reflects the unfiltered total. When these filters are
  // active, return result.length as the count so pagination stays accurate.
  let result: ResourceFull[] = (data ?? []) as unknown as ResourceFull[]
  const hasPostFilters =
    (filters.categories?.length ?? 0) > 0 ||
    (filters.countries?.length ?? 0) > 0 ||
    (filters.regions?.length ?? 0) > 0

  if (filters.categories?.length) {
    result = result.filter((r) =>
      r.categories?.some((c) => filters.categories!.includes(c.id))
    )
  }
  if (filters.countries?.length) {
    result = result.filter((r) =>
      r.locations?.some((l) => filters.countries!.includes(l.country_code))
    )
  }
  if (filters.regions?.length) {
    result = result.filter((r) =>
      r.locations?.some((l) => l.region_id != null && filters.regions!.includes(l.region_id))
    )
  }

  // Use filtered count when post-filters are active to keep pagination accurate
  return { data: result, count: hasPostFilters ? result.length : (count ?? 0) }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchResources(filters: ResourceFilters): Promise<{ data: ResourceFull[]; count: number }> {
  if (!USE_SUPABASE) {
    return fetchFromCatalogJson(filters)
  }
  return fetchFromSupabase(filters)
}

export async function fetchResourceBySlug(slug: string): Promise<ResourceFull | null> {
  if (!USE_SUPABASE) {
    const item = catalogItems.find((g) => g.id === slug)
    return item ? mapCatalogItemToResource(item) : null
  }

  if (!supabase) return null

  const { data, error } = await supabase
    .from('resources_full')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // not found
    console.error('[GrantKit] fetchResourceBySlug error:', error)
    return null
  }
  return data as unknown as ResourceFull
}

export async function fetchCategories(resourceType?: ResourceType): Promise<Category[]> {
  if (!USE_SUPABASE) return []

  if (!supabase) return []

  let query = supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  if (resourceType) query = query.eq('resource_type', resourceType)

  const { data, error } = await query
  if (error) {
    console.error('[GrantKit] fetchCategories error:', error)
    return []
  }

  const flat: Category[] = (data ?? []) as unknown as Category[]

  // Build parent-child tree
  const byId: Record<string, Category> = {}
  const roots: Category[] = []
  for (const cat of flat) {
    byId[cat.id] = { ...cat, children: [] }
  }
  for (const cat of flat) {
    if (cat.parent_id && byId[cat.parent_id]) {
      byId[cat.parent_id].children!.push(byId[cat.id])
    } else {
      roots.push(byId[cat.id])
    }
  }
  return roots
}

export async function fetchCountries(): Promise<Country[]> {
  if (!USE_SUPABASE) return []

  if (!supabase) return []

  const [{ data: countries, error: ce }, { data: regions, error: re }] = await Promise.all([
    supabase.from('countries').select('*').order('name'),
    supabase.from('regions').select('*').order('name'),
  ])

  if (ce) console.error('[GrantKit] fetchCountries error:', ce)
  if (re) console.error('[GrantKit] fetchRegions error:', re)

  const regionsByCountry: Record<string, Region[]> = {}
  for (const r of (regions ?? []) as unknown as Region[]) {
    if (!regionsByCountry[r.country_code]) regionsByCountry[r.country_code] = []
    regionsByCountry[r.country_code].push(r)
  }

  return ((countries ?? []) as unknown as Country[]).map((c) => ({
    ...c,
    regions: regionsByCountry[c.code] ?? [],
  }))
}

export async function fetchResourceStats(): Promise<ResourceStats> {
  if (!USE_SUPABASE) {
    return {
      total: catalogItems.length,
      by_type: { GRANT: catalogItems.length, SOCIAL: 0, MEDICAL: 0 },
      by_status: { OPEN: catalogItems.length, CLOSED: 0, UPCOMING: 0, ONGOING: 0, ARCHIVED: 0 },
    }
  }

  if (!supabase) {
    return { total: 0, by_type: { GRANT: 0, SOCIAL: 0, MEDICAL: 0 }, by_status: { OPEN: 0, CLOSED: 0, UPCOMING: 0, ONGOING: 0, ARCHIVED: 0 } }
  }

  const { data, error } = await supabase.from('resource_stats').select('*')
  if (error) {
    console.error('[GrantKit] fetchResourceStats error:', error)
    return { total: 0, by_type: { GRANT: 0, SOCIAL: 0, MEDICAL: 0 }, by_status: { OPEN: 0, CLOSED: 0, UPCOMING: 0, ONGOING: 0, ARCHIVED: 0 } }
  }

  const stats: ResourceStats = {
    total: 0,
    by_type: { GRANT: 0, SOCIAL: 0, MEDICAL: 0 },
    by_status: { OPEN: 0, CLOSED: 0, UPCOMING: 0, ONGOING: 0, ARCHIVED: 0 },
  }

  for (const row of (data ?? []) as any[]) {
    if (row.resource_type) stats.by_type[row.resource_type as ResourceType] = row.count ?? 0
    if (row.status) stats.by_status[row.status as keyof typeof stats.by_status] = row.count ?? 0
    stats.total += row.count ?? 0
  }
  return stats
}

export async function searchResources(query: string, filters: ResourceFilters): Promise<{ data: ResourceFull[]; count: number }> {
  return fetchResources({ ...filters, search: query })
}
