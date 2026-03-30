/*
 * Footer Component
 * Design: Structured Clarity — simple, clean footer with essential links
 */

import { useLanguage } from "@/contexts/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-[#0f172a] text-gray-400">
      <div className="container py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">G</span>
            </div>
            <span className="font-bold text-white tracking-tight">
              Grant<span className="text-blue-400">Kit</span>
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm">
            <a href="mailto:hello@grantkit.co" className="hover:text-white transition-colors">
              {t.footer.contact}
            </a>
            <span className="text-gray-600">|</span>
            <a href="/privacy" className="hover:text-white transition-colors">
              {t.legal.privacyTitle}
            </a>
            <span className="text-gray-600">|</span>
            <a href="/terms" className="hover:text-white transition-colors">
              {t.legal.termsTitle}
            </a>
            <span className="text-gray-600">|</span>
            <span className="text-gray-500 text-xs">
              {t.footer.paddle}
            </span>
          </div>

          {/* Copyright */}
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} GrantKit. {t.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
