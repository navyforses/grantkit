/*
 * ResourceCard Component
 * Design: Structured Clarity — category color-coded left border, contact info, translated content
 */

import { motion } from "framer-motion";
import { ExternalLink, Mail, Phone, MapPin } from "lucide-react";
import { getResourceCategoryStyle, getResourceCategoryBorderColor, type Resource } from "@/lib/constants";
import { useLanguage } from "@/contexts/LanguageContext";

interface ResourceCardProps {
  resource: Resource;
  index: number;
}

export default function ResourceCard({ resource, index }: ResourceCardProps) {
  const borderColor = getResourceCategoryBorderColor(resource.category);
  const { t, tResourceCategory, tResourceContent } = useLanguage();

  const content = tResourceContent(resource.id, {
    name: resource.name,
    description: resource.description,
    eligibility: resource.eligibility || "",
  });

  const translatedCategory = tResourceCategory(resource.category);

  const hasContact = resource.contact.website || resource.contact.email || resource.contact.phone;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.5), ease: "easeOut" }}
      className={`group bg-white border border-gray-200/80 rounded-lg ${borderColor} border-l-4 hover:shadow-md hover:border-gray-300 transition-all duration-200`}
    >
      <div className="p-5">
        {/* Header: Name + Category */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-semibold text-[#0f172a] leading-snug text-[15px] group-hover:text-[#1e3a5f] transition-colors min-w-0">
            {content.name}
          </h3>
          <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${getResourceCategoryStyle(resource.category)}`}>
            {translatedCategory}
          </span>
        </div>

        {/* Description */}
        {content.description && (
          <p className="text-sm text-gray-600 leading-relaxed mb-3 line-clamp-3">
            {content.description}
          </p>
        )}

        {/* Eligibility */}
        {content.eligibility && (
          <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2">
            <span className="font-medium text-gray-600">{t.grants.eligibility}</span>{" "}
            {content.eligibility}
          </p>
        )}

        {/* Location */}
        {resource.contact.location && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="truncate">{resource.contact.location}</span>
          </div>
        )}

        {/* Contact links */}
        {hasContact && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100">
            {resource.contact.website && (
              <a
                href={resource.contact.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1e3a5f] hover:text-[#22c55e] transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {t.resources.visitWebsite}
              </a>
            )}
            {resource.contact.email && (
              <a
                href={`mailto:${resource.contact.email}`}
                className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                <Mail className="w-3 h-3" />
                {resource.contact.email}
              </a>
            )}
            {resource.contact.phone && (
              <a
                href={`tel:${resource.contact.phone}`}
                className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                <Phone className="w-3 h-3" />
                {resource.contact.phone}
              </a>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
