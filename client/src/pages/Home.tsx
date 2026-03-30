/*
 * Landing Page — GrantKit
 * Design: Structured Clarity — data-driven, Scandinavian minimalism
 * Sections: Hero, How It Works, Problem, What You Get, Preview, Testimonials, Pricing, FAQ, Newsletter, CTA, Footer
 */

import { motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  Check,
  Clock,
  Globe,
  HelpCircle,
  Lock,
  Mail,
  Search,
  Shield,
  Star,
  UserPlus,
  Zap,
} from "lucide-react";
import { useState } from "react";
import Footer from "@/components/Footer";
import CatalogCard from "@/components/CatalogCard";
import Navbar from "@/components/Navbar";
import PricingCTA from "@/components/PricingCTA";
import catalogData from "@/data/catalog.json";
import { type CatalogItem } from "@/lib/constants";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

// Show first 5 items from different categories for variety
const allItems = catalogData as CatalogItem[];
const previewItems = (() => {
  const seen = new Set<string>();
  const result: CatalogItem[] = [];
  for (const item of allItems) {
    if (!seen.has(item.category)) {
      result.push(item);
      seen.add(item.category);
    }
    if (result.length >= 5) break;
  }
  if (result.length < 5) {
    for (const item of allItems) {
      if (!result.includes(item)) {
        result.push(item);
        if (result.length >= 5) break;
      }
    }
  }
  return result;
})();

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5, ease: "easeOut" as const },
};

const stagger = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

export default function Home() {
  let { user, loading, error, isAuthenticated, logout } = useAuth();

  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [pricingPlan, setPricingPlan] = useState<"monthly" | "annual">("monthly");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const { t } = useLanguage();

  const newsletterMutation = trpc.newsletter.subscribe.useMutation({
    onSuccess: () => {
      setNewsletterStatus("success");
      setNewsletterEmail("");
    },
    onError: () => {
      setNewsletterStatus("error");
    },
  });

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || newsletterStatus === "loading") return;
    setNewsletterStatus("loading");
    newsletterMutation.mutate({ email: newsletterEmail });
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      {/* ===== HERO SECTION ===== */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(https://d2xsxph8kpxj0f.cloudfront.net/310519663102724389/ne96tB4yURpkfMNLLJuy9T/hero-bg-gHR255Ajhp8t6NjNb5USUg.webp)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a]/90 via-[#1e3a5f]/85 to-[#0f172a]/90" />
        <div className="relative container py-20 md:py-28 lg:py-32">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <span className="inline-flex items-center gap-2 text-sm font-medium text-blue-300 bg-blue-500/10 border border-blue-400/20 rounded-full px-4 py-1.5 mb-6">
                <Globe className="w-3.5 h-3.5" />
                {t.hero.badge}
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-[56px] font-bold text-white leading-[1.1] tracking-tight mb-5">
                {t.hero.title}
                <span className="text-[#22c55e]">{t.hero.titleAccent}</span>
              </h1>
              <p className="text-lg md:text-xl text-blue-100/80 leading-relaxed mb-8 max-w-2xl">
                {t.hero.subtitle}
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <PricingCTA text={t.hero.cta} size="large" />
                <a
                  href="/catalog"
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-200 hover:text-white transition-colors"
                >
                  {t.hero.seeCatalog}
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {[
              { icon: Globe, label: t.hero.statCountriesLabel, value: t.hero.statCountries },
              { icon: Shield, label: t.hero.statMedicalLabel, value: t.hero.statMedical },
              { icon: Zap, label: t.hero.statFinancialLabel, value: t.hero.statFinancial },
              { icon: Calendar, label: t.hero.statUpdatedLabel, value: t.hero.statUpdated },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-5 py-4"
              >
                <stat.icon className="w-5 h-5 text-[#22c55e] mb-2" />
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-blue-200/60">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== HOW IT WORKS SECTION ===== */}
      <section className="py-20 bg-white">
        <div className="container">
          <motion.div {...fadeInUp} className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0f172a] tracking-tight mb-4">
              {t.howItWorks.title}
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              {t.howItWorks.subtitle}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                icon: UserPlus,
                step: "01",
                title: t.howItWorks.step1Title,
                desc: t.howItWorks.step1Desc,
                color: "bg-blue-50 text-blue-600",
              },
              {
                icon: Shield,
                step: "02",
                title: t.howItWorks.step2Title,
                desc: t.howItWorks.step2Desc,
                color: "bg-green-50 text-green-600",
              },
              {
                icon: Search,
                step: "03",
                title: t.howItWorks.step3Title,
                desc: t.howItWorks.step3Desc,
                color: "bg-purple-50 text-purple-600",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                {...stagger}
                transition={{ duration: 0.4, delay: i * 0.15 }}
                className="relative text-center"
              >
                {/* Connector line */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-[80%] border-t-2 border-dashed border-gray-200" />
                )}
                <div className={`w-16 h-16 ${item.color} rounded-2xl flex items-center justify-center mx-auto mb-5`}>
                  <item.icon className="w-7 h-7" />
                </div>
                <span className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-2 block">
                  {item.step}
                </span>
                <h3 className="text-lg font-semibold text-[#0f172a] mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PROBLEM SECTION ===== */}
      <section className="py-20 bg-gray-50/50">
        <div className="container">
          <motion.div {...fadeInUp} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0f172a] tracking-tight mb-4">
              {t.problem.title}
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              {t.problem.subtitle}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { icon: Search, title: t.problem.pain1Title, desc: t.problem.pain1Desc },
              { icon: Globe, title: t.problem.pain2Title, desc: t.problem.pain2Desc },
              { icon: Clock, title: t.problem.pain3Title, desc: t.problem.pain3Desc },
            ].map((pain, i) => (
              <motion.div
                key={i}
                {...stagger}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="bg-white border border-gray-200/80 rounded-xl p-6 hover:shadow-sm transition-shadow"
              >
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center mb-4">
                  <pain.icon className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="font-semibold text-[#0f172a] mb-2">{pain.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{pain.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== WHAT YOU GET SECTION ===== */}
      <section className="py-20">
        <div className="container">
          <motion.div {...fadeInUp} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0f172a] tracking-tight mb-4">
              {t.whatYouGet.title}
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              {t.whatYouGet.subtitle}
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5 max-w-6xl mx-auto">
            {[
              { icon: "🏥", title: t.whatYouGet.cat1Title, desc: t.whatYouGet.cat1Desc },
              { icon: "♿", title: t.whatYouGet.cat2Title, desc: t.whatYouGet.cat2Desc },
              { icon: "💰", title: t.whatYouGet.cat3Title, desc: t.whatYouGet.cat3Desc },
              { icon: "🤝", title: t.whatYouGet.cat4Title, desc: t.whatYouGet.cat4Desc },
              { icon: "🎓", title: t.whatYouGet.cat5Title, desc: t.whatYouGet.cat5Desc },
            ].map((item, i) => (
              <motion.div
                key={i}
                {...stagger}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="text-center p-6 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
              >
                <span className="text-3xl mb-3 block">{item.icon}</span>
                <h3 className="font-semibold text-[#0f172a] mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeInUp} className="mt-12 max-w-3xl mx-auto">
            <div className="bg-[#f0fdf4] border border-green-200/60 rounded-xl p-6">
              <h3 className="font-semibold text-[#0f172a] mb-3">{t.whatYouGet.includesTitle}</h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {t.whatYouGet.includes.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-gray-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== PREVIEW SECTION ===== */}
      <section id="preview" className="py-20 bg-gray-50/50">
        <div className="container">
          <motion.div {...fadeInUp} className="text-center mb-10">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#22c55e] uppercase tracking-wider mb-3">
              {t.preview.badge}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-[#0f172a] tracking-tight mb-4">
              {t.preview.title}
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              {t.preview.subtitle}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {previewItems.map((item, i) => (
              <CatalogCard key={item.id} item={item} index={i} />
            ))}
          </div>

          {/* Blurred/locked section */}
          <div className="relative mt-6 max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 blur-sm opacity-50 pointer-events-none select-none">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-5 h-48" />
              ))}
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl px-8 py-6 text-center shadow-lg">
                <Lock className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                <p className="font-semibold text-[#0f172a] mb-1">{t.preview.lockedTitle}</p>
                <p className="text-sm text-gray-500 mb-4">{t.preview.lockedSubtitle}</p>
                <PricingCTA text={t.preview.unlockCta} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS SECTION ===== */}
      <section className="py-20 bg-white">
        <div className="container">
          <motion.div {...fadeInUp} className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0f172a] tracking-tight mb-4">
              {t.testimonials.title}
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              {t.testimonials.subtitle}
            </p>
          </motion.div>

          {/* Stats bar */}
          <motion.div {...fadeInUp} className="flex flex-wrap justify-center gap-8 md:gap-16 mb-14">
            {[
              { value: t.testimonials.statUsers, label: t.testimonials.statUsersLabel },
              { value: t.testimonials.statGrants, label: t.testimonials.statGrantsLabel },
              { value: t.testimonials.statCountries, label: t.testimonials.statCountriesLabel },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-[#0f172a]">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Testimonial cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {t.testimonials.items.map((item, i) => (
              <motion.div
                key={i}
                {...stagger}
                transition={{ duration: 0.4, delay: i * 0.12 }}
                className="bg-gray-50 border border-gray-100 rounded-xl p-6"
              >
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-5 italic">
                  "{item.text}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white font-semibold text-sm">
                    {item.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-[#0f172a] text-sm">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING SECTION ===== */}
      <section id="pricing" className="py-20 bg-gray-50/50">
        <div className="container">
          <motion.div {...fadeInUp} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0f172a] tracking-tight mb-4">
              {t.pricing.title}
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              {t.pricing.subtitle}
            </p>
          </motion.div>

          {/* Plan toggle */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <button
              onClick={() => setPricingPlan("monthly")}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                pricingPlan === "monthly"
                  ? "bg-[#0f172a] text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
              }`}
            >
              {t.pricing.monthly}
            </button>
            <button
              onClick={() => setPricingPlan("annual")}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                pricingPlan === "annual"
                  ? "bg-[#0f172a] text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
              }`}
            >
              {t.pricing.annual}
              <span className="text-xs bg-[#22c55e] text-white px-2 py-0.5 rounded-full font-semibold">
                {t.pricing.annualSave}
              </span>
            </button>
          </div>

          {/* Pricing card */}
          <motion.div {...fadeInUp} className="max-w-md mx-auto">
            <div className="bg-white border-2 border-[#0f172a] rounded-2xl p-8 shadow-lg">
              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-bold text-[#0f172a]">
                    {pricingPlan === "monthly" ? t.pricing.monthlyPrice : t.pricing.annualPrice}
                  </span>
                  <span className="text-gray-500 text-lg">
                    {pricingPlan === "monthly" ? t.pricing.perMonth : t.pricing.perYear}
                  </span>
                </div>
                {pricingPlan === "annual" && (
                  <p className="text-sm text-[#22c55e] font-medium mt-2">
                    {t.pricing.annualMonthlyPrice}{t.pricing.perMonth}
                  </p>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {t.pricing.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                    <Check className="w-5 h-5 text-[#22c55e] shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>

              <PricingCTA
                text={t.pricing.cta}
                size="large"
                className="w-full justify-center"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== FAQ SECTION ===== */}
      <section className="py-20">
        <div className="container">
          <motion.div {...fadeInUp} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0f172a] tracking-tight mb-4">
              {t.faq.title}
            </h2>
          </motion.div>

          <div className="max-w-2xl mx-auto space-y-3">
            {t.faq.items.map((faq, i) => (
              <motion.div
                key={i}
                {...stagger}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="border border-gray-200 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-[#0f172a] pr-4">{faq.q}</span>
                  <HelpCircle
                    className={`w-5 h-5 shrink-0 text-gray-400 transition-transform duration-200 ${
                      openFaq === i ? "rotate-180 text-[#1e3a5f]" : ""
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    openFaq === i ? "max-h-40" : "max-h-0"
                  }`}
                >
                  <p className="px-6 pb-4 text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== NEWSLETTER SECTION ===== */}
      <section className="py-16 bg-[#f0fdf4]">
        <div className="container">
          <motion.div {...fadeInUp} className="max-w-xl mx-auto text-center">
            <Mail className="w-10 h-10 text-[#22c55e] mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-bold text-[#0f172a] tracking-tight mb-3">
              {t.newsletter.title}
            </h2>
            <p className="text-gray-500 mb-6">
              {t.newsletter.subtitle}
            </p>

            {newsletterStatus === "success" ? (
              <div className="bg-white border border-green-200 rounded-xl px-6 py-4">
                <Check className="w-6 h-6 text-[#22c55e] mx-auto mb-2" />
                <p className="text-sm text-gray-700 font-medium">{t.newsletter.success}</p>
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="flex gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder={t.newsletter.placeholder}
                  required
                  className="flex-1 px-4 py-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]/30 focus:border-[#22c55e]"
                />
                <button
                  type="submit"
                  disabled={newsletterStatus === "loading"}
                  className="px-6 py-3 bg-[#22c55e] text-white rounded-lg text-sm font-semibold hover:bg-[#16a34a] transition-colors disabled:opacity-60"
                >
                  {newsletterStatus === "loading" ? "..." : t.newsletter.cta}
                </button>
              </form>
            )}
            {newsletterStatus === "error" && (
              <p className="text-sm text-red-500 mt-3">{t.newsletter.error}</p>
            )}
          </motion.div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="py-20 bg-[#0f172a]">
        <div className="container text-center">
          <motion.div {...fadeInUp}>
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
              {t.finalCta.title}
            </h2>
            <p className="text-blue-200/70 max-w-lg mx-auto mb-8">
              {t.finalCta.subtitle}
            </p>
            <PricingCTA text={t.finalCta.cta} size="large" />
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
