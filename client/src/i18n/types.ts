export interface Translations {
  // Navbar
  nav: {
    home: string;
    catalog: string;
    subscribe: string;
    profile: string;
  };

  // Hero
  hero: {
    badge: string;
    title: string;
    titleAccent: string;
    subtitle: string;
    cta: string;
    seeCatalog: string;
    statCountries: string;
    statCountriesLabel: string;
    statMedical: string;
    statMedicalLabel: string;
    statFinancial: string;
    statFinancialLabel: string;
    statUpdated: string;
    statUpdatedLabel: string;
  };

  // Problem section
  problem: {
    title: string;
    subtitle: string;
    pain1Title: string;
    pain1Desc: string;
    pain2Title: string;
    pain2Desc: string;
    pain3Title: string;
    pain3Desc: string;
  };

  // What You Get section
  whatYouGet: {
    title: string;
    subtitle: string;
    cat1Title: string;
    cat1Desc: string;
    cat2Title: string;
    cat2Desc: string;
    cat3Title: string;
    cat3Desc: string;
    cat4Title: string;
    cat4Desc: string;
    cat5Title: string;
    cat5Desc: string;
    includesTitle: string;
    includes: string[];
  };

  // Preview section
  preview: {
    badge: string;
    title: string;
    subtitle: string;
    lockedTitle: string;
    lockedSubtitle: string;
    unlockCta: string;
  };

  // FAQ section
  faq: {
    title: string;
    items: { q: string; a: string }[];
  };

  // How It Works
  howItWorks: {
    title: string;
    subtitle: string;
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
  };

  // Testimonials / Social Proof
  testimonials: {
    title: string;
    subtitle: string;
    items: { name: string; role: string; text: string }[];
    statUsers: string;
    statUsersLabel: string;
    statGrants: string;
    statGrantsLabel: string;
    statCountries: string;
    statCountriesLabel: string;
  };

  // Pricing section
  pricing: {
    title: string;
    subtitle: string;
    monthly: string;
    annual: string;
    annualSave: string;
    perMonth: string;
    perYear: string;
    monthlyPrice: string;
    annualPrice: string;
    annualMonthlyPrice: string;
    features: string[];
    cta: string;
  };

  // Newsletter
  newsletter: {
    title: string;
    subtitle: string;
    placeholder: string;
    cta: string;
    success: string;
    error: string;
  };

  // Onboarding
  onboarding: {
    welcomeTitle: string;
    welcomeSubtitle: string;
    step1: string;
    step2: string;
    step3: string;
    getStarted: string;
  };

  // Final CTA
  finalCta: {
    title: string;
    subtitle: string;
    cta: string;
  };

  // Footer
  footer: {
    contact: string;
    paddle: string;
    rights: string;
  };

  // Catalog page (unified grants + resources)
  catalog: {
    title: string;
    subtitle: string;
    memberBanner: string;
    memberBannerCta: string;
    itemsCount: string;
    noResults: string;
    noResultsHint: string;
    clearFilters: string;
    apply: string;
    eligibility: string;
    searchPlaceholder: string;
    visitWebsite: string;
    loadMore: string;
    remaining: string;
    typeAll: string;
    typeGrant: string;
    typeResource: string;
    ctaTitle: string;
    ctaSubtitle: string;
    ctaButton: string;
  };

  // Filter labels
  categories: {
    all: string;
  };

  countries: {
    all: string;
  };

  // Filter & sort labels
  filters: {
    filters: string;
    clearAll: string;
    clearFilters: string;
    showResults: string;
    resultsFor: string;
    noResultsFor: string;
    type: string;
    country: string;
    stateLocation: string;
    city: string;
    condition: string;
    fundingType: string;
    b2Visa: string;
    deadline: string;
    state: string;
    allStates: string;
    nationwide: string;
    international: string;
    allCitiesIn: string;
    allCities: string;
    sortAZ: string;
    sortZA: string;
    sortNewest: string;
    sortCategory: string;
    sortCountry: string;
    sortState: string;
    onlyWithDeadline: string;
    anyDeadline: string;
    hasDeadline: string;
    // Diagnosis options
    allConditions: string;
    cancer: string;
    rareDisease: string;
    autismASD: string;
    cerebralPalsy: string;
    epilepsy: string;
    downSyndrome: string;
    hearingLoss: string;
    visionImpairment: string;
    diabetes: string;
    mentalHealth: string;
    spinalCordInjury: string;
    kidneyDisease: string;
    heartDisease: string;
    multipleSclerosis: string;
    alzheimers: string;
    generalAny: string;
    // Funding type options
    allFundingTypes: string;
    oneTime: string;
    recurring: string;
    reimbursement: string;
    varies: string;
    // B-2 visa options
    all: string;
    b2Eligible: string;
    usResidentsOnly: string;
    contactToConfirm: string;
  };

  // Grant detail page
  grantDetail: {
    notFound: string;
    notFoundDesc: string;
    backToCatalog: string;
    back: string;
    description: string;
    howToApply: string;
    requiredDocuments: string;
    contact: string;
    details: string;
    location: string;
    scope: string;
    category: string;
    organization: string;
    amount: string;
    conditions: string;
    status: string;
    deadlineLabel: string;
    geographicScope: string;
    fundingType: string;
    targetConditions: string;
    ageRange: string;
    children: string;
    adults: string;
    ages: string;
    relatedGrants: string;
    visitWebsite: string;
    noWebsite: string;
    noPhone: string;
    noEmail: string;
    applyNow: string;
    save: string;
    saved: string;
    saveThisGrant: string;
    removeFromSaved: string;
    share: string;
    failedToSave: string;
    linkCopied: string;
    nationwideUSA: string;
    open: string;
    b2VisaOK: string;
  };

  // Profile page
  profile: {
    title: string;
    accountInfo: string;
    name: string;
    email: string;
    memberSince: string;
    subscription: string;
    plan: string;
    status: string;
    nextBilling: string;
    statusActive: string;
    statusCancelled: string;
    statusPastDue: string;
    statusPaused: string;
    statusNone: string;
    cancelSubscription: string;
    cancelConfirmTitle: string;
    cancelConfirmDesc: string;
    cancelConfirmButton: string;
    cancelKeepButton: string;
    resubscribe: string;
    subscribeCta: string;
    subscribeDesc: string;
    logoutButton: string;
    backToHome: string;
  };

  // Legal pages
  legal: {
    backToHome: string;
    lastUpdated: string;
    privacyTitle: string;
    termsTitle: string;
    privacyIntroTitle: string;
    privacyIntroText: string;
    privacyCollectTitle: string;
    privacyCollectText: string;
    privacyCollect1: string;
    privacyCollect2: string;
    privacyCollect3: string;
    privacyCollect4: string;
    privacyCollectDetails: string;
    privacyUseTitle: string;
    privacyUseText: string;
    privacyUse1: string;
    privacyUse2: string;
    privacyUse3: string;
    privacyUse4: string;
    privacyUse5: string;
    privacyPaymentTitle: string;
    privacyPaymentText: string;
    privacyCookiesTitle: string;
    privacyCookiesText: string;
    privacyShareTitle: string;
    privacyShareText: string;
    privacySecurityTitle: string;
    privacySecurityText: string;
    privacyRetentionTitle: string;
    privacyRetentionText: string;
    privacyRightsTitle: string;
    privacyRightsText: string;
    privacyRights1: string;
    privacyRights2: string;
    privacyRights3: string;
    privacyRights4: string;
    privacyRights5: string;
    privacyChangesTitle: string;
    privacyChangesText: string;
    privacyContactTitle: string;
    privacyContactText: string;
    termsAcceptTitle: string;
    termsAcceptText: string;
    termsDescTitle: string;
    termsDescText: string;
    termsAccountTitle: string;
    termsAccountText: string;
    termsSubscriptionTitle: string;
    termsSubscriptionText: string;
    termsSub1: string;
    termsSub2: string;
    termsSub3: string;
    termsSub4: string;
    termsUseTitle: string;
    termsUseText: string;
    termsUse1: string;
    termsUse2: string;
    termsUse3: string;
    termsUse4: string;
    termsUse5: string;
    termsIPTitle: string;
    termsIPText: string;
    termsDisclaimerTitle: string;
    termsDisclaimerText: string;
    termsLiabilityTitle: string;
    termsLiabilityText: string;
    termsTerminationTitle: string;
    termsTerminationText: string;
    termsChangesTitle: string;
    termsChangesText: string;
    termsGoverningTitle: string;
    termsGoverningText: string;
    termsContactTitle: string;
    termsContactText: string;
    refundTitle: string;
    refundOverviewTitle: string;
    refundOverviewText: string;
    refundMerchantTitle: string;
    refundMerchantText: string;
    refundEligibilityTitle: string;
    refundEligibilityText: string;
    refundEligibility1: string;
    refundEligibility2: string;
    refundEligibility3: string;
    refundNotEligibleTitle: string;
    refundNotEligibleText: string;
    refundNotEligible1: string;
    refundNotEligible2: string;
    refundNotEligible3: string;
    refundNotEligible4: string;
    refundProcessTitle: string;
    refundProcessText: string;
    refundProcess1: string;
    refundProcess2: string;
    refundProcess3: string;
    refundTimelineTitle: string;
    refundTimelineText: string;
    refundCancellationTitle: string;
    refundCancellationText: string;
    refundChangesTitle: string;
    refundChangesText: string;
    refundContactTitle: string;
    refundContactText: string;
  };
}
