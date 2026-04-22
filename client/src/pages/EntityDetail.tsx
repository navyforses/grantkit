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
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  Globe,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Plane,
  Share2,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import GrantDetailHeader from "@/components/grant/GrantDetailHeader";
import MatchSummary from "@/components/grant/MatchSummary";
import { parseToBullets, parseToSteps } from "@/lib/parseList";
import { computeMatch } from "@/lib/computeMatch";

export default function EntityDetail() {
  const params = useParams<{ id: string }>();
  const [, _navigate] = useLocation();
  void _navigate;
  const { t, tCategory, tCountry, tCatalogContent, language } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  const [aiOpen, setAiOpen] = useState(false);

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
        <GrantDetailSkeleton />
      </div>
    );
  }

  if (!grant) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="flex-1 flex items-center justify-center px-4 py-24">
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

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: content.name, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success(t.grantDetail.linkCopied);
    }
  };

  // PDF "download" = browser print dialog. Users pick "Save as PDF" from
  // the OS print menu. Print stylesheet lives globally; no dedicated
  // dependency required. Tracked under DATA_GAPS.md as a future improvement.
  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
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

  // 3-card stat strip — only render cards we have real data for.
  // successRate is in DATA_GAPS.md (column does not exist yet) → skipped.
  const deadlineDisplay = formatDeadline(content.deadline, t);
  const statCards: Array<{ label: string; value: string; tone: "green" | "amber" | "blue" | "muted"; icon: React.ReactNode }> = [];
  if (item.amount) statCards.push({
    label: t.detail.metricAmount,
    value: item.amount,
    tone: "green",
    icon: <DollarSign className="w-3.5 h-3.5" />,
  });
  if (deadlineDisplay) statCards.push({
    label: t.detail.metricDeadline,
    value: deadlineDisplay,
    tone: "amber",
    icon: <Clock className="w-3.5 h-3.5" />,
  });
  // successRate placeholder (see DATA_GAPS.md) — reveals automatically once backfilled.
  const successRate = (item as any).successRate as string | undefined;
  if (successRate) statCards.push({
    label: t.detail.metricSuccess,
    value: successRate,
    tone: "blue",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  });

  // Structured content — free-text → arrays for <ul> / <ol> rendering.
  const eligibilityBullets = parseToBullets(content.eligibility);
  const processSteps = parseToSteps(content.applicationProcess);

  // Personalized match card — only for authenticated users whose profile
  // gives us at least one scorable criterion (country / diagnosis / age).
  const matchResult = useMemo(() => {
    if (!isAuthenticated || !user) return null;
    return computeMatch(
      {
        targetCountry: user.targetCountry,
        purposes: user.purposes,
        purposeDetails: user.purposeDetails,
        needs: user.needs,
        needDetails: user.needDetails,
      },
      {
        country: translatedCountry,
        targetDiagnosis: content.targetDiagnosis,
        ageRange: content.ageRange,
      },
      {
        country: t.detail.matchCountry,
        diagnosis: t.detail.matchDiagnosis,
        age: t.detail.matchAge,
        income: t.detail.matchIncome,
        toConfirm: t.detail.matchToConfirm,
        notProvided: t.detail.matchNotInProfile,
        anyCountry: t.detail.matchAnyCountry,
        international: t.detail.matchInternational,
      },
    );
  }, [isAuthenticated, user, translatedCountry, content.targetDiagnosis, content.ageRange, t]);

  // Footer meta — foundedYear / processingTime live in DATA_GAPS.md for now.
  const foundedYear = (item as any).foundedYear as number | string | undefined;
  const processingTime = (item as any).processingTime as string | undefined;

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
      <GrantDetailHeader
        breadcrumb={[
          { label: t.detail.breadcrumbHome, href: "/" },
          { label: t.detail.breadcrumbCatalog, href: "/catalog" },
          { label: content.name },
        ]}
        isAuthenticated={isAuthenticated}
        isSaved={isSaved}
        saveLabel={labels.saveThisOne}
        savedLabel={t.grantDetail.saved}
        shareLabel={t.grantDetail.share}
        aiLabel={t.detail.aiShort}
        closeLabel={t.detail.close}
        backLabel={t.detail.back}
        onToggleSave={isAuthenticated ? () => toggleSave(item.id) : undefined}
        onShare={handleShare}
        onOpenAi={() => setAiOpen(true)}
      />

      {/* Main content */}
      <div className="container px-4 py-6 md:py-8 flex-1 pb-32 lg:pb-10">
        <div className="lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-8 xl:gap-10">

          {/* ═════ LEFT COLUMN ═════ */}
          <div className="space-y-5 min-w-0">

            {/* Badges: status · category · type */}
            <div className="flex items-center gap-2 flex-wrap">
              {item.status === "Open" && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden />
                  {item.status.toUpperCase()}
                </span>
              )}
              <span className="text-lg leading-none" aria-hidden>{countryFlag}</span>
              <span className={`inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-full border ${getCategoryStyle(item.category)}`}>
                {translatedCategory}
              </span>
              <span className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded ${
                item.type === "grant"
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-blue-500/15 text-blue-300"
              }`}>
                {typeLabel}
              </span>
            </div>

            {/* Title + subtitle line (organization · location) */}
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-[32px] font-bold text-white leading-tight tracking-tight">
                {content.name}
              </h1>
              {(item.organization || locationDisplay) && (
                <p className="text-muted-foreground mt-2 text-sm md:text-[15px]">
                  {[item.organization, locationDisplay].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>

            {/* 3-card stat strip — Amount / Deadline / Success rate (if present) */}
            {statCards.length > 0 && (
              <div className={`grid gap-3 ${statCards.length === 1 ? "grid-cols-1" : statCards.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                {statCards.map((card, i) => {
                  const tone =
                    card.tone === "green"
                      ? "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-300"
                      : card.tone === "amber"
                      ? "border-amber-500/25 bg-amber-500/[0.06] text-amber-300"
                      : card.tone === "blue"
                      ? "border-blue-500/25 bg-blue-500/[0.06] text-blue-300"
                      : "border-border bg-muted/40 text-foreground";
                  return (
                    <div key={i} className={`rounded-xl border ${tone} px-4 py-3`}>
                      <div className="flex items-center gap-1.5 mb-1 text-muted-foreground/80">
                        {card.icon}
                        <span className="text-[10px] uppercase tracking-wider font-medium">
                          {card.label}
                        </span>
                      </div>
                      <p className="text-xl md:text-2xl font-bold leading-tight truncate">
                        {card.value}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Personalized match card (authenticated users only) */}
            {isAuthenticated && matchResult && (
              <MatchSummary
                result={matchResult}
                title={t.detail.matchTitle}
                matchFormat={(n, m) => `${n}/${m}`}
              />
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

            {/* Eligibility — structured as bullets when splitting yields ≥2 items */}
            {eligibilityBullets.length > 0 && (
              <div className="bg-muted/40 border border-border rounded-xl p-5">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" />
                  {t.detail.eligibilityTitle}
                </h2>
                {eligibilityBullets.length > 1 ? (
                  <ul className="space-y-2">
                    {eligibilityBullets.map((b, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm md:text-[15px] text-foreground/90">
                        <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-[color:var(--brand-green)] mt-2" aria-hidden />
                        <span className="leading-relaxed">{b}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm md:text-[15px] text-foreground/90 leading-relaxed whitespace-pre-line">
                    {eligibilityBullets[0]}
                  </p>
                )}
              </div>
            )}

            {/* Tags: B-2 visa + International */}
            {(b2Badge || item.country === "International") && (
              <div className="flex flex-wrap gap-2">
                {b2Badge && (
                  <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${b2Badge.color}`}>
                    <Plane className="w-3 h-3" />
                    {b2Badge.label}
                  </span>
                )}
                {item.country === "International" && (
                  <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300">
                    <Globe className="w-3 h-3" />
                    {t.detail.matchInternational}
                  </span>
                )}
              </div>
            )}

            {/* Desktop CTAs — Apply (primary) + PDF (print). Save/Share live in header. */}
            {primaryLink && (
              <div className="hidden lg:flex gap-3">
                <a href={applyHref} target="_blank" rel="noopener noreferrer" className="flex-1">
                  <Button className="w-full h-12 bg-[color:var(--brand-green)] hover:bg-[color:var(--brand-green)]/90 text-white font-semibold gap-2 rounded-xl text-[15px]">
                    <ArrowUpRight className="w-4 h-4" />
                    {t.detail.applyCta}
                  </Button>
                </a>
                <Button
                  variant="outline"
                  onClick={handlePrint}
                  className="h-12 px-5 rounded-xl border-border text-foreground/80 hover:bg-muted hover:text-foreground gap-2"
                >
                  <FileText className="w-4 h-4" />
                  {t.detail.downloadPdf}
                </Button>
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
                      height={220}
                    />
                  ) : (
                    <div
                      role="status"
                      aria-live="polite"
                      aria-label={t.map.loading}
                      style={{ height: 220 }}
                      className="w-full rounded-xl bg-muted/40 border border-border/60 flex items-center justify-center overflow-hidden relative"
                    >
                      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/[0.02] via-[var(--brand-green)]/[0.05] to-white/[0.02]" />
                      <span className="relative text-xs text-muted-foreground/70">{t.map.loading}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Office / Contact card — address banner + 2-col grid */}
            <div className="bg-muted/40 border border-border rounded-xl p-5">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5" />
                {t.detail.officeTitle}
              </h2>
              {mapAddress && (
                <div className="mb-4 pb-4 border-b border-border/60 flex items-start gap-2">
                  <MapPin className="w-4 h-4 shrink-0 text-muted-foreground/70 mt-0.5" />
                  <p className="text-sm text-foreground/85 leading-relaxed">{mapAddress}</p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                {primaryLink && (
                  <a
                    href={applyHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-medium text-[color:var(--brand-green)] hover:text-foreground transition-colors min-w-0"
                  >
                    <Globe className="w-4 h-4 shrink-0" />
                    <span className="truncate">{t.catalog.visitWebsite}</span>
                  </a>
                )}
                {item.phone && (
                  <a
                    href={`tel:${item.phone}`}
                    className="flex items-center gap-2 text-sm text-foreground/85 hover:text-foreground transition-colors min-w-0"
                  >
                    <Phone className="w-4 h-4 shrink-0 text-[color:var(--brand-green)]" />
                    <span className="truncate">{item.phone}</span>
                  </a>
                )}
                {item.email && (
                  <a
                    href={`mailto:${item.email}`}
                    className="flex items-center gap-2 text-sm text-foreground/85 hover:text-foreground transition-colors min-w-0"
                  >
                    <Mail className="w-4 h-4 shrink-0 text-[color:var(--brand-green)]" />
                    <span className="truncate">{item.email}</span>
                  </a>
                )}
                {officeHours && (
                  <div className="flex items-center gap-2 text-sm text-foreground/85 min-w-0">
                    <Clock className="w-4 h-4 shrink-0 text-[color:var(--brand-green)]" />
                    <span className="truncate" title={officeHours}>{officeHours}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Application process — numbered list when splitting yields ≥2 steps */}
            {processSteps.length > 0 && (
              <div className="bg-muted/40 border border-border rounded-xl p-5">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[color:var(--brand-green)]" />
                  {labels.processTitle}
                </h2>
                {processSteps.length > 1 ? (
                  <ol className="space-y-2.5">
                    {processSteps.map((step, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm md:text-[15px] text-foreground/90">
                        <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-[color:var(--brand-green)]/15 text-[color:var(--brand-green)] text-xs font-semibold mt-0.5">
                          {i + 1}
                        </span>
                        <span className="leading-relaxed pt-0.5">{step}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm md:text-[15px] text-foreground/90 leading-relaxed whitespace-pre-line">
                    {processSteps[0]}
                  </p>
                )}
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

            {/* Footer meta — founded year + processing time.
                Both fields live in DATA_GAPS.md today; the line renders
                automatically once the columns are backfilled. */}
            {(foundedYear || processingTime) && (
              <p className="text-[11px] text-muted-foreground/70 px-1 flex flex-wrap gap-x-2 gap-y-1">
                {processingTime && (
                  <span>{t.detail.processingTime.replace("{time}", processingTime)}</span>
                )}
                {processingTime && foundedYear && <span aria-hidden>·</span>}
                {foundedYear && (
                  <span>{t.detail.foundedSince.replace("{year}", String(foundedYear))}</span>
                )}
              </p>
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

      {/* AI chat — opens from the header. Full grant context is passed to
          the assistant so it can answer questions about the organization,
          eligibility, process, contact methods, etc. without extra tool
          calls. */}
      <Sheet open={aiOpen} onOpenChange={setAiOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col gap-0">
          <SheetHeader className="px-5 py-4 border-b border-border">
            <SheetTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-[color:var(--brand-green)]" aria-hidden="true" />
              <span>{t.aiAssistant.chatTab}</span>
              <span className="text-muted-foreground/70 font-normal truncate">· {content.name}</span>
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 min-h-0">
            <GrantAiChat
              className="h-full border-0 rounded-none bg-background"
              grantId={item.id}
              grant={{
                name: content.name,
                organization: item.organization || undefined,
                country: translatedCountry || undefined,
                amount: item.amount || undefined,
                deadline: content.deadline || undefined,
                website: item.website || undefined,
                category: translatedCategory,
                eligibility: content.eligibility || undefined,
                applicationProcess: content.applicationProcess || undefined,
                targetDiagnosis: content.targetDiagnosis || undefined,
                ageRange: content.ageRange || undefined,
                geographicScope: content.geographicScope || undefined,
                documentsRequired: content.documentsRequired || undefined,
                phone: item.phone || undefined,
                email: item.email || undefined,
                address: mapAddress || undefined,
                officeHours: officeHours || undefined,
                status: item.status || undefined,
                fundingType: item.fundingType || undefined,
                b2VisaEligible: item.b2VisaEligible || undefined,
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

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

/**
 * Convert a free-text deadline into a UI-friendly string.
 *
 * DB stores `deadline` as localized free text: "March 15, 2026", "Rolling",
 * "Contact organization", etc. We try to parse it as a date and compute
 * days-remaining. On failure we fall back to keyword detection ("rolling",
 * "ongoing") or return the original text verbatim. Tracked in
 * DATA_GAPS.md — a dedicated `deadlineDate` DATE column would let us
 * skip this heuristic.
 */
function formatDeadline(raw: string | null | undefined, t: any): string | null {
  if (!raw) return null;
  const text = String(raw).trim();
  if (!text) return null;

  // Heuristic: contains at least one digit → try Date.parse
  if (/\d/.test(text)) {
    const ms = Date.parse(text);
    if (!Number.isNaN(ms)) {
      const diffDays = Math.ceil((ms - Date.now()) / 86_400_000);
      if (diffDays < 0) return t.detail.deadlineExpired;
      if (diffDays === 0) return t.detail.deadlineToday;
      if (diffDays <= 365) return t.detail.deadlineDays.replace("{days}", String(diffDays));
    }
  }

  if (/\b(rolling|ongoing|continuous|permanent|any\s*time)\b/i.test(text)) {
    return t.detail.deadlineRolling;
  }
  if (/\b(expired|closed|passed)\b/i.test(text)) {
    return t.detail.deadlineExpired;
  }

  return text;
}
