/*
 * Landing Page — GrantKit
 * Design: Structured Clarity — data-driven, Scandinavian minimalism
 * Mobile-first: compact hero, horizontal-scroll cards, large touch targets
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
import { useState, useRef, useEffect } from "react";
import Footer from "@/components/Footer";
import CatalogCard from "@/components/CatalogCard";
import CatalogCardSkeleton from "@/components/CatalogCardSkeleton";
import Navbar from "@/components/Navbar";
import PricingCTA from "@/components/PricingCTA";
import { type CatalogItem } from "@/lib/constants";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import SEO from "@/components/SEO";
import { OrganizationJsonLd, WebSiteJsonLd, FaqJsonLd } from "@/components/JsonLd";
import { trpc } from "@/lib/trpc";
import { useMemo } from "react";

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
  const { t, language } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch diverse preview items from database (one per category)
  const { data: previewData } = trpc.catalog.preview.useQuery(
    undefined,
    { retry: false }
  );
  const { data: countData } = trpc.catalog.count.useQuery(undefined, { retry: false });

  // Always load static preview eagerly (used when API is unavailable)
  const [staticPreview, setStaticPreview] = useState<any[] | null>(null);
  useEffect(() => {
    if (!staticPreview) {
      import("@/data/catalog.json").then((mod) => {
        const all = mod.default || mod;
        // Pick 5 diverse items (one per category)
        const seen = new Set<string>();
        const picks: any[] = [];
        for (const g of all) {
          if (!seen.has(g.category) && picks.length < 5) {
            seen.add(g.category);
            picks.push(g);
          }
        }
        setStaticPreview(picks);
      }).catch(() => {});
    }
  }, []);

  const previewItems: CatalogItem[] = useMemo(() => {
    const source = previewData?.grants || staticPreview;
    if (!source) return [];
    return source.map((g: any) => {
      const trans = (g as any).translations?.[language];
      return {
        id: g.id,
        name: trans?.name || g.name,
        organization: g.organization,
        description: trans?.description || g.description,
        category: g.category,
        type: g.type as "grant" | "resource",
        country: g.country,
        eligibility: trans?.eligibility || g.eligibility,
        website: g.website,
        phone: g.phone,
        email: g.email,
        amount: g.amount,
        status: g.status,
        applicationProcess: g.applicationProcess,
        deadline: g.deadline,
        fundingType: g.fundingType,
        targetDiagnosis: g.targetDiagnosis,
        ageRange: g.ageRange,
        geographicScope: g.geographicScope,
        documentsRequired: g.documentsRequired,
        b2VisaEligible: g.b2VisaEligible,
        state: g.state || "",
        city: g.city || "",
      };
    });
  }, [previewData, staticPreview, language]);

  const totalGrants = countData?.total || 3650;

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
    <div className="min-h-screen flex flex-col bg-background theme-transition">
      <SEO
        title={t.seo.homeTitle}
        description={t.seo.homeDescription}
        canonicalPath="/"
        keywords="grants, medical grants, startup grants, scholarships, financial assistance, funding, research grants"
        noSuffix
      />
      <OrganizationJsonLd />
      <WebSiteJsonLd />
      <FaqJsonLd items={t.faq.items.map(faq => ({ question: faq.q, answer: faq.a }))} />
      <Navbar />

      {/* ===== HERO SECTION ===== */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(https://d2xsxph8kpxj0f.cloudfront.net/310519663102724389/ne96tB4yURpkfMNLLJuy9T/hero-bg-gHR255Ajhp8t6NjNb5USUg.webp)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-hero-bg/90 via-hero-bg/85 to-hero-bg/90" />
        {/* Mobile: tighter padding. Desktop: generous */}
        <div className="relative container py-12 md:py-28 lg:py-32">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <span className="inline-flex items-center gap-2 text-xs md:text-sm font-medium text-brand-green bg-brand-green/10 border border-brand-green/20 rounded-full px-3 py-1 md:px-4 md:py-1.5 mb-4 md:mb-6">
                <Globe className="w-3 h-3 md:w-3.5 md:h-3.5" />
                {t.hero.badge}
              </span>
              {/* Mobile: smaller text. Desktop: large */}
              <h1 className="text-3xl md:text-5xl lg:text-[56px] font-bold text-hero-text leading-[1.1] tracking-tight mb-3 md:mb-5">
                {t.hero.title}
                <span className="text-brand-green">{t.hero.titleAccent}</span>
              </h1>
              <p className="text-base md:text-xl text-hero-muted leading-relaxed mb-6 md:mb-8 max-w-2xl">
                {t.hero.subtitle}
              </p>
              {/* Mobile: full-width CTA stack */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                <PricingCTA text={t.hero.cta} size="large" className="w-full sm:w-auto justify-center" />
                <a
                  href="/catalog"
                  className="inline-flex items-center justify-center gap-2 text-sm font-medium text-hero-muted hover:text-hero-text transition-colors py-3 sm:py-0"
                >
                  {t.hero.seeCatalog}
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
          </div>

          {/* Stats — 2x2 grid on mobile, 4-col on desktop */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="mt-10 md:mt-16 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4"
          >
            {[
              { icon: Globe, label: t.hero.statCountriesLabel, value: t.hero.statCountries },
              { icon: Shield, label: t.hero.statMedicalLabel, value: t.hero.statMedical },
              { icon: Zap, label: t.hero.statFinancialLabel, value: t.hero.statFinancial },
              { icon: Calendar, label: t.hero.statUpdatedLabel, value: t.hero.statUpdated },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-card/60 backdrop-blur-sm border border-border rounded-xl px-4 py-3 md:px-5 md:py-4"
              >
                <stat.icon className="w-4 h-4 md:w-5 md:h-5 text-brand-green mb-1.5 md:mb-2" />
                <p className="text-xl md:text-2xl font-bold text-hero-text">{stat.value}</p>
                <p className="text-xs md:text-sm text-hero-muted/60 leading-tight">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== HOW IT WORKS SECTION ===== */}
      <section className="py-12 md:py-20 bg-background">
        <div className="container">
          <motion.div {...fadeInUp} className="text-center mb-8 md:mb-14">
            <h2 className="text-2xl md:text-4xl font-bold text-foreground tracking-tight mb-3 md:mb-4">
              {t.howItWorks.title}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
              {t.howItWorks.subtitle}
            </p>
          </motion.div>

          {/* Mobile: horizontal scroll. Desktop: grid */}
          <div className="md:grid md:grid-cols-3 md:gap-8 md:max-w-4xl md:mx-auto">
            <div className="flex md:contents gap-4 overflow-x-auto pb-4 md:pb-0 snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
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
                  className="relative text-center flex-shrink-0 w-[75vw] md:w-auto snap-center"
                >
                  {/* Connector line — desktop only */}
                  {i < 2 && (
                    <div className="hidden md:block absolute top-12 left-[60%] w-[80%] border-t-2 border-dashed border-border" />
                  )}
                  <div className={`w-14 h-14 md:w-16 md:h-16 ${item.color} rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-5`}>
                    <item.icon className="w-6 h-6 md:w-7 md:h-7" />
                  </div>
                  <span className="text-xs font-bold text-muted-foreground/40 uppercase tracking-widest mb-2 block">
                    {item.step}
                  </span>
                  <h3 className="text-base md:text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== PROBLEM SECTION ===== */}
      <section className="py-12 md:py-20 bg-secondary">
        <div className="container">
          <motion.div {...fadeInUp} className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-4xl font-bold text-foreground tracking-tight mb-3 md:mb-4">
              {t.problem.title}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
              {t.problem.subtitle}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
            {[
              { icon: Search, title: t.problem.pain1Title, desc: t.problem.pain1Desc },
              { icon: Clock, title: t.problem.pain2Title, desc: t.problem.pain2Desc },
              { icon: Globe, title: t.problem.pain3Title, desc: t.problem.pain3Desc },
            ].map((pain, i) => (
              <motion.div
                key={i}
                {...stagger}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="bg-card border border-border rounded-xl p-5 md:p-6 hover:shadow-sm transition-shadow"
              >
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center mb-3 md:mb-4">
                  <pain.icon className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{pain.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{pain.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== WHAT YOU GET SECTION ===== */}
      <section className="py-12 md:py-20">
        <div className="container">
          <motion.div {...fadeInUp} className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-4xl font-bold text-foreground tracking-tight mb-3 md:mb-4">
              {t.whatYouGet.title}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
              {t.whatYouGet.subtitle}
            </p>
          </motion.div>

          {/* Mobile: horizontal scroll. Desktop: 5-col grid */}
          <div className="lg:grid lg:grid-cols-5 lg:gap-5 lg:max-w-6xl lg:mx-auto">
            <div className="flex lg:contents gap-3 overflow-x-auto pb-4 lg:pb-0 snap-x snap-mandatory -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-hide">
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
                  className="text-center p-5 md:p-6 rounded-xl border border-border hover:border-foreground/20 hover:shadow-sm transition-all flex-shrink-0 w-[60vw] sm:w-[45vw] lg:w-auto snap-center"
                >
                  <span className="text-2xl md:text-3xl mb-2 md:mb-3 block">{item.icon}</span>
                  <h3 className="font-semibold text-foreground mb-1.5 md:mb-2 text-sm md:text-base">{item.title}</h3>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div {...fadeInUp} className="mt-8 md:mt-12 max-w-3xl mx-auto">
            <div className="bg-brand-green/5 border border-green-200/60 rounded-xl p-5 md:p-6">
              <h3 className="font-semibold text-foreground mb-3">{t.whatYouGet.includesTitle}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {t.whatYouGet.includes.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-foreground/80">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-green shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== PREVIEW SECTION ===== */}
      <section id="preview" className="py-12 md:py-20 bg-secondary">
        <div className="container">
          <motion.div {...fadeInUp} className="text-center mb-6 md:mb-10">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-green uppercase tracking-wider mb-2 md:mb-3">
              {t.preview.badge}
            </span>
            <h2 className="text-2xl md:text-4xl font-bold text-foreground tracking-tight mb-3 md:mb-4">
              {t.preview.title}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-lg mx-auto">
              {t.preview.subtitle}
            </p>
          </motion.div>

          {/* Mobile: horizontal scroll cards. Desktop: grid */}
          <div className="md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:max-w-5xl md:mx-auto">
            <div
              ref={scrollRef}
              className="flex md:contents gap-4 overflow-x-auto pb-4 md:pb-0 snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide"
            >
              {previewItems.length === 0
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div key={`skel-${i}`} className="flex-shrink-0 w-[85vw] sm:w-[70vw] md:w-auto snap-center">
                      <CatalogCardSkeleton index={i} />
                    </div>
                  ))
                : previewItems.map((item, i) => (
                    <div key={item.id} className="flex-shrink-0 w-[85vw] sm:w-[70vw] md:w-auto snap-center">
                      <CatalogCard item={item} index={i} />
                    </div>
                  ))
              }
            </div>
          </div>

          {/* Blurred/locked section */}
          <div className="relative mt-6 max-w-5xl mx-auto">
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 blur-sm opacity-50 pointer-events-none select-none">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card border border-border rounded-lg p-5 h-48" />
              ))}
            </div>
            <div className="md:absolute md:inset-0 flex flex-col items-center justify-center mt-4 md:mt-0">
              <div className="bg-card/95 backdrop-blur-sm border border-border rounded-xl px-6 py-5 md:px-8 md:py-6 text-center shadow-lg w-full md:w-auto">
                <Lock className="w-7 h-7 md:w-8 md:h-8 text-muted-foreground/60 mx-auto mb-2 md:mb-3" />
                <p className="font-semibold text-foreground mb-1">{t.preview.lockedTitle}</p>
                <p className="text-sm text-muted-foreground mb-3 md:mb-4">{t.preview.lockedSubtitle}</p>
                <PricingCTA text={t.preview.unlockCta} className="w-full md:w-auto justify-center" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS SECTION ===== */}      <section className="py-12 md:py-20 bg-background">
        <div className="container">
          <motion.div {...fadeInUp} className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-4xl font-bold text-foreground tracking-tight mb-3 md:mb-4">
              {t.testimonials.title}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
              {t.testimonials.subtitle}
            </p>
          </motion.div>

          {/* Stats bar */}
          <motion.div {...fadeInUp} className="flex justify-center gap-6 md:gap-16 mb-8 md:mb-14">
            {[
              { value: t.testimonials.statUsers, label: t.testimonials.statUsersLabel },
              { value: t.testimonials.statGrants, label: t.testimonials.statGrantsLabel },
              { value: t.testimonials.statCountries, label: t.testimonials.statCountriesLabel },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl md:text-4xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1">{stat.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Testimonial cards — horizontal scroll on mobile */}
          <div className="md:grid md:grid-cols-3 md:gap-6 md:max-w-5xl md:mx-auto">
            <div className="flex md:contents gap-4 overflow-x-auto pb-4 md:pb-0 snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
              {t.testimonials.items.map((item, i) => (
                <motion.div
                  key={i}
                  {...stagger}
                  transition={{ duration: 0.4, delay: i * 0.12 }}
                  className="bg-secondary border border-border rounded-xl p-5 md:p-6 flex-shrink-0 w-[80vw] md:w-auto snap-center"
                >
                  <div className="flex gap-1 mb-3 md:mb-4">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-3.5 h-3.5 md:w-4 md:h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4 md:mb-5 italic">
                    "{item.text}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-sm">
                      {item.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.role}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== PRICING SECTION ===== */}
      <section id="pricing" className="py-12 md:py-20 bg-secondary">
        <div className="container">
          <motion.div {...fadeInUp} className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-4xl font-bold text-foreground tracking-tight mb-3 md:mb-4">
              {t.pricing.title}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
              {t.pricing.subtitle}
            </p>
          </motion.div>

          {/* Plan toggle */}
          <div className="flex items-center justify-center gap-2 md:gap-3 mb-8 md:mb-10">
            <button
              onClick={() => setPricingPlan("monthly")}
              className={`px-4 md:px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                pricingPlan === "monthly"
                  ? "bg-primary text-white shadow-sm"
                  : "bg-card text-muted-foreground border border-border hover:border-foreground/20"
              }`}
            >
              {t.pricing.monthly}
            </button>
            <button
              onClick={() => setPricingPlan("annual")}
              className={`px-4 md:px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                pricingPlan === "annual"
                  ? "bg-primary text-white shadow-sm"
                  : "bg-card text-muted-foreground border border-border hover:border-foreground/20"
              }`}
            >
              {t.pricing.annual}
              <span className="text-xs bg-brand-green text-white px-2 py-0.5 rounded-full font-semibold">
                {t.pricing.annualSave}
              </span>
            </button>
          </div>

          {/* Pricing card */}
          <motion.div {...fadeInUp} className="max-w-md mx-auto">
            <div className="bg-card border-2 border-primary rounded-2xl p-6 md:p-8 shadow-lg">
              <div className="text-center mb-5 md:mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl md:text-5xl font-bold text-foreground">
                    {pricingPlan === "monthly" ? t.pricing.monthlyPrice : t.pricing.annualPrice}
                  </span>
                  <span className="text-muted-foreground text-base md:text-lg">
                    {pricingPlan === "monthly" ? t.pricing.perMonth : t.pricing.perYear}
                  </span>
                </div>
                {pricingPlan === "annual" && (
                  <p className="text-sm text-brand-green font-medium mt-2">
                    {t.pricing.annualMonthlyPrice}{t.pricing.perMonth}
                  </p>
                )}
              </div>

              <ul className="space-y-3 mb-6 md:mb-8">
                {t.pricing.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-foreground/80">
                    <Check className="w-5 h-5 text-brand-green shrink-0 mt-0.5" />
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
      <section className="py-12 md:py-20">
        <div className="container">
          <motion.div {...fadeInUp} className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-4xl font-bold text-foreground tracking-tight mb-3 md:mb-4">
              {t.faq.title}
            </h2>
          </motion.div>

          <div className="max-w-2xl mx-auto space-y-2 md:space-y-3">
            {t.faq.items.map((faq, i) => (
              <motion.div
                key={i}
                {...stagger}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="border border-border rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-4 md:px-6 py-3.5 md:py-4 text-left active:bg-secondary md:hover:bg-secondary transition-colors"
                >
                  <span className="font-medium text-foreground pr-4 text-sm md:text-base">{faq.q}</span>
                  <HelpCircle
                    className={`w-5 h-5 shrink-0 text-muted-foreground/60 transition-transform duration-200 ${
                      openFaq === i ? "rotate-180 text-primary" : ""
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    openFaq === i ? "max-h-40" : "max-h-0"
                  }`}
                >
                  <p className="px-4 md:px-6 pb-4 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== NEWSLETTER SECTION ===== */}
      <section className="py-12 md:py-16 bg-brand-green/5">
        <div className="container">
          <motion.div {...fadeInUp} className="max-w-xl mx-auto text-center">
            <Mail className="w-8 h-8 md:w-10 md:h-10 text-brand-green mx-auto mb-3 md:mb-4" />
            <h2 className="text-xl md:text-3xl font-bold text-foreground tracking-tight mb-2 md:mb-3">
              {t.newsletter.title}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground mb-5 md:mb-6">
              {t.newsletter.subtitle}
            </p>

            {newsletterStatus === "success" ? (
              <div className="bg-card border border-brand-green/20 rounded-xl px-5 py-4 md:px-6">
                <Check className="w-6 h-6 text-brand-green mx-auto mb-2" />
                <p className="text-sm text-foreground/80 font-medium">{t.newsletter.success}</p>
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder={t.newsletter.placeholder}
                  required
                  className="flex-1 px-4 py-3 rounded-lg border border-border text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green"
                />
                <button
                  type="submit"
                  disabled={newsletterStatus === "loading"}
                  className="px-6 py-3 bg-brand-green text-white rounded-lg text-sm font-semibold hover:bg-brand-green-hover transition-colors disabled:opacity-60"
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
      <section className="py-12 md:py-20 bg-secondary border-t border-border">
        <div className="container text-center">
          <motion.div {...fadeInUp}>
            <h2 className="text-2xl md:text-4xl font-bold text-foreground tracking-tight mb-3 md:mb-4">
              {t.finalCta.title}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-lg mx-auto mb-6 md:mb-8">
              {t.finalCta.subtitle}
            </p>
            <PricingCTA text={t.finalCta.cta} size="large" className="w-full sm:w-auto justify-center" />
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
