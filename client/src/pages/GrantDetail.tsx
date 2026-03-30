/*
 * Grant Detail Page — Full information view for a single grant/resource
 * Design: Structured Clarity — clean layout with all grant info, related items, and bookmark
 * Data sourced from database via tRPC
 */

import { useMemo } from "react";
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

export default function GrantDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { t, tCategory, tCountry, language } = useLanguage();
  const { isAuthenticated } = useAuth();

  // Fetch grant detail from database
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
      toast.error("Failed to save grant");
    },
    onSettled: () => {
      utils.grants.savedList.invalidate();
    },
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50/30">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
        <Footer />
      </div>
    );
  }

  // Not found
  if (!detailData?.grant) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50/30">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Grant Not Found</h2>
            <p className="text-gray-500 mb-6">The grant you're looking for doesn't exist.</p>
            <Link href="/catalog">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Catalog
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const item = detailData.grant;
  const translations = detailData.translations || {};
  const relatedItems = detailData.related || [];

  // Get translated content
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
  const borderColor = getCategoryBorderColor(item.category);
  const primaryLink = item.website || "";

  // Funding type label
  const fundingTypeLabels: Record<string, string> = {
    one_time: "One-Time",
    recurring: "Recurring",
    reimbursement: "Reimbursement",
    varies: "Varies",
    unknown: "—",
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: content.name, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    }
  };

  // Build SEO description from grant content
  const seoDescription = content.description
    ? content.description.slice(0, 160).replace(/\s+/g, " ").trim() + (content.description.length > 160 ? "..." : "")
    : `${content.name} — ${translatedCategory} grant from ${item.organization || "GrantKit"}`;
  const seoKeywords = [
    content.name,
    item.organization,
    translatedCategory,
    translatedCountry,
    item.type === "grant" ? "grant" : "resource",
    "funding",
  ].filter(Boolean).join(", ");

  // B-2 visa badge
  const b2Badge = item.b2VisaEligible === "yes"
    ? { label: "B-2 Visa Eligible", color: "bg-emerald-100 text-emerald-700 border-emerald-200" }
    : item.b2VisaEligible === "no"
    ? { label: "US Residents Only", color: "bg-red-50 text-red-600 border-red-200" }
    : item.b2VisaEligible === "uncertain"
    ? { label: "B-2 Visa: Contact to Confirm", color: "bg-amber-50 text-amber-700 border-amber-200" }
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

      {/* Header */}
      <div className="bg-[#0f172a] py-8">
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
              {/* Quick stats row */}
              <div className="flex items-center gap-4 mt-3 flex-wrap">
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

      {/* Content */}
      <div className="container py-8 flex-1">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`bg-white border border-gray-200 rounded-lg ${borderColor} border-l-4 p-6`}
            >
              <h2 className="text-lg font-semibold text-[#0f172a] mb-3 flex items-center gap-2">
                <Tag className="w-5 h-5 text-gray-400" />
                Description
              </h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {content.description || "No description available."}
              </p>
            </motion.div>

            {/* Eligibility card */}
            {content.eligibility && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="bg-white border border-gray-200 rounded-lg p-6"
              >
                <h2 className="text-lg font-semibold text-[#0f172a] mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-400" />
                  {t.catalog.eligibility}
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  {content.eligibility}
                </p>
              </motion.div>
            )}

            {/* How to Apply card */}
            {item.applicationProcess && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
                className="bg-white border border-gray-200 rounded-lg p-6"
              >
                <h2 className="text-lg font-semibold text-[#0f172a] mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  How to Apply
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  {item.applicationProcess}
                </p>
              </motion.div>
            )}

            {/* Required Documents card */}
            {item.documentsRequired && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="bg-white border border-gray-200 rounded-lg p-6"
              >
                <h2 className="text-lg font-semibold text-[#0f172a] mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-400" />
                  Required Documents
                </h2>
                <div className="flex flex-wrap gap-2">
                  {item.documentsRequired.split(",").map((doc, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-gray-400" />
                      {doc.trim()}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Related Grants */}
            {relatedItems.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.25 }}
              >
                <h2 className="text-lg font-semibold text-[#0f172a] mb-4">Related Grants</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {relatedItems.map((related) => {
                    const rTrans = language !== "en" ? (related as any).translations?.[language] : null;
                    const rc = {
                      name: rTrans?.name || related.name,
                      description: rTrans?.description || related.description,
                    };
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
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Quick Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="bg-white border border-gray-200 rounded-lg p-6"
            >
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Details</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Location</p>
                    <p className="text-sm font-medium text-gray-900">{translatedCountry}</p>
                  </div>
                </div>

                {item.geographicScope && (
                  <div className="flex items-start gap-3">
                    <Globe className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Geographic Scope</p>
                      <p className="text-sm font-medium text-gray-900">{item.geographicScope}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Tag className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Category</p>
                    <p className="text-sm font-medium text-gray-900">{translatedCategory}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Building2 className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Organization</p>
                    <p className="text-sm font-medium text-gray-900">{item.organization || "—"}</p>
                  </div>
                </div>

                {item.amount && (
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Amount</p>
                      <p className="text-sm font-semibold text-emerald-600">{item.amount}</p>
                    </div>
                  </div>
                )}

                {item.fundingType && item.fundingType !== "unknown" && (
                  <div className="flex items-start gap-3">
                    <Heart className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Funding Type</p>
                      <p className="text-sm font-medium text-gray-900">{fundingTypeLabels[item.fundingType] || item.fundingType}</p>
                    </div>
                  </div>
                )}

                {item.deadline && (
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Deadline</p>
                      <p className="text-sm font-medium text-gray-900">{item.deadline}</p>
                    </div>
                  </div>
                )}

                {item.targetDiagnosis && item.targetDiagnosis !== "General" && (
                  <div className="flex items-start gap-3">
                    <Stethoscope className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Target Conditions</p>
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
                      <p className="text-xs text-gray-500">Age Range</p>
                      <p className="text-sm font-medium text-gray-900">
                        {item.ageRange === "0-18" ? "Children (0-18)" :
                         item.ageRange === "18-100" ? "Adults (18+)" :
                         `Ages ${item.ageRange}`}
                      </p>
                    </div>
                  </div>
                )}

                {item.status && (
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
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
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Contact</h3>
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
                    No website listed
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
                    No phone listed
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
                    No email listed
                  </p>
                )}
              </div>

              {/* Apply button */}
              {primaryLink && (
                <a
                  href={primaryLink.startsWith("http") ? primaryLink : `https://${primaryLink}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-4"
                >
                  <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <ArrowUpRight className="w-4 h-4" />
                    Apply Now
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
                      Saved
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4" />
                      Save this Grant
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
