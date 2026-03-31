/*
 * Privacy Policy Page
 * Mobile: compact spacing, readable prose, no footer
 * Desktop: centered max-w-3xl layout
 */

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import SEO from "@/components/SEO";

export default function Privacy() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col bg-card">
      <SEO
        title="Privacy Policy"
        description="GrantKit Privacy Policy. Learn how we collect, use, and protect your personal information."
        canonicalPath="/privacy"
      />
      <Navbar />

      <main className="flex-1 py-6 md:py-16 pb-24 md:pb-16">
        <div className="container px-4 md:px-0 max-w-3xl">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground active:text-primary md:hover:text-primary transition-colors mb-4 md:mb-8">
            <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
            {t.legal?.backToHome || "Back to Home"}
          </Link>

          <h1 className="text-xl md:text-4xl font-bold text-foreground tracking-tight mb-1 md:mb-2">
            {t.legal?.privacyTitle || "Privacy Policy"}
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground/60 mb-6 md:mb-10">
            {t.legal?.lastUpdated || "Last updated"}: March 30, 2026
          </p>

          <div className="prose prose-sm md:prose-base prose-gray max-w-none prose-headings:text-foreground prose-headings:tracking-tight prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-headings:text-base md:prose-headings:text-xl prose-p:text-sm md:prose-p:text-base prose-li:text-sm md:prose-li:text-base">
            <h2>{t.legal?.privacyIntroTitle || "Introduction"}</h2>
            <p>{t.legal?.privacyIntroText || "GrantKit (\"we\", \"our\", or \"us\") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services."}</p>

            <h2>{t.legal?.privacyCollectTitle || "Information We Collect"}</h2>
            <p>{t.legal?.privacyCollectText || "We collect information that you provide directly to us when you:"}</p>
            <ul>
              <li>{t.legal?.privacyCollect1 || "Create an account or sign in through our authentication provider"}</li>
              <li>{t.legal?.privacyCollect2 || "Subscribe to our service through Paddle (our payment processor)"}</li>
              <li>{t.legal?.privacyCollect3 || "Contact us via email or other communication channels"}</li>
              <li>{t.legal?.privacyCollect4 || "Browse and interact with our website"}</li>
            </ul>
            <p>{t.legal?.privacyCollectDetails || "This may include your name, email address, payment information (processed securely by Paddle), and usage data such as pages visited and features used."}</p>

            <h2>{t.legal?.privacyUseTitle || "How We Use Your Information"}</h2>
            <p>{t.legal?.privacyUseText || "We use the information we collect to:"}</p>
            <ul>
              <li>{t.legal?.privacyUse1 || "Provide, maintain, and improve our services"}</li>
              <li>{t.legal?.privacyUse2 || "Process your subscription and manage your account"}</li>
              <li>{t.legal?.privacyUse3 || "Send you service-related communications"}</li>
              <li>{t.legal?.privacyUse4 || "Respond to your inquiries and provide customer support"}</li>
              <li>{t.legal?.privacyUse5 || "Monitor and analyze usage patterns to improve user experience"}</li>
            </ul>

            <h2>{t.legal?.privacyPaymentTitle || "Payment Processing"}</h2>
            <p>{t.legal?.privacyPaymentText || "All payment transactions are processed through Paddle (paddle.com), our Merchant of Record. Paddle handles all payment data in accordance with PCI-DSS requirements. We do not store your credit card details or financial information on our servers. For more information about Paddle's privacy practices, please visit Paddle's privacy policy at paddle.com/legal/privacy."}</p>

            <h2>{t.legal?.privacyCookiesTitle || "Cookies and Tracking"}</h2>
            <p>{t.legal?.privacyCookiesText || "We use essential cookies to maintain your session and authentication state. We may also use analytics cookies to understand how visitors interact with our website. You can control cookie preferences through your browser settings."}</p>

            <h2>{t.legal?.privacyShareTitle || "Data Sharing"}</h2>
            <p>{t.legal?.privacyShareText || "We do not sell your personal information. We may share your information only with: Paddle (for payment processing), authentication service providers (for account management), and as required by law or to protect our legal rights."}</p>

            <h2>{t.legal?.privacySecurityTitle || "Data Security"}</h2>
            <p>{t.legal?.privacySecurityText || "We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure."}</p>

            <h2>{t.legal?.privacyRetentionTitle || "Data Retention"}</h2>
            <p>{t.legal?.privacyRetentionText || "We retain your personal information for as long as your account is active or as needed to provide you services. You may request deletion of your account and associated data by contacting us at hello@grantkit.co."}</p>

            <h2>{t.legal?.privacyRightsTitle || "Your Rights"}</h2>
            <p>{t.legal?.privacyRightsText || "Depending on your location, you may have the right to:"}</p>
            <ul>
              <li>{t.legal?.privacyRights1 || "Access the personal data we hold about you"}</li>
              <li>{t.legal?.privacyRights2 || "Request correction of inaccurate data"}</li>
              <li>{t.legal?.privacyRights3 || "Request deletion of your data"}</li>
              <li>{t.legal?.privacyRights4 || "Object to or restrict processing of your data"}</li>
              <li>{t.legal?.privacyRights5 || "Data portability"}</li>
            </ul>

            <h2>{t.legal?.privacyChangesTitle || "Changes to This Policy"}</h2>
            <p>{t.legal?.privacyChangesText || "We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the \"Last updated\" date."}</p>

            <h2>{t.legal?.privacyContactTitle || "Contact Us"}</h2>
            <p>
              {t.legal?.privacyContactText || "If you have questions about this Privacy Policy, please contact us at:"}{" "}
              <a href="mailto:hello@grantkit.co">hello@grantkit.co</a>
            </p>
          </div>
        </div>
      </main>

      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
