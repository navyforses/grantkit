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
