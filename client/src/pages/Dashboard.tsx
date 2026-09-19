/*
 * User Dashboard — Personalized hub: organizations for the user's country
 * and integration domains (Phase 1.3), subscription status, quick actions.
 * Mobile: single-column app-like layout, no footer, compact cards
 * Desktop: 3-column layout with sidebar
 */

import { useMemo } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Crown,
  ExternalLink,
  LayoutDashboard,
  Loader2,
  MapPin,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import SEO from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatStat } from "@/hooks/useStats";
import { normalizeNeeds } from "@/components/onboarding/OnboardingFlow";
import { SUPPORTED_COUNTRIES } from "@shared/profileTypes";
import type { Domain } from "@shared/domains";

/** How many of the user's domains get their own section. */
const TOP_DOMAINS = 3;
const ORGS_PER_DOMAIN = 4;

function DomainOrgsSection({ country, domain }: { country: string; domain: Domain | null }) {
  const { t } = useLanguage();
  const listQuery = trpc.organizations.list.useQuery(
    { country, domain: domain ?? undefined, pageSize: ORGS_PER_DOMAIN, page: 1 },
    { retry: false },
  );
  const orgs = listQuery.data?.organizations ?? [];
  const title = domain ? t.domains[domain].label : t.dashboard.forYouAll;

  return (
    <section data-testid={`domain-section-${domain ?? "all"}`}>
      <div className="flex items-center justify-between mb-2 md:mb-3">
        <h3 className="text-sm md:text-base font-semibold text-foreground flex items-center gap-2">
          <Building2 className="w-4 h-4 text-brand-green" aria-hidden />
          {title}
        </h3>
        <Link href="/organizations">
          <Button variant="ghost" size="sm" className="text-primary gap-1 h-8 text-xs md:text-sm">
            {t.dashboard.seeAll}
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>
      {listQuery.isLoading ? (
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/60 mx-auto" />
        </div>
      ) : orgs.length === 0 ? (
        <p className="bg-card border border-border rounded-xl p-4 text-xs md:text-sm text-muted-foreground">{t.dashboard.forYouEmpty}</p>
      ) : (
        <div className="grid gap-2 md:gap-3 sm:grid-cols-2">
          {orgs.map((org) => (
            <Link key={org.orgId} href={`/organizations/${org.orgId}`}>
              <div className="bg-card border border-border rounded-xl p-3 md:p-4 h-full hover:shadow-sm transition-shadow cursor-pointer">
                <h4 className="font-medium text-foreground text-sm leading-snug line-clamp-2">{org.name}</h4>
                {org.city && (
                  <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" aria-hidden />
                    {org.city}
                  </p>
                )}
                {org.description && (
                  <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{org.description}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export default function Dashboard() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { t } = useLanguage();

  const { data: subData } = trpc.subscription.status.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: countData } = trpc.organizations.count.useQuery(undefined, { retry: false });
  const availableCount = formatStat(countData?.total);

  const { data: profile } = trpc.onboarding.getProfile.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  const needs = useMemo(() => normalizeNeeds(profile?.needs), [profile?.needs]);
  const topDomains = needs.slice(0, TOP_DOMAINS);
  const country = profile?.targetCountry ?? null;

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
            <p className="text-xl font-bold">{availableCount}</p>
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
                <p className="text-xs text-muted-foreground">{t.dashboard.unlockDesc.replace("{count}", availableCount)}</p>
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
            {!profile?.profileCompletedAt && (
              <div className="rounded-2xl border border-brand-green/30 bg-brand-green/10 p-4 md:p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{t.profile.completeProfileBanner}</p>
                  <Button className="bg-brand-green hover:bg-brand-green-hover" size="sm" onClick={() => navigate("/onboarding")}>
                    {t.profile.completeProfileCta}
                  </Button>
                </div>
              </div>
            )}

            {profile?.profileCompletedAt && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-lg">
                      {SUPPORTED_COUNTRIES.find((c) => c.code === country)?.flag ?? "🌐"}
                    </span>
                    <span>{country ? t.country[country as keyof typeof t.country] ?? country : ""}</span>
                    {needs.map((domain) => (
                      <span key={domain} className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border border-border bg-muted/60">
                        {t.domains[domain].label}
                      </span>
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/onboarding")}>{t.profile.editProfile}</Button>
                </div>
              </motion.div>
            )}

            {/* Organizations for you — one section per top domain; country-only when no needs */}
            {country && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <h2 className="text-sm md:text-lg font-semibold text-foreground">{t.dashboard.forYou}</h2>
                {topDomains.length === 0 ? (
                  <DomainOrgsSection country={country} domain={null} />
                ) : (
                  topDomains.map((domain) => <DomainOrgsSection key={domain} country={country} domain={domain} />)
                )}
              </motion.div>
            )}

            {/* Mobile: Quick Actions */}
            <div className="md:hidden">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t.dashboard.quickActions}</h3>
              <div className="grid grid-cols-3 gap-2">
                <Link href="/organizations">
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
                    {t.dashboard.subscribePrompt.replace("{count}", availableCount)}
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
                <Link href="/organizations">
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
                  <p className="text-2xl font-bold">{needs.length}</p>
                  <p className="text-xs text-primary-foreground/70">{t.dashboard.yourNeeds}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{availableCount}</p>
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
