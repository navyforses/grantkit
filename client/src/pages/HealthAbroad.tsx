/*
 * /health-abroad — Concierge v0 (MASTER-PLAN v2 §5 item 1.11, D17/D20/D23).
 *
 * Ring-fenced paid surface: the ONLY link to it lives in the catalog's health
 * sub-filter (CatalogToolbar), never in Navbar / MobileBottomNav / Home.
 * Static content + a five-field intake form → `concierge.intake` (email to
 * the owner, nothing stored). Prices are owner decisions (PIVOT §6 rule 5).
 * noindex until the owner decides on indexing (server/seoHead.ts too).
 */

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  CONCIERGE_COUNTRIES,
  CONCIERGE_LANGUAGES,
  DIAGNOSIS_CATEGORIES,
  TREATMENT_STAGES,
  type ConciergeCountry,
  type ConciergeLanguage,
  type DiagnosisCategory,
  type TreatmentStage,
} from "@shared/concierge";

// Official sources only (no amounts, no timelines — the page says so).
const OFFICIAL_LINKS = {
  pass: "https://www.ameli.fr/assure/droits-demarches/difficultes-acces-droits-soins/permanences-acces-soins-sante-pass",
  ame: "https://www.service-public.fr/particuliers/vosdroits/F3079",
  b2: "https://travel.state.gov/content/travel/en/us-visas/tourism-visit/visitor.html",
  de: "https://www.auswaertiges-amt.de/en/visa-service",
  tr: "https://www.evisa.gov.tr/",
} as const;

// Plain links, not escrow (1.11): we never hold or route money.
const FUNDRAISING_LINKS = [
  { name: "Leetchi (cagnotte solidaire)", href: "https://www.leetchi.com/" },
  { name: "HelloAsso", href: "https://www.helloasso.com/" },
] as const;

const DIAGNOSIS_QUICK: ReadonlyArray<{ key: "cancer" | "pediatric" | "rare"; q: string }> = [
  { key: "cancer", q: "cancer" },
  { key: "pediatric", q: "pediatric" },
  { key: "rare", q: "rare" },
];

const LANGUAGE_NAMES: Record<ConciergeLanguage, string> = { ka: "ქართული", ru: "Русский", en: "English" };

const selectClass =
  "h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]/30";

export default function HealthAbroad() {
  const { t, language } = useLanguage();
  const c = t.healthAbroad;

  const [country, setCountry] = useState<ConciergeCountry>("US");
  const [diagnosisCategory, setDiagnosisCategory] = useState<DiagnosisCategory | "">("");
  const [stage, setStage] = useState<TreatmentStage | "">("");
  const [callLanguage, setCallLanguage] = useState<ConciergeLanguage>(
    (CONCIERGE_LANGUAGES as readonly string[]).includes(language) ? (language as ConciergeLanguage) : "en"
  );
  const [contact, setContact] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const intake = trpc.concierge.intake.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: () => toast.error(c.toastError),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnosisCategory || !stage || contact.trim().length < 5 || !consent) {
      toast.error(c.toastValidation);
      return;
    }
    intake.mutate({ country, diagnosisCategory, stage, language: callLanguage, contact: contact.trim(), consent: true });
  };

  return (
    <div className="min-h-screen flex flex-col bg-secondary">
      <SEO title={c.seoTitle} description={c.seoDescription} canonicalPath="/health-abroad" noIndex />
      <Navbar />

      <main className="container px-4 md:px-0 py-8 md:py-12 flex-1 pb-24 md:pb-12">
        <div className="max-w-3xl mx-auto space-y-10">
          <header>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-3">{c.heading}</h1>
            <p className="text-muted-foreground text-sm md:text-base">{c.intro}</p>
          </header>

          <p role="note" data-testid="not-medical-advice" className="border-l-4 border-amber-500 bg-card px-4 py-3 text-sm text-foreground/90 rounded-r-md">
            {c.notMedicalAdvice}
          </p>

          {/* Country × diagnosis → existing catalog filters */}
          <section aria-labelledby="ha-countries">
            <h2 id="ha-countries" className="text-lg md:text-xl font-semibold text-foreground mb-1">{c.countriesHeading}</h2>
            <p className="text-sm text-muted-foreground mb-4">{c.countriesNote}</p>
            <ul className="space-y-4">
              {CONCIERGE_COUNTRIES.map((code) => {
                const name = c.country[code].name;
                const health = `/organizations?domain=health&mc=${code}`;
                return (
                  <li key={code} className="bg-card border border-border rounded-lg p-4">
                    <h3 className="font-semibold text-foreground">{name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{c.country[code].note}</p>
                    <ul className="text-sm space-y-1">
                      <li><a className="text-primary underline underline-offset-2" href={health}>{c.catalogLink.replace("{country}", name)}</a></li>
                      <li><a className="text-primary underline underline-offset-2" href={`/organizations?domain=housing&mc=${code}`}>{c.housingLink.replace("{country}", name)}</a></li>
                      <li className="text-muted-foreground">
                        {c.diagnosisLinks}{" "}
                        {DIAGNOSIS_QUICK.map((d, i) => (
                          <span key={d.key}>
                            {i > 0 && " · "}
                            <a className="text-primary underline underline-offset-2" href={`${health}&diagnosis=${d.q}`}>{c.diagnosisQuick[d.key]}</a>
                          </span>
                        ))}
                      </li>
                    </ul>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Official routes — sources only */}
          <section aria-labelledby="ha-official">
            <h2 id="ha-official" className="text-lg md:text-xl font-semibold text-foreground mb-1">{c.officialHeading}</h2>
            <p className="text-sm text-muted-foreground mb-3">{c.officialIntro}</p>
            <ul className="text-sm space-y-1.5">
              {(Object.keys(OFFICIAL_LINKS) as Array<keyof typeof OFFICIAL_LINKS>).map((k) => (
                <li key={k}>
                  <a className="text-primary underline underline-offset-2" href={OFFICIAL_LINKS[k]} target="_blank" rel="noopener noreferrer">{c.official[k]}</a>
                </li>
              ))}
            </ul>
          </section>

          {/* Fundraising — plain links */}
          <section aria-labelledby="ha-fundraising">
            <h2 id="ha-fundraising" className="text-lg md:text-xl font-semibold text-foreground mb-1">{c.fundraisingHeading}</h2>
            <p className="text-sm text-muted-foreground mb-3">{c.fundraisingNote}</p>
            <ul className="text-sm space-y-1.5">
              {FUNDRAISING_LINKS.map((f) => (
                <li key={f.href}><a className="text-primary underline underline-offset-2" href={f.href} target="_blank" rel="noopener noreferrer">{f.name}</a></li>
              ))}
            </ul>
          </section>

          {/* Price block — manual invoice (D23), no Paddle in v0 */}
          <section aria-labelledby="ha-pricing" data-testid="price-block">
            <h2 id="ha-pricing" className="text-lg md:text-xl font-semibold text-foreground mb-3">{c.pricingHeading}</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[c.orientation, c.accompaniment].map((p) => (
                <div key={p.title} className="bg-card border border-border rounded-lg p-4">
                  <h3 className="font-semibold text-foreground mb-1">{p.title}</h3>
                  <p className="text-sm text-muted-foreground">{p.description}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-3">{c.paymentNote}</p>
          </section>

          {/* Intake form */}
          <section aria-labelledby="ha-form" className="bg-card border border-border rounded-lg p-5 md:p-6">
            <h2 id="ha-form" className="text-lg md:text-xl font-semibold text-foreground mb-1">{c.formHeading}</h2>
            <p className="text-sm text-muted-foreground mb-4">{c.formIntro}</p>
            {submitted ? (
              <div className="text-center py-6">
                <h3 className="text-lg font-bold text-foreground mb-2">{c.successTitle}</h3>
                <p className="text-sm text-muted-foreground">{c.successMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block text-sm">
                  <span className="block mb-1 font-medium text-foreground">{c.fields.country}</span>
                  <select className={selectClass} value={country} onChange={(e) => setCountry(e.target.value as ConciergeCountry)}>
                    {CONCIERGE_COUNTRIES.map((code) => <option key={code} value={code}>{c.country[code].name}</option>)}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="block mb-1 font-medium text-foreground">{c.fields.diagnosis}</span>
                  <select className={selectClass} value={diagnosisCategory} onChange={(e) => setDiagnosisCategory(e.target.value as DiagnosisCategory)} required>
                    <option value="" disabled>—</option>
                    {DIAGNOSIS_CATEGORIES.map((d) => <option key={d} value={d}>{c.diagnosis[d]}</option>)}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="block mb-1 font-medium text-foreground">{c.fields.stage}</span>
                  <select className={selectClass} value={stage} onChange={(e) => setStage(e.target.value as TreatmentStage)} required>
                    <option value="" disabled>—</option>
                    {TREATMENT_STAGES.map((s) => <option key={s} value={s}>{c.stage[s]}</option>)}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="block mb-1 font-medium text-foreground">{c.fields.language}</span>
                  <select className={selectClass} value={callLanguage} onChange={(e) => setCallLanguage(e.target.value as ConciergeLanguage)}>
                    {CONCIERGE_LANGUAGES.map((l) => <option key={l} value={l}>{LANGUAGE_NAMES[l]}</option>)}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="block mb-1 font-medium text-foreground">{c.fields.contact}</span>
                  <input
                    type="text"
                    autoComplete="email"
                    className={selectClass}
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder={c.fields.contactPlaceholder}
                    maxLength={120}
                    required
                  />
                </label>
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
                  <span>
                    <span className="font-medium text-foreground">{c.consentLabel}</span>{" — "}
                    <span data-testid="consent-text" className="text-muted-foreground">{c.consentText}</span>
                  </span>
                </label>
                <p data-testid="retention" className="text-xs text-muted-foreground">{c.retention}</p>
                <Button type="submit" disabled={intake.isPending} className="h-11 rounded-md">
                  {intake.isPending ? c.sending : c.submit}
                </Button>
              </form>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
