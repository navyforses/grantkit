/*
 * Terms of Service Page
 * Professional legal page for Paddle verification
 */

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import SEO from "@/components/SEO";

export default function Terms() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <SEO
        title="Terms of Service"
        description="GrantKit Terms of Service. Read our terms and conditions for using the platform."
        canonicalPath="/terms"
      />
      <Navbar />

      <main className="flex-1 py-16">
        <div className="container max-w-3xl">
          {/* Back link */}
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1e3a5f] transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            {t.legal?.backToHome || "Back to Home"}
          </Link>

          <h1 className="text-3xl md:text-4xl font-bold text-[#0f172a] tracking-tight mb-2">
            {t.legal?.termsTitle || "Terms of Service"}
          </h1>
          <p className="text-sm text-gray-400 mb-10">
            {t.legal?.lastUpdated || "Last updated"}: March 30, 2026
          </p>

          <div className="prose prose-gray max-w-none prose-headings:text-[#0f172a] prose-headings:tracking-tight prose-p:text-gray-600 prose-p:leading-relaxed prose-li:text-gray-600 prose-a:text-[#1e3a5f] prose-a:no-underline hover:prose-a:underline">
            <h2>{t.legal?.termsAcceptTitle || "Acceptance of Terms"}</h2>
            <p>
              {t.legal?.termsAcceptText || "By accessing and using GrantKit (the \"Service\"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Service."}
            </p>

            <h2>{t.legal?.termsDescTitle || "Service Description"}</h2>
            <p>
              {t.legal?.termsDescText || "GrantKit provides a curated database of grants, foundations, and support resources for individuals, families, and caregivers worldwide. Our database is organized by category, country, and eligibility criteria, and is updated on a regular basis."}
            </p>

            <h2>{t.legal?.termsAccountTitle || "Account Registration"}</h2>
            <p>
              {t.legal?.termsAccountText || "To access certain features of our Service, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate and complete information during registration."}
            </p>

            <h2>{t.legal?.termsSubscriptionTitle || "Subscription and Payment"}</h2>
            <p>
              {t.legal?.termsSubscriptionText || "Access to the full GrantKit database requires a paid subscription. Payments are processed by Paddle (paddle.com), our Merchant of Record. By subscribing, you agree to Paddle's terms of service and authorize recurring charges at the stated subscription rate."}
            </p>
            <ul>
              <li>{t.legal?.termsSub1 || "Subscriptions are billed monthly at the current rate ($9/month)"}</li>
              <li>{t.legal?.termsSub2 || "You may cancel your subscription at any time through your account profile"}</li>
              <li>{t.legal?.termsSub3 || "Refund requests are handled in accordance with Paddle's refund policy"}</li>
              <li>{t.legal?.termsSub4 || "We reserve the right to change subscription pricing with prior notice"}</li>
            </ul>

            <h2>{t.legal?.termsUseTitle || "Acceptable Use"}</h2>
            <p>{t.legal?.termsUseText || "When using our Service, you agree not to:"}</p>
            <ul>
              <li>{t.legal?.termsUse1 || "Copy, redistribute, or resell the database content without authorization"}</li>
              <li>{t.legal?.termsUse2 || "Use automated tools to scrape or bulk-download data from the Service"}</li>
              <li>{t.legal?.termsUse3 || "Share your account credentials with third parties"}</li>
              <li>{t.legal?.termsUse4 || "Use the Service for any unlawful purpose"}</li>
              <li>{t.legal?.termsUse5 || "Attempt to interfere with or disrupt the Service's infrastructure"}</li>
            </ul>

            <h2>{t.legal?.termsIPTitle || "Intellectual Property"}</h2>
            <p>
              {t.legal?.termsIPText || "All content on GrantKit, including but not limited to the database, text, graphics, logos, and software, is the property of GrantKit or its licensors and is protected by intellectual property laws. Your subscription grants you a personal, non-transferable license to access and use the content for personal, non-commercial purposes."}
            </p>

            <h2>{t.legal?.termsDisclaimerTitle || "Disclaimer"}</h2>
            <p>
              {t.legal?.termsDisclaimerText || "The information provided through GrantKit is for informational purposes only. While we strive to keep our database accurate and up-to-date, we make no warranties or representations about the completeness, accuracy, or reliability of the information. Grant availability, eligibility criteria, and deadlines may change without notice. We recommend verifying all information directly with the grant provider before applying."}
            </p>

            <h2>{t.legal?.termsLiabilityTitle || "Limitation of Liability"}</h2>
            <p>
              {t.legal?.termsLiabilityText || "To the maximum extent permitted by law, GrantKit shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Our total liability shall not exceed the amount you paid for the Service in the twelve months preceding the claim."}
            </p>

            <h2>{t.legal?.termsTerminationTitle || "Termination"}</h2>
            <p>
              {t.legal?.termsTerminationText || "We reserve the right to suspend or terminate your account if you violate these Terms of Service. Upon termination, your right to access the Service will immediately cease. You may also terminate your account at any time by cancelling your subscription and contacting us."}
            </p>

            <h2>{t.legal?.termsChangesTitle || "Changes to Terms"}</h2>
            <p>
              {t.legal?.termsChangesText || "We may modify these Terms of Service at any time. We will notify users of material changes by posting the updated terms on this page. Your continued use of the Service after changes constitutes acceptance of the modified terms."}
            </p>

            <h2>{t.legal?.termsGoverningTitle || "Governing Law"}</h2>
            <p>
              {t.legal?.termsGoverningText || "These Terms of Service shall be governed by and construed in accordance with the laws of Georgia, without regard to its conflict of law provisions."}
            </p>

            <h2>{t.legal?.termsContactTitle || "Contact Us"}</h2>
            <p>
              {t.legal?.termsContactText || "If you have questions about these Terms of Service, please contact us at:"}{" "}
              <a href="mailto:hello@grantkit.co">hello@grantkit.co</a>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
