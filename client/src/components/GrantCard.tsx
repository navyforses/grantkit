/*
 * GrantCard Component
 * Design: Structured Clarity — category color-coded left border, dense but scannable layout
 * Each card shows grant name, org, country, amount, category, eligibility, deadline, and apply link
 */

import { motion } from "framer-motion";
import { ArrowUpRight, Calendar, DollarSign, MapPin } from "lucide-react";
import { getCategoryLabel, getCategoryStyle, type Grant } from "@/lib/constants";

interface GrantCardProps {
  grant: Grant;
  index: number;
}

const categoryBorderColors: Record<string, string> = {
  "medical-treatment": "border-l-blue-500",
  "rehabilitation": "border-l-violet-500",
  "rare-disease": "border-l-red-500",
  "pediatric": "border-l-amber-500",
  "startup": "border-l-emerald-500",
};

export default function GrantCard({ grant, index }: GrantCardProps) {
  const borderColor = categoryBorderColors[grant.category] || "border-l-gray-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
      className={`group bg-white border border-gray-200/80 rounded-lg ${borderColor} border-l-4 hover:shadow-md hover:border-gray-300 transition-all duration-200`}
    >
      <div className="p-5">
        {/* Header: Flag + Name */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <span className="text-xl mt-0.5 shrink-0">{grant.countryFlag}</span>
            <div className="min-w-0">
              <h3 className="font-semibold text-[#0f172a] leading-snug text-[15px] group-hover:text-[#1e3a5f] transition-colors">
                {grant.name}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5 truncate">{grant.organization}</p>
            </div>
          </div>
          <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${getCategoryStyle(grant.category)}`}>
            {getCategoryLabel(grant.category)}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 leading-relaxed mb-3 line-clamp-2">
          {grant.description}
        </p>

        {/* Meta row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-gray-500 mb-3">
          <span className="flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-medium text-gray-700">{grant.amount}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            {grant.country}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            {grant.deadline}
          </span>
        </div>

        {/* Eligibility */}
        <p className="text-xs text-gray-500 leading-relaxed mb-4 line-clamp-2">
          <span className="font-medium text-gray-600">Eligibility:</span> {grant.eligibility}
        </p>

        {/* Apply button */}
        <a
          href={grant.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1e3a5f] hover:text-[#22c55e] transition-colors"
        >
          Apply
          <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </motion.div>
  );
}
