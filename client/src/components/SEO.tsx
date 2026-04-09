/**
 * SEO Component — Dynamic meta tags, Open Graph, Twitter Cards, and canonical URLs
 * Uses react-helmet-async to inject <head> tags per page
 */

import { Helmet } from "react-helmet-async";
import { GRANT_COUNT_DISPLAY } from "@/lib/constants";

const DEFAULT_OG_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663102724389/ne96tB4yURpkfMNLLJuy9T/og-image-LT43qbv2mf3WDHuJv8pmuH.png";
const SITE_NAME = "GrantKit";
const DEFAULT_DESCRIPTION = `Curated database of ${GRANT_COUNT_DISPLAY} grants for medical treatment, financial assistance, and academic scholarships. Updated monthly.`;

interface SEOProps {
  /** Page title — will be suffixed with " | GrantKit" unless noSuffix is true */
  title?: string;
  /** Meta description for search engines */
  description?: string;
  /** Canonical URL path (e.g., "/catalog" or "/grant/item_0001") */
  canonicalPath?: string;
  /** Open Graph image URL */
  ogImage?: string;
  /** Open Graph type (default: "website") */
  ogType?: "website" | "article";
  /** Additional keywords for meta keywords tag */
  keywords?: string;
  /** Whether to add noindex directive */
  noIndex?: boolean;
  /** Skip the " | GrantKit" suffix on title */
  noSuffix?: boolean;
}

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  canonicalPath,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  keywords,
  noIndex = false,
  noSuffix = false,
}: SEOProps) {
  const fullTitle = title
    ? noSuffix
      ? title
      : `${title} | ${SITE_NAME}`
    : `${SITE_NAME} — Find Medical & Startup Grants Worldwide`;

  const canonicalUrl = canonicalPath
    ? `${window.location.origin}${canonicalPath}`
    : undefined;

  return (
    <Helmet>
      {/* Basic meta */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Canonical URL */}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}
    </Helmet>
  );
}
