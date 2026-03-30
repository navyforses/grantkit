/*
 * Navbar Component
 * Design: Structured Clarity — clean top navigation with logo, language switcher, and CTA
 */

import { Link, useLocation } from "wouter";
import PricingCTA from "./PricingCTA";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Navbar() {
  const [location] = useLocation();
  const { t } = useLanguage();

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
          <div className="hidden sm:block">
            <PricingCTA text={t.nav.subscribe} size="default" />
          </div>
          <LanguageSwitcher />
        </div>
      </div>
    </nav>
  );
}
