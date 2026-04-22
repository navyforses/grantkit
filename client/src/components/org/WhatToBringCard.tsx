/*
 * WhatToBringCard — required-documents card.
 *
 * Renders the org's `requiredDocuments` JSON array as animated chips.
 * Strings are displayed verbatim today; when we introduce a fixed
 * vocabulary for document types we can swap to per-key i18n labels
 * inside this component without touching the caller.
 *
 * If `documents.length === 0` the card renders a single "To be
 * confirmed" placeholder chip so the layout still appears — important
 * while the admin panel is still filling values.
 */

import { motion } from "framer-motion";
import { CheckCircle2, FileText } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  documents: string[];
}

export default function WhatToBringCard({ documents }: Props) {
  const { t } = useLanguage();
  const e = t.orgEnrichment;

  const items = documents.length > 0 ? documents : [e.placeholderTbd];
  const missing = documents.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="bg-muted/40 border border-border rounded-xl p-5"
    >
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
        <FileText className="w-3.5 h-3.5 text-[color:var(--brand-green)]" aria-hidden />
        {e.whatToBringTitle}
      </h2>
      <div className="flex flex-wrap gap-2">
        {items.map((doc, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{
              duration: 0.3,
              delay: 0.05 + i * 0.05,
              ease: [0.34, 1.56, 0.64, 1], // gentle overshoot
            }}
            className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${
              missing
                ? "bg-muted text-muted-foreground/60 border-border italic"
                : "bg-[color:var(--brand-green)]/10 text-foreground/85 border-[color:var(--brand-green)]/30"
            }`}
          >
            {!missing && (
              <CheckCircle2 className="w-3 h-3 text-[color:var(--brand-green)]" aria-hidden />
            )}
            {doc}
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
}
