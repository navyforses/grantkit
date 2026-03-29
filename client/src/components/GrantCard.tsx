/*
 * GrantCard Component
 * Design: Structured Clarity — category color-coded left border, dense but scannable layout
 * Uses dynamic translations for categories, types, and situations
 */

import { motion } from "framer-motion";
import { ArrowUpRight, ExternalLink, MapPin, Tag, User } from "lucide-react";
import { getCategoryStyle, getCategoryBorderColor, type Grant } from "@/lib/constants";
import { useLanguage } from "@/contexts/LanguageContext";

interface GrantCardProps {
  grant: Grant;
  index: number;
}

export default function GrantCard({ grant, index }: GrantCardProps) {
  const borderColor = getCategoryBorderColor(grant.category);
  const { t, tCategory, tType, tSituation, tCountry } = useLanguage();

  const translatedCategory = tCategory(grant.category);
  const translatedCountry = tCountry(grant.country);

  // Translate situations for display
  const translatedSituations = grant.situations
    .slice(0, 3)
    .map(s => tSituation(s))
    .join(", ");

  // Translate types for display
  const translatedTypes = grant.types
    .slice(0, 2)
    .map(tp => tType(tp))
    .join(", ");

  const countryFlag = grant.country === "USA" ? "🇺🇸" : grant.country === "Canada" ? "🇨🇦" : "🌐";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.5), ease: "easeOut" }}
      className={`group bg-white border border-gray-200/80 rounded-lg ${borderColor} border-l-4 hover:shadow-md hover:border-gray-300 transition-all duration-200`}
    >
      <div className="p-5">
        {/* Header: Flag + Name */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <span className="text-xl mt-0.5 shrink-0">{countryFlag}</span>
            <div className="min-w-0">
              <h3 className="font-semibold text-[#0f172a] leading-snug text-[15px] group-hover:text-[#1e3a5f] transition-colors">
                {grant.name}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5 truncate">{grant.organization}</p>
            </div>
          </div>
          <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${getCategoryStyle(grant.category)}`}>
            {translatedCategory}
          </span>
        </div>

        {/* Description */}
        {grant.description && (
          <p className="text-sm text-gray-600 leading-relaxed mb-3 line-clamp-2">
            {grant.description}
          </p>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-gray-500 mb-3">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            {translatedCountry}
            {grant.locations.length > 1 && (
              <span className="text-xs text-gray-400">+{grant.locations.length - 1}</span>
            )}
          </span>
          {translatedTypes && (
            <span className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-gray-400" />
              <span className="truncate max-w-[160px]">{translatedTypes}</span>
            </span>
          )}
        </div>

        {/* Situations / Eligibility */}
        {(translatedSituations || grant.eligibility) && (
          <p className="text-xs text-gray-500 leading-relaxed mb-4 line-clamp-2">
            <span className="font-medium text-gray-600">{t.grants.eligibility}</span>{" "}
            {translatedSituations || grant.eligibility}
          </p>
        )}

        {/* Apply button */}
        <div className="flex items-center gap-3">
          {grant.applicationUrl && (
            <a
              href={grant.applicationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1e3a5f] hover:text-[#22c55e] transition-colors"
            >
              {t.grants.apply}
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          )}
          {grant.sourceUrl && (
            <a
              href={grant.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}
