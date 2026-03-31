/*
 * Grant Detail Page — Full information view for a single grant/resource
 * Mobile: app-like single-column with sticky bottom CTA, compact sections
 * Desktop: 3-column layout with sidebar
 */

import { useMemo, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  FileText,
  Globe,
  Heart,
  Loader2,
  Mail,
  MapPin,
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

/** Collapsible section for mobile — expands/collapses content */
function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = false,
  mobileOnly = true,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  mobileOnly?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <>
      {/* Mobile: collapsible */}
      <div className={mobileOnly ? "md:hidden" : ""}>
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between py-3 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-[#0f172a]">
            {icon}
            {title}
          </span>
          {open ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>
        {open && <div className="pb-4">{children}</div>}
      </div>
      {/* Desktop: always open */}
      {mobileOnly && (
        <div className="hidden md:block">
          <h2 className="text-lg font-semibold text-[#0f172a] mb-3 flex items-center gap-2">
            {icon}
            {title}
          </h2>
          {children}
        </div>
      )}
    </>
  );
}

export default function GrantDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { t, tCategory, tCountry, language } = useLanguage();
  const { isAuthenticated } = useAuth();

  const itemId = params.id || "";
  const { data: detailData, isLoading } = trpc.catalog.detail.useQuery(
    { itemId },
    { enabled: !!itemId, retry: false }
  );

  // Saved grants
  const { data: savedData } = trpc.grants.savedList.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  const savedSet = useMemo(() => new Set(savedData?.grantIds || []), [savedData]);
  const isSaved = detailData?.grant ? savedSet.has(detailData.grant.id) : false;

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

  // Loading state — show skeleton matching the page layout
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50/30">
        <Navbar />
        <GrantDetailSkeleton />
      </div>
    );
  }

  // Not found
  if (!detailData?.grant) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50/30">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">{t.grantDetail.notFound}</h2>
            <p className="text-gray-500 mb-6 text-sm">{t.grantDetail.notFoundDesc}</p>
            <Link href="/catalog">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                {t.grantDetail.backToCatalog}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const item = detailData.grant;
  const translations = detailData.translations || {};
  const relatedItems = detailData.related || [];

  const trans = language !== "en" ? translations[language] : null;
  const content = {
    name: trans?.name || item.name,
    description: trans?.description || item.description,
    eligibility: trans?.eligibility || item.eligibility,
  };

  const translatedCategory = tCategory(item.category);
  const translatedCountry = tCountry(item.country);
  const countryFlag = item.country === "US" ? "🇺🇸" : "🌐";
  const typeLabel = item.type === "grant" ? t.catalog.typeGrant : t.catalog.typeResource;

  // Build location display string: "City, State" or "State" or country fallback
  const locationDisplay = item.state && item.state !== "Nationwide" && item.state !== "International"
    ? `${item.city ? item.city + ", " : ""}${item.state}`
    : item.state === "Nationwide" ? t.grantDetail.nationwideUSA : translatedCountry;
  const borderColor = getCategoryBorderColor(item.category);
  const primaryLink = item.website || "";

  const fundingTypeLabels: Record<string, string> = {
    one_time: t.filters.oneTime,
    recurring: t.filters.recurring,
    reimbursement: t.filters.reimbursement,
    varies: t.filters.varies,
    unknown: "\u2014",
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: content.name, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success(t.grantDetail.linkCopied);
    }
  };

  const seoDescription = content.description
    ? content.description.slice(0, 160).replace(/\s+/g, " ").trim() + (content.description.length > 160 ? "..." : "")
    : `${content.name} — ${translatedCategory} grant from ${item.organization || "GrantKit"}`;
  const seoKeywords = [
    content.name, item.organization, translatedCategory, translatedCountry,
    item.type === "grant" ? "grant" : "resource", "funding",
  ].filter(Boolean).join(", ");

  const b2Badge = item.b2VisaEligible === "yes"
    ? { label: t.filters.b2Eligible, color: "bg-emerald-100 text-emerald-700 border-emerald-200" }
    : item.b2VisaEligible === "no"
    ? { label: t.filters.usResidentsOnly, color: "bg-red-50 text-red-600 border-red-200" }
    : item.b2VisaEligible === "uncertain"
    ? { label: t.filters.contactToConfirm, color: "bg-amber-50 text-amber-700 border-amber-200" }
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/30">
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

      {/* ===== MOBILE HEADER ===== */}
      <div className="md:hidden bg-[#0f172a] px-4 pt-4 pb-5">
        {/* Back + actions row */}
        <div className="flex items-center justify-between mb-3">
          <Link href="/catalog">
            <button className="inline-flex items-center gap-1 text-sm text-blue-200/70 active:text-white">
              <ArrowLeft className="w-4 h-4" />
              {t.grantDetail.back}
            </button>
          </Link>
          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button
                className={`w-9 h-9 flex items-center justify-center rounded-full border transition-all ${
                  isSaved ? "border-yellow-400/40 text-yellow-400 bg-yellow-400/10" : "border-white/20 text-white/70 active:bg-white/10"
                }`}
                onClick={() => toggleSave.mutate({ grantId: item.id })}
              >
                {isSaved ? <BookmarkCheck className="w-4.5 h-4.5" /> : <Bookmark className="w-4.5 h-4.5" />}
              </button>
            )}
            <button
              className="w-9 h-9 flex items-center justify-center rounded-full border border-white/20 text-white/70 active:bg-white/10"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-lg">{countryFlag}</span>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${getCategoryStyle(item.category)}`}>
            {translatedCategory}
          </span>
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${
            item.type === "grant" ? "bg-emerald-500/20 text-emerald-300" : "bg-blue-500/20 text-blue-300"
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
        <h1 className="text-lg font-bold text-white leading-snug">
          {content.name}
        </h1>
        {item.organization && item.organization !== item.name && (
          <p className="text-blue-200/70 text-sm mt-1 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" />
            {item.organization}
          </p>
        )}

        {/* Quick stats chips */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {item.state && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-200 bg-white/10 px-2.5 py-1 rounded-full">
              <MapPin className="w-3 h-3" />
              {locationDisplay}
            </span>
          )}
          {item.amount && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-full">
              <DollarSign className="w-3 h-3" />
              {item.amount}
            </span>
          )}
          {item.deadline && (
            <span className="inline-flex items-center gap-1 text-xs text-blue-200 bg-blue-500/10 px-2.5 py-1 rounded-full">
              <Clock className="w-3 h-3" />
              {item.deadline}
            </span>
          )}
          {item.fundingType && item.fundingType !== "unknown" && (
            <span className="inline-flex items-center gap-1 text-xs text-purple-200 bg-purple-500/10 px-2.5 py-1 rounded-full">
              <Tag className="w-3 h-3" />
              {fundingTypeLabels[item.fundingType] || item.fundingType}
            </span>
          )}
        </div>
      </div>

      {/* ===== DESKTOP HEADER ===== */}
      <div className="hidden md:block bg-[#0f172a] py-8">
        <div className="container">
          <Link href="/catalog">
            <button className="inline-flex items-center gap-1.5 text-sm text-blue-200/70 hover:text-white transition-colors mb-4">
              <ArrowLeft className="w-4 h-4" />
              {t.catalog.title}
            </button>
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className="text-2xl">{countryFlag}</span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${getCategoryStyle(item.category)}`}>
                  {translatedCategory}
                </span>
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${
                  item.type === "grant" ? "bg-emerald-500/20 text-emerald-300" : "bg-blue-500/20 text-blue-300"
                }`}>
                  {typeLabel}
                </span>
                {b2Badge && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border flex items-center gap-1 ${b2Badge.color}`}>
                    <Plane className="w-3 h-3" />
                    {b2Badge.label}
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                {content.name}
              </h1>
              {item.organization && item.organization !== item.name && (
                <p className="text-blue-200/70 mt-1 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  {item.organization}
                </p>
              )}
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                {item.state && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-gray-200 bg-white/10 px-3 py-1 rounded-full">
                    <MapPin className="w-3.5 h-3.5" />
                    {locationDisplay}
                  </span>
                )}
                {item.amount && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-emerald-300 bg-emerald-500/10 px-3 py-1 rounded-full">
                    <DollarSign className="w-3.5 h-3.5" />
                    {item.amount}
                  </span>
                )}
                {item.deadline && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-blue-200 bg-blue-500/10 px-3 py-1 rounded-full">
                    <Clock className="w-3.5 h-3.5" />
                    {item.deadline}
                  </span>
                )}
                {item.fundingType && item.fundingType !== "unknown" && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-purple-200 bg-purple-500/10 px-3 py-1 rounded-full">
                    <Tag className="w-3.5 h-3.5" />
                    {fundingTypeLabels[item.fundingType] || item.fundingType}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isAuthenticated && (
                <Button
                  variant="outline"
                  size="icon"
                  className={`border-white/20 hover:bg-white/10 ${isSaved ? "text-yellow-400 border-yellow-400/40" : "text-white/70"}`}
                  onClick={() => toggleSave.mutate({ grantId: item.id })}
                >
                  {isSaved ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                className="border-white/20 text-white/70 hover:bg-white/10"
                onClick={handleShare}
              >
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== CONTENT ===== */}
      <div className="container px-4 md:px-0 py-4 md:py-8 flex-1 pb-28 md:pb-8">
        <div className="grid lg:grid-cols-3 gap-4 md:gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-0 md:space-y-6">
            {/* Description — mobile: collapsible card, desktop: full card */}
            <div className={`bg-white border border-gray-200 rounded-xl md:rounded-lg ${borderColor} border-l-4 p-4 md:p-6`}>
              <CollapsibleSection
                title={t.grantDetail.description}
                icon={<Tag className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />}
                defaultOpen={true}
              >
                <p className="text-sm md:text-base text-gray-700 leading-relaxed whitespace-pre-line">
                  {content.description || "—"}
                </p>
              </CollapsibleSection>
            </div>

            {/* Eligibility */}
            {content.eligibility && (
              <div className="bg-white border border-gray-200 rounded-xl md:rounded-lg p-4 md:p-6">
                <CollapsibleSection
                  title={t.catalog.eligibility}
                  icon={<Users className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />}
                  defaultOpen={true}
                >
                  <p className="text-sm md:text-base text-gray-700 leading-relaxed">
                    {content.eligibility}
                  </p>
                </CollapsibleSection>
              </div>
            )}

            {/* How to Apply */}
            {item.applicationProcess && (
              <div className="bg-white border border-gray-200 rounded-xl md:rounded-lg p-4 md:p-6">
                <CollapsibleSection
                  title={t.grantDetail.howToApply}
                  icon={<CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" />}
                  defaultOpen={false}
                >
                  <p className="text-sm md:text-base text-gray-700 leading-relaxed">
                    {item.applicationProcess}
                  </p>
                </CollapsibleSection>
              </div>
            )}

            {/* Required Documents */}
            {item.documentsRequired && (
              <div className="bg-white border border-gray-200 rounded-xl md:rounded-lg p-4 md:p-6">
                <CollapsibleSection
                  title={t.grantDetail.requiredDocuments}
                  icon={<FileText className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />}
                  defaultOpen={false}
                >
                  <div className="flex flex-wrap gap-2">
                    {item.documentsRequired.split(",").map((doc, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-xs md:text-sm bg-gray-100 text-gray-700 px-2.5 md:px-3 py-1 md:py-1.5 rounded-full"
                      >
                        <CheckCircle2 className="w-3 h-3 md:w-3.5 md:h-3.5 text-gray-400" />
                        {doc.trim()}
                      </span>
                    ))}
                  </div>
                </CollapsibleSection>
              </div>
            )}

            {/* Contact info — mobile only (desktop has sidebar) */}
            <div className="md:hidden bg-white border border-gray-200 rounded-xl p-4">
              <CollapsibleSection
                title={t.grantDetail.contact}
                icon={<Phone className="w-4 h-4 text-gray-400" />}
                defaultOpen={false}
                mobileOnly={false}
              >
                <div className="space-y-3">
                  {primaryLink && (
                    <a
                      href={primaryLink.startsWith("http") ? primaryLink : `https://${primaryLink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm font-medium text-[#1e3a5f] active:text-[#22c55e]"
                    >
                      <Globe className="w-4 h-4" />
                      {t.catalog.visitWebsite}
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {item.phone && (
                    <a href={`tel:${item.phone}`} className="flex items-center gap-2 text-sm text-gray-600 active:text-gray-900">
                      <Phone className="w-4 h-4 text-gray-400" />
                      {item.phone}
                    </a>
                  )}
                  {item.email && (
                    <a href={`mailto:${item.email}`} className="flex items-center gap-2 text-sm text-gray-600 active:text-gray-900">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {item.email}
                    </a>
                  )}
                </div>
              </CollapsibleSection>
            </div>

            {/* Details — mobile only (desktop has sidebar) */}
            <div className="md:hidden bg-white border border-gray-200 rounded-xl p-4">
              <CollapsibleSection
                title={t.grantDetail.details}
                icon={<MapPin className="w-4 h-4 text-gray-400" />}
                defaultOpen={false}
                mobileOnly={false}
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase">{t.grantDetail.location}</p>
                    <p className="text-sm font-medium text-gray-900">{locationDisplay}</p>
                  </div>
                  {item.geographicScope && (
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase">{t.grantDetail.scope}</p>
                      <p className="text-sm font-medium text-gray-900">{item.geographicScope}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase">{t.grantDetail.category}</p>
                    <p className="text-sm font-medium text-gray-900">{translatedCategory}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase">{t.grantDetail.organization}</p>
                    <p className="text-sm font-medium text-gray-900">{item.organization || "—"}</p>
                  </div>
                  {item.targetDiagnosis && item.targetDiagnosis !== "General" && (
                    <div className="col-span-2">
                      <p className="text-[10px] text-gray-400 uppercase mb-1">{t.grantDetail.conditions}</p>
                      <div className="flex flex-wrap gap-1">
                        {item.targetDiagnosis.split(",").slice(0, 4).map((d, i) => (
                          <span key={i} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                            {d.trim()}
                          </span>
                        ))}
                        {item.targetDiagnosis.split(",").length > 4 && (
                          <span className="text-[10px] text-gray-400">+{item.targetDiagnosis.split(",").length - 4}</span>
                        )}
                      </div>
                    </div>
                  )}
                  {item.ageRange && item.ageRange !== "0-100" && (
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase">{t.grantDetail.ageRange}</p>
                      <p className="text-sm font-medium text-gray-900">
                        {item.ageRange === "0-18" ? t.grantDetail.children : item.ageRange === "18-100" ? t.grantDetail.adults : t.grantDetail.ages.replace("{range}", item.ageRange)}
                      </p>
                    </div>
                  )}
                  {item.status && (
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase">{t.grantDetail.status}</p>
                      <p className={`text-sm font-medium ${item.status === "Open" ? "text-emerald-600" : "text-gray-700"}`}>
                        {item.status}
                      </p>
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            </div>

            {/* Related Grants */}
            {relatedItems.length > 0 && (
              <div className="pt-2 md:pt-0">
                <h2 className="text-sm md:text-lg font-semibold text-[#0f172a] mb-3 md:mb-4">{t.grantDetail.relatedGrants}</h2>
                {/* Mobile: horizontal scroll */}
                <div className="md:hidden flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                  {relatedItems.map((related) => {
                    const rTrans = language !== "en" ? (related as any).translations?.[language] : null;
                    const rc = { name: rTrans?.name || related.name, description: rTrans?.description || related.description };
                    const rFlag = related.country === "US" ? "🇺🇸" : "🌐";
                    return (
                      <Link key={related.id} href={`/grant/${related.id}`}>
                        <div className={`w-56 flex-shrink-0 bg-white border border-gray-200 rounded-xl ${getCategoryBorderColor(related.category)} border-l-4 p-3.5 active:shadow-md transition-all`}>
                          <div className="flex items-start gap-2 mb-1.5">
                            <span className="text-base">{rFlag}</span>
                            <h3 className="font-medium text-[#0f172a] text-xs leading-snug line-clamp-2">
                              {rc.name}
                            </h3>
                          </div>
                          <p className="text-[10px] text-gray-500 line-clamp-2">{rc.description}</p>
                          {related.amount && (
                            <p className="text-[10px] text-emerald-600 font-medium mt-1.5 flex items-center gap-1">
                              <DollarSign className="w-2.5 h-2.5" />
                              {related.amount}
                            </p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
                {/* Desktop: grid */}
                <div className="hidden md:grid sm:grid-cols-2 gap-3">
                  {relatedItems.map((related) => {
                    const rTrans = language !== "en" ? (related as any).translations?.[language] : null;
                    const rc = { name: rTrans?.name || related.name, description: rTrans?.description || related.description };
                    const rFlag = related.country === "US" ? "🇺🇸" : "🌐";
                    return (
                      <Link key={related.id} href={`/grant/${related.id}`}>
                        <div className={`bg-white border border-gray-200 rounded-lg ${getCategoryBorderColor(related.category)} border-l-4 p-4 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer`}>
                          <div className="flex items-start gap-2 mb-2">
                            <span className="text-lg">{rFlag}</span>
                            <h3 className="font-medium text-[#0f172a] text-sm leading-snug line-clamp-2">
                              {rc.name}
                            </h3>
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-2">{rc.description}</p>
                          {related.amount && (
                            <p className="text-xs text-emerald-600 font-medium mt-1.5 flex items-center gap-1">
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

          {/* ===== DESKTOP SIDEBAR ===== */}
          <div className="hidden lg:block space-y-4">
            {/* Quick Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="bg-white border border-gray-200 rounded-lg p-6"
            >
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">{t.grantDetail.details}</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">{t.grantDetail.location}</p>
                    <p className="text-sm font-medium text-gray-900">{locationDisplay}</p>
                  </div>
                </div>
                {item.geographicScope && (
                  <div className="flex items-start gap-3">
                    <Globe className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">{t.grantDetail.geographicScope}</p>
                      <p className="text-sm font-medium text-gray-900">{item.geographicScope}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Tag className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">{t.grantDetail.category}</p>
                    <p className="text-sm font-medium text-gray-900">{translatedCategory}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Building2 className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">{t.grantDetail.organization}</p>
                    <p className="text-sm font-medium text-gray-900">{item.organization || "\u2014"}</p>
                  </div>
                </div>
                {item.amount && (
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">{t.grantDetail.amount}</p>
                      <p className="text-sm font-semibold text-emerald-600">{item.amount}</p>
                    </div>
                  </div>
                )}
                {item.fundingType && item.fundingType !== "unknown" && (
                  <div className="flex items-start gap-3">
                    <Heart className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">{t.grantDetail.fundingType}</p>
                      <p className="text-sm font-medium text-gray-900">{fundingTypeLabels[item.fundingType] || item.fundingType}</p>
                    </div>
                  </div>
                )}
                {item.deadline && (
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">{t.grantDetail.deadlineLabel}</p>
                      <p className="text-sm font-medium text-gray-900">{item.deadline}</p>
                    </div>
                  </div>
                )}
                {item.targetDiagnosis && item.targetDiagnosis !== "General" && (
                  <div className="flex items-start gap-3">
                    <Stethoscope className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">{t.grantDetail.targetConditions}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.targetDiagnosis.split(",").slice(0, 5).map((d, i) => (
                          <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                            {d.trim()}
                          </span>
                        ))}
                        {item.targetDiagnosis.split(",").length > 5 && (
                          <span className="text-xs text-gray-400">+{item.targetDiagnosis.split(",").length - 5} more</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {item.ageRange && item.ageRange !== "0-100" && (
                  <div className="flex items-start gap-3">
                    <Users className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">{t.grantDetail.ageRange}</p>
                      <p className="text-sm font-medium text-gray-900">
                        {item.ageRange === "0-18" ? `${t.grantDetail.children} (0-18)` :
                         item.ageRange === "18-100" ? `${t.grantDetail.adults} (18+)` :
                         t.grantDetail.ages.replace("{range}", item.ageRange)}
                      </p>
                    </div>
                  </div>
                )}
                {item.status && (
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">{t.grantDetail.status}</p>
                      <p className={`text-sm font-medium ${item.status === "Open" ? "text-emerald-600" : "text-gray-700"}`}>
                        {item.status}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Contact Card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="bg-white border border-gray-200 rounded-lg p-6"
            >
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">{t.grantDetail.contact}</h3>
              <div className="space-y-3">
                {primaryLink ? (
                  <a
                    href={primaryLink.startsWith("http") ? primaryLink : `https://${primaryLink}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-medium text-[#1e3a5f] hover:text-[#22c55e] transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                    {t.catalog.visitWebsite}
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <p className="text-sm text-gray-400 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    {t.grantDetail.noWebsite}
                  </p>
                )}
                {item.phone ? (
                  <a href={`tel:${item.phone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {item.phone}
                  </a>
                ) : (
                  <p className="text-sm text-gray-400 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {t.grantDetail.noPhone}
                  </p>
                )}
                {item.email ? (
                  <a href={`mailto:${item.email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                    <Mail className="w-4 h-4 text-gray-400" />
                    {item.email}
                  </a>
                ) : (
                  <p className="text-sm text-gray-400 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {t.grantDetail.noEmail}
                  </p>
                )}
              </div>

              {primaryLink && (
                <a
                  href={primaryLink.startsWith("http") ? primaryLink : `https://${primaryLink}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-4"
                >
                  <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <ArrowUpRight className="w-4 h-4" />
                    {t.grantDetail.applyNow}
                  </Button>
                </a>
              )}
            </motion.div>

            {/* Bookmark CTA */}
            {isAuthenticated && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <Button
                  variant={isSaved ? "outline" : "default"}
                  className={`w-full gap-2 ${isSaved ? "border-yellow-400 text-yellow-600 hover:bg-yellow-50" : "bg-[#1e3a5f] hover:bg-[#0f172a]"}`}
                  onClick={() => toggleSave.mutate({ grantId: item.id })}
                >
                  {isSaved ? (
                    <>
                      <BookmarkCheck className="w-4 h-4" />
                      {t.grantDetail.saved}
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4" />
                      {t.grantDetail.saveThisGrant}
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* ===== MOBILE STICKY BOTTOM CTA ===== */}
      {primaryLink && (
        <div className="md:hidden fixed bottom-16 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm border-t border-gray-200 px-4 py-3 safe-area-bottom">
          <div className="flex gap-2">
            <a
              href={primaryLink.startsWith("http") ? primaryLink : `https://${primaryLink}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button className="w-full gap-2 bg-emerald-600 active:bg-emerald-700 text-white h-12 text-sm font-semibold rounded-xl">
                <ArrowUpRight className="w-4 h-4" />
                {t.grantDetail.applyNow}
              </Button>
            </a>
            {isAuthenticated && (
              <Button
                variant="outline"
                className={`h-12 w-12 shrink-0 rounded-xl ${isSaved ? "border-yellow-400 text-yellow-600" : "border-gray-200 text-gray-600"}`}
                onClick={() => toggleSave.mutate({ grantId: item.id })}
              >
                {isSaved ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
