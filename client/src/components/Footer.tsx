/*
 * Footer Component
 * Design: Structured Clarity — simple, clean footer with essential links
 */

import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-card border-t border-border text-muted-foreground theme-transition">
      <div className="container py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">G</span>
            </div>
            <span className="font-bold text-foreground tracking-tight">
              Grant<span className="text-brand-green">Kit</span>
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm flex-wrap justify-center">
            <Link href="/contact" className="hover:text-foreground dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
              {t.footer.contact}
            </Link>
            <span className="text-border">|</span>
            <Link href="/privacy" className="hover:text-foreground dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
              {t.legal.privacyTitle}
            </Link>
            <span className="text-border">|</span>
            <Link href="/terms" className="hover:text-foreground dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
              {t.legal.termsTitle}
            </Link>
            <span className="text-border">|</span>
            <Link href="/refund" className="hover:text-foreground dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
              {t.legal?.refundTitle || "Refund Policy"}
            </Link>
            <span className="text-border">|</span>
            <span className="text-muted-foreground/60 dark:text-gray-500 text-xs">
              {t.footer.paddle}
            </span>
          </div>

          {/* Copyright */}
          <p className="text-sm text-muted-foreground/60 dark:text-gray-500">
            &copy; {new Date().getFullYear()} GrantKit. {t.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
