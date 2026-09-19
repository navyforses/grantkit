/*
 * Privacy Policy Page
 * Mobile: compact spacing, readable prose, no footer
 * Desktop: centered max-w-3xl layout
 * Body text lives in components/PrivacyBody.tsx (testable without providers).
 */

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PrivacyBody from "@/components/PrivacyBody";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import SEO from "@/components/SEO";

export default function Privacy() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col bg-card">
      <SEO
        title={t.seo.privacyTitle}
        description={t.seo.privacyDescription}
        canonicalPath="/privacy"
      />
      <Navbar />

      <main className="flex-1 py-6 md:py-16 pb-24 md:pb-16">
        <div className="container px-4 md:px-0 max-w-3xl">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground active:text-primary md:hover:text-primary transition-colors mb-4 md:mb-8">
            <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
            {t.legal.backToHome}
          </Link>

          <h1 className="text-xl md:text-4xl font-bold text-foreground tracking-tight mb-1 md:mb-2">
            {t.legal.privacyTitle}
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground/60 mb-6 md:mb-10">
            {t.legal.lastUpdated}: 2026-09-19
          </p>

          <PrivacyBody t={t} />
        </div>
      </main>

      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
