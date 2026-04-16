import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { fetchResources, fetchResourceBySlug, fetchCategories, fetchCountries } from '../lib/resources'
import { supabase, USE_SUPABASE } from '../lib/supabase'
import type { ResourceFull, ResourceFilters, Category, Country, ResourceType, ResourceStatus, Eligibility, ClinicalPhase } from '../types/resources'

// ─── Filter reducer ───────────────────────────────────────────────────────────

type FilterAction =
  | { type: 'SET_TYPE'; payload: ResourceType | undefined }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_STATUS'; payload: ResourceStatus | undefined }
  | { type: 'SET_ELIGIBILITY'; payload: Eligibility | undefined }
  | { type: 'SET_CATEGORIES'; payload: string[] }
  | { type: 'SET_COUNTRIES'; payload: string[] }
  | { type: 'SET_REGIONS'; payload: string[] }
  | { type: 'SET_AMOUNT_MIN'; payload: number | undefined }
  | { type: 'SET_AMOUNT_MAX'; payload: number | undefined }
  | { type: 'SET_TARGET_GROUPS'; payload: string[] }
  | { type: 'SET_DISEASE_AREAS'; payload: string[] }
  | { type: 'SET_CLINICAL_PHASE'; payload: ClinicalPhase | undefined }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'SET_SORT'; payload: string }
  | { type: 'RESET' }

const defaultFilters: ResourceFilters = {
  page: 1,
  limit: 30,
  sort: 'newest',
}

function filtersReducer(state: ResourceFilters, action: FilterAction): ResourceFilters {
  switch (action.type) {
    case 'SET_TYPE':        return { ...state, type: action.payload, page: 1 }
    case 'SET_SEARCH':      return { ...state, search: action.payload || undefined, page: 1 }
    case 'SET_STATUS':      return { ...state, status: action.payload, page: 1 }
    case 'SET_ELIGIBILITY': return { ...state, eligibility: action.payload, page: 1 }
    case 'SET_CATEGORIES':  return { ...state, categories: action.payload, page: 1 }
    case 'SET_COUNTRIES':   return { ...state, countries: action.payload, page: 1 }
    case 'SET_REGIONS':     return { ...state, regions: action.payload, page: 1 }
    case 'SET_AMOUNT_MIN':  return { ...state, amount_min: action.payload, page: 1 }
    case 'SET_AMOUNT_MAX':  return { ...state, amount_max: action.payload, page: 1 }
    case 'SET_TARGET_GROUPS':  return { ...state, target_groups: action.payload, page: 1 }
    case 'SET_DISEASE_AREAS':  return { ...state, disease_areas: action.payload, page: 1 }
    case 'SET_CLINICAL_PHASE': return { ...state, clinical_phase: action.payload, page: 1 }
    case 'SET_PAGE':           return { ...state, page: action.payload }
    case 'SET_SORT':        return { ...state, sort: action.payload }
    case 'RESET':           return { ...defaultFilters }
    default:                return state
  }
}

const SEARCH_DEBOUNCE_MS = 300

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ─── useResources ─────────────────────────────────────────────────────────────

export function useResources(initialType?: ResourceType) {
  const [filters, dispatch] = useReducer(filtersReducer, {
    ...defaultFilters,
    type: initialType,
  })

  const [data, setData] = useState<ResourceFull[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Bump to force a re-fetch without changing filters (used by realtime callbacks)
  const [refreshCounter, setRefreshCounter] = useState(0)
  const refresh = useCallback(() => setRefreshCounter((c) => c + 1), [])

  // Debounce the search field only
  const debouncedSearch = useDebounced(filters.search, SEARCH_DEBOUNCE_MS)
  const effectiveFilters = { ...filters, search: debouncedSearch }

  const abortRef = useRef<AbortController | null>(null)

  // Stable string keys for array filters — avoids JSON.stringify in useEffect deps
  const categoriesKey = useMemo(() => (effectiveFilters.categories ?? []).slice().sort().join(','), [effectiveFilters.categories])
  const countriesKey = useMemo(() => (effectiveFilters.countries ?? []).slice().sort().join(','), [effectiveFilters.countries])
  const regionsKey = useMemo(() => (effectiveFilters.regions ?? []).slice().sort().join(','), [effectiveFilters.regions])
  const targetGroupsKey = useMemo(() => (effectiveFilters.target_groups ?? []).slice().sort().join(','), [effectiveFilters.target_groups])
  const diseaseAreasKey = useMemo(() => (effectiveFilters.disease_areas ?? []).slice().sort().join(','), [effectiveFilters.disease_areas])

  useEffect(() => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setLoading(true)
    setError(null)

    fetchResources(effectiveFilters)
      .then(({ data: rows, count }) => {
        setData(rows)
        setTotalCount(count)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if ((err as Error)?.name === 'AbortError') return
        setError((err as Error)?.message ?? 'Unknown error')
        setLoading(false)
      })

    return () => { abortRef.current?.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    effectiveFilters.type,
    effectiveFilters.status,
    effectiveFilters.eligibility,
    debouncedSearch,
    categoriesKey,
    countriesKey,
    regionsKey,
    targetGroupsKey,
    diseaseAreasKey,
    effectiveFilters.amount_min,
    effectiveFilters.amount_max,
    effectiveFilters.deadline_before,
    effectiveFilters.clinical_phase,
    effectiveFilters.page,
    effectiveFilters.sort,
    refreshCounter,
  ])

  const resetFilters = useCallback(() => dispatch({ type: 'RESET' }), [])

  return { data, loading, error, totalCount, filters, dispatch, resetFilters, refresh }
}

// ─── useResource (single) ─────────────────────────────────────────────────────

export function useResource(slug: string | null) {
  const [data, setData] = useState<ResourceFull | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setError(null)

    fetchResourceBySlug(slug)
      .then((resource) => {
        setData(resource)
        setLoading(false)
      })
      .catch((err: unknown) => {
        setError((err as Error)?.message ?? 'Unknown error')
        setLoading(false)
      })
  }, [slug])

  return { data, loading, error }
}

// ─── useCategories ────────────────────────────────────────────────────────────

export function useCategories(resourceType?: ResourceType) {
  const [data, setData] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchCategories(resourceType)
      .then((cats) => { setData(cats); setLoading(false) })
      .catch(() => setLoading(false))
  }, [resourceType])

  return { data, loading }
}

// ─── useCountries ─────────────────────────────────────────────────────────────

export function useCountries() {
  const [data, setData] = useState<Country[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchCountries()
      .then((countries) => { setData(countries); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return { data, loading }
}

// ─── useResourcesRealtime ─────────────────────────────────────────────────────
// Subscribes to Postgres changes on the resources table.
// Calls the provided callbacks when resources are added/updated/deleted.
// Safe to mount once (e.g. in a root provider or in the Catalog page).

interface RealtimeCallbacks {
  onInsert?: (row: ResourceFull) => void
  onUpdate?: (row: ResourceFull) => void
  onDelete?: (row: Partial<ResourceFull>) => void
}

export function useResourcesRealtime({ onInsert, onUpdate, onDelete }: RealtimeCallbacks) {
  useEffect(() => {
    if (!USE_SUPABASE || !supabase) return

    const channel = supabase
      .channel('resources-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'resources' },
        (payload) => {
          if (payload.eventType === 'INSERT' && onInsert) {
            onInsert(payload.new as ResourceFull)
          }
          if (payload.eventType === 'UPDATE' && onUpdate) {
            onUpdate(payload.new as ResourceFull)
          }
          if (payload.eventType === 'DELETE' && onDelete) {
            onDelete(payload.old as Partial<ResourceFull>)
          }
        }
      )
      .subscribe()

    return () => {
      if (supabase) supabase.removeChannel(channel)
    }
  }, [onInsert, onUpdate, onDelete])
}
