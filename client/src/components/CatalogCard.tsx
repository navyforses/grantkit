/*
 * CatalogCard Component
 * Design: Structured Clarity — category color-coded left border, dense but scannable layout
 * Unified card for both grants and resources. Clickable to navigate to detail page.
 * Accepts either a legacy CatalogItem or a Supabase ResourceFull.
 */

import { motion } from "framer-motion";
import { ArrowUpRight, Bookmark, BookmarkCheck, Clock, DollarSign, Globe, Mail, MapPin, Phone, Plane } from "lucide-react";
import { Link } from "wouter";
import { getCategoryStyle, getCategoryBorderColor, type CatalogItem } from "@/lib/constants";
import { useLanguage } from "@/contexts/LanguageContext";
import StatusBadge from "@/components/StatusBadge";
import AmountRange from "@/components/AmountRange";
import { localized, localizedDescription } from "@/lib/localize";
import type { ResourceFull, ResourceStatus } from "@/types/resources";

interface CatalogCardProps {
  item: CatalogItem | ResourceFull;
  index: number;
  isSaved?: boolean;
  onToggleSave?: (grantId: string) => void;
  isAuthenticated?: boolean;
}

function isResourceFull(item: CatalogItem | ResourceFull): item is ResourceFull {
  return "resource_type" in item && "slug" in item;
}

const RESOURCE_TYPE_BORDER: Record<string, string> = {
  GRANT:   "border-l-emerald-500",
  SOCIAL:  "border-l-blue-500",
  MEDICAL: "border-l-purple-500",
}

const RESOURCE_TYPE_BADGE: Record<string, string> = {
  GRANT:   "bg-emerald-50 text-emerald-600 border-emerald-200",
  SOCIAL:  "bg-blue-50 text-blue-600 border-blue-200",
  MEDICAL: "bg-purple-50 text-purple-600 border-purple-200",
}

export default function CatalogCard({ item, index, isSaved, onToggleSave, isAuthenticated }: CatalogCardProps) {
  const { t, tCategory, tCountry, tCatalogContent, language } = useLanguage();
  const isResource = isResourceFull(item);

  // ── Legacy CatalogItem path ──────────────────────────────────────────────
  if (!isResource) {
    const legacyItem = item as CatalogItem;
    const borderColor = getCategoryBorderColor(legacyItem.category);
    const content = tCatalogContent(legacyItem.id, {
      name: legacyItem.name,
      description: legacyItem.description,
      eligibility: legacyItem.eligibility || "",
    });
    const translatedCategory = tCategory(legacyItem.category);
    const translatedCountry = tCountry(legacyItem.country);
    const countryFlag = legacyItem.country === "US" ? "🇺🇸" : "🌐";
    const typeLabel = legacyItem.type === "grant" ? t.catalog.typeGrant : t.catalog.typeResource;
    const primaryLink = legacyItem.website || "";

    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.4), ease: "easeOut" }}
        className={`group bg-card border border-border rounded-lg ${borderColor} border-l-4 hover:shadow-md hover:border-foreground/20 transition-all duration-200 relative theme-transition`}
      >
        {isAuthenticated && onToggleSave && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSave(legacyItem.id); }}
            className={`absolute top-3 right-3 z-10 p-1.5 rounded-md transition-all ${
              isSaved ? "text-yellow-500 hover:bg-yellow-500/10" : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-secondary opacity-0 group-hover:opacity-100"
            }`}
            title={isSaved ? t.grantDetail.removeFromSaved : t.grantDetail.saveThisGrant}
          >
            {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          </button>
        )}
        <Link href={`/grant/${legacyItem.id}`}>
          <div className="p-5 cursor-pointer">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="text-xl mt-0.5 shrink-0">{countryFlag}</span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground leading-snug text-[15px] group-hover:text-brand-green transition-colors">{content.name}</h3>
                  {legacyItem.organization && legacyItem.organization !== legacyItem.name && (
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">{legacyItem.organization}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0 pr-6">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${getCategoryStyle(legacyItem.category)}`}>{translatedCategory}</span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${legacyItem.type === "grant" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${legacyItem.type === "grant" ? "bg-emerald-500" : "bg-blue-500"}`} />
                  {legacyItem.status === "Open" ? legacyItem.status : typeLabel}
                </span>
              </div>
            </div>
            {content.description && (
              <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-2">{content.description}</p>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-sm text-muted-foreground mb-3">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground/60" />
                {legacyItem.state && legacyItem.state !== "Nationwide" && legacyItem.state !== "International"
                  ? `${legacyItem.city ? legacyItem.city + ", " : ""}${legacyItem.state}`
                  : translatedCountry}
              </span>
              {legacyItem.amount && legacyItem.amount !== "Varies" && legacyItem.amount !== "" && (
                <span className="flex items-center gap-1 text-emerald-600 font-medium"><DollarSign className="w-3.5 h-3.5" />{legacyItem.amount}</span>
              )}
              {legacyItem.deadline && (
                <span className="flex items-center gap-1 text-muted-foreground"><Clock className="w-3.5 h-3.5 text-muted-foreground/60" />{legacyItem.deadline}</span>
              )}
              {legacyItem.b2VisaEligible === "yes" && (
                <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                  <Plane className="w-3 h-3" />{t.grantDetail.b2VisaOK}
                </span>
              )}
            </div>
            {content.eligibility && (
              <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2">
                <span className="font-medium text-foreground/70">{t.catalog.eligibility}</span>{" "}{content.eligibility}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              {primaryLink && (
                <span
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(primaryLink.startsWith("http") ? primaryLink : `https://${primaryLink}`, "_blank"); }}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-brand-green transition-colors"
                >
                  <Globe className="w-3.5 h-3.5" />{t.catalog.visitWebsite}<ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              )}
              {legacyItem.phone && (
                <a href={`tel:${legacyItem.phone}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Phone className="w-3 h-3" /><span className="hidden sm:inline">{legacyItem.phone}</span>
                </a>
              )}
              {legacyItem.email && (
                <a href={`mailto:${legacyItem.email}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Mail className="w-3 h-3" /><span className="hidden sm:inline truncate max-w-[140px]">{legacyItem.email}</span>
                </a>
              )}
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  // ── Supabase ResourceFull path ───────────────────────────────────────────
  const resource = item as ResourceFull;
  const borderClass = RESOURCE_TYPE_BORDER[resource.resource_type] ?? "border-l-gray-300";
  const badgeClass = RESOURCE_TYPE_BADGE[resource.resource_type] ?? "bg-gray-50 text-gray-600 border-gray-200";

  const title = localized(resource, language, 'title');
  const description = localizedDescription(resource, language);
  const primaryCat = resource.categories?.[0];
  const primaryLoc = resource.locations?.[0];
  const countryFlag = primaryLoc?.country_code === "US" ? "🇺🇸" : primaryLoc ? "🌐" : "🌍";
  const primaryLink = resource.application_url || resource.source_url || "";

  const typeLabel = resource.resource_type === 'GRANT'
    ? t.resources.typeGrant
    : resource.resource_type === 'SOCIAL'
    ? t.resources.typeSocial
    : t.resources.typeMedical;

  // Deadline urgency
  let deadlineDisplay: React.ReactNode = null;
  if (resource.deadline) {
    const daysLeft = Math.ceil((new Date(resource.deadline).getTime() - Date.now()) / 86400000);
    const urgentClass = daysLeft <= 7 ? "text-red-600" : daysLeft <= 30 ? "text-amber-600" : "text-muted-foreground";
    const label = daysLeft === 1 ? t.resources.dayLeft
      : daysLeft <= 0 ? t.resources.statusClosed
      : t.resources.daysLeft.replace("{count}", String(daysLeft));
    deadlineDisplay = (
      <span className={`flex items-center gap-1 ${urgentClass}`}>
        <Clock className="w-3.5 h-3.5 opacity-60" />{label}
      </span>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.4), ease: "easeOut" }}
      className={`group bg-card border border-border rounded-lg ${borderClass} border-l-4 hover:shadow-md hover:border-foreground/20 transition-all duration-200 relative theme-transition`}
    >
      {isAuthenticated && onToggleSave && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSave(resource.id); }}
          className={`absolute top-3 right-3 z-10 p-1.5 rounded-md transition-all ${
            isSaved ? "text-yellow-500 hover:bg-yellow-500/10" : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-secondary opacity-0 group-hover:opacity-100"
          }`}
          title={isSaved ? t.grantDetail.removeFromSaved : t.grantDetail.saveThisGrant}
        >
          {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        </button>
      )}

      <Link href={`/resources/${resource.slug}`}>
        <div className="p-5 cursor-pointer">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <span className="text-xl mt-0.5 shrink-0">{countryFlag}</span>
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground leading-snug text-[15px] group-hover:text-brand-green transition-colors">{title}</h3>
                {resource.source_name && (
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">{resource.source_name}</p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0 pr-6">
              {primaryCat && (
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${badgeClass}`}>
                  {primaryCat.icon ? `${primaryCat.icon} ` : ''}{localized(primaryCat, language)}
                </span>
              )}
              <StatusBadge status={resource.status as ResourceStatus} />
            </div>
          </div>

          {/* Description */}
          {description && (
            <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-2">{description}</p>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-sm text-muted-foreground mb-3">
            {primaryLoc && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground/60" />
                {primaryLoc.region_name
                  ? `${primaryLoc.region_name}, ${primaryLoc.country_code}`
                  : primaryLoc.country_name}
              </span>
            )}
            {(resource.amount_min != null || resource.amount_max != null) && (
              <span className="flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <AmountRange min={resource.amount_min} max={resource.amount_max} currency={resource.currency} />
              </span>
            )}
            {deadlineDisplay}
          </div>

          {/* Eligibility details */}
          {resource.eligibility_details && (
            <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2">
              <span className="font-medium text-foreground/70">{t.catalog.eligibility}</span>{" "}{resource.eligibility_details}
            </p>
          )}

          {/* Category tags */}
          {resource.categories && resource.categories.length > 1 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {resource.categories.slice(1, 4).map((cat) => (
                <span key={cat.id} className="text-[11px] px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                  {localized(cat, language)}
                </span>
              ))}
            </div>
          )}

          {/* Links */}
          <div className="flex flex-wrap items-center gap-3">
            {primaryLink && (
              <span
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(primaryLink.startsWith("http") ? primaryLink : `https://${primaryLink}`, "_blank"); }}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-brand-green transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />{t.catalog.visitWebsite}<ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            )}
            <span className={`text-xs font-medium px-2 py-0.5 rounded border ${badgeClass}`}>{typeLabel}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
