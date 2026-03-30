/*
 * Navbar Component
 * Design: Structured Clarity — clean top navigation with logo, language switcher, auth, and CTA
 */

import { Link, useLocation } from "wouter";
import PricingCTA from "./PricingCTA";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { LogIn, LogOut, User } from "lucide-react";
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
    <nav className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-30">
      <div className="container flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">G</span>
          </div>
          <span className="font-bold text-lg text-[#0f172a] tracking-tight">
            Grant<span className="text-[#1e3a5f]">Kit</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-3 sm:gap-5">
          <Link
            href="/"
            className={`text-sm font-medium transition-colors ${
              location === "/" ? "text-[#1e3a5f]" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.nav.home}
          </Link>
          <Link
            href="/catalog"
            className={`text-sm font-medium transition-colors ${
              location === "/catalog" ? "text-[#1e3a5f]" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.nav.catalog}
          </Link>

          {/* Auth-aware CTA / User menu */}
          {!loading && (
            <>
              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  {/* Show subscribe button only if not active subscriber */}
                  {!subStatus?.isActive && (
                    <div className="hidden sm:block">
                      <PricingCTA text={t.nav.subscribe} size="default" />
                    </div>
                  )}
                  {/* User info + logout */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#1e3a5f]/10 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-[#1e3a5f]" />
                    </div>
                    <span className="hidden md:inline text-sm text-gray-600 max-w-[120px] truncate">
                      {user?.name || user?.email || "User"}
                    </span>
                    <button
                      onClick={handleLogout}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      title="Logout"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <a
                    href={getLoginUrl()}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1e3a5f] hover:text-[#0f172a] transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    <span className="hidden sm:inline">Login</span>
                  </a>
                  <div className="hidden sm:block">
                    <PricingCTA text={t.nav.subscribe} size="default" />
                  </div>
                </div>
              )}
            </>
          )}

          <LanguageSwitcher />
        </div>
      </div>
    </nav>
  );
}
