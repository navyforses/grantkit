/*
 * CatalogCard Component
 * Design: Structured Clarity — category color-coded left border, dense but scannable layout
 * Unified card for both grants and resources. Clickable to navigate to detail page.
 */

import { motion } from "framer-motion";
import { ArrowUpRight, Bookmark, BookmarkCheck, Clock, DollarSign, Globe, Mail, MapPin, Phone, Plane } from "lucide-react";
import { Link } from "wouter";
import { getCategoryStyle, getCategoryBorderColor, type CatalogItem } from "@/lib/constants";
import { useLanguage } from "@/contexts/LanguageContext";

interface CatalogCardProps {
  item: CatalogItem;
  index: number;
  isSaved?: boolean;
  onToggleSave?: (grantId: string) => void;
  isAuthenticated?: boolean;
}

export default function CatalogCard({ item, index, isSaved, onToggleSave, isAuthenticated }: CatalogCardProps) {
  const borderColor = getCategoryBorderColor(item.category);
  const { t, tCategory, tCountry, tCatalogContent } = useLanguage();

  // Get translated content (name, description, eligibility)
  const content = tCatalogContent(item.id, {
    name: item.name,
    description: item.description,
    eligibility: item.eligibility || "",
  });

  const translatedCategory = tCategory(item.category);
  const translatedCountry = tCountry(item.country);

  const countryFlag = item.country === "US" ? "🇺🇸" : "🌐";
  const typeLabel = item.type === "grant" ? t.catalog.typeGrant : t.catalog.typeResource;

  // Determine the primary link
  const primaryLink = item.website || "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.4), ease: "easeOut" }}
      className={`group bg-card border border-border rounded-lg ${borderColor} border-l-4 hover:shadow-md hover:border-foreground/20 transition-all duration-200 relative theme-transition`}
    >
      {/* Bookmark button */}
      {isAuthenticated && onToggleSave && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleSave(item.id);
          }}
          className={`absolute top-3 right-3 z-10 p-1.5 rounded-md transition-all ${
            isSaved
                  ? "text-yellow-500 hover:bg-yellow-500/10"
              : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-secondary opacity-0 group-hover:opacity-100"
          }`}
          title={isSaved ? t.grantDetail.removeFromSaved : t.grantDetail.saveThisGrant}
        >
          {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        </button>
      )}

      <Link href={`/grant/${item.id}`}>
        <div className="p-5 cursor-pointer">
          {/* Header: Flag + Name + Category badge */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <span className="text-xl mt-0.5 shrink-0">{countryFlag}</span>
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground leading-snug text-[15px] group-hover:text-brand-green transition-colors">
                  {content.name}
                </h3>
                {item.organization && item.organization !== item.name && (
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">{item.organization}</p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0 pr-6">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${getCategoryStyle(item.category)}`}>
                {translatedCategory}
              </span>
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${
                item.type === "grant"
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-blue-50 text-blue-600"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${item.type === "grant" ? "bg-emerald-500" : "bg-blue-500"}`} />
                {item.status === "Open" ? item.status : typeLabel}
              </span>
            </div>
          </div>

          {/* Description */}
          {content.description && (
            <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-2">
              {content.description}
            </p>
          )}

          {/* Meta row: Location + State/City + Amount + Deadline + B-2 Visa */}
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-sm text-muted-foreground mb-3">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground/60" />
              {item.state && item.state !== "Nationwide" && item.state !== "International"
                ? `${item.city ? item.city + ", " : ""}${item.state}`
                : translatedCountry}
            </span>
            {item.amount && item.amount !== "Varies" && item.amount !== "" && (
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <DollarSign className="w-3.5 h-3.5" />
                {item.amount}
              </span>
            )}
            {item.deadline && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3.5 h-3.5 text-muted-foreground/60" />
                {item.deadline}
              </span>
            )}
            {item.b2VisaEligible === "yes" && (
              <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                <Plane className="w-3 h-3" />
                {t.grantDetail.b2VisaOK}
              </span>
            )}
          </div>

          {/* Eligibility */}
          {content.eligibility && (
            <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2">
              <span className="font-medium text-foreground/70">{t.catalog.eligibility}</span>{" "}
              {content.eligibility}
            </p>
          )}

          {/* Contact & Links */}
          <div className="flex flex-wrap items-center gap-3">
            {primaryLink && (
              <span
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(primaryLink.startsWith("http") ? primaryLink : `https://${primaryLink}`, "_blank");
                }}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-brand-green transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                {t.catalog.visitWebsite}
                <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            )}
            {item.phone && (
              <a
                href={`tel:${item.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Phone className="w-3 h-3" />
                <span className="hidden sm:inline">{item.phone}</span>
              </a>
            )}
            {item.email && (
              <a
                href={`mailto:${item.email}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="w-3 h-3" />
                <span className="hidden sm:inline truncate max-w-[140px]">{item.email}</span>
              </a>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
