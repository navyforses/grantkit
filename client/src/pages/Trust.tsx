/*
 * /trust — the trust contract (MASTER-PLAN 1.13, Levan §4.4, D19).
 * Eight points ×5 languages + the public partner list from
 * content/offers/partners.json. Only names, domain and disclosure are
 * rendered: trackingUrl is never read here (placement engine = Phase 2.9).
 * Layout follows Privacy.tsx: mobile compact, desktop max-w-3xl, no footer on mobile.
 */

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import SEO from "@/components/SEO";
import partnersFile from "../../../content/offers/partners.json";

const CONTACT_EMAIL = "hello@grantkit.co";

/** Public fields only — the partner list as /trust shows it. */
export const PUBLIC_PARTNERS = partnersFile.partners.map(({ slug, name, domain, disclosure }) => ({
  slug,
  name,
  domain,
  disclosure,
}));

export default function Trust() {
  const { t, language } = useLanguage();
  const tr = t.trust;

  return (
    <div className="min-h-screen flex flex-col bg-card">
      <SEO title={tr.seoTitle} description={tr.seoDescription} canonicalPath="/trust" />
      <Navbar />

      <main className="flex-1 py-6 md:py-16 pb-24 md:pb-16">
        <div className="container px-4 md:px-0 max-w-3xl">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground active:text-primary md:hover:text-primary transition-colors mb-4 md:mb-8">
            <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
            {t.legal?.backToHome || "Back to Home"}
          </Link>

          <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-3 md:mb-4">{tr.title}</h1>
          <p className="text-sm md:text-base text-muted-foreground mb-6 md:mb-10">{tr.intro}</p>

          <div className="prose prose-sm md:prose-base prose-gray dark:prose-invert max-w-none">
            {tr.points.map((point, i) => (
              <section key={i}>
                <h2>{point.title}</h2>
                <p>{point.body}</p>
                {i === 2 && (
                  <ul>
                    {tr.neverZone.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
                {i === 5 && (
                  <p>
                    <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(tr.reportSubject)}`}>{tr.reportCta}</a>
                  </p>
                )}
                {i === 6 && (
                  <ul>
                    {tr.neverDo.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
                {i === 7 && (
                  <p>
                    <a href={`mailto:${CONTACT_EMAIL}`}>{tr.contactCta}</a> — {CONTACT_EMAIL}
                  </p>
                )}
              </section>
            ))}

            <h2 id="partners">{tr.partnersTitle}</h2>
            <p>{tr.partnersIntro}</p>
            {PUBLIC_PARTNERS.length === 0 ? (
              <p>{tr.partnersEmpty}</p>
            ) : (
              <ul className="not-prose space-y-3 list-none p-0">
                {PUBLIC_PARTNERS.map((p) => (
                  <li key={p.slug} className="rounded-lg border border-border p-3 md:p-4" data-partner={p.slug}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-foreground">{p.name}</span>
                      <span className="text-[11px] uppercase tracking-wide rounded px-1.5 py-0.5 bg-muted text-muted-foreground">
                        {tr.partnerLabel}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground m-0">{p.disclosure[language]}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>

      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
