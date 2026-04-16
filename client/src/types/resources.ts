export type ResourceType = 'GRANT' | 'SOCIAL' | 'MEDICAL'
export type ResourceStatus = 'OPEN' | 'CLOSED' | 'UPCOMING' | 'ONGOING' | 'ARCHIVED'
export type Eligibility = 'INDIVIDUAL' | 'ORGANIZATION' | 'BOTH'
export type ClinicalPhase = 'PHASE_1' | 'PHASE_2' | 'PHASE_3' | 'PHASE_4'

export interface Resource {
  id: string
  resource_type: ResourceType
  title: string
  title_ka?: string
  title_fr?: string
  title_es?: string
  title_ru?: string
  slug: string
  description: string
  description_ka?: string
  description_fr?: string
  description_es?: string
  description_ru?: string
  amount_min?: number
  amount_max?: number
  currency: string
  deadline?: string
  start_date?: string
  end_date?: string
  is_rolling: boolean
  status: ResourceStatus
  eligibility: Eligibility
  eligibility_details?: string
  target_groups: string[]
  latitude?: number
  longitude?: number
  address?: string
  clinical_trial_phase?: ClinicalPhase
  nct_id?: string
  disease_areas: string[]
  source_url?: string
  source_name?: string
  application_url?: string
  is_verified: boolean
  is_featured: boolean
  view_count: number
  created_at: string
  updated_at: string
  published_at?: string
}

export interface ResourceFull extends Resource {
  purpose_tags?: string[]
  need_tags?: string[]
  country_codes?: string[]
  categories: {
    id: string
    name: string
    name_ka?: string
    name_fr?: string
    name_es?: string
    name_ru?: string
    icon?: string
    is_primary: boolean
  }[]
  locations: {
    country_code: string
    country_name: string
    country_name_ka?: string
    region_id?: string
    region_name?: string
    is_nationwide: boolean
  }[]
}

export interface Category {
  id: string
  parent_id?: string
  resource_type: ResourceType
  name: string
  name_ka?: string
  name_fr?: string
  name_es?: string
  name_ru?: string
  icon?: string
  sort_order: number
  is_active: boolean
  children?: Category[]
}

export interface Country {
  code: string
  name: string
  name_ka?: string
  name_fr?: string
  name_es?: string
  name_ru?: string
  group_code: string
  regions?: Region[]
}

export interface Region {
  id: string
  country_code: string
  name: string
  name_ka?: string
  name_fr?: string
  name_es?: string
  name_ru?: string
}

export interface ResourceFilters {
  type?: ResourceType
  categories?: string[]
  countries?: string[]
  regions?: string[]
  status?: ResourceStatus
  amount_min?: number
  amount_max?: number
  deadline_before?: string
  target_groups?: string[]
  eligibility?: Eligibility
  disease_areas?: string[]
  clinical_phase?: ClinicalPhase
  search?: string
  page: number
  limit: number
  sort: string
}

export interface ResourceStats {
  total: number
  by_type: Record<ResourceType, number>
  by_status: Record<ResourceStatus, number>
}
