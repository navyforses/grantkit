/*
 * Refund Policy Page
 * Professional legal page for Paddle verification
 */

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import SEO from "@/components/SEO";

export default function Refund() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <SEO
        title="Refund Policy"
        description="GrantKit Refund Policy. Learn about our refund eligibility, process, and timeline."
        canonicalPath="/refund"
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
            {t.legal?.refundTitle || "Refund Policy"}
          </h1>
          <p className="text-sm text-gray-400 mb-10">
            {t.legal?.lastUpdated || "Last updated"}: March 30, 2026
          </p>

          <div className="prose prose-gray max-w-none prose-headings:text-[#0f172a] prose-headings:tracking-tight prose-p:text-gray-600 prose-p:leading-relaxed prose-li:text-gray-600 prose-a:text-[#1e3a5f] prose-a:no-underline hover:prose-a:underline">
            <h2>{t.legal?.refundOverviewTitle || "Overview"}</h2>
            <p>
              {t.legal?.refundOverviewText || "At GrantKit, we want you to be completely satisfied with your subscription. This Refund Policy outlines the terms and conditions under which refunds may be issued for our subscription service."}
            </p>

            <h2>{t.legal?.refundMerchantTitle || "Merchant of Record"}</h2>
            <p>
              {t.legal?.refundMerchantText || "All payments for GrantKit are processed by Paddle (paddle.com), our Merchant of Record. Paddle handles all billing, payment processing, and refund transactions on our behalf. As such, refund requests are subject to both our policy and Paddle's terms of service."}
            </p>

            <h2>{t.legal?.refundEligibilityTitle || "Refund Eligibility"}</h2>
            <p>{t.legal?.refundEligibilityText || "You may be eligible for a refund under the following circumstances:"}</p>
            <ul>
              <li>{t.legal?.refundEligibility1 || "You request a refund within 14 days of your initial subscription purchase"}</li>
              <li>{t.legal?.refundEligibility2 || "You experience a technical issue that prevents you from accessing the service, and we are unable to resolve it within a reasonable timeframe"}</li>
              <li>{t.legal?.refundEligibility3 || "You were charged incorrectly or experienced an unauthorized transaction"}</li>
            </ul>

            <h2>{t.legal?.refundNotEligibleTitle || "Non-Refundable Situations"}</h2>
            <p>{t.legal?.refundNotEligibleText || "Refunds will generally not be issued in the following cases:"}</p>
            <ul>
              <li>{t.legal?.refundNotEligible1 || "The refund request is made more than 14 days after the initial purchase"}</li>
              <li>{t.legal?.refundNotEligible2 || "You have substantially used the service during the billing period"}</li>
              <li>{t.legal?.refundNotEligible3 || "You simply changed your mind about the subscription after the 14-day period"}</li>
              <li>{t.legal?.refundNotEligible4 || "Your account was terminated due to violation of our Terms of Service"}</li>
            </ul>

            <h2>{t.legal?.refundProcessTitle || "How to Request a Refund"}</h2>
            <p>{t.legal?.refundProcessText || "To request a refund, please follow these steps:"}</p>
            <ol>
              <li>{t.legal?.refundProcess1 || "Send an email to hello@grantkit.co with the subject line \"Refund Request\""}</li>
              <li>{t.legal?.refundProcess2 || "Include your account email address and the reason for your refund request"}</li>
              <li>{t.legal?.refundProcess3 || "Our team will review your request and respond within 3-5 business days"}</li>
            </ol>

            <h2>{t.legal?.refundTimelineTitle || "Refund Processing Time"}</h2>
            <p>
              {t.legal?.refundTimelineText || "Once a refund is approved, it will be processed through Paddle. The refund will typically appear on your original payment method within 5-10 business days, depending on your bank or payment provider. Paddle will send you a confirmation email once the refund has been initiated."}
            </p>

            <h2>{t.legal?.refundCancellationTitle || "Subscription Cancellation"}</h2>
            <p>
              {t.legal?.refundCancellationText || "You may cancel your subscription at any time through your account profile page. When you cancel, your subscription will remain active until the end of the current billing period. No partial refunds are provided for unused time within a billing period after the 14-day refund window has passed."}
            </p>

            <h2>{t.legal?.refundChangesTitle || "Changes to This Policy"}</h2>
            <p>
              {t.legal?.refundChangesText || "We reserve the right to modify this Refund Policy at any time. Any changes will be posted on this page with an updated date. Your continued use of the service after changes constitutes acceptance of the modified policy."}
            </p>

            <h2>{t.legal?.refundContactTitle || "Contact Us"}</h2>
            <p>
              {t.legal?.refundContactText || "If you have questions about this Refund Policy or need assistance with a refund, please contact us at:"}{" "}
              <a href="mailto:hello@grantkit.co">hello@grantkit.co</a>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
