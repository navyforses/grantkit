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
  Globe,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Share2,
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
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{countryFlag}</span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${getCategoryStyle(item.category)}`}>
                  {translatedCategory}
                </span>
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${
                  item.type === "grant" ? "bg-emerald-500/20 text-emerald-300" : "bg-blue-500/20 text-blue-300"
                }`}>
                  {typeLabel}
                </span>
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

            {/* Related Grants */}
            {relatedItems.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
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
                    <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Amount</p>
                      <p className="text-sm font-medium text-emerald-600">{item.amount}</p>
                    </div>
                  </div>
                )}

                {item.status && (
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
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
