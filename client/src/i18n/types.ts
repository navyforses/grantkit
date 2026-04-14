export interface Translations {
  // Navbar
  nav: {
    home: string;
    catalog: string;
    subscribe: string;
    profile: string;
    dashboard: string;
    admin: string;
    login: string;
    logout: string;
    legal: string;
    user: string;
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
    statGrants: string;
    statGrantsLabel: string;
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
    prev: string;
    next: string;
    searching: string;
    loginRegister: string;
    activeSubscriber: string;
    grantsRefreshed: string;
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
    // Map filter panel
    allCountries: string;
    allRegions: string;
    category: string;
    searchCountries: string;
    searchRegions: string;
    searchCities: string;
    searchCategories: string;
    clearAllFilters: string;
    openFilters: string;
    closeFilters: string;
    nFound: string;
    noResults: string;
    typeMore: string;
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
    more: string;
    grant: string;
    resource: string;
    eligibility: string;
    close: string;
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
    adminAccess: string;
    planName: string;
    stepCountry: string;
    stepCountryHint: string;
    stepPurpose: string;
    stepPurposeHint: string;
    stepNeeds: string;
    stepNeedsHint: string;
    stepComplete: string;
    stepCompleteHint: string;
    purposeEducation: string;
    purposeMedical: string;
    purposeBusiness: string;
    scholarship: string;
    researchFunding: string;
    certification: string;
    languageCourse: string;
    childSchool: string;
    specializedTreatment: string;
    childTreatment: string;
    clinicalTrial: string;
    chronicDisease: string;
    mentalHealth: string;
    dental: string;
    maternity: string;
    freeClinic: string;
    medicationAccess: string;
    rehabilitation: string;
    startup: string;
    businessExpansion: string;
    employment: string;
    freelance: string;
    investment: string;
    needVisa: string;
    needHousing: string;
    needFood: string;
    needTransport: string;
    needLegal: string;
    needLanguage: string;
    needBanking: string;
    studentVisa: string;
    medicalVisa: string;
    workVisa: string;
    startupVisa: string;
    investorVisa: string;
    nomadVisa: string;
    temporaryHousing: string;
    longTermRental: string;
    hospitalNearby: string;
    foodBank: string;
    foodSubsidy: string;
    hospitalTransport: string;
    dailyTransport: string;
    flightFunding: string;
    fundingSection: string;
    needsSection: string;
    recentUpdates: string;
    newResource: string;
    updatedResource: string;
    closedResource: string;
    completeProfileBanner: string;
    completeProfileCta: string;
    editProfile: string;
    noFundingResults: string;
    noNeedsResults: string;
    saveProfileError: string;
    next: string;
    back: string;
    skip: string;
    finish: string;
  };

  country: {
    US: string;
    GB: string;
    DE: string;
    FR: string;
    NL: string;
    IE: string;
    ES: string;
    IT: string;
    PT: string;
    SE: string;
    AT: string;
    BE: string;
    DK: string;
    FI: string;
    EE: string;
    CA: string;
  };

  // Admin panel
  admin: {
    // Page-level
    title: string;
    refresh: string;
    accessDenied: string;
    noPermission: string;
    returnHome: string;

    // Stat cards
    totalUsers: string;
    activeSubs: string;
    totalGrants: string;
    subscribers: string;
    cancelled: string;
    pastDue: string;
    noSub: string;

    // Tabs
    tabUsers: string;
    tabGrants: string;
    tabNewsletter: string;

    // Status badges
    statusActive: string;
    statusCancelled: string;
    statusPastDue: string;
    statusPaused: string;
    statusNone: string;

    // Role badges
    roleAdmin: string;
    roleUser: string;

    // Category labels
    catMedicalTreatment: string;
    catFinancialAssistance: string;
    catAssistiveTechnology: string;
    catSocialServices: string;
    catScholarships: string;
    catHousing: string;
    catTravelTransport: string;
    catInternational: string;
    catOther: string;

    // Users tab
    usersTitle: string;
    searchUsers: string;
    allStatuses: string;
    noSubscription: string;
    thUser: string;
    thRole: string;
    thSubscription: string;
    thJoined: string;
    thLastLogin: string;
    thActions: string;
    loadingUsers: string;
    noUsersFound: string;
    promote: string;
    demote: string;
    showing: string;

    // Grants tab
    grantsTitle: string;
    grantsCount: string;
    searchGrants: string;
    allCategories: string;
    addGrant: string;
    importBtn: string;
    thGrant: string;
    thCategory: string;
    thType: string;
    thCountry: string;
    thStatus: string;
    thAdded: string;
    loadingGrants: string;
    noGrantsFound: string;
    typeGrant: string;
    typeResource: string;
    activeStatus: string;
    inactiveStatus: string;

    // Grant form modal
    addNewGrant: string;
    editGrant: string;
    formName: string;
    formOrganization: string;
    formDescription: string;
    formCategory: string;
    formType: string;
    formCountry: string;
    formAmount: string;
    formEligibility: string;
    formWebsite: string;
    formEmail: string;
    formPhone: string;
    formStatus: string;
    enrichmentDetails: string;
    formApplicationProcess: string;
    formDeadline: string;
    formFundingType: string;
    formTargetDiagnosis: string;
    formAgeRange: string;
    formState: string;
    formCity: string;
    formGeographicScope: string;
    formB2Visa: string;
    formDocumentsRequired: string;
    notSpecified: string;
    oneTime: string;
    recurring: string;
    reimbursement: string;
    varies: string;
    yes: string;
    no: string;
    uncertain: string;
    notifySubscribers: string;
    notifySubscribersDesc: string;
    cancel: string;
    createGrant: string;
    saveChanges: string;

    // Placeholders
    phGrantName: string;
    phOrganization: string;
    phDescription: string;
    phAmount: string;
    phEligibility: string;
    phWebsite: string;
    phEmail: string;
    phPhone: string;
    phStatus: string;
    phApplicationProcess: string;
    phDeadline: string;
    phTargetDiagnosis: string;
    phAgeRange: string;
    phState: string;
    phCity: string;
    phGeographicScope: string;
    phDocuments: string;

    // Delete modal
    deleteGrant: string;
    deleteConfirm: string;
    deleteBtn: string;

    // Notification modal
    sendNotification: string;
    selectGrantsToNotify: string;
    selected: string;
    searchGrantsToInclude: string;
    selectAtLeastOne: string;
    grantsSelected: string;
    sendToSubscribers: string;

    // Newsletter tab
    activeSubscribers: string;
    notificationsSent: string;
    totalSubscribers: string;
    unsubscribed: string;
    completed: string;
    failed: string;
    sendGrantNotification: string;
    notificationHistory: string;
    thSubject: string;
    thGrantsCol: string;
    thRecipients: string;
    thSuccess: string;
    thSentAt: string;
    noNotifications: string;
    noNotificationsHint: string;

    // Import modal
    importGrants: string;
    importStepUpload: string;
    importStepPreview: string;
    importStepImporting: string;
    importStepDone: string;
    parsingFile: string;
    dropFileHere: string;
    orClickBrowse: string;
    expectedColumns: string;
    requiredColumns: string;
    optionalColumns: string;
    translationColumns: string;
    importTip: string;
    validRows: string;
    skipped: string;
    errors: string;
    validationErrors: string;
    previewRows: string;
    andMoreRows: string;
    importingGrants: string;
    thisMayTakeMoment: string;
    importComplete: string;
    created: string;
    updated: string;
    failedEntries: string;
    uploadDifferentFile: string;
    importNGrants: string;
    done: string;
    close: string;

    // Toast messages
    toastRoleUpdated: string;
    toastSubUpdated: string;
    toastGrantCreated: string;
    toastGrantUpdated: string;
    toastGrantDeleted: string;
    toastNoGrantsExport: string;
    toastExportFailed: string;
    toastParseFailed: string;
    toastImportFailed: string;

    // Country labels
    unitedStates: string;
    international: string;

    // External search tab
    tabExternal: string;
    extSearchPlaceholder: string;
    extSourceAll: string;
    extSourceFederal: string;
    extSourceFoundation: string;
    extSourceState: string;
    extSourceIntl: string;
    extSearchBtn: string;
    extResults: string;
    extSearching: string;
    extLoadingDetail: string;
    extMappedCategory: string;
    extAddToCatalog: string;
    extAddAndNotify: string;
    extDetailNotFound: string;
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

  // Contact page
  contact: {
    pageTitle: string;
    pageDescription: string;
    backHome: string;
    heading: string;
    subheading: string;
    successTitle: string;
    successMessage: string;
    sendAnother: string;
    browseCatalog: string;
    emailLabel: string;
    responseLabel: string;
    responseTime: string;
    getInTouch: string;
    responseTimeLabel: string;
    usualResponseTime: string;
    nameLabel: string;
    namePlaceholder: string;
    emailPlaceholder: string;
    messageLabel: string;
    messagePlaceholder: string;
    sending: string;
    sendMessage: string;
    toastSuccess: string;
    toastError: string;
    toastValidation: string;
  };

  // Dashboard page
  dashboard: {
    welcome: string;
    pageTitle: string;
    signInTitle: string;
    signInSubtitle: string;
    signInButton: string;
    subtitle: string;
    settings: string;
    saved: string;
    available: string;
    active: string;
    upgrade: string;
    unlockTitle: string;
    unlockDesc: string;
    priceMonth: string;
    savedGrants: string;
    browse: string;
    noSavedTitle: string;
    noSavedDesc: string;
    exploreCatalog: string;
    quickActions: string;
    support: string;
    subscription: string;
    activeMember: string;
    activeMessage: string;
    manageSubscription: string;
    subscribePrompt: string;
    subscribeCta: string;
    browseCatalog: string;
    contactSupport: string;
    accountSettings: string;
    yourActivity: string;
    totalAvailable: string;
    removeFromSaved: string;
    toastRemoveError: string;
  };

  // Dashboard layout
  dashboardLayout: {
    signInTitle: string;
    signInMessage: string;
    signInButton: string;
    navigation: string;
    signOut: string;
  };

  // Not Found page
  notFound: {
    title: string;
    description: string;
    descriptionLine2: string;
    goHome: string;
  };

  // Error Boundary
  errorBoundary: {
    title: string;
    reload: string;
  };

  // AI Assistant page
  aiAssistant: {
    title: string;
    subtitle: string;
    description: string;
    liveDatabase: string;
    countries: string;
    grants: string;
    placeholder: string;
    newChat: string;
    emptyState: string;
    copy: string;
    error: string;
    retry: string;
    panelTitle: string;
    suggestedPrompts: string[];
    focusLabel: string;
    focusRemoved: string;
    askAboutGrant: string;
    fullInfo: string;
    removeFocus: string;
    focusPlaceholder: string;
    chatTab: string;
    grantSuggestedPrompts: string[];
  };

  // Resource system (Supabase multi-category resources)
  resources: {
    // Type tabs
    typeGrant: string
    typeSocial: string
    typeMedical: string
    // Filter labels
    filterCountry: string
    filterStatus: string
    filterAmount: string
    filterDeadline: string
    filterCategory: string
    filterEligibility: string
    filterTargetGroup: string
    filterClearAll: string
    filterClinicalPhase: string
    filterDiseaseArea: string
    resultsCount: string
    // Status labels
    statusOpen: string
    statusClosed: string
    statusUpcoming: string
    statusOngoing: string
    statusArchived: string
    // Target groups
    targetChildren: string
    targetDisabled: string
    targetVeterans: string
    targetImmigrants: string
    targetStudents: string
    targetElderly: string
    // Eligibility
    eligibilityIndividual: string
    eligibilityOrganization: string
    eligibilityBoth: string
    // Detail page
    applyNow: string
    sourceWebsite: string
    viewDetails: string
    relatedResources: string
    amountRange: string
    deadlineLabel: string
    eligibilityLabel: string
    locationLabel: string
    categoriesLabel: string
    clinicalPhaseLabel: string
    nctIdLabel: string
    diseaseAreasLabel: string
    featuredBadge: string
    verifiedBadge: string
    rollingDeadline: string
    noDeadline: string
    daysLeft: string
    dayLeft: string
    closingSoon: string
    // Empty / error
    noResults: string
    noResultsHint: string
    errorLoading: string
    // Sort/filter UI (new Supabase system)
    filterByCategory: string
    filterByCountry: string
    filterByStatus: string
    sortBy: string
    sortNewest: string
    sortDeadline: string
    sortAmountHigh: string
    sortAmountLow: string
    sortName: string
    sortRelevance: string
    // Short-form labels (aliases for existing labels, used in sort/filter chips)
    deadline: string
    eligibility: string
    individual: string
    organization: string
    both: string
    targetGroups: string
    children: string
    disabled: string
    veterans: string
    immigrants: string
    students: string
    elderly: string
    clinicalPhase: string
    diseaseArea: string
    clearFilters: string
    // Admin resource management
    addResource: string
    editResource: string
    importCSV: string
    importSuccess: string
    importErrors: string
  }

  // SEO meta tags
  seo: {
    homeTitle: string;
    homeDescription: string;
    catalogTitle: string;
    catalogDescription: string;
    contactTitle: string;
    contactDescription: string;
    dashboardTitle: string;
    adminTitle: string;
    profileTitle: string;
    privacyTitle: string;
    privacyDescription: string;
    termsTitle: string;
    termsDescription: string;
    refundTitle: string;
    refundDescription: string;
  };
}
