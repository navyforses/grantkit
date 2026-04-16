/*
 * MobileHeader — Compact top header for mobile devices
 * Replaces the full Navbar on screens < 768px.
 * Shows logo, language switcher, and hamburger menu.
 */

import { Link, useLocation } from "wouter";
import { Menu, X, LogIn, LogOut, Shield, Globe, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { getLoginUrl } from "@/const";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import PricingCTA from "./PricingCTA";
import { trpc } from "@/lib/trpc";

export default function MobileHeader() {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useLanguage();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const { data: subStatus } = trpc.subscription.status.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    window.location.href = "/";
  };

  return (
    <>
      {/* Compact header bar */}
      <header className="md:hidden bg-background/95 backdrop-blur-lg border-b border-border sticky top-0 z-40 theme-transition">
        <div className="flex items-center justify-between h-14 px-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">G</span>
            </div>
            <span className="font-bold text-base text-foreground tracking-tight">
              Grant<span className="text-brand-green">Kit</span>
            </span>
          </Link>

          {/* Right side: language + menu */}
          <div className="flex items-center gap-2">
            <ThemeToggle size="sm" />
            <LanguageSwitcher />
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground active:bg-secondary transition-colors"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Full-screen overlay menu */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 top-14 z-30 bg-background animate-in fade-in slide-in-from-top-2 duration-200 theme-transition">
          <div className="flex flex-col h-full overflow-y-auto pb-20">
            {/* User section */}
            {isAuthenticated && user && (
              <div className="px-5 py-4 bg-secondary border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                    <span className="text-foreground font-semibold text-sm">
                      {(user.name || user.email || "U").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {user.name || t.nav.user}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Menu items */}
            <div className="flex-1 px-2 py-3">
              {/* Subscribe CTA if not subscribed */}
              {isAuthenticated && !subStatus?.isActive && (
                <div className="px-3 py-3 mb-2">
                  <PricingCTA text={t.nav.subscribe} size="default" className="w-full" />
                </div>
              )}
              {!isAuthenticated && (
                <div className="px-3 py-3 mb-2">
                  <PricingCTA text={t.nav.subscribe} size="default" className="w-full" />
                </div>
              )}

              {/* Legal links */}
              <div className="mt-4 pt-4 border-t border-border">
                <p className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t.nav.legal}
                </p>
                <Link
                  href="/contact"
                  className="flex items-center justify-between px-4 py-3 rounded-xl text-sm text-muted-foreground active:bg-secondary"
                >
                  <span>{t.footer.contact}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                </Link>
                <Link
                  href="/privacy"
                  className="flex items-center justify-between px-4 py-3 rounded-xl text-sm text-muted-foreground active:bg-secondary"
                >
                  <span>{t.legal.privacyTitle}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                </Link>
                <Link
                  href="/terms"
                  className="flex items-center justify-between px-4 py-3 rounded-xl text-sm text-muted-foreground active:bg-secondary"
                >
                  <span>{t.legal.termsTitle}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                </Link>
                <Link
                  href="/refund"
                  className="flex items-center justify-between px-4 py-3 rounded-xl text-sm text-muted-foreground active:bg-secondary"
                >
                  <span>{t.legal?.refundTitle || "Refund Policy"}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                </Link>
              </div>

              {/* Auth actions */}
              <div className="mt-4 pt-4 border-t border-border px-2">
                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm text-destructive active:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">{t.nav.logout}</span>
                  </button>
                ) : (
                  <a
                    href={getLoginUrl()}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm text-foreground active:bg-secondary transition-colors"
                  >
                    <LogIn className="w-5 h-5" />
                    <span className="font-medium">{t.nav.login}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
