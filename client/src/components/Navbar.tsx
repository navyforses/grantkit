/*
 * Navbar Component
 * Design: Structured Clarity — clean top navigation with logo, language switcher, auth, and CTA
 * Hidden on mobile (< 768px) — MobileHeader + MobileBottomNav are used instead
 */

import { Link, useLocation } from "wouter";
import PricingCTA from "./PricingCTA";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { LayoutDashboard, LogIn, LogOut, User, Shield } from "lucide-react";
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
    <nav className="hidden md:block bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-30">
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
                  {/* Dashboard link */}
                  <Link
                    href="/dashboard"
                    className={`inline-flex items-center gap-1 text-sm font-medium transition-colors ${
                      location === "/dashboard" ? "text-[#1e3a5f]" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </Link>

                  {/* Show subscribe button only if not active subscriber */}
                  {!subStatus?.isActive && (
                    <PricingCTA text={t.nav.subscribe} size="default" />
                  )}
                  {/* Admin link */}
                  {user?.role === "admin" && (
                    <Link
                      href="/admin"
                      className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>Admin</span>
                    </Link>
                  )}
                  {/* User info + logout */}
                  <div className="flex items-center gap-2">
                    <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                      <div className="w-8 h-8 bg-[#1e3a5f]/10 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-[#1e3a5f]" />
                      </div>
                      <span className="text-sm text-gray-600 max-w-[120px] truncate">
                        {user?.name || user?.email || "User"}
                      </span>
                    </Link>
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
                    <span>Login</span>
                  </a>
                  <PricingCTA text={t.nav.subscribe} size="default" />
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
