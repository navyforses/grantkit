export interface Translations {
  // Navbar
  nav: {
    home: string;
    grantsDirectory: string;
    resourcesDirectory: string;
    subscribe: string;
  };

  // Hero
  hero: {
    badge: string;
    title: string;
    titleAccent: string;
    subtitle: string;
    cta: string;
    seeGrants: string;
    statCountries: string;
    statCountriesLabel: string;
    statMedical: string;
    statMedicalLabel: string;
    statStartup: string;
    statStartupLabel: string;
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
    gumroad: string;
    rights: string;
  };

  // Grants page
  grants: {
    memberBanner: string;
    memberBannerCta: string;
    grantsCount: string;
    noResults: string;
    noResultsHint: string;
    apply: string;
    eligibility: string;
    searchPlaceholder: string;
    source: string;
  };

  // Filter categories (static "All" label only; dynamic categories use tCategory)
  categories: {
    all: string;
  };

  // Countries (static "All" label only; dynamic countries use tCountry)
  countries: {
    all: string;
  };

  // Resources page
  resources: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    resourcesCount: string;
    noResults: string;
    noResultsHint: string;
    visitWebsite: string;
    allResources: string;
    memberBanner: string;
    memberBannerCta: string;
    loadMore: string;
    remaining: string;
  };
}
