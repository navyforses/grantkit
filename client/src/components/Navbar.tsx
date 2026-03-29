/*
 * Navbar Component
 * Design: Structured Clarity — clean top navigation with logo and CTA
 */

import { Link, useLocation } from "wouter";
import PricingCTA from "./PricingCTA";

export default function Navbar() {
  const [location] = useLocation();

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
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className={`text-sm font-medium transition-colors ${
              location === "/" ? "text-[#1e3a5f]" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Home
          </Link>
          <Link
            href="/grants"
            className={`text-sm font-medium transition-colors ${
              location === "/grants" ? "text-[#1e3a5f]" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Grants Directory
          </Link>
          <div className="hidden sm:block">
            <PricingCTA text="Subscribe" size="default" />
          </div>
        </div>
      </div>
    </nav>
  );
}
