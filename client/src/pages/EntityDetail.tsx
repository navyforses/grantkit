/*
 * EntityDetail — unified detail page for grants and resources.
 * (Previously GrantDetail.)
 *
 * Desktop (lg+): full-width breadcrumb + 50/50 two-column layout.
 *   Left  — badges, title, org, metrics grid, description, eligibility, CTAs.
 *   Right — LocationMap (280 px), office/contact card, application process,
 *           required documents.
 *   Below — related entities, full width, 3-col grid.
 *
 * Mobile (<lg): single-column stacked; sticky bottom CTA bar for Apply + Save
 *   (positioned bottom-16 to clear MobileBottomNav).
 *
 * Routed at /grant/:id. Renders differently based on item.type
 * ("grant" vs "resource") — see conditional blocks below.
 */

import { useMemo, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import {
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  Globe,
  Home,
  Info,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Plane,
  Share2,
  Sparkles,
  Stethoscope,
  Tag,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getCategoryStyle, getCategoryBorderColor } from "@/lib/constants";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import { GrantJsonLd } from "@/components/JsonLd";
import GrantDetailSkeleton from "@/components/GrantDetailSkeleton";
import LocationMap from "@/components/LocationMap";
import { useGeocodedAddress } from "@/hooks/useGeocodedAddress";
import { openInGoogleMapsDirections } from "@/lib/googleMaps";
import { catalogItems } from "@/data/catalogData";
import { useSaveEntity } from "@/hooks/useSaveEntity";
import { pickLocalizedFields } from "@/lib/localizeEntity";
import GrantAiChat from "@/components/GrantAiChat";
import type { ParsedGrant } from "@/components/GrantCard";

export default function EntityDetail() {
  const params = useParams<{ id: string }>();
  const [, _navigate] = useLocation();
  void _navigate;
  const { t, tCategory, tCountry, tCatalogContent, language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<"info" | "ai">("info");

  const itemId = params.id || "";
  const { data: detailData, isLoading } = trpc.catalog.detail.useQuery(
    { itemId },
    { enabled: !!itemId, retry: false }
  );

  // Static fallback: find grant from bundled catalog when API unavailable.
  const staticGrant = useMemo(() => {
    if (detailData?.grant) return null;
    return catalogItems.find((g: any) => g.id === itemId || g.itemId === itemId) || null;
  }, [detailData, itemId]);

  const grant = detailData?.grant || staticGrant;

  const { data: savedData } = trpc.grants.savedList.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  const savedSet = useMemo(() => new Set(savedData?.grantIds || []), [savedData]);
  const isSaved = grant ? savedSet.has(grant.id) : false;

  const { toggleSave } = useSaveEntity({
    errorMessage: grant?.type === "resource" ? t.resourceDetail.failedToSave : t.grantDetail.failedToSave,
  });

  if (isLoading && !grant) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <GrantDetailSkeleton />
      </div>
    );
  }

  if (!grant) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2">{t.grantDetail.notFound}</h2>
            <p className="text-muted-foreground/80 mb-6 text-sm">{t.grantDetail.notFoundDesc}</p>
            <Link href="/catalog">
              <Button variant="outline" className="gap-2 border-border text-foreground/80 hover:bg-muted hover:text-foreground">
                <ChevronRight className="w-4 h-4 rotate-180" />
                {t.grantDetail.backToCatalog}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const item = grant;
  const translations = detailData?.translations || {};
  const relatedItems = detailData?.related || [];

  // Type-aware labels: resources get different strings for CTA, titles,
  // "save this" button, etc. When item.type === "grant" (current default
  // for all 643 entries) we use the legacy grantDetail copy, which is
  // unchanged from before R3.
  const isResource = item.type === "resource";
  const labels = {
    notFound: isResource ? t.resourceDetail.notFound : t.grantDetail.notFound,
    notFoundDesc: isResource ? t.resourceDetail.notFoundDesc : t.grantDetail.notFoundDesc,
    applyNow: isResource ? t.resourceDetail.applyNow : t.grantDetail.applyNow,
    saveThisOne: isResource ? t.resourceDetail.saveThisOne : t.grantDetail.saveThisGrant,
    failedToSave: isResource ? t.resourceDetail.failedToSave : t.grantDetail.failedToSave,
    descriptionTitle: isResource ? t.resourceDetail.descriptionTitle : t.detail.descriptionTitle,
    processTitle: isResource ? t.resourceDetail.processTitle : t.detail.processTitle,
    relatedTitle: isResource ? t.resourceDetail.relatedTitle : t.detail.relatedTitle,
  };

  const apiTrans = language !== "en" ? translations[language] : null;
  const staticTrans = language !== "en" && !apiTrans
    ? tCatalogContent(item.itemId || item.id, { name: item.name, description: item.description || "", eligibility: item.eligibility || "" })
    : null;

  const content = pickLocalizedFields(
    item,
    ["name", "description", "eligibility", "applicationProcess", "deadline", "targetDiagnosis", "ageRange", "geographicScope", "documentsRequired"] as const,
    apiTrans as Record<string, unknown> | null | undefined,
    staticTrans as unknown as Record<string, unknown> | null | undefined,
  );

  const translatedCategory = tCategory(item.category);
  const translatedCountry = tCountry(item.country);
  const countryFlag = item.country === "US" ? "🇺🇸" : "🌐";
  const typeLabel = item.type === "grant" ? t.catalog.typeGrant : t.catalog.typeResource;

  const locationDisplay = item.state && item.state !== "Nationwide" && item.state !== "International"
    ? `${item.city ? item.city + ", " : ""}${item.state}`
    : item.state === "Nationwide" ? t.grantDetail.nationwideUSA : translatedCountry;

  const borderColor = getCategoryBorderColor(item.category);
  const primaryLink = item.website || "";
  const applyHref = primaryLink.startsWith("http") ? primaryLink : `https://${primaryLink}`;

  // Coords: API returns decimal as string; static fallback may omit entirely.
  const mapLat = toFiniteNumber((item as any).latitude);
  const mapLng = toFiniteNumber((item as any).longitude);
  const mapAddress = ((item as any).address && String((item as any).address).trim())
    || [item.city, item.state, translatedCountry].filter(Boolean).join(", ");
  // Query string for the geocoder — prefix the org name so results are
  // more specific than a bare city/state ("St Jude Memphis" vs "Memphis").
  const geocodeQuery = [item.organization, mapAddress].filter(Boolean).join(", ");
  // Client-side geocoding fallback for rows where the Phase 2 batch
  // pipeline has not yet populated latitude/longitude in the DB.
  const geo = useGeocodedAddress({
    address: geocodeQuery,
    fallbackLat: mapLat,
    fallbackLng: mapLng,
  });
  const resolvedLat = geo.lat;
  const resolvedLng = geo.lng;
  const hasResolvedCoords = resolvedLat !== null && resolvedLng !== null;
  const showMapPanel = Boolean(mapAddress) && !geo.error;
  const officeHours = (item as any).officeHours as string | undefined;

  const fundingTypeLabels: Record<string, string> = {
    one_time: t.filters.oneTime,
    recurring: t.filters.recurring,
    reimbursement: t.filters.reimbursement,
    varies: t.filters.varies,
    unknown: "—",
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: content.name, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success(t.grantDetail.linkCopied);
    }
  };

  const handleDirections = () => {
    openInGoogleMapsDirections({
      // Prefer resolved coords (from DB or from the client-side geocoder
      // fallback) so the directions URL is lat/lng-accurate even for
      // grants the batch geocoder has not yet processed.
      latitude: resolvedLat ?? undefined,
      longitude: resolvedLng ?? undefined,
      address: mapAddress,
      organization: item.organization || undefined,
    });
  };

  const seoDescription = content.description
    ? content.description.slice(0, 160).replace(/\s+/g, " ").trim() + (content.description.length > 160 ? "..." : "")
    : `${content.name} — ${translatedCategory} grant from ${item.organization || "GrantKit"}`;
  const seoKeywords = [
    content.name, item.organization, translatedCategory, translatedCountry,
    item.type === "grant" ? "grant" : "resource", "funding",
  ].filter(Boolean).join(", ");

  const b2Badge = item.b2VisaEligible === "yes"
    ? { label: t.filters.b2Eligible, color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" }
    : item.b2VisaEligible === "no"
    ? { label: t.filters.usResidentsOnly, color: "bg-red-500/20 text-red-300 border-red-500/30" }
    : item.b2VisaEligible === "uncertain"
    ? { label: t.filters.contactToConfirm, color: "bg-amber-500/20 text-amber-300 border-amber-500/30" }
    : null;

  // Metrics grid — only render cells that have data.
  type Metric = { icon: React.ReactNode; label: string; value: string; accent?: string };
  const metrics: Metric[] = [];
  if (item.amount) metrics.push({
    icon: <DollarSign className="w-3.5 h-3.5 text-[color:var(--brand-green)]" />,
    label: t.detail.metricAmount,
    value: item.amount,
    accent: "text-[color:var(--brand-green)]",
  });
  if (content.deadline) metrics.push({
    icon: <Calendar className="w-3.5 h-3.5 text-blue-400" />,
    label: t.detail.metricDeadline,
    value: content.deadline,
  });
  if (item.state || translatedCountry) metrics.push({
    icon: <MapPin className="w-3.5 h-3.5 text-muted-foreground/80" />,
    label: t.detail.metricLocation,
    value: locationDisplay,
  });
  if (content.geographicScope) metrics.push({
    icon: <Globe className="w-3.5 h-3.5 text-muted-foreground/80" />,
    label: t.detail.metricScope,
    value: content.geographicScope,
  });
  if (item.status) metrics.push({
    icon: <CheckCircle2 className={`w-3.5 h-3.5 ${item.status === "Open" ? "text-[color:var(--brand-green)]" : "text-muted-foreground/80"}`} />,
    label: t.detail.metricStatus,
    value: item.status,
    accent: item.status === "Open" ? "text-[color:var(--brand-green)]" : undefined,
  });
  if (item.fundingType && item.fundingType !== "unknown") metrics.push({
    icon: <Tag className="w-3.5 h-3.5 text-purple-400" />,
    label: t.detail.metricFunding,
    value: fundingTypeLabels[item.fundingType] || item.fundingType,
  });
  if (content.ageRange && content.ageRange !== "0-100") {
    const ageValue = content.ageRange === "0-18"
      ? `${t.grantDetail.children} (0–18)`
      : content.ageRange === "18-100"
      ? `${t.grantDetail.adults} (18+)`
      : t.grantDetail.ages.replace("{range}", content.ageRange);
    metrics.push({
      icon: <Users className="w-3.5 h-3.5 text-muted-foreground/80" />,
      label: t.detail.metricAge,
      value: ageValue,
    });
  }
  if (content.targetDiagnosis && content.targetDiagnosis !== "General") {
    const parts = content.targetDiagnosis.split(",").map((d: string) => d.trim()).filter(Boolean);
    const value = parts.slice(0, 2).join(", ") + (parts.length > 2 ? ` +${parts.length - 2}` : "");
    metrics.push({
      icon: <Stethoscope className="w-3.5 h-3.5 text-muted-foreground/80" />,
      label: t.detail.metricConditions,
      value,
    });
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title={content.name}
        description={seoDescription}
        canonicalPath={`/grant/${item.id}`}
        keywords={seoKeywords}
        ogType="article"
      />
      <GrantJsonLd
        name={content.name}
        description={content.description || ""}
        organization={item.organization}
        category={translatedCategory}
        country={translatedCountry}
        amount={item.amount}
        eligibility={content.eligibility}
        website={item.website}
        url={window.location.href}
      />
      <Navbar />

      {/* Breadcrumb bar */}
      <nav
        aria-label="Breadcrumb"
        className="border-b border-border bg-background"
      >
        <div className="container px-4 py-2.5 flex items-center gap-1.5 text-[13px] text-muted-foreground/80 overflow-hidden">
          <Link
            href="/"
            className="hover:text-foreground/90 transition-colors flex items-center gap-1 shrink-0"
            aria-label={t.detail.breadcrumbHome}
          >
            <Home className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">{t.detail.breadcrumbHome}</span>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" aria-hidden="true" />
          <Link
            href="/catalog"
            className="hover:text-foreground/90 transition-colors shrink-0 truncate"
          >
            {t.detail.breadcrumbCatalog}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" aria-hidden="true" />
          <span className="text-foreground/85 truncate font-medium" aria-current="page">{content.name}</span>
        </div>
      </nav>

      {/* Info / AI chat tab switcher */}
      <div
        role="tablist"
        aria-label={content.name}
        className="border-b border-border bg-background"
      >
        <div className="container px-4 flex items-center gap-1">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "info"}
            onClick={() => setActiveTab("info")}
            className={`relative flex items-center gap-2 px-4 py-3 text-[13px] font-medium transition-colors ${
              activeTab === "info"
                ? "text-[color:var(--brand-green)]"
                : "text-muted-foreground hover:text-foreground/90"
            }`}
          >
            <Info className="w-3.5 h-3.5" aria-hidden="true" />
            {t.aiAssistant.fullInfo}
            {activeTab === "info" && (
              <span
                aria-hidden="true"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[color:var(--brand-green)]"
              />
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "ai"}
            onClick={() => setActiveTab("ai")}
            className={`relative flex items-center gap-2 px-4 py-3 text-[13px] font-medium transition-colors ${
              activeTab === "ai"
                ? "text-[color:var(--brand-green)]"
                : "text-muted-foreground hover:text-foreground/90"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            {t.aiAssistant.chatTab}
            {activeTab === "ai" && (
              <span
                aria-hidden="true"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[color:var(--brand-green)]"
              />
            )}
          </button>
        </div>
      </div>

      {activeTab === "ai" && (
        <div className="container px-4 py-6 md:py-8 flex-1 pb-32 lg:pb-10">
          <div className="mx-auto max-w-4xl h-[calc(100dvh-16rem)] min-h-[520px]">
            <GrantAiChat
              className="h-full border-border bg-muted/30"
              grantId={item.id}
              grant={{
                name: content.name,
                organization: item.organization || undefined,
                country: translatedCountry || undefined,
                amount: item.amount || undefined,
                deadline: content.deadline || undefined,
                website: item.website || undefined,
              } satisfies ParsedGrant}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      {activeTab === "info" && (
      <div className="container px-4 py-6 md:py-8 flex-1 pb-32 lg:pb-10">
        <div className="lg:grid lg:grid-cols-2 lg:gap-8 xl:gap-12">

          {/* ═════ LEFT COLUMN ═════ */}
          <div className="space-y-5">

            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl leading-none">{countryFlag}</span>
              <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${getCategoryStyle(item.category)}`}>
                {translatedCategory}
              </span>
              <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${
                item.type === "grant"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-blue-500/20 text-blue-300"
              }`}>
                {typeLabel}
              </span>
              {b2Badge && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border flex items-center gap-1 ${b2Badge.color}`}>
                  <Plane className="w-2.5 h-2.5" />
                  {b2Badge.label}
                </span>
              )}
            </div>

            {/* Title */}
            <div>
              <h1 className="text-xl md:text-2xl lg:text-[28px] font-bold text-white leading-tight tracking-tight">
                {content.name}
              </h1>
              {item.organization && item.organization !== item.name && (
                <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-sm">
                  <Building2 className="w-4 h-4 shrink-0 text-muted-foreground/70" />
                  <span className="truncate">{item.organization}</span>
                </p>
              )}
            </div>

            {/* Metrics grid */}
            {metrics.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {metrics.map((m, i) => (
                  <div
                    key={i}
                    className="bg-muted/60 border border-border rounded-lg px-3 py-2.5"
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {m.icon}
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">
                        {m.label}
                      </span>
                    </div>
                    <p className={`text-[13px] font-semibold ${m.accent || "text-foreground"} truncate`}>
                      {m.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Description */}
            <div className={`bg-muted/40 border border-border rounded-xl p-5 ${borderColor} border-l-4`}>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                {labels.descriptionTitle}
              </h2>
              <p className="text-sm md:text-[15px] text-foreground/90 leading-relaxed whitespace-pre-line">
                {content.description || "—"}
              </p>
            </div>

            {/* Eligibility */}
            {content.eligibility && (
              <div className="bg-muted/40 border border-border rounded-xl p-5">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" />
                  {t.detail.eligibilityTitle}
                </h2>
                <p className="text-sm md:text-[15px] text-foreground/90 leading-relaxed whitespace-pre-line">
                  {content.eligibility}
                </p>
              </div>
            )}

            {/* Desktop CTAs — hidden on mobile (uses sticky bottom bar instead) */}
            {primaryLink && (
              <div className="hidden lg:flex flex-col gap-3">
                <a href={applyHref} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full h-12 bg-[color:var(--brand-green)] hover:bg-[color:var(--brand-green)]/90 text-white font-semibold gap-2 rounded-xl text-[15px]">
                    <ArrowUpRight className="w-4 h-4" />
                    {labels.applyNow}
                  </Button>
                </a>
                <div className="flex gap-3">
                  {isAuthenticated && (
                    <Button
                      variant="outline"
                      className={`flex-1 h-11 rounded-xl gap-2 ${
                        isSaved
                          ? "border-yellow-400/40 text-yellow-400 hover:bg-yellow-400/10 hover:text-yellow-300"
                          : "border-border text-foreground/80 hover:bg-muted hover:text-foreground"
                      }`}
                      onClick={() => toggleSave(item.id)}
                    >
                      {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                      {isSaved ? t.grantDetail.saved : labels.saveThisOne}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="h-11 px-4 rounded-xl border-border text-foreground/80 hover:bg-muted hover:text-foreground gap-2"
                    onClick={handleShare}
                  >
                    <Share2 className="w-4 h-4" />
                    {t.grantDetail.share}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ═════ RIGHT COLUMN ═════ */}
          <div className="space-y-5 mt-5 lg:mt-0">

            {/* LocationMap — always rendered when we have *any* address
                info. If the DB already has lat/lng we mount the map
                immediately; otherwise the useGeocodedAddress hook resolves
                the address through the Google Maps Geocoder (cached in
                sessionStorage) and we show a skeleton for ~200–500 ms while
                that resolves. Geocoder hard-failures hide the panel so we
                don't ship a permanently-broken box. */}
            {showMapPanel && (
              <div className="bg-muted/40 border border-border rounded-xl overflow-hidden">
                <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-2">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" />
                    {t.detail.locationTitle}
                  </h2>
                  <button
                    type="button"
                    onClick={handleDirections}
                    disabled={!hasResolvedCoords}
                    aria-label={`${t.deepLink.getDirections} — ${item.organization || mapAddress} (${t.deepLink.nativeAppHint})`}
                    className="flex items-center gap-1.5 text-xs text-[color:var(--brand-green)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-green)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1419] rounded px-1 py-0.5 transition-colors font-medium whitespace-nowrap disabled:text-muted-foreground/50 disabled:cursor-not-allowed"
                  >
                    <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
                    {t.detail.getDirections}
                  </button>
                </div>
                <div className="px-4 pb-4">
                  {hasResolvedCoords ? (
                    <LocationMap
                      latitude={resolvedLat as number}
                      longitude={resolvedLng as number}
                      address={mapAddress}
                      organization={item.organization || ""}
                      serviceArea={content.geographicScope || undefined}
                      height={280}
                    />
                  ) : (
                    <div
                      role="status"
                      aria-live="polite"
                      aria-label={t.map.loading}
                      style={{ height: 280 }}
                      className="w-full rounded-xl bg-muted/40 border border-border/60 flex items-center justify-center overflow-hidden relative"
                    >
                      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/[0.02] via-[var(--brand-green)]/[0.05] to-white/[0.02]" />
                      <span className="relative text-xs text-muted-foreground/70">{t.map.loading}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Office / Contact card */}
            <div className="bg-muted/40 border border-border rounded-xl p-5">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5" />
                {t.detail.officeTitle}
              </h2>
              <div className="space-y-3">
                {primaryLink ? (
                  <a
                    href={applyHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-medium text-[color:var(--brand-green)] hover:text-foreground transition-colors"
                  >
                    <Globe className="w-4 h-4 shrink-0" />
                    <span className="truncate">{t.catalog.visitWebsite}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                  </a>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground/50">
                    <Globe className="w-4 h-4 shrink-0" />
                    {t.grantDetail.noWebsite}
                  </p>
                )}
                {item.phone ? (
                  <a
                    href={`tel:${item.phone}`}
                    className="flex items-center gap-2 text-sm text-foreground/85 hover:text-foreground transition-colors"
                  >
                    <Phone className="w-4 h-4 shrink-0 text-muted-foreground/70" />
                    <span className="truncate">{item.phone}</span>
                  </a>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground/50">
                    <Phone className="w-4 h-4 shrink-0" />
                    {t.grantDetail.noPhone}
                  </p>
                )}
                {item.email ? (
                  <a
                    href={`mailto:${item.email}`}
                    className="flex items-center gap-2 text-sm text-foreground/85 hover:text-foreground transition-colors"
                  >
                    <Mail className="w-4 h-4 shrink-0 text-muted-foreground/70" />
                    <span className="truncate">{item.email}</span>
                  </a>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground/50">
                    <Mail className="w-4 h-4 shrink-0" />
                    {t.grantDetail.noEmail}
                  </p>
                )}
                {officeHours && (
                  <div className="flex items-start gap-2 pt-1">
                    <Clock className="w-4 h-4 shrink-0 text-muted-foreground/70 mt-0.5" />
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 block">
                        {t.detail.officeHours}
                      </span>
                      <span className="text-sm text-foreground/85">{officeHours}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Application process */}
            {content.applicationProcess && (
              <div className="bg-muted/40 border border-border rounded-xl p-5">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[color:var(--brand-green)]" />
                  {labels.processTitle}
                </h2>
                <p className="text-sm md:text-[15px] text-foreground/90 leading-relaxed whitespace-pre-line">
                  {content.applicationProcess}
                </p>
              </div>
            )}

            {/* Required documents */}
            {content.documentsRequired && (
              <div className="bg-muted/40 border border-border rounded-xl p-5">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground/80" />
                  {t.detail.docsTitle}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {content.documentsRequired.split(",").map((doc: string, i: number) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-xs bg-muted border border-border text-foreground/85 px-2.5 py-1 rounded-full"
                    >
                      <CheckCircle2 className="w-3 h-3 text-[color:var(--brand-green)]" />
                      {doc.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related grants — full width below 2-col grid */}
        {relatedItems.length > 0 && (
          <div className="mt-8 pt-8 border-t border-border">
            <h2 className="text-base md:text-lg font-semibold text-white mb-4">
              {labels.relatedTitle}
            </h2>

            {/* Mobile: horizontal scroll */}
            <div className="lg:hidden flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
              {relatedItems.map((related) => {
                const rTrans = language !== "en" ? (related as any).translations?.[language] : null;
                const rc = {
                  name: rTrans?.name || related.name,
                  description: rTrans?.description || related.description,
                };
                const rFlag = related.country === "US" ? "🇺🇸" : "🌐";
                return (
                  <Link key={related.id} href={`/grant/${related.id}`}>
                    <div className={`w-56 flex-shrink-0 snap-start bg-muted/60 border border-border rounded-xl ${getCategoryBorderColor(related.category)} border-l-4 p-3.5 active:bg-muted transition-colors`}>
                      <div className="flex items-start gap-2 mb-1.5">
                        <span className="text-base shrink-0">{rFlag}</span>
                        <h3 className="font-medium text-white text-xs leading-snug line-clamp-2">
                          {rc.name}
                        </h3>
                      </div>
                      <p className="text-[10px] text-muted-foreground/80 line-clamp-2">{rc.description}</p>
                      {related.amount && (
                        <p className="text-[10px] text-[color:var(--brand-green)] font-medium mt-1.5 flex items-center gap-1">
                          <DollarSign className="w-2.5 h-2.5" />
                          {related.amount}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Desktop: 3-col grid */}
            <div className="hidden lg:grid grid-cols-3 gap-4">
              {relatedItems.map((related) => {
                const rTrans = language !== "en" ? (related as any).translations?.[language] : null;
                const rc = {
                  name: rTrans?.name || related.name,
                  description: rTrans?.description || related.description,
                };
                const rFlag = related.country === "US" ? "🇺🇸" : "🌐";
                return (
                  <Link key={related.id} href={`/grant/${related.id}`}>
                    <div className={`bg-muted/60 border border-border rounded-xl ${getCategoryBorderColor(related.category)} border-l-4 p-4 hover:bg-muted hover:border-border transition-colors cursor-pointer h-full`}>
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-lg shrink-0">{rFlag}</span>
                        <h3 className="font-medium text-white text-sm leading-snug line-clamp-2">
                          {rc.name}
                        </h3>
                      </div>
                      <p className="text-xs text-muted-foreground/90 line-clamp-2">{rc.description}</p>
                      {related.amount && (
                        <p className="text-xs text-[color:var(--brand-green)] font-medium mt-2 flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {related.amount}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
      )}

      {/* Mobile sticky bottom CTA — sits above MobileBottomNav (h ≈ 56 px) */}
      {primaryLink && (
        <div className="lg:hidden fixed bottom-16 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 safe-area-bottom">
          <div className="flex gap-2">
            <a
              href={applyHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button className="w-full h-12 bg-[color:var(--brand-green)] active:bg-[color:var(--brand-green)]/90 text-white font-semibold gap-2 rounded-xl">
                <ArrowUpRight className="w-4 h-4" />
                {labels.applyNow}
              </Button>
            </a>
            <Button
              variant="outline"
              className="h-12 w-12 shrink-0 rounded-xl border-border text-foreground/80"
              onClick={handleShare}
              aria-label={t.grantDetail.share}
            >
              <Share2 className="w-5 h-5" />
            </Button>
            {isAuthenticated && (
              <Button
                variant="outline"
                className={`h-12 w-12 shrink-0 rounded-xl ${
                  isSaved ? "border-yellow-400/40 text-yellow-400" : "border-border text-foreground/80"
                }`}
                onClick={() => toggleSave(item.id)}
                aria-label={isSaved ? t.grantDetail.saved : labels.saveThisOne}
              >
                {isSaved ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Desktop footer */}
      <div className="hidden lg:block">
        <Footer />
      </div>

      {/* Mobile footer — minimal legal links above sticky CTA / MobileBottomNav */}
      <div className="lg:hidden px-4 pb-36 pt-4 border-t border-border/60 flex items-center justify-center gap-4 text-[11px] text-muted-foreground/50">
        <Link href="/privacy" className="hover:text-muted-foreground transition-colors">{t.nav.legal}</Link>
        <span aria-hidden="true">·</span>
        <Link href="/terms" className="hover:text-muted-foreground transition-colors">Terms</Link>
        <span aria-hidden="true">·</span>
        <span>© {new Date().getFullYear()} GrantKit</span>
      </div>
    </div>
  );
}

// API returns Drizzle decimal as string; static fallback may omit entirely.
function toFiniteNumber(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}
