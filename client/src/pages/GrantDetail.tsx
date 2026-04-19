/*
 * GrantDetail — Phase 5 redesign (Sofia, Senior UX Engineer, ex-NYT)
 *
 * Desktop (lg+): full-width breadcrumb + 50/50 two-column layout.
 *   Left  — badges, title, org, metrics grid, description, eligibility, CTAs.
 *   Right — LocationMap (280 px), office/contact card, application process,
 *           required documents.
 *   Below — related grants, full width, 3-col grid.
 *
 * Mobile (<lg): single-column stacked; sticky bottom CTA bar for Apply + Save
 *   (positioned bottom-16 to clear MobileBottomNav).
 */

import { useMemo } from "react";
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
  Mail,
  MapPin,
  Navigation,
  Phone,
  Plane,
  Share2,
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
import { openInGoogleMapsDirections } from "@/lib/googleMaps";
import { catalogItems } from "@/data/catalogData";

export default function GrantDetail() {
  const params = useParams<{ id: string }>();
  const [, _navigate] = useLocation();
  void _navigate;
  const { t, tCategory, tCountry, tCatalogContent, language } = useLanguage();
  const { isAuthenticated } = useAuth();

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

  const utils = trpc.useUtils();
  const toggleSave = trpc.grants.toggleSave.useMutation({
    onMutate: async ({ grantId }) => {
      await utils.grants.savedList.cancel();
      const prev = utils.grants.savedList.getData();
      utils.grants.savedList.setData(undefined, (old) => {
        if (!old) return { grantIds: [grantId] };
        const ids = old.grantIds.includes(grantId)
          ? old.grantIds.filter((id) => id !== grantId)
          : [...old.grantIds, grantId];
        return { grantIds: ids };
      });
      return { prev };
    },
    onError: (_err: unknown, _vars: unknown, ctx: { prev?: { grantIds: string[] } } | undefined) => {
      if (ctx?.prev) utils.grants.savedList.setData(undefined, ctx.prev);
      toast.error(t.grantDetail.failedToSave);
    },
    onSettled: () => {
      utils.grants.savedList.invalidate();
    },
  });

  if (isLoading && !grant) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0F1419]">
        <Navbar />
        <GrantDetailSkeleton />
      </div>
    );
  }

  if (!grant) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0F1419]">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2">{t.grantDetail.notFound}</h2>
            <p className="text-white/50 mb-6 text-sm">{t.grantDetail.notFoundDesc}</p>
            <Link href="/catalog">
              <Button variant="outline" className="gap-2 border-white/20 text-white/70 hover:bg-white/10 hover:text-white">
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

  const apiTrans = language !== "en" ? translations[language] : null;
  const staticTrans = language !== "en" && !apiTrans
    ? tCatalogContent(item.itemId || item.id, { name: item.name, description: item.description || "", eligibility: item.eligibility || "" })
    : null;

  const content = {
    name: apiTrans?.name || staticTrans?.name || item.name,
    description: apiTrans?.description || staticTrans?.description || item.description,
    eligibility: apiTrans?.eligibility || staticTrans?.eligibility || item.eligibility,
    applicationProcess: apiTrans?.applicationProcess || item.applicationProcess,
    deadline: apiTrans?.deadline || item.deadline,
    targetDiagnosis: apiTrans?.targetDiagnosis || item.targetDiagnosis,
    ageRange: apiTrans?.ageRange || item.ageRange,
    geographicScope: apiTrans?.geographicScope || item.geographicScope,
    documentsRequired: apiTrans?.documentsRequired || item.documentsRequired,
  };

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
  const hasMapCoords = mapLat !== null && mapLng !== null;
  const mapAddress = ((item as any).address && String((item as any).address).trim())
    || [item.city, item.state, translatedCountry].filter(Boolean).join(", ");
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
      latitude: mapLat ?? undefined,
      longitude: mapLng ?? undefined,
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
    icon: <DollarSign className="w-3.5 h-3.5 text-[#5DCAA5]" />,
    label: t.detail.metricAmount,
    value: item.amount,
    accent: "text-[#5DCAA5]",
  });
  if (content.deadline) metrics.push({
    icon: <Calendar className="w-3.5 h-3.5 text-blue-400" />,
    label: t.detail.metricDeadline,
    value: content.deadline,
  });
  if (item.state || translatedCountry) metrics.push({
    icon: <MapPin className="w-3.5 h-3.5 text-white/50" />,
    label: t.detail.metricLocation,
    value: locationDisplay,
  });
  if (content.geographicScope) metrics.push({
    icon: <Globe className="w-3.5 h-3.5 text-white/50" />,
    label: t.detail.metricScope,
    value: content.geographicScope,
  });
  if (item.status) metrics.push({
    icon: <CheckCircle2 className={`w-3.5 h-3.5 ${item.status === "Open" ? "text-[#5DCAA5]" : "text-white/50"}`} />,
    label: t.detail.metricStatus,
    value: item.status,
    accent: item.status === "Open" ? "text-[#5DCAA5]" : undefined,
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
      icon: <Users className="w-3.5 h-3.5 text-white/50" />,
      label: t.detail.metricAge,
      value: ageValue,
    });
  }
  if (content.targetDiagnosis && content.targetDiagnosis !== "General") {
    const parts = content.targetDiagnosis.split(",").map((d: string) => d.trim()).filter(Boolean);
    const value = parts.slice(0, 2).join(", ") + (parts.length > 2 ? ` +${parts.length - 2}` : "");
    metrics.push({
      icon: <Stethoscope className="w-3.5 h-3.5 text-white/50" />,
      label: t.detail.metricConditions,
      value,
    });
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0F1419]">
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
        className="border-b border-white/[0.06] bg-[#0F1419]"
      >
        <div className="container px-4 py-2.5 flex items-center gap-1.5 text-[13px] text-white/50 overflow-hidden">
          <Link href="/">
            <button className="hover:text-white/80 transition-colors flex items-center gap-1 shrink-0">
              <Home className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.detail.breadcrumbHome}</span>
            </button>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-white/25 shrink-0" />
          <Link href="/catalog">
            <button className="hover:text-white/80 transition-colors shrink-0 truncate">
              {t.detail.breadcrumbCatalog}
            </button>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-white/25 shrink-0" />
          <span className="text-white/75 truncate font-medium">{content.name}</span>
        </div>
      </nav>

      {/* Main content */}
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
                <p className="text-white/60 mt-2 flex items-center gap-1.5 text-sm">
                  <Building2 className="w-4 h-4 shrink-0 text-white/40" />
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
                    className="bg-white/[0.04] border border-white/[0.07] rounded-lg px-3 py-2.5"
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {m.icon}
                      <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">
                        {m.label}
                      </span>
                    </div>
                    <p className={`text-[13px] font-semibold ${m.accent || "text-white/90"} truncate`}>
                      {m.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Description */}
            <div className={`bg-white/[0.03] border border-white/[0.08] rounded-xl p-5 ${borderColor} border-l-4`}>
              <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                {t.detail.descriptionTitle}
              </h2>
              <p className="text-sm md:text-[15px] text-white/80 leading-relaxed whitespace-pre-line">
                {content.description || "—"}
              </p>
            </div>

            {/* Eligibility */}
            {content.eligibility && (
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
                <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" />
                  {t.detail.eligibilityTitle}
                </h2>
                <p className="text-sm md:text-[15px] text-white/80 leading-relaxed whitespace-pre-line">
                  {content.eligibility}
                </p>
              </div>
            )}

            {/* Desktop CTAs — hidden on mobile (uses sticky bottom bar instead) */}
            {primaryLink && (
              <div className="hidden lg:flex flex-col gap-3">
                <a href={applyHref} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full h-12 bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white font-semibold gap-2 rounded-xl text-[15px]">
                    <ArrowUpRight className="w-4 h-4" />
                    {t.grantDetail.applyNow}
                  </Button>
                </a>
                <div className="flex gap-3">
                  {isAuthenticated && (
                    <Button
                      variant="outline"
                      className={`flex-1 h-11 rounded-xl gap-2 ${
                        isSaved
                          ? "border-yellow-400/40 text-yellow-400 hover:bg-yellow-400/10 hover:text-yellow-300"
                          : "border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                      onClick={() => toggleSave.mutate({ grantId: item.id })}
                    >
                      {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                      {isSaved ? t.grantDetail.saved : t.grantDetail.saveThisGrant}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="h-11 px-4 rounded-xl border-white/20 text-white/70 hover:bg-white/10 hover:text-white gap-2"
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

            {/* LocationMap */}
            {hasMapCoords && (
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden">
                <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-2">
                  <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" />
                    {t.detail.locationTitle}
                  </h2>
                  <button
                    type="button"
                    onClick={handleDirections}
                    aria-label={`${t.deepLink.getDirections} — ${item.organization || mapAddress} (${t.deepLink.nativeAppHint})`}
                    className="flex items-center gap-1.5 text-xs text-[#5DCAA5] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5DCAA5] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1419] rounded px-1 py-0.5 transition-colors font-medium whitespace-nowrap"
                  >
                    <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
                    {t.detail.getDirections}
                  </button>
                </div>
                <div className="px-4 pb-4">
                  <LocationMap
                    latitude={mapLat as number}
                    longitude={mapLng as number}
                    address={mapAddress}
                    organization={item.organization || ""}
                    serviceArea={content.geographicScope || undefined}
                    height={280}
                  />
                </div>
              </div>
            )}

            {/* Office / Contact card */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
              <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5" />
                {t.detail.officeTitle}
              </h2>
              <div className="space-y-3">
                {primaryLink ? (
                  <a
                    href={applyHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-medium text-[#5DCAA5] hover:text-white transition-colors"
                  >
                    <Globe className="w-4 h-4 shrink-0" />
                    <span className="truncate">{t.catalog.visitWebsite}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                  </a>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-white/30">
                    <Globe className="w-4 h-4 shrink-0" />
                    {t.grantDetail.noWebsite}
                  </p>
                )}
                {item.phone ? (
                  <a
                    href={`tel:${item.phone}`}
                    className="flex items-center gap-2 text-sm text-white/75 hover:text-white transition-colors"
                  >
                    <Phone className="w-4 h-4 shrink-0 text-white/40" />
                    <span className="truncate">{item.phone}</span>
                  </a>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-white/30">
                    <Phone className="w-4 h-4 shrink-0" />
                    {t.grantDetail.noPhone}
                  </p>
                )}
                {item.email ? (
                  <a
                    href={`mailto:${item.email}`}
                    className="flex items-center gap-2 text-sm text-white/75 hover:text-white transition-colors"
                  >
                    <Mail className="w-4 h-4 shrink-0 text-white/40" />
                    <span className="truncate">{item.email}</span>
                  </a>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-white/30">
                    <Mail className="w-4 h-4 shrink-0" />
                    {t.grantDetail.noEmail}
                  </p>
                )}
                {officeHours && (
                  <div className="flex items-start gap-2 pt-1">
                    <Clock className="w-4 h-4 shrink-0 text-white/40 mt-0.5" />
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase tracking-wider text-white/40 block">
                        {t.detail.officeHours}
                      </span>
                      <span className="text-sm text-white/75">{officeHours}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Application process */}
            {content.applicationProcess && (
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
                <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#5DCAA5]" />
                  {t.detail.processTitle}
                </h2>
                <p className="text-sm md:text-[15px] text-white/80 leading-relaxed whitespace-pre-line">
                  {content.applicationProcess}
                </p>
              </div>
            )}

            {/* Required documents */}
            {content.documentsRequired && (
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
                <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-white/50" />
                  {t.detail.docsTitle}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {content.documentsRequired.split(",").map((doc: string, i: number) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-xs bg-white/[0.06] border border-white/[0.08] text-white/75 px-2.5 py-1 rounded-full"
                    >
                      <CheckCircle2 className="w-3 h-3 text-[#5DCAA5]" />
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
          <div className="mt-8 pt-8 border-t border-white/[0.06]">
            <h2 className="text-base md:text-lg font-semibold text-white mb-4">
              {t.detail.relatedTitle}
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
                    <div className={`w-56 flex-shrink-0 snap-start bg-white/[0.04] border border-white/[0.08] rounded-xl ${getCategoryBorderColor(related.category)} border-l-4 p-3.5 active:bg-white/[0.08] transition-colors`}>
                      <div className="flex items-start gap-2 mb-1.5">
                        <span className="text-base shrink-0">{rFlag}</span>
                        <h3 className="font-medium text-white text-xs leading-snug line-clamp-2">
                          {rc.name}
                        </h3>
                      </div>
                      <p className="text-[10px] text-white/50 line-clamp-2">{rc.description}</p>
                      {related.amount && (
                        <p className="text-[10px] text-[#5DCAA5] font-medium mt-1.5 flex items-center gap-1">
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
                    <div className={`bg-white/[0.04] border border-white/[0.08] rounded-xl ${getCategoryBorderColor(related.category)} border-l-4 p-4 hover:bg-white/[0.06] hover:border-white/[0.12] transition-colors cursor-pointer h-full`}>
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-lg shrink-0">{rFlag}</span>
                        <h3 className="font-medium text-white text-sm leading-snug line-clamp-2">
                          {rc.name}
                        </h3>
                      </div>
                      <p className="text-xs text-white/55 line-clamp-2">{rc.description}</p>
                      {related.amount && (
                        <p className="text-xs text-[#5DCAA5] font-medium mt-2 flex items-center gap-1">
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

      {/* Mobile sticky bottom CTA — sits above MobileBottomNav (h ≈ 56 px) */}
      {primaryLink && (
        <div className="lg:hidden fixed bottom-16 left-0 right-0 z-30 bg-[#0F1419]/95 backdrop-blur-sm border-t border-white/[0.08] px-4 py-3 safe-area-bottom">
          <div className="flex gap-2">
            <a
              href={applyHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button className="w-full h-12 bg-[#1D9E75] active:bg-[#1D9E75]/90 text-white font-semibold gap-2 rounded-xl">
                <ArrowUpRight className="w-4 h-4" />
                {t.grantDetail.applyNow}
              </Button>
            </a>
            <Button
              variant="outline"
              className="h-12 w-12 shrink-0 rounded-xl border-white/20 text-white/70"
              onClick={handleShare}
              aria-label={t.grantDetail.share}
            >
              <Share2 className="w-5 h-5" />
            </Button>
            {isAuthenticated && (
              <Button
                variant="outline"
                className={`h-12 w-12 shrink-0 rounded-xl ${
                  isSaved ? "border-yellow-400/40 text-yellow-400" : "border-white/20 text-white/70"
                }`}
                onClick={() => toggleSave.mutate({ grantId: item.id })}
                aria-label={isSaved ? t.grantDetail.saved : t.grantDetail.saveThisGrant}
              >
                {isSaved ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="hidden lg:block">
        <Footer />
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
