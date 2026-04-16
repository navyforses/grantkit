import { useCallback, useEffect, useState } from 'react'
import { supabase, USE_SUPABASE } from '@/lib/supabase'
import type { ResourceFull } from '@/types/resources'
import type { UserProfile } from '@shared/profileTypes'

interface PersonalizedResults {
  funding: ResourceFull[]
  needs: ResourceFull[]
  loading: boolean
  error: string | null
  refresh: () => void
}

export function usePersonalizedResources(profile: UserProfile | null): PersonalizedResults {
  const [funding, setFunding] = useState<ResourceFull[]>([])
  const [needs, setNeeds] = useState<ResourceFull[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshCounter, setRefreshCounter] = useState(0)
  const refresh = useCallback(() => setRefreshCounter((c) => c + 1), [])

  useEffect(() => {
    if (!USE_SUPABASE || !supabase || !profile || !profile.targetCountry) {
      setFunding([])
      setNeeds([])
      setLoading(false)
      setError(null)
      return
    }

    const supabaseClient = supabase
    if (!supabaseClient) return

    let isMounted = true

    const run = async () => {
      setLoading(true)
      setError(null)

      const fundingQuery = supabaseClient
        .from('resources_full')
        .select('*')
        .overlaps('purpose_tags', profile.purposes)
        .contains('country_codes', [profile.targetCountry])
        .in('status', ['OPEN', 'ONGOING', 'UPCOMING'])
        .order('is_featured', { ascending: false })
        .order('deadline', { ascending: true })
        .limit(12)

      const needsQuery = supabaseClient
        .from('resources_full')
        .select('*')
        .overlaps('need_tags', profile.needs)
        .contains('country_codes', [profile.targetCountry])
        .in('status', ['OPEN', 'ONGOING'])
        .limit(12)

      const [fundingRes, needsRes] = await Promise.all([fundingQuery, needsQuery])

      if (!isMounted) return

      if (fundingRes.error || needsRes.error) {
        setError(fundingRes.error?.message ?? needsRes.error?.message ?? 'Failed to load resources')
        setFunding([])
        setNeeds([])
      } else {
        setFunding((fundingRes.data ?? []) as ResourceFull[])
        setNeeds((needsRes.data ?? []) as ResourceFull[])
      }
      setLoading(false)
    }

    void run()

    const channel = supabaseClient
      .channel('personalized-resources-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resources' }, () => {
        setRefreshCounter((c) => c + 1)
      })
      .subscribe()

    return () => {
      isMounted = false
      supabaseClient.removeChannel(channel)
    }
  }, [profile, refreshCounter])

  return { funding, needs, loading, error, refresh }
}
