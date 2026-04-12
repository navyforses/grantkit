/*
 * Navbar Component
 * Design: Theme-aware top navigation with logo, language switcher, auth, Sun/Moon toggle, and CTA
 * Hidden on mobile (< 768px) — MobileHeader + MobileBottomNav are used instead
 */

import { Link, useLocation } from "wouter";
import PricingCTA from "./PricingCTA";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { LayoutDashboard, LogIn, LogOut, User, Shield, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Navbar() {
  const [location] = useLocation();
  const { t } = useLanguage();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const { data: subStatus } = trpc.subscription.status.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  return (
    <nav className="hidden md:block bg-background/80 backdrop-blur-md shadow-sm sticky top-0 z-30">
      <div className="container flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">G</span>
          </div>
          <span className="font-bold text-lg text-foreground tracking-tight">
            Grant<span className="text-brand-green">Kit</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-3 sm:gap-5">
          <Link
            href="/"
            aria-current={location === "/" ? "page" : undefined}
            className={`relative text-sm transition-colors pb-0.5 ${
              location === "/"
                ? "font-semibold text-foreground after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-brand-green"
                : "font-medium text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.nav.home}
          </Link>
          <Link
            href="/catalog"
            aria-current={location === "/catalog" ? "page" : undefined}
            className={`relative text-sm transition-colors pb-0.5 ${
              location === "/catalog"
                ? "font-semibold text-foreground after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-brand-green"
                : "font-medium text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.nav.catalog}
          </Link>
          <Link
            href="/ai-assistant"
            aria-current={location === "/ai-assistant" ? "page" : undefined}
            className={`relative inline-flex items-center gap-1.5 text-sm transition-colors pb-0.5 ${
              location === "/ai-assistant"
                ? "font-semibold text-foreground after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-brand-green"
                : "font-medium text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Assistant
          </Link>

          {/* Auth-aware CTA / User menu */}
          {!loading && (
            <>
              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  {/* Dashboard link */}
                  <Link
                    href="/dashboard"
                    aria-current={location === "/dashboard" ? "page" : undefined}
                    className={`inline-flex items-center gap-1 text-sm font-medium transition-colors ${
                      location === "/dashboard" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>{t.nav.dashboard}</span>
                  </Link>

                  {/* Show subscribe button only if not active subscriber */}
                  {!subStatus?.isActive && (
                    <PricingCTA text={t.nav.subscribe} size="default" />
                  )}
                  {/* Admin link */}
                  {user?.role === "admin" && (
                    <Link
                      href="/admin"
                      className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 dark:hover:bg-purple-500/20 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>{t.nav.admin}</span>
                    </Link>
                  )}
                  {/* User info + logout */}
                  <div className="flex items-center gap-2">
                    <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                      <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <span className="text-sm text-muted-foreground max-w-[120px] truncate">
                        {user?.name || user?.email || t.nav.user}
                      </span>
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      title={t.nav.logout}
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <a
                    href={getLoginUrl()}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-brand-green transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{t.nav.login}</span>
                  </a>
                  <PricingCTA text={t.nav.subscribe} size="default" />
                </div>
              )}
            </>
          )}

          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </div>
    </nav>
  );
}
