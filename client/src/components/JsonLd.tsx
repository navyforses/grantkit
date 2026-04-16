/**
 * JSON-LD Structured Data Components
 * Provides Schema.org markup for search engine rich results
 */

import { Helmet } from "react-helmet-async";
import { GRANT_COUNT_DISPLAY } from "@/lib/constants";

/** Organization schema for GrantKit */
export function OrganizationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "GrantKit",
    url: typeof window !== "undefined" ? window.location.origin : "https://grantkit-ne96tb4y.manus.space",
    logo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663102724389/ne96tB4yURpkfMNLLJuy9T/og-image-LT43qbv2mf3WDHuJv8pmuH.png",
    description:
      `Curated database of ${GRANT_COUNT_DISPLAY} grants for medical treatment, financial assistance, and academic scholarships worldwide.`,
    contactPoint: {
      "@type": "ContactPoint",
      email: "hello@grantkit.co",
      contactType: "customer service",
    },
    sameAs: [],
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

/** WebSite schema with search action for sitelinks search box */
export function WebSiteJsonLd() {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://grantkit-ne96tb4y.manus.space";
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "GrantKit",
    url: origin,
    description:
      "Find medical, financial, and academic grants worldwide. Curated database updated monthly.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${origin}/catalog?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

/** Grant detail page structured data */
interface GrantJsonLdProps {
  name: string;
  description: string;
  organization?: string;
  category: string;
  country: string;
  amount?: string;
  eligibility?: string;
  website?: string;
  url: string;
}

export function GrantJsonLd({
  name,
  description,
  organization,
  category,
  country,
  amount,
  eligibility,
  website,
  url,
}: GrantJsonLdProps) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "GovernmentService",
    name,
    description: description?.slice(0, 300) || name,
    serviceType: category,
    areaServed: {
      "@type": "Country",
      name: country,
    },
    url,
  };

  if (organization) {
    schema.provider = {
      "@type": "Organization",
      name: organization,
    };
  }

  if (website) {
    schema.url = website;
  }

  if (eligibility) {
    schema.audience = {
      "@type": "Audience",
      audienceType: eligibility.slice(0, 200),
    };
  }

  // BreadcrumbList for grant detail pages
  const origin = typeof window !== "undefined" ? window.location.origin : "https://grantkit-ne96tb4y.manus.space";
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: origin,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Grants Catalog",
        item: `${origin}/catalog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name,
        item: url,
      },
    ],
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
      <script type="application/ld+json">{JSON.stringify(breadcrumb)}</script>
    </Helmet>
  );
}

/** FAQ structured data for landing page */
interface FaqItem {
  question: string;
  answer: string;
}

export function FaqJsonLd({ items }: { items: FaqItem[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}
