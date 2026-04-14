/*
 * User Dashboard — Personalized hub for saved grants, subscription status, and quick actions
 * Mobile: single-column app-like layout, no footer, compact cards
 * Desktop: 3-column layout with sidebar
 */

import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bookmark,
  BookmarkX,
  Crown,
  ExternalLink,
  LayoutDashboard,
  Loader2,
  Search,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { getCategoryStyle, getCategoryBorderColor } from "@/lib/constants";
import SEO from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePersonalizedResources } from "@/hooks/usePersonalizedResources";
import { PURPOSE_OPTIONS, SUPPORTED_COUNTRIES, type UserProfile, type Purpose, type PurposeDetail, type Need, type NeedDetail } from "@shared/profileTypes";


const PURPOSE_LABEL_KEY: Record<Purpose, "purposeEducation" | "purposeMedical" | "purposeBusiness"> = {
  EDUCATION: "purposeEducation",
  MEDICAL: "purposeMedical",
  BUSINESS: "purposeBusiness",
};

const NEED_LABEL_KEY: Record<Need, "needVisa" | "needHousing" | "needFood" | "needTransport" | "needLegal" | "needLanguage" | "needBanking"> = {
  VISA: "needVisa",
  HOUSING: "needHousing",
  FOOD: "needFood",
  TRANSPORT: "needTransport",
  LEGAL: "needLegal",
  LANGUAGE: "needLanguage",
  BANKING: "needBanking",
};

export default function Dashboard() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { t, tCategory, tCountry, language } = useLanguage();

  const { data: subData } = trpc.subscription.status.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: savedData, isLoading: savedLoading } = trpc.grants.savedList.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  const savedGrantIds = useMemo(() => savedData?.grantIds || [], [savedData]);

  const { data: catalogData } = trpc.catalog.list.useQuery(
    { pageSize: 100, page: 1 },
    { enabled: isAuthenticated && savedGrantIds.length > 0, retry: false }
  );

  const { data: countData } = trpc.catalog.count.useQuery(undefined, { retry: false });

  const { data: profile } = trpc.onboarding.getProfile.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  const normalizedProfile = useMemo<UserProfile | null>(() => {
    if (!profile) return null;
    return {
      targetCountry: profile.targetCountry,
      purposes: profile.purposes as Purpose[],
      purposeDetails: profile.purposeDetails as PurposeDetail[],
      needs: profile.needs as Need[],
      needDetails: profile.needDetails as NeedDetail[],
      profileCompletedAt: profile.profileCompletedAt,
    };
  }, [profile]);

  const { funding, needs, loading: personalizedLoading } = usePersonalizedResources(normalizedProfile);
  const [selectedPurposeTab, setSelectedPurposeTab] = useState<string>("all");
  const [selectedNeedTab, setSelectedNeedTab] = useState<string>("all");
  const filteredFunding = useMemo(
    () => (selectedPurposeTab === "all" ? funding : funding.filter((item) => (item as any).purpose_tags?.includes(selectedPurposeTab))),
    [funding, selectedPurposeTab]
  );
  const filteredNeeds = useMemo(
    () => (selectedNeedTab === "all" ? needs : needs.filter((item) => (item as any).need_tags?.includes(selectedNeedTab))),
    [needs, selectedNeedTab]
  );

  const savedItems = useMemo(() => {
    if (!catalogData?.grants || savedGrantIds.length === 0) return [];
    const savedSet = new Set(savedGrantIds);
    return catalogData.grants
      .filter((g) => savedSet.has(g.id))
      .map((g) => {
        const trans = (g as any).translations?.[language];
        return {
          id: g.id,
          name: trans?.name || g.name,
          description: trans?.description || g.description,
          category: g.category,
          country: g.country,
          type: g.type,
        };
      });
  }, [catalogData, savedGrantIds, language]);

  const utils = trpc.useUtils();
  const toggleSave = trpc.grants.toggleSave.useMutation({
    onMutate: async ({ grantId }) => {
      await utils.grants.savedList.cancel();
      const prev = utils.grants.savedList.getData();
      utils.grants.savedList.setData(undefined, (old) => {
        if (!old) return { grantIds: [] };
        const ids = old.grantIds.filter((id) => id !== grantId);
        return { grantIds: ids };
      });
      return { prev };
    },
    onError: (_err: unknown, _vars: unknown, ctx: { prev?: { grantIds: string[] } } | undefined) => {
      if (ctx?.prev) utils.grants.savedList.setData(undefined, ctx.prev);
      toast.error(t.dashboard.toastRemoveError);
    },
    onSettled: () => {
      utils.grants.savedList.invalidate();
    },
  });

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-secondary">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/60" />
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-secondary">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <LayoutDashboard className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground/40 mx-auto mb-3 md:mb-4" />
            <h2 className="text-lg md:text-xl font-bold text-foreground mb-2">{t.dashboard.signInTitle}</h2>
            <p className="text-sm text-muted-foreground mb-5 md:mb-6">
              {t.dashboard.signInSubtitle}
            </p>
            <a href={getLoginUrl()}>
              <Button className="bg-primary hover:bg-primary h-11 md:h-10 w-full md:w-auto px-8">{t.dashboard.signInButton}</Button>
            </a>
          </div>
        </div>
      </div>
    );
  }

  const isActive = subData?.isActive;

  return (
    <div className="min-h-screen flex flex-col bg-secondary">
      <SEO title={t.seo.dashboardTitle} noIndex />
      <Navbar />

      {/* Header — compact on mobile */}
      <div className="bg-secondary py-5 md:py-8 border-b border-border">
        <div className="container px-4 md:px-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg md:text-3xl font-bold text-foreground tracking-tight">
                {t.dashboard.welcome}{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
              </h1>
              <p className="text-muted-foreground text-xs md:text-base mt-0.5 md:mt-1">{t.dashboard.subtitle}</p>
            </div>
            <Link href="/profile">
              <Button variant="outline" size="sm" className="border-white/20 text-foreground/70 hover:bg-white/10 gap-1.5 h-9 text-xs md:text-sm">
                <Settings className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden md:inline">{t.dashboard.settings}</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container px-4 md:px-0 py-4 md:py-8 flex-1 pb-24 md:pb-8">
        {/* Mobile: stats strip */}
        <div className="md:hidden flex gap-3 mb-4">
          <div className="flex-1 bg-gradient-to-br from-[#0f172a] to-[#1e3a5f] rounded-xl p-3 text-white">
            <p className="text-xl font-bold">{savedGrantIds.length}</p>
            <p className="text-[10px] text-primary-foreground/70">{t.dashboard.saved}</p>
          </div>
          <div className="flex-1 bg-gradient-to-br from-[#0f172a] to-[#1e3a5f] rounded-xl p-3 text-white">
            <p className="text-xl font-bold">{countData?.total || "643"}</p>
            <p className="text-[10px] text-primary-foreground/70">{t.dashboard.available}</p>
          </div>
          <div className="flex-1 bg-card border border-border rounded-xl p-3">
            {isActive ? (
              <>
                <Crown className="w-5 h-5 text-yellow-500 mb-0.5" />
                <p className="text-[10px] font-medium text-foreground/80">{t.dashboard.active}</p>
              </>
            ) : (
              <Link href="/#pricing">
                <Sparkles className="w-5 h-5 text-emerald-500 mb-0.5" />
                <p className="text-[10px] font-medium text-emerald-600">{t.dashboard.upgrade}</p>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile: subscription CTA (if not active) */}
        {!isActive && (
          <div className="md:hidden bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-emerald-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{t.dashboard.unlockTitle}</p>
                <p className="text-xs text-muted-foreground">{t.dashboard.unlockDesc.replace("{count}", String(countData?.total || "643"))}</p>
              </div>
              <Link href="/#pricing">
                <Button size="sm" className="bg-emerald-600 active:bg-emerald-700 text-white h-9 text-xs rounded-lg">
                  {t.dashboard.priceMonth}
                </Button>
              </Link>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
          {/* Main content area */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {!normalizedProfile?.profileCompletedAt && (
              <div className="rounded-2xl border border-brand-green/30 bg-brand-green/10 p-4 md:p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{t.profile.completeProfileBanner}</p>
                  <Button className="bg-brand-green hover:bg-brand-green-hover" size="sm" onClick={() => navigate("/onboarding")}> 
                    {t.profile.completeProfileCta}
                  </Button>
                </div>
              </div>
            )}

            {normalizedProfile?.profileCompletedAt && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-lg">
                        {SUPPORTED_COUNTRIES.find((country) => country.code === normalizedProfile.targetCountry)?.flag ?? "🌐"}
                      </span>
                      <span>{normalizedProfile.targetCountry ? t.country[normalizedProfile.targetCountry as keyof typeof t.country] : ""}</span>
                      <div className="flex items-center gap-1">
                        {normalizedProfile.purposes.map((purpose) => (
                          <span key={purpose} className="text-lg">{PURPOSE_OPTIONS.find((option) => option.value === purpose)?.icon}</span>
                        ))}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => navigate("/onboarding")}>{t.profile.editProfile}</Button>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-4">
                  <h3 className="mb-3 text-sm font-semibold text-foreground">{t.profile.fundingSection}</h3>
                  <Tabs value={selectedPurposeTab} onValueChange={setSelectedPurposeTab}>
                    <TabsList className="h-auto w-full flex-wrap">
                      <TabsTrigger value="all">{t.filters.all}</TabsTrigger>
                      {normalizedProfile.purposes.map((purpose) => (
                        <TabsTrigger key={purpose} value={purpose}>{t.profile[PURPOSE_LABEL_KEY[purpose]]}</TabsTrigger>
                      ))}
                    </TabsList>
                    <TabsContent value={selectedPurposeTab} className="mt-3">
                      {personalizedLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : filteredFunding.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t.profile.noFundingResults}</p>
                      ) : (
                        <div className="space-y-2">
                          {filteredFunding.map((item) => (
                      ) : funding.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t.profile.noFundingResults}</p>
                      ) : (
                        <div className="space-y-2">
                          {funding.map((item) => (
                            <Link key={item.id} href={`/resources/${item.slug}`}>
                              <div className="cursor-pointer rounded-lg border border-border p-3 hover:bg-secondary/60">
                                <p className="text-sm font-medium">{item.title}</p>
                                <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="rounded-xl border border-border bg-card p-4">
                  <h3 className="mb-3 text-sm font-semibold text-foreground">{t.profile.needsSection}</h3>
                  <Tabs value={selectedNeedTab} onValueChange={setSelectedNeedTab}>
                    <TabsList className="h-auto w-full flex-wrap">
                      <TabsTrigger value="all">{t.filters.all}</TabsTrigger>
                      {normalizedProfile.needs.map((need) => (
                        <TabsTrigger key={need} value={need}>{t.profile[NEED_LABEL_KEY[need]]}</TabsTrigger>
                      ))}
                    </TabsList>
                    <TabsContent value={selectedNeedTab} className="mt-3">
                      {personalizedLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : filteredNeeds.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t.profile.noNeedsResults}</p>
                      ) : (
                        <div className="space-y-2">
                          {filteredNeeds.map((item) => (
                      ) : needs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t.profile.noNeedsResults}</p>
                      ) : (
                        <div className="space-y-2">
                          {needs.map((item) => (
                            <Link key={item.id} href={`/resources/${item.slug}`}>
                              <div className="cursor-pointer rounded-lg border border-border p-3 hover:bg-secondary/60">
                                <p className="text-sm font-medium">{item.title}</p>
                                <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </motion.div>
            )}

            {/* Saved Grants */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <h2 className="text-sm md:text-lg font-semibold text-foreground flex items-center gap-2">
                  <Bookmark className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" />
                  {t.dashboard.savedGrants}
                  {savedItems.length > 0 && (
                    <span className="text-xs md:text-sm font-normal text-muted-foreground">({savedItems.length})</span>
                  )}
                </h2>
                <Link href="/catalog">
                  <Button variant="ghost" size="sm" className="text-primary gap-1 h-8 text-xs md:text-sm">
                    <Search className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    {t.dashboard.browse}
                  </Button>
                </Link>
              </div>

              {savedLoading ? (
                <div className="bg-card border border-border rounded-xl md:rounded-lg p-6 md:p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/60 mx-auto" />
                </div>
              ) : savedItems.length === 0 ? (
                <div className="bg-card border border-border rounded-xl md:rounded-lg p-6 md:p-8 text-center">
                  <BookmarkX className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground/40 mx-auto mb-2 md:mb-3" />
                  <h3 className="font-medium text-foreground/80 text-sm md:text-base mb-1">{t.dashboard.noSavedTitle}</h3>
                  <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
                    {t.dashboard.noSavedDesc}
                  </p>
                  <Link href="/catalog">
                    <Button variant="outline" size="sm" className="gap-1.5 h-10 md:h-9 text-xs md:text-sm rounded-lg md:rounded-md">
                      <Search className="w-4 h-4" />
                      {t.dashboard.exploreCatalog}
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2 md:space-y-3">
                  {savedItems.map((item) => {
                    const flag = item.country === "US" ? "🇺🇸" : "🌐";
                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className={`bg-card border border-border rounded-xl md:rounded-lg ${getCategoryBorderColor(item.category)} border-l-4 p-3 md:p-4 active:shadow-sm md:hover:shadow-sm transition-all`}
                      >
                        <div className="flex items-start justify-between gap-2 md:gap-3">
                          <Link href={`/grant/${item.id}`}>
                            <div className="cursor-pointer flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-base md:text-lg">{flag}</span>
                                <h3 className="font-medium text-foreground text-xs md:text-sm leading-snug active:text-primary md:hover:text-primary transition-colors line-clamp-1">
                                  {item.name}
                                </h3>
                              </div>
                              <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-1 ml-6 md:ml-7">{item.description}</p>
                              <div className="flex items-center gap-2 md:gap-3 mt-1.5 md:mt-2 ml-6 md:ml-7">
                                <span className={`text-[9px] md:text-[10px] font-medium px-2 py-0.5 rounded-full border ${getCategoryStyle(item.category)}`}>
                                  {tCategory(item.category)}
                                </span>
                                <span className="text-[10px] md:text-xs text-muted-foreground/60">{tCountry(item.country)}</span>
                              </div>
                            </div>
                          </Link>
                          <button
                            onClick={() => toggleSave.mutate({ grantId: item.id })}
                            className="p-2 md:p-1.5 rounded-lg md:rounded-md active:bg-red-50 md:hover:bg-red-50 text-muted-foreground/60 active:text-red-500 md:hover:text-red-500 transition-colors shrink-0"
                            title={t.dashboard.removeFromSaved}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* Mobile: Quick Actions */}
            <div className="md:hidden">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t.dashboard.quickActions}</h3>
              <div className="grid grid-cols-3 gap-2">
                <Link href="/catalog">
                  <div className="bg-card border border-border rounded-xl p-3 text-center active:bg-secondary">
                    <Search className="w-5 h-5 text-muted-foreground/60 mx-auto mb-1" />
                    <p className="text-[10px] font-medium text-foreground/80">{t.dashboard.browse}</p>
                  </div>
                </Link>
                <Link href="/contact">
                  <div className="bg-card border border-border rounded-xl p-3 text-center active:bg-secondary">
                    <ExternalLink className="w-5 h-5 text-muted-foreground/60 mx-auto mb-1" />
                    <p className="text-[10px] font-medium text-foreground/80">{t.dashboard.support}</p>
                  </div>
                </Link>
                <Link href="/profile">
                  <div className="bg-card border border-border rounded-xl p-3 text-center active:bg-secondary">
                    <Settings className="w-5 h-5 text-muted-foreground/60 mx-auto mb-1" />
                    <p className="text-[10px] font-medium text-foreground/80">{t.dashboard.settings}</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Desktop Sidebar */}
          <div className="hidden lg:block space-y-4">
            {/* Subscription Status */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="bg-card border border-border rounded-lg p-6"
            >
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">{t.dashboard.subscription}</h3>
              {isActive ? (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    <span className="font-semibold text-foreground">{t.dashboard.activeMember}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t.dashboard.activeMessage}
                  </p>
                  <Link href="/profile">
                    <Button variant="outline" size="sm" className="w-full gap-1.5">
                      <Settings className="w-4 h-4" />
                      {t.dashboard.manageSubscription}
                    </Button>
                  </Link>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t.dashboard.subscribePrompt.replace("{count}", String(countData?.total || "643"))}
                  </p>
                  <Link href="/#pricing">
                    <Button size="sm" className="w-full bg-brand-green hover:bg-brand-green-hover gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      {t.dashboard.subscribeCta}
                    </Button>
                  </Link>
                </div>
              )}
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="bg-card border border-border rounded-lg p-6"
            >
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">{t.dashboard.quickActions}</h3>
              <div className="space-y-2">
                <Link href="/catalog">
                  <button className="w-full flex items-center justify-between p-3 rounded-md hover:bg-secondary transition-colors text-left">
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                      <Search className="w-4 h-4 text-muted-foreground/60" />
                      {t.dashboard.browseCatalog}
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground/60" />
                  </button>
                </Link>
                <Link href="/contact">
                  <button className="w-full flex items-center justify-between p-3 rounded-md hover:bg-secondary transition-colors text-left">
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                      <ExternalLink className="w-4 h-4 text-muted-foreground/60" />
                      {t.dashboard.contactSupport}
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground/60" />
                  </button>
                </Link>
                <Link href="/profile">
                  <button className="w-full flex items-center justify-between p-3 rounded-md hover:bg-secondary transition-colors text-left">
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                      <Settings className="w-4 h-4 text-muted-foreground/60" />
                      {t.dashboard.accountSettings}
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground/60" />
                  </button>
                </Link>
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="bg-gradient-to-br from-[#0f172a] to-[#1e3a5f] rounded-lg p-6 text-white"
            >
              <h3 className="text-sm font-semibold text-primary-foreground/70 uppercase tracking-wider mb-4">{t.dashboard.yourActivity}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold">{savedGrantIds.length}</p>
                  <p className="text-xs text-primary-foreground/70">{t.dashboard.savedGrants}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{countData?.total || "643"}</p>
                  <p className="text-xs text-primary-foreground/70">{t.dashboard.totalAvailable}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
