/*
 * ResourceDetail Page — Full information view for a Supabase resource
 * Route: /resources/:slug
 * Mobile: single-column with sticky CTA
 * Desktop: two-column layout
 */

import { useMemo } from "react";
import { Link, useParams } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Clock,
  DollarSign,
  ExternalLink,
  FlaskConical,
  Globe,
  Heart,
  Loader2,
  MapPin,
  Share2,
  Tag,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { useLanguage } from "@/contexts/LanguageContext";
import SEO from "@/components/SEO";
import StatusBadge from "@/components/StatusBadge";
import AmountRange from "@/components/AmountRange";
import { useResource, useResources } from "@/hooks/useResources";
import { localized, localizedDescription } from "@/lib/localize";
import { toast } from "sonner";
import type { ResourceStatus } from "@/types/resources";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDeadlineLabel(deadline: string, t: any): string {
  const daysLeft = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (daysLeft <= 0) return t.resources.statusClosed;
  if (daysLeft === 1) return t.resources.dayLeft;
  if (daysLeft <= 7) return `${t.resources.closingSoon} · ${t.resources.daysLeft.replace("{count}", String(daysLeft))}`;
  return t.resources.daysLeft.replace("{count}", String(daysLeft));
}

function LabeledSection({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
        {icon}
        {label}
      </h3>
      {children}
    </div>
  );
}

const TYPE_COLORS: Record<string, string> = {
  GRANT:   "border-l-emerald-500",
  SOCIAL:  "border-l-blue-500",
  MEDICAL: "border-l-purple-500",
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function ResourceDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { t, language } = useLanguage();
  const { data: resource, loading, error } = useResource(slug ?? null);

  const title = resource ? localized(resource, language, "title") : "";
  const description = resource ? localizedDescription(resource, language) : "";
  const borderClass = resource ? (TYPE_COLORS[resource.resource_type] ?? "border-l-gray-300") : "";

  const primaryLink = resource?.application_url || resource?.source_url || "";

  // Related resources — same type, excluding current resource, max 3
  const { data: relatedAll } = useResources(resource?.resource_type);
  const relatedResources = useMemo(
    () => relatedAll.filter((r) => r.slug !== slug).slice(0, 3),
    [relatedAll, slug]
  );

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => toast.success(t.grantDetail.linkCopied));
    }
  };

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // ── Error / Not found ───────────────────────────────────────────────────────
  if (error || !resource) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container max-w-2xl py-20 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-3">{t.grantDetail.notFound}</h1>
          <p className="text-muted-foreground mb-6">{t.grantDetail.notFoundDesc}</p>
          <Link href="/catalog">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t.grantDetail.backToCatalog}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────
  const typeLabel = resource.resource_type === "GRANT"
    ? t.resources.typeGrant
    : resource.resource_type === "SOCIAL"
    ? t.resources.typeSocial
    : t.resources.typeMedical;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${title} — GrantKit`}
        description={description.slice(0, 160)}
        canonicalPath={`/resources/${slug}`}
        keywords={[typeLabel, ...(resource.categories?.map((c) => c.name) ?? [])].join(", ")}
      />

      <Navbar />

      {/* Sticky top CTA bar on mobile */}
      {primaryLink && (
        <div className="md:hidden sticky top-14 z-20 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-2.5 flex items-center justify-between gap-3">
          <span className="font-semibold text-foreground truncate text-sm">{title}</span>
          <a
            href={primaryLink}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
          >
            {t.resources.applyNow}
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      <div className="container max-w-5xl py-6 md:py-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <span>/</span>
          <Link href="/catalog" className="hover:text-foreground transition-colors">{t.nav.catalog}</Link>
          <span>/</span>
          <span className="text-foreground truncate max-w-[200px]">{title}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* ── Main content ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="md:col-span-2"
          >
            {/* Title card */}
            <div className={`bg-card border border-border rounded-xl ${borderClass} border-l-4 p-6 mb-6`}>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <StatusBadge status={resource.status as ResourceStatus} />
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-muted-foreground border border-border">
                      {typeLabel}
                    </span>
                    {resource.is_featured && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        ⭐ {t.resources.featuredBadge}
                      </span>
                    )}
                    {resource.is_verified && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        ✓ {t.resources.verifiedBadge}
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold text-foreground leading-snug">{title}</h1>
                  {resource.source_name && (
                    <p className="text-muted-foreground mt-1">{resource.source_name}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleShare}
                  className="shrink-0 p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                  title={t.grantDetail.share}
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              {/* Description */}
              {description && (
                <p className="text-muted-foreground leading-relaxed">{description}</p>
              )}

              {/* Apply CTA — desktop */}
              {primaryLink && (
                <div className="mt-5 hidden md:flex items-center gap-3">
                  <a
                    href={primaryLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
                  >
                    {t.resources.applyNow}
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                  {resource.source_url && resource.source_url !== primaryLink && (
                    <a
                      href={resource.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      {t.resources.sourceWebsite}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Medical-specific info */}
            {resource.resource_type === "MEDICAL" && (resource.clinical_trial_phase || resource.nct_id || resource.disease_areas?.length > 0) && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 mb-6">
                <h3 className="flex items-center gap-2 font-semibold text-purple-900 mb-3">
                  <FlaskConical className="w-4 h-4" />
                  Clinical Research Details
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {resource.clinical_trial_phase && (
                    <div>
                      <span className="text-purple-700 font-medium">{t.resources.clinicalPhaseLabel}:</span>{" "}
                      <span className="text-purple-900">{resource.clinical_trial_phase.replace("_", " ")}</span>
                    </div>
                  )}
                  {resource.nct_id && (
                    <div>
                      <span className="text-purple-700 font-medium">{t.resources.nctIdLabel}:</span>{" "}
                      <a
                        href={`https://clinicaltrials.gov/ct2/show/${resource.nct_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-700 hover:text-purple-900 underline"
                      >
                        {resource.nct_id}
                        <ExternalLink className="w-3 h-3 inline ml-1" />
                      </a>
                    </div>
                  )}
                  {resource.disease_areas?.length > 0 && (
                    <div className="col-span-2">
                      <span className="text-purple-700 font-medium">{t.resources.diseaseAreasLabel}:</span>{" "}
                      <span className="text-purple-900">{resource.disease_areas.join(", ")}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Eligibility details */}
            {resource.eligibility_details && (
              <div className="bg-card border border-border rounded-xl p-5 mb-6">
                <h3 className="flex items-center gap-2 font-semibold text-foreground mb-3">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  {t.resources.eligibilityLabel}
                </h3>
                <p className="text-muted-foreground leading-relaxed">{resource.eligibility_details}</p>
              </div>
            )}
          </motion.div>

          {/* ── Sidebar ── */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="space-y-4"
          >
            {/* Key details card */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-foreground mb-4">Details</h3>

              {/* Amount */}
              {(resource.amount_min != null || resource.amount_max != null) && (
                <LabeledSection label={t.resources.amountRange} icon={<DollarSign className="w-3.5 h-3.5" />}>
                  <AmountRange
                    min={resource.amount_min}
                    max={resource.amount_max}
                    currency={resource.currency}
                    className="text-base font-semibold"
                  />
                </LabeledSection>
              )}

              {/* Deadline */}
              <LabeledSection label={t.resources.deadlineLabel} icon={<Calendar className="w-3.5 h-3.5" />}>
                {resource.deadline ? (
                  <span className={`font-medium ${
                    Math.ceil((new Date(resource.deadline).getTime() - Date.now()) / 86400000) <= 7
                      ? "text-red-600"
                      : "text-foreground"
                  }`}>
                    {new Date(resource.deadline).toLocaleDateString(language === "en" ? "en-US" : language, {
                      year: "numeric", month: "long", day: "numeric",
                    })}
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {formatDeadlineLabel(resource.deadline, t)}
                    </span>
                  </span>
                ) : resource.is_rolling ? (
                  <span className="text-muted-foreground">{t.resources.rollingDeadline}</span>
                ) : (
                  <span className="text-muted-foreground">{t.resources.noDeadline}</span>
                )}
              </LabeledSection>

              {/* Eligibility type */}
              <LabeledSection label={t.resources.eligibilityLabel} icon={<Users className="w-3.5 h-3.5" />}>
                <span className="text-foreground font-medium">
                  {resource.eligibility === "INDIVIDUAL"
                    ? t.resources.eligibilityIndividual
                    : resource.eligibility === "ORGANIZATION"
                    ? t.resources.eligibilityOrganization
                    : t.resources.eligibilityBoth}
                </span>
              </LabeledSection>

              {/* Target groups */}
              {resource.target_groups?.length > 0 && (
                <LabeledSection label={t.resources.filterTargetGroup} icon={<Heart className="w-3.5 h-3.5" />}>
                  <div className="flex flex-wrap gap-1">
                    {resource.target_groups.map((g) => (
                      <span key={g} className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                        {g}
                      </span>
                    ))}
                  </div>
                </LabeledSection>
              )}
            </div>

            {/* Location card */}
            {resource.locations?.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="flex items-center gap-2 font-semibold text-foreground mb-3">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  {t.resources.locationLabel}
                </h3>
                <ul className="space-y-1.5">
                  {resource.locations.map((loc, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="text-lg">🌐</span>
                      <span>
                        {loc.region_name ? `${loc.region_name}, ` : ""}
                        {localized(loc as any, language) || loc.country_name}
                        {loc.is_nationwide && (
                          <span className="ml-1 text-xs text-muted-foreground/60">(nationwide)</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Categories card */}
            {resource.categories?.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="flex items-center gap-2 font-semibold text-foreground mb-3">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  {t.resources.categoriesLabel}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {resource.categories.map((cat) => (
                    <span
                      key={cat.id}
                      className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-muted-foreground border border-border"
                    >
                      {cat.icon && <span>{cat.icon}</span>}
                      {localized(cat, language)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Back link */}
            <Link href="/catalog">
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                {t.grantDetail.backToCatalog}
              </button>
            </Link>
          </motion.div>
        </div>

        {/* Related resources — full width row below the two-column layout */}
        {relatedResources.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="mt-10"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">{t.resources.relatedResources}</h2>
              <Link href="/catalog" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t.grantDetail.backToCatalog}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {relatedResources.map((related) => {
                const relTitle = localized(related, language, "title");
                const relDesc = localizedDescription(related, language);
                const TYPE_BORDER: Record<string, string> = {
                  GRANT: "border-l-emerald-500", SOCIAL: "border-l-blue-500", MEDICAL: "border-l-purple-500",
                };
                return (
                  <Link key={related.slug} href={`/resources/${related.slug}`}>
                    <div className={`group bg-card border border-border rounded-xl p-4 border-l-4 ${TYPE_BORDER[related.resource_type] ?? "border-l-gray-300"} hover:shadow-md hover:border-foreground/20 transition-all cursor-pointer`}>
                      <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-1.5">{relTitle}</h3>
                      {relDesc && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{relDesc}</p>}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {related.amount_min != null && (
                          <span className="flex items-center gap-0.5 text-emerald-600 font-medium">
                            <DollarSign className="w-3 h-3" />
                            {related.amount_min.toLocaleString()}
                            {related.amount_max && related.amount_max !== related.amount_min
                              ? `–${related.amount_max.toLocaleString()}`
                              : ""}
                          </span>
                        )}
                        {related.deadline && (
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />
                            {new Date(related.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
