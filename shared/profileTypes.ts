export type Purpose = 'EDUCATION' | 'MEDICAL' | 'BUSINESS'

export type PurposeDetail =
  | 'scholarship' | 'research_funding' | 'certification'
  | 'language_course' | 'child_school'
  | 'specialized_treatment' | 'child_treatment' | 'clinical_trial'
  | 'chronic_disease' | 'mental_health' | 'dental' | 'maternity'
  | 'free_clinic' | 'medication_access' | 'rehabilitation'
  | 'startup' | 'business_expansion' | 'employment'
  | 'freelance' | 'investment'

export type Need =
  | 'VISA' | 'HOUSING' | 'FOOD' | 'TRANSPORT'
  | 'LEGAL' | 'LANGUAGE' | 'BANKING'

export type NeedDetail =
  | 'temporary_housing' | 'long_term_rental' | 'hospital_nearby'
  | 'food_bank' | 'food_subsidy'
  | 'hospital_transport' | 'daily_transport' | 'flight_funding'
  | 'student_visa' | 'medical_visa' | 'work_visa'
  | 'startup_visa' | 'investor_visa' | 'nomad_visa'

export interface UserProfile {
  targetCountry: string | null
  purposes: Purpose[]
  purposeDetails: PurposeDetail[]
  needs: Need[]
  needDetails: NeedDetail[]
  profileCompletedAt: string | null
}

export const PURPOSE_OPTIONS: { value: Purpose; icon: string }[] = [
  { value: 'EDUCATION', icon: '📚' },
  { value: 'MEDICAL', icon: '🏥' },
  { value: 'BUSINESS', icon: '💼' },
]

export const PURPOSE_DETAIL_OPTIONS: Record<Purpose, { value: PurposeDetail; labelKey: string }[]> = {
  EDUCATION: [
    { value: 'scholarship', labelKey: 'profile.scholarship' },
    { value: 'research_funding', labelKey: 'profile.researchFunding' },
    { value: 'certification', labelKey: 'profile.certification' },
    { value: 'language_course', labelKey: 'profile.languageCourse' },
    { value: 'child_school', labelKey: 'profile.childSchool' },
  ],
  MEDICAL: [
    { value: 'specialized_treatment', labelKey: 'profile.specializedTreatment' },
    { value: 'child_treatment', labelKey: 'profile.childTreatment' },
    { value: 'clinical_trial', labelKey: 'profile.clinicalTrial' },
    { value: 'chronic_disease', labelKey: 'profile.chronicDisease' },
    { value: 'mental_health', labelKey: 'profile.mentalHealth' },
    { value: 'dental', labelKey: 'profile.dental' },
    { value: 'maternity', labelKey: 'profile.maternity' },
    { value: 'free_clinic', labelKey: 'profile.freeClinic' },
    { value: 'medication_access', labelKey: 'profile.medicationAccess' },
    { value: 'rehabilitation', labelKey: 'profile.rehabilitation' },
  ],
  BUSINESS: [
    { value: 'startup', labelKey: 'profile.startup' },
    { value: 'business_expansion', labelKey: 'profile.businessExpansion' },
    { value: 'employment', labelKey: 'profile.employment' },
    { value: 'freelance', labelKey: 'profile.freelance' },
    { value: 'investment', labelKey: 'profile.investment' },
  ],
}

export const NEED_OPTIONS: { value: Need; icon: string; labelKey: string }[] = [
  { value: 'VISA', icon: '📋', labelKey: 'profile.needVisa' },
  { value: 'HOUSING', icon: '🏠', labelKey: 'profile.needHousing' },
  { value: 'FOOD', icon: '🍽️', labelKey: 'profile.needFood' },
  { value: 'TRANSPORT', icon: '🚌', labelKey: 'profile.needTransport' },
  { value: 'LEGAL', icon: '⚖️', labelKey: 'profile.needLegal' },
  { value: 'LANGUAGE', icon: '🗣️', labelKey: 'profile.needLanguage' },
  { value: 'BANKING', icon: '🏦', labelKey: 'profile.needBanking' },
]

export const NEED_DETAIL_OPTIONS: Partial<Record<Need, { value: NeedDetail; labelKey: string }[]>> = {
  VISA: [
    { value: 'student_visa', labelKey: 'profile.studentVisa' },
    { value: 'medical_visa', labelKey: 'profile.medicalVisa' },
    { value: 'work_visa', labelKey: 'profile.workVisa' },
    { value: 'startup_visa', labelKey: 'profile.startupVisa' },
    { value: 'investor_visa', labelKey: 'profile.investorVisa' },
    { value: 'nomad_visa', labelKey: 'profile.nomadVisa' },
  ],
  HOUSING: [
    { value: 'temporary_housing', labelKey: 'profile.temporaryHousing' },
    { value: 'long_term_rental', labelKey: 'profile.longTermRental' },
    { value: 'hospital_nearby', labelKey: 'profile.hospitalNearby' },
  ],
  FOOD: [
    { value: 'food_bank', labelKey: 'profile.foodBank' },
    { value: 'food_subsidy', labelKey: 'profile.foodSubsidy' },
  ],
  TRANSPORT: [
    { value: 'hospital_transport', labelKey: 'profile.hospitalTransport' },
    { value: 'daily_transport', labelKey: 'profile.dailyTransport' },
    { value: 'flight_funding', labelKey: 'profile.flightFunding' },
  ],
}

export const SUPPORTED_COUNTRIES: { code: string; flag: string; labelKey: string }[] = [
  { code: 'US', flag: '🇺🇸', labelKey: 'country.US' },
  { code: 'GB', flag: '🇬🇧', labelKey: 'country.GB' },
  { code: 'DE', flag: '🇩🇪', labelKey: 'country.DE' },
  { code: 'FR', flag: '🇫🇷', labelKey: 'country.FR' },
  { code: 'NL', flag: '🇳🇱', labelKey: 'country.NL' },
  { code: 'IE', flag: '🇮🇪', labelKey: 'country.IE' },
  { code: 'ES', flag: '🇪🇸', labelKey: 'country.ES' },
  { code: 'IT', flag: '🇮🇹', labelKey: 'country.IT' },
  { code: 'PT', flag: '🇵🇹', labelKey: 'country.PT' },
  { code: 'SE', flag: '🇸🇪', labelKey: 'country.SE' },
  { code: 'AT', flag: '🇦🇹', labelKey: 'country.AT' },
  { code: 'BE', flag: '🇧🇪', labelKey: 'country.BE' },
  { code: 'DK', flag: '🇩🇰', labelKey: 'country.DK' },
  { code: 'FI', flag: '🇫🇮', labelKey: 'country.FI' },
  { code: 'EE', flag: '🇪🇪', labelKey: 'country.EE' },
  { code: 'CA', flag: '🇨🇦', labelKey: 'country.CA' },
]
