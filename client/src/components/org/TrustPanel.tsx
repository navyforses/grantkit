/*
 * TrustPanel — "Verification & Trust" card for the org detail page.
 *
 * Surfaces the three signals newcomers look for before engaging with an
 * organisation:
 *   1. Is this a real nonprofit / NGO / government body?
 *   2. How old is it? (founded-year trust signal)
 *   3. What do other people say? (Google rating + review count)
 *
 * Includes a "Verified by GrantKit" row that only lights up when the
 * `verifiedAt` timestamp is populated, so the badge is never a lie.
 *
 * Animations:
 *   - Whole card fades-in + slides up on viewport entry
 *   - Rating + review count tween from 0 via AnimatedNumber
 *   - Check icons scale-in staggered
 */

import { motion } from "framer-motion";
import { BadgeCheck, Building2, Calendar, Star } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import AnimatedNumber from "@/components/org/AnimatedNumber";
import { orgTypeLabel, type OrgType } from "@/lib/orgEnrichment";

interface Props {
  orgType: OrgType | null;
  foundedYear: number | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  verifiedAt: Date | null;
}

export default function TrustPanel({
  orgType,
  foundedYear,
  googleRating,
  googleReviewCount,
  verifiedAt,
}: Props) {
  const { t } = useLanguage();
  const e = t.orgEnrichment;

  const rows: Array<{ icon: React.ReactNode; label: string; active: boolean }> = [];

  if (orgType) {
    rows.push({
      icon: <Building2 className="w-4 h-4" aria-hidden />,
      label: orgTypeLabel(e, orgType) ?? "",
      active: true,
    });
  }
  if (foundedYear) {
    rows.push({
      icon: <Calendar className="w-4 h-4" aria-hidden />,
      label: e.foundedIn.replace("{year}", String(foundedYear)),
      active: true,
    });
  }
  if (verifiedAt) {
    rows.push({
      icon: <BadgeCheck className="w-4 h-4" aria-hidden />,
      label: e.verified,
      active: true,
    });
  }

  const hasGoogle = googleRating !== null && googleRating > 0;
  const hasAny = rows.length > 0 || hasGoogle;
  if (!hasAny) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.06] via-emerald-500/[0.03] to-transparent p-5 overflow-hidden"
    >
      {/* Subtle shimmer on entrance */}
      <motion.div
        aria-hidden
        initial={{ x: "-120%" }}
        whileInView={{ x: "220%" }}
        viewport={{ once: true }}
        transition={{ duration: 1.6, delay: 0.2, ease: "easeInOut" }}
        className="pointer-events-none absolute inset-y-0 -inset-x-20 w-1/3 bg-gradient-to-r from-transparent via-emerald-400/10 to-transparent skew-x-12"
      />

      <h2 className="relative text-xs font-semibold text-emerald-300/90 uppercase tracking-wider mb-4 flex items-center gap-2">
        <BadgeCheck className="w-3.5 h-3.5" aria-hidden />
        {e.trustTitle}
      </h2>

      <ul className="relative space-y-2.5">
        {rows.map((row, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
            className="flex items-center gap-3 text-sm text-foreground/90"
          >
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-300 shrink-0">
              {row.icon}
            </span>
            <span>{row.label}</span>
          </motion.li>
        ))}

        {hasGoogle && (
          <motion.li
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.4, delay: 0.1 + rows.length * 0.08 }}
            className="flex items-center gap-3 text-sm text-foreground/90"
          >
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/15 text-amber-300 shrink-0">
              <Star className="w-4 h-4" aria-hidden />
            </span>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-muted-foreground/80">{e.googleRating}:</span>
              <span className="font-semibold text-foreground">
                <AnimatedNumber value={googleRating as number} decimals={1} />
                <span className="text-muted-foreground/70"> / 5</span>
              </span>
              {googleReviewCount != null && googleReviewCount > 0 && (
                <span className="text-xs text-muted-foreground/70">
                  (
                  <AnimatedNumber value={googleReviewCount} />
                  {" "}
                  {e.reviewsCount.replace(/\{count\}\s*/, "").trim()}
                  )
                </span>
              )}
            </div>
          </motion.li>
        )}
      </ul>
    </motion.div>
  );
}
