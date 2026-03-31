/*
 * User Dashboard — Personalized hub for saved grants, subscription status, and quick actions
 * Mobile: single-column app-like layout, no footer, compact cards
 * Desktop: 3-column layout with sidebar
 */

import { useMemo } from "react";
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
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { getCategoryStyle, getCategoryBorderColor } from "@/lib/constants";
import SEO from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";

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
      toast.error("Failed to remove saved grant");
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
            <h2 className="text-lg md:text-xl font-bold text-foreground mb-2">Sign in to access your Dashboard</h2>
            <p className="text-sm text-muted-foreground mb-5 md:mb-6">
              Save grants, track your favorites, and manage your subscription all in one place.
            </p>
            <a href={getLoginUrl()}>
              <Button className="bg-primary hover:bg-primary h-11 md:h-10 w-full md:w-auto px-8">Sign In</Button>
            </a>
          </div>
        </div>
      </div>
    );
  }

  const isActive = subData?.isActive;

  return (
    <div className="min-h-screen flex flex-col bg-secondary">
      <SEO title="Dashboard" noIndex />
      <Navbar />

      {/* Header — compact on mobile */}
      <div className="bg-secondary py-5 md:py-8 border-b border-border">
        <div className="container px-4 md:px-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg md:text-3xl font-bold text-foreground tracking-tight">
                Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
              </h1>
              <p className="text-muted-foreground text-xs md:text-base mt-0.5 md:mt-1">Your personalized grant hub</p>
            </div>
            <Link href="/profile">
              <Button variant="outline" size="sm" className="border-white/20 text-foreground/70 hover:bg-white/10 gap-1.5 h-9 text-xs md:text-sm">
                <Settings className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden md:inline">Settings</span>
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
            <p className="text-[10px] text-primary-foreground/70">Saved</p>
          </div>
          <div className="flex-1 bg-gradient-to-br from-[#0f172a] to-[#1e3a5f] rounded-xl p-3 text-white">
            <p className="text-xl font-bold">{countData?.total || "643"}</p>
            <p className="text-[10px] text-primary-foreground/70">Available</p>
          </div>
          <div className="flex-1 bg-card border border-border rounded-xl p-3">
            {isActive ? (
              <>
                <Crown className="w-5 h-5 text-yellow-500 mb-0.5" />
                <p className="text-[10px] font-medium text-foreground/80">Active</p>
              </>
            ) : (
              <Link href="/#pricing">
                <Sparkles className="w-5 h-5 text-emerald-500 mb-0.5" />
                <p className="text-[10px] font-medium text-emerald-600">Upgrade</p>
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
                <p className="text-sm font-semibold text-foreground">Unlock Full Access</p>
                <p className="text-xs text-muted-foreground">Get access to {countData?.total || "643"}+ grants</p>
              </div>
              <Link href="/#pricing">
                <Button size="sm" className="bg-emerald-600 active:bg-emerald-700 text-white h-9 text-xs rounded-lg">
                  $9/mo
                </Button>
              </Link>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
          {/* Main content area */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Saved Grants */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <h2 className="text-sm md:text-lg font-semibold text-foreground flex items-center gap-2">
                  <Bookmark className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" />
                  Saved Grants
                  {savedItems.length > 0 && (
                    <span className="text-xs md:text-sm font-normal text-muted-foreground">({savedItems.length})</span>
                  )}
                </h2>
                <Link href="/catalog">
                  <Button variant="ghost" size="sm" className="text-primary gap-1 h-8 text-xs md:text-sm">
                    <Search className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    Browse
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
                  <h3 className="font-medium text-foreground/80 text-sm md:text-base mb-1">No saved grants yet</h3>
                  <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
                    Browse the catalog and tap the bookmark icon to save grants.
                  </p>
                  <Link href="/catalog">
                    <Button variant="outline" size="sm" className="gap-1.5 h-10 md:h-9 text-xs md:text-sm rounded-lg md:rounded-md">
                      <Search className="w-4 h-4" />
                      Explore Catalog
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
                            title="Remove from saved"
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
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quick Actions</h3>
              <div className="grid grid-cols-3 gap-2">
                <Link href="/catalog">
                  <div className="bg-card border border-border rounded-xl p-3 text-center active:bg-secondary">
                    <Search className="w-5 h-5 text-muted-foreground/60 mx-auto mb-1" />
                    <p className="text-[10px] font-medium text-foreground/80">Browse</p>
                  </div>
                </Link>
                <Link href="/contact">
                  <div className="bg-card border border-border rounded-xl p-3 text-center active:bg-secondary">
                    <ExternalLink className="w-5 h-5 text-muted-foreground/60 mx-auto mb-1" />
                    <p className="text-[10px] font-medium text-foreground/80">Support</p>
                  </div>
                </Link>
                <Link href="/profile">
                  <div className="bg-card border border-border rounded-xl p-3 text-center active:bg-secondary">
                    <Settings className="w-5 h-5 text-muted-foreground/60 mx-auto mb-1" />
                    <p className="text-[10px] font-medium text-foreground/80">Settings</p>
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
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Subscription</h3>
              {isActive ? (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    <span className="font-semibold text-foreground">Active Member</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    You have full access to all grants and resources in the catalog.
                  </p>
                  <Link href="/profile">
                    <Button variant="outline" size="sm" className="w-full gap-1.5">
                      <Settings className="w-4 h-4" />
                      Manage Subscription
                    </Button>
                  </Link>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Subscribe to unlock full access to {countData?.total || "643"}+ grants and resources.
                  </p>
                  <Link href="/#pricing">
                    <Button size="sm" className="w-full bg-brand-green hover:bg-brand-green-hover gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      Get Access — $9/mo
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
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link href="/catalog">
                  <button className="w-full flex items-center justify-between p-3 rounded-md hover:bg-secondary transition-colors text-left">
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                      <Search className="w-4 h-4 text-muted-foreground/60" />
                      Browse Catalog
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground/60" />
                  </button>
                </Link>
                <Link href="/contact">
                  <button className="w-full flex items-center justify-between p-3 rounded-md hover:bg-secondary transition-colors text-left">
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                      <ExternalLink className="w-4 h-4 text-muted-foreground/60" />
                      Contact Support
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground/60" />
                  </button>
                </Link>
                <Link href="/profile">
                  <button className="w-full flex items-center justify-between p-3 rounded-md hover:bg-secondary transition-colors text-left">
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                      <Settings className="w-4 h-4 text-muted-foreground/60" />
                      Account Settings
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
              <h3 className="text-sm font-semibold text-primary-foreground/70 uppercase tracking-wider mb-4">Your Activity</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold">{savedGrantIds.length}</p>
                  <p className="text-xs text-primary-foreground/70">Saved Grants</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{countData?.total || "643"}</p>
                  <p className="text-xs text-primary-foreground/70">Total Available</p>
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
