/*
 * Landing Page — GrantKit
 * Design: Structured Clarity — data-driven, Scandinavian minimalism
 * Sections: Hero, Trust Indicators, Problem, What You Get, Preview, FAQ, CTA, Footer
 */

import { motion } from "framer-motion";
import { ArrowRight, Calendar, Clock, Globe, HelpCircle, Lock, Search, Shield, Zap } from "lucide-react";
import { useState } from "react";
import Footer from "@/components/Footer";
import GrantCard from "@/components/GrantCard";
import Navbar from "@/components/Navbar";
import PricingCTA from "@/components/PricingCTA";
import grantsData from "@/data/grants.json";
import { type Grant } from "@/lib/constants";

const featuredGrants = (grantsData as Grant[]).filter(g => g.featured).slice(0, 5);

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
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "How often is it updated?",
      a: "Monthly, with email notifications when new grants are added. We continuously monitor grant programs across all covered countries.",
    },
    {
      q: "Can I cancel anytime?",
      a: "Yes, you can cancel your subscription anytime through Gumroad. No questions asked, no hidden fees.",
    },
    {
      q: "What countries are covered?",
      a: "We cover grants from the US, EU (France, Germany, Netherlands, and more), UK, Georgia, Canada, and Australia. New countries are added regularly.",
    },
    {
      q: "Is this for organizations or individuals?",
      a: "Both. Our database includes grants for individuals, families seeking medical treatment, and early-stage startups looking for funding.",
    },
  ];

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
                Curated grant database — updated monthly
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-[56px] font-bold text-white leading-[1.1] tracking-tight mb-5">
                Find Grants for Medical Treatment & Startups
                <span className="text-[#22c55e]"> — Worldwide</span>
              </h1>
              <p className="text-lg md:text-xl text-blue-100/80 leading-relaxed mb-8 max-w-2xl">
                Curated database of 50+ grants for individuals, families, and founders.
                Organized by category, country, and eligibility. Updated monthly.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <PricingCTA text="Get Access — $9/month" size="large" />
                <a
                  href="#preview"
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-200 hover:text-white transition-colors"
                >
                  See sample grants
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
              { icon: Globe, label: "Countries", value: "15+" },
              { icon: Shield, label: "Medical & Rehab", value: "20+" },
              { icon: Zap, label: "Startup Grants", value: "10+" },
              { icon: Calendar, label: "Updated", value: "Monthly" },
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

      {/* ===== PROBLEM SECTION ===== */}
      <section className="py-20 bg-gray-50/50">
        <div className="container">
          <motion.div {...fadeInUp} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0f172a] tracking-tight mb-4">
              Grant information is scattered, outdated,
              <br className="hidden md:block" /> and hard to find
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Thousands of grants exist, but finding the right one shouldn't take weeks.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                icon: Search,
                title: "Hours of searching",
                desc: "Grant information is spread across dozens of government websites, NGOs, and databases in different languages.",
              },
              {
                icon: Globe,
                title: "Language barriers",
                desc: "Confusing eligibility rules, complex application processes, and documentation in languages you don't speak.",
              },
              {
                icon: Clock,
                title: "Missing deadlines",
                desc: "No centralized alerts or notifications. By the time you find a grant, the deadline has already passed.",
              },
            ].map((pain, i) => (
              <motion.div
                key={pain.title}
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
              Everything you need, organized in one place
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Each grant is researched, verified, and formatted for quick scanning.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            {[
              {
                icon: "🏥",
                title: "Medical Treatment",
                desc: "Copay assistance, treatment funding, and disability compensation programs.",
              },
              {
                icon: "♿",
                title: "Rehabilitation",
                desc: "Physical therapy, early intervention, and pediatric rehabilitation grants.",
              },
              {
                icon: "🧬",
                title: "Rare Diseases",
                desc: "Specialized funding for rare and orphan disease research and patient support.",
              },
              {
                icon: "🚀",
                title: "Startup Funding",
                desc: "Innovation grants, SBIR/STTR programs, and EU accelerator funding.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
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
              <h3 className="font-semibold text-[#0f172a] mb-3">Each grant entry includes:</h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {[
                  "Grant name & organization",
                  "Country with flag indicator",
                  "Funding amount or range",
                  "Category classification",
                  "Eligibility summary",
                  "Application deadline",
                  "Direct application link",
                  "Monthly update status",
                ].map((item) => (
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
              Free Preview
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-[#0f172a] tracking-tight mb-4">
              See what's inside
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              Here are 5 sample grants from our database. Members get access to all 50+ grants.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {featuredGrants.map((grant, i) => (
              <GrantCard key={grant.id} grant={grant} index={i} />
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
                <p className="font-semibold text-[#0f172a] mb-1">50+ more grants available for members</p>
                <p className="text-sm text-gray-500 mb-4">Updated monthly with new opportunities</p>
                <PricingCTA text="Unlock All Grants — $9/month" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FAQ SECTION ===== */}
      <section className="py-20">
        <div className="container">
          <motion.div {...fadeInUp} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0f172a] tracking-tight mb-4">
              Frequently asked questions
            </h2>
          </motion.div>

          <div className="max-w-2xl mx-auto space-y-3">
            {faqs.map((faq, i) => (
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

      {/* ===== FINAL CTA ===== */}
      <section className="py-20 bg-[#0f172a]">
        <div className="container text-center">
          <motion.div {...fadeInUp}>
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
              Stop searching. Start applying.
            </h2>
            <p className="text-blue-200/70 max-w-lg mx-auto mb-8">
              Get instant access to 50+ curated grants across 15+ countries.
              New grants added every month.
            </p>
            <PricingCTA text="Get Access — $9/month" size="large" />
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
