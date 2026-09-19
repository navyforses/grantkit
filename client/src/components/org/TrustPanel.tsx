/*
 * TrustPanel — "Google rating & Trust" card on the org detail page.
 *
 * Phase 1.5 (D7/D8): the card always renders. It shows
 *   - the provenance of the contact data ("Last checked {date} · source"
 *     or "Unverified — call to double-check"), and
 *   - the Google rating only when it is backed by at least
 *     MIN_REVIEWS_FOR_RATING reviews; otherwise one muted line explains
 *     why no rating is shown. No empty box, no placeholder stars.
 *
 * Animations:
 *   - Card fades/slides up on viewport entry
 *   - Shimmer sweep sweeps across on first reveal
 *   - Rating + review count tween from 0 via AnimatedNumber
 */

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import AnimatedNumber from "@/components/org/AnimatedNumber";
import ProvenanceLine from "@/components/org/ProvenanceLine";
import { isRatingDisplayable } from "@/lib/orgTrust";

interface Props {
  googleRating: number | null;
  googleReviewCount: number | null;
  /** Most recent contact verification (phone or email) — null = unverified. */
  verifiedAt: Date | string | null;
  verifiedSource: string | null;
}

export default function TrustPanel({ googleRating, googleReviewCount, verifiedAt, verifiedSource }: Props) {
  const { t } = useLanguage();
  const e = t.orgEnrichment;

  const showRating = isRatingDisplayable(googleRating, googleReviewCount);

  // Extract the {count} token's suffix (e.g. " reviews" / " მიმოხილვა")
  // from the translated string so AnimatedNumber can tween the number
  // and we render the localised label next to it.
  const reviewsSuffix = e.reviewsCount.replace(/\s*\{count\}\s*/, " ").trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.06] via-emerald-500/[0.03] to-transparent p-5 overflow-hidden"
      data-testid="trust-panel"
    >
      <motion.div
        aria-hidden
        initial={{ x: "-120%" }}
        whileInView={{ x: "220%" }}
        viewport={{ once: true }}
        transition={{ duration: 1.6, delay: 0.2, ease: "easeInOut" }}
        className="pointer-events-none absolute inset-y-0 -inset-x-20 w-1/3 bg-gradient-to-r from-transparent via-emerald-400/10 to-transparent skew-x-12"
      />

      <h2 className="relative text-xs font-semibold text-emerald-300/90 uppercase tracking-wider mb-3 flex items-center gap-2">
        <Star className="w-3.5 h-3.5" aria-hidden />
        {e.trustTitle}
      </h2>

      <ProvenanceLine verifiedAt={verifiedAt} source={verifiedSource} className="relative mb-3" />

      {showRating ? (
        <div className="relative flex items-center gap-3" data-testid="trust-rating">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/15 text-amber-300 shrink-0">
            <Star className="w-5 h-5 fill-current" aria-hidden />
          </span>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-baseline gap-1.5 text-foreground">
              <AnimatedNumber value={googleRating as number} decimals={1} className="text-2xl font-bold" />
              <span className="text-muted-foreground/70">/ 5</span>
            </div>
            <div className="text-xs text-muted-foreground/80">
              <AnimatedNumber value={googleReviewCount as number} />
              {reviewsSuffix ? ` ${reviewsSuffix}` : ""}
            </div>
          </div>
        </div>
      ) : (
        <p className="relative text-xs text-muted-foreground/70">{t.orgTrust.ratingHidden}</p>
      )}
    </motion.div>
  );
}
