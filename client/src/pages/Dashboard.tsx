/*
 * User Dashboard — Personalized hub for saved grants, subscription status, and quick actions
 * Design: Structured Clarity — clean card-based layout
 * Data sourced from database via tRPC
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
import { useLanguage } from "@/contexts/LanguageContext";

export default function Dashboard() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { t, tCategory, tCountry, language } = useLanguage();

  // Subscription status
  const { data: subData } = trpc.subscription.status.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  // Saved grants
  const { data: savedData, isLoading: savedLoading } = trpc.grants.savedList.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch saved grant details from database
  const savedGrantIds = useMemo(() => savedData?.grantIds || [], [savedData]);

  // Fetch catalog to get details for saved grants
  // We'll use catalog.list with a special approach - fetch all saved items
  const { data: catalogData } = trpc.catalog.list.useQuery(
    { pageSize: 100, page: 1 },
    { enabled: isAuthenticated && savedGrantIds.length > 0, retry: false }
  );

  // Get total count
  const { data: countData } = trpc.catalog.count.useQuery(undefined, { retry: false });

  // Filter catalog results to only show saved items
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
      <div className="min-h-screen flex flex-col bg-gray-50/30">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
        <Footer />
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50/30">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <LayoutDashboard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Sign in to access your Dashboard</h2>
            <p className="text-gray-500 mb-6">
              Save grants, track your favorites, and manage your subscription all in one place.
            </p>
            <a href={getLoginUrl()}>
              <Button className="bg-[#1e3a5f] hover:bg-[#0f172a]">Sign In</Button>
            </a>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const isActive = subData?.isActive;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/30">
      <Navbar />

      {/* Header */}
      <div className="bg-[#0f172a] py-8">
        <div className="container">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
              </h1>
              <p className="text-blue-200/70 mt-1">Your personalized grant hub</p>
            </div>
            <Link href="/profile">
              <Button variant="outline" size="sm" className="border-white/20 text-white/70 hover:bg-white/10 gap-1.5">
                <Settings className="w-4 h-4" />
                Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-8 flex-1">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Saved Grants */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#0f172a] flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-yellow-500" />
                  Saved Grants
                  {savedItems.length > 0 && (
                    <span className="text-sm font-normal text-gray-500">({savedItems.length})</span>
                  )}
                </h2>
                <Link href="/catalog">
                  <Button variant="ghost" size="sm" className="text-[#1e3a5f] gap-1">
                    <Search className="w-4 h-4" />
                    Browse All
                  </Button>
                </Link>
              </div>

              {savedLoading ? (
                <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
                </div>
              ) : savedItems.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                  <BookmarkX className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <h3 className="font-medium text-gray-700 mb-1">No saved grants yet</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Browse the catalog and click the bookmark icon to save grants you're interested in.
                  </p>
                  <Link href="/catalog">
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Search className="w-4 h-4" />
                      Explore Catalog
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedItems.map((item) => {
                    const flag = item.country === "US" ? "🇺🇸" : "🌐";
                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className={`bg-white border border-gray-200 rounded-lg ${getCategoryBorderColor(item.category)} border-l-4 p-4 hover:shadow-sm transition-all`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <Link href={`/grant/${item.id}`}>
                            <div className="cursor-pointer flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">{flag}</span>
                                <h3 className="font-medium text-[#0f172a] text-sm leading-snug hover:text-[#1e3a5f] transition-colors line-clamp-1">
                                  {item.name}
                                </h3>
                              </div>
                              <p className="text-xs text-gray-500 line-clamp-1 ml-7">{item.description}</p>
                              <div className="flex items-center gap-3 mt-2 ml-7">
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${getCategoryStyle(item.category)}`}>
                                  {tCategory(item.category)}
                                </span>
                                <span className="text-xs text-gray-400">{tCountry(item.country)}</span>
                              </div>
                            </div>
                          </Link>
                          <button
                            onClick={() => toggleSave.mutate({ grantId: item.id })}
                            className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors shrink-0"
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
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Subscription Status */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="bg-white border border-gray-200 rounded-lg p-6"
            >
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Subscription</h3>
              {isActive ? (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    <span className="font-semibold text-[#0f172a]">Active Member</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
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
                  <p className="text-sm text-gray-500 mb-4">
                    Subscribe to unlock full access to {countData?.total || "643"}+ grants and resources.
                  </p>
                  <Link href="/#pricing">
                    <Button size="sm" className="w-full bg-[#22c55e] hover:bg-[#16a34a] gap-1.5">
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
              className="bg-white border border-gray-200 rounded-lg p-6"
            >
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link href="/catalog">
                  <button className="w-full flex items-center justify-between p-3 rounded-md hover:bg-gray-50 transition-colors text-left">
                    <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Search className="w-4 h-4 text-gray-400" />
                      Browse Catalog
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </button>
                </Link>
                <Link href="/contact">
                  <button className="w-full flex items-center justify-between p-3 rounded-md hover:bg-gray-50 transition-colors text-left">
                    <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                      Contact Support
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </button>
                </Link>
                <Link href="/profile">
                  <button className="w-full flex items-center justify-between p-3 rounded-md hover:bg-gray-50 transition-colors text-left">
                    <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Settings className="w-4 h-4 text-gray-400" />
                      Account Settings
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
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
              <h3 className="text-sm font-semibold text-blue-200/70 uppercase tracking-wider mb-4">Your Activity</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold">{savedGrantIds.length}</p>
                  <p className="text-xs text-blue-200/70">Saved Grants</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{countData?.total || "643"}</p>
                  <p className="text-xs text-blue-200/70">Total Available</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
